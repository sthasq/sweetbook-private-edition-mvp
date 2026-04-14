package com.playpick.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.playpick.domain.FulfillmentStatus;
import com.playpick.domain.SweetbookWebhookEvent;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SweetbookWebhookEventInterpreter {

	private final ObjectMapper objectMapper;

	ParsedWebhookPayload parse(SweetbookWebhookService.WebhookRequest request) {
		Map<String, Object> payload = parsePayload(request.rawBody());
		Map<String, Object> data = asMap(payload.get("data"));
		String rawEventType = firstText(
			request.eventType(),
			payload.get("event"),
			payload.get("type"),
			payload.get("event_type"),
			payload.get("eventType"),
			data.get("event"),
			data.get("event_type"),
			"unknown"
		);
		return new ParsedWebhookPayload(
			rawEventType,
			normalizeEventType(rawEventType, payload, data),
			readSweetbookOrderUid(payload, data),
			firstText(
				request.deliveryUid(),
				payload.get("deliveryUid"),
				payload.get("delivery_uid"),
				data.get("deliveryUid"),
				data.get("delivery_uid"),
				""
			),
			parseEventAt(payload, data),
			payload,
			data
		);
	}

	ParsedWebhookPayload parse(SweetbookWebhookEvent event) {
		Map<String, Object> payload = event.getPayload() == null ? new LinkedHashMap<>() : event.getPayload();
		Map<String, Object> data = asMap(payload.get("data"));
		String rawEventType = firstText(
			event.getEventType(),
			payload.get("event"),
			payload.get("type"),
			payload.get("event_type"),
			payload.get("eventType"),
			data.get("event"),
			data.get("event_type"),
			"unknown"
		);
		return new ParsedWebhookPayload(
			rawEventType,
			normalizeEventType(rawEventType, payload, data),
			readSweetbookOrderUid(payload, data),
			firstText(
				event.getDeliveryUid(),
				payload.get("deliveryUid"),
				payload.get("delivery_uid"),
				data.get("deliveryUid"),
				data.get("delivery_uid"),
				""
			),
			parseEventAt(payload, data),
			payload,
			data
		);
	}

	FulfillmentStatus mapStatus(ParsedWebhookPayload parsedPayload, FulfillmentStatus currentStatus) {
		String normalizedEventType = parsedPayload.normalizedEventType();
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
			case "order.status_changed" -> mapStatusFromChangedPayload(parsedPayload.payload(), parsedPayload.data(), currentStatus);
			default -> currentStatus == null ? FulfillmentStatus.PENDING_SUBMISSION : currentStatus;
		};
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

	private String readSweetbookOrderUid(Map<String, Object> payload, Map<String, Object> data) {
		return firstText(
			payload.get("orderUid"),
			payload.get("order_uid"),
			payload.get("uid"),
			data.get("orderUid"),
			data.get("order_uid"),
			data.get("uid"),
			""
		);
	}

	private FulfillmentStatus mapStatusFromChangedPayload(
		Map<String, Object> payload,
		Map<String, Object> data,
		FulfillmentStatus currentStatus
	) {
		String normalizedStatus = normalizeStatusValue(firstText(
			payload.get("status"),
			payload.get("orderStatus"),
			payload.get("order_status"),
			payload.get("currentStatus"),
			payload.get("current_status"),
			payload.get("toStatus"),
			payload.get("to_status"),
			payload.get("state"),
			payload.get("stage"),
			data.get("status"),
			data.get("orderStatus"),
			data.get("order_status"),
			data.get("currentStatus"),
			data.get("current_status"),
			data.get("toStatus"),
			data.get("to_status"),
			data.get("state"),
			data.get("stage"),
			data.get("productionStatus"),
			data.get("production_status"),
			data.get("shippingStatus"),
			data.get("shipping_status"),
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
			payload.get("order_status"),
			payload.get("currentStatus"),
			payload.get("current_status"),
			payload.get("toStatus"),
			payload.get("to_status"),
			payload.get("state"),
			payload.get("stage"),
			data.get("status"),
			data.get("orderStatus"),
			data.get("order_status"),
			data.get("currentStatus"),
			data.get("current_status"),
			data.get("toStatus"),
			data.get("to_status"),
			data.get("state"),
			data.get("stage"),
			data.get("productionStatus"),
			data.get("production_status"),
			data.get("shippingStatus"),
			data.get("shipping_status"),
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
			payload.get("created_at"),
			payload.get("occurredAt"),
			payload.get("occurred_at"),
			data.get("createdAt"),
			data.get("created_at"),
			data.get("occurredAt"),
			data.get("occurred_at"),
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

	record ParsedWebhookPayload(
		String rawEventType,
		String normalizedEventType,
		String sweetbookOrderUid,
		String deliveryUid,
		Instant eventAt,
		Map<String, Object> payload,
		Map<String, Object> data
	) {
	}
}
