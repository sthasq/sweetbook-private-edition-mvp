package com.playpick.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.playpick.config.SweetbookProperties;
import com.playpick.domain.CustomerOrder;
import com.playpick.domain.CustomerOrderRepository;
import com.playpick.domain.FulfillmentStatus;
import com.playpick.domain.OrderRecord;
import com.playpick.domain.OrderRecordRepository;
import com.playpick.domain.OrderStatus;
import com.playpick.domain.SweetbookWebhookEvent;
import com.playpick.domain.SweetbookWebhookEventRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SweetbookWebhookService {

	private final SweetbookWebhookEventRepository sweetbookWebhookEventRepository;
	private final OrderRecordRepository orderRecordRepository;
	private final CustomerOrderRepository customerOrderRepository;
	private final SweetbookProperties sweetbookProperties;
	private final ObjectMapper objectMapper;

	public Receipt accept(WebhookRequest request) {
		verifyWebhookRequest(request);
		Map<String, Object> normalizedPayload = parsePayload(request.rawBody());
		Map<String, Object> data = asMap(normalizedPayload.get("data"));
		String rawEventType = firstText(
			request.eventType(),
			normalizedPayload.get("event"),
			normalizedPayload.get("type"),
			normalizedPayload.get("eventType"),
			data.get("event"),
			"unknown"
		);
		String normalizedEventType = normalizeEventType(rawEventType, normalizedPayload, data);
		String sweetbookOrderUid = firstText(
			normalizedPayload.get("orderUid"),
			normalizedPayload.get("uid"),
			data.get("orderUid"),
			data.get("uid"),
			""
		);
		String deliveryUid = firstText(
			request.deliveryUid(),
			normalizedPayload.get("deliveryUid"),
			data.get("deliveryUid"),
			""
		);
		Instant eventAt = parseEventAt(normalizedPayload, data);

		if (!deliveryUid.isBlank()) {
			SweetbookWebhookEvent existingEvent = sweetbookWebhookEventRepository.findByDeliveryUid(deliveryUid).orElse(null);
			if (existingEvent != null) {
				return new Receipt(
					existingEvent.getId(),
					existingEvent.getEventType(),
					existingEvent.getSweetbookOrderUid(),
					existingEvent.isLinked(),
					true
				);
			}
		}

		SweetbookWebhookEvent event = new SweetbookWebhookEvent();
		event.setEventType(rawEventType);
		event.setSweetbookOrderUid(sweetbookOrderUid.isBlank() ? null : sweetbookOrderUid);
		event.setDeliveryUid(deliveryUid.isBlank() ? null : deliveryUid);
		event.setPayload(normalizedPayload);

		boolean linked = false;
		if (!sweetbookOrderUid.isBlank()) {
			OrderRecord orderRecord = orderRecordRepository.findBySweetbookOrderUid(sweetbookOrderUid).orElse(null);
			if (orderRecord != null) {
				linked = true;
				FulfillmentStatus nextStatus = mapStatus(normalizedEventType, normalizedPayload, data, orderRecord.getStatus());
				orderRecord.setStatus(nextStatus);
				orderRecord.setLastEventType(normalizedEventType);
				orderRecord.setLastEventAt(eventAt);
				orderRecordRepository.save(orderRecord);
				syncCustomerOrder(normalizedEventType, nextStatus, orderRecord);
			}
		}

		event.setLinked(linked);
		event.setProcessedAt(Instant.now());
		event = sweetbookWebhookEventRepository.save(event);
		return new Receipt(event.getId(), event.getEventType(), event.getSweetbookOrderUid(), linked, false);
	}

	private void verifyWebhookRequest(WebhookRequest request) {
		if (!sweetbookProperties.isWebhookSecretConfigured()) {
			throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Sweetbook webhook secret is not configured");
		}
		long timestamp = parseTimestampSeconds(request.timestamp());
		long now = Instant.now().getEpochSecond();
		long tolerance = sweetbookProperties.getWebhookTimestampToleranceSeconds();
		if (Math.abs(now - timestamp) > tolerance) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook timestamp is invalid or too old");
		}

		String providedSignature = request.signature();
		if (providedSignature == null || providedSignature.isBlank()) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook signature is invalid");
		}
		String expectedSignature = signPayload(
			sweetbookProperties.getWebhookSecret(),
			timestamp + "." + request.rawBody()
		);
		if (!secureEquals(expectedSignature, providedSignature.trim())) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook signature is invalid");
		}
	}

	private Map<String, Object> parsePayload(String rawBody) {
		if (rawBody == null || rawBody.isBlank()) {
			return new LinkedHashMap<>();
		}
		try {
			return objectMapper.readValue(rawBody, new TypeReference<LinkedHashMap<String, Object>>() {
			});
		} catch (JsonProcessingException exception) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Sweetbook webhook payload must be valid JSON", exception);
		}
	}

	private void syncCustomerOrder(String normalizedEventType, FulfillmentStatus nextStatus, OrderRecord orderRecord) {
		CustomerOrder customerOrder = customerOrderRepository.findByFanProjectId(orderRecord.getFanProject().getId()).orElse(null);
		if (customerOrder == null) {
			return;
		}

		if (nextStatus == FulfillmentStatus.CANCELLED || "order.cancelled".equalsIgnoreCase(normalizedEventType)) {
			customerOrder.setStatus(OrderStatus.CANCELLED);
			customerOrderRepository.save(customerOrder);
			return;
		}

		if ("order.restored".equalsIgnoreCase(normalizedEventType) && customerOrder.getStatus() == OrderStatus.CANCELLED) {
			customerOrder.setStatus(OrderStatus.PAID);
			customerOrderRepository.save(customerOrder);
		}
	}

	private FulfillmentStatus mapStatus(
		String normalizedEventType,
		Map<String, Object> payload,
		Map<String, Object> data,
		FulfillmentStatus currentStatus
	) {
		if (normalizedEventType == null || normalizedEventType.isBlank()) {
			return currentStatus == null ? FulfillmentStatus.PENDING_SUBMISSION : currentStatus;
		}

		return switch (normalizedEventType) {
			case "order.created", "order.restored" -> FulfillmentStatus.SUBMITTED;
			case "production.confirmed" -> FulfillmentStatus.PRODUCTION_CONFIRMED;
			case "production.started" -> FulfillmentStatus.PRODUCTION_STARTED;
			case "production.completed" -> FulfillmentStatus.PRODUCTION_COMPLETED;
			case "shipping.departed" -> FulfillmentStatus.SHIPPING_DEPARTED;
			case "shipping.delivered" -> FulfillmentStatus.SHIPPING_DELIVERED;
			case "order.cancelled" -> FulfillmentStatus.CANCELLED;
			case "order.status_changed" -> mapStatusFromChangedPayload(payload, data, currentStatus);
			default -> currentStatus == null ? FulfillmentStatus.PENDING_SUBMISSION : currentStatus;
		};
	}

	private FulfillmentStatus mapStatusFromChangedPayload(
		Map<String, Object> payload,
		Map<String, Object> data,
		FulfillmentStatus currentStatus
	) {
		String normalizedStatus = normalizeStatusValue(firstText(
			payload.get("status"),
			payload.get("orderStatus"),
			payload.get("currentStatus"),
			payload.get("toStatus"),
			payload.get("state"),
			payload.get("stage"),
			data.get("status"),
			data.get("orderStatus"),
			data.get("currentStatus"),
			data.get("toStatus"),
			data.get("state"),
			data.get("stage"),
			data.get("productionStatus"),
			data.get("shippingStatus"),
			""
		));
		return switch (normalizedStatus) {
			case "PAID", "CREATED", "SUBMITTED" -> FulfillmentStatus.SUBMITTED;
			case "CONFIRMED", "PRODUCTION_CONFIRMED" -> FulfillmentStatus.PRODUCTION_CONFIRMED;
			case "PRODUCTION_STARTED", "STARTED", "IN_PRODUCTION" -> FulfillmentStatus.PRODUCTION_STARTED;
			case "PRODUCTION_COMPLETED", "COMPLETED" -> FulfillmentStatus.PRODUCTION_COMPLETED;
			case "SHIPPED", "SHIPPING_DEPARTED", "DEPARTED" -> FulfillmentStatus.SHIPPING_DEPARTED;
			case "DELIVERED", "SHIPPING_DELIVERED" -> FulfillmentStatus.SHIPPING_DELIVERED;
			case "CANCELLED" -> FulfillmentStatus.CANCELLED;
			default -> currentStatus == null ? FulfillmentStatus.PENDING_SUBMISSION : currentStatus;
		};
	}

	private String normalizeEventType(String rawEventType, Map<String, Object> payload, Map<String, Object> data) {
		if (rawEventType == null || rawEventType.isBlank()) {
			return "unknown";
		}
		return switch (rawEventType.trim()) {
			case "order.paid" -> "order.created";
			case "order.confirmed" -> "production.confirmed";
			case "order.shipped" -> "shipping.departed";
			case "order.status_changed" -> inferCanonicalEventTypeFromStatus(payload, data);
			default -> rawEventType.trim();
		};
	}

	private String inferCanonicalEventTypeFromStatus(Map<String, Object> payload, Map<String, Object> data) {
		String normalizedStatus = normalizeStatusValue(firstText(
			payload.get("status"),
			payload.get("orderStatus"),
			payload.get("currentStatus"),
			payload.get("toStatus"),
			payload.get("state"),
			payload.get("stage"),
			data.get("status"),
			data.get("orderStatus"),
			data.get("currentStatus"),
			data.get("toStatus"),
			data.get("state"),
			data.get("stage"),
			data.get("productionStatus"),
			data.get("shippingStatus"),
			""
		));
		return switch (normalizedStatus) {
			case "PAID", "CREATED", "SUBMITTED" -> "order.created";
			case "CONFIRMED", "PRODUCTION_CONFIRMED" -> "production.confirmed";
			case "PRODUCTION_STARTED", "STARTED", "IN_PRODUCTION" -> "production.started";
			case "PRODUCTION_COMPLETED", "COMPLETED" -> "production.completed";
			case "SHIPPED", "SHIPPING_DEPARTED", "DEPARTED" -> "shipping.departed";
			case "DELIVERED", "SHIPPING_DELIVERED" -> "shipping.delivered";
			case "CANCELLED" -> "order.cancelled";
			case "RESTORED" -> "order.restored";
			default -> "order.status_changed";
		};
	}

	private Instant parseEventAt(Map<String, Object> payload, Map<String, Object> data) {
		return parseInstant(firstText(
			payload.get("createdAt"),
			payload.get("occurredAt"),
			data.get("createdAt"),
			data.get("occurredAt"),
			""
		));
	}

	private Map<String, Object> asMap(Object value) {
		if (value instanceof Map<?, ?> map) {
			Map<String, Object> result = new LinkedHashMap<>();
			map.forEach((key, object) -> result.put(String.valueOf(key), object));
			return result;
		}
		return new LinkedHashMap<>();
	}

	private String firstText(Object... candidates) {
		for (Object candidate : candidates) {
			if (candidate == null) {
				continue;
			}
			String value = String.valueOf(candidate).trim();
			if (!value.isBlank()) {
				return value;
			}
		}
		return "";
	}

	private String normalizeStatusValue(String rawValue) {
		if (rawValue == null || rawValue.isBlank()) {
			return "";
		}
		return rawValue.trim()
			.replace('-', '_')
			.replace('.', '_')
			.replace(' ', '_')
			.toUpperCase(Locale.ROOT);
	}

	private long parseTimestampSeconds(String rawTimestamp) {
		if (rawTimestamp == null || rawTimestamp.isBlank()) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook timestamp is invalid or too old");
		}
		try {
			return Long.parseLong(rawTimestamp.trim());
		} catch (NumberFormatException exception) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook timestamp is invalid or too old", exception);
		}
	}

	private Instant parseInstant(String rawValue) {
		if (rawValue == null || rawValue.isBlank()) {
			return Instant.now();
		}
		try {
			return Instant.parse(rawValue);
		} catch (DateTimeParseException ignored) {
			return Instant.now();
		}
	}

	private String signPayload(String secret, String message) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			byte[] digest = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
			return "sha256=" + toHex(digest);
		} catch (Exception exception) {
			throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to verify Sweetbook webhook signature", exception);
		}
	}

	private boolean secureEquals(String expected, String actual) {
		return java.security.MessageDigest.isEqual(
			expected.getBytes(StandardCharsets.UTF_8),
			actual.getBytes(StandardCharsets.UTF_8)
		);
	}

	private String toHex(byte[] bytes) {
		StringBuilder builder = new StringBuilder(bytes.length * 2);
		for (byte value : bytes) {
			builder.append(Character.forDigit((value >> 4) & 0xF, 16));
			builder.append(Character.forDigit(value & 0xF, 16));
		}
		return builder.toString();
	}

	public record Receipt(
		Long id,
		String eventType,
		String sweetbookOrderUid,
		boolean linked,
		boolean duplicate
	) {
	}

	public record WebhookRequest(
		String eventType,
		String deliveryUid,
		String timestamp,
		String signature,
		String rawBody
	) {
	}
}
