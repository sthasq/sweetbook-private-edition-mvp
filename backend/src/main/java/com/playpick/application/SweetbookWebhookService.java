package com.playpick.application;

import com.playpick.domain.CustomerOrder;
import com.playpick.domain.CustomerOrderRepository;
import com.playpick.domain.FulfillmentStatus;
import com.playpick.domain.OrderRecord;
import com.playpick.domain.OrderRecordRepository;
import com.playpick.domain.OrderStatus;
import com.playpick.domain.SweetbookWebhookEvent;
import com.playpick.domain.SweetbookWebhookEventRepository;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SweetbookWebhookService {

	private final SweetbookWebhookEventRepository sweetbookWebhookEventRepository;
	private final OrderRecordRepository orderRecordRepository;
	private final CustomerOrderRepository customerOrderRepository;

	public Receipt accept(Map<String, Object> payload) {
		Map<String, Object> normalizedPayload = payload == null ? new LinkedHashMap<>() : new LinkedHashMap<>(payload);
		Map<String, Object> data = asMap(normalizedPayload.get("data"));
		String eventType = firstText(
			normalizedPayload.get("event"),
			normalizedPayload.get("type"),
			normalizedPayload.get("eventType"),
			data.get("event"),
			"unknown"
		);
		String sweetbookOrderUid = firstText(
			normalizedPayload.get("orderUid"),
			normalizedPayload.get("uid"),
			data.get("orderUid"),
			data.get("uid"),
			""
		);
		Instant eventAt = parseInstant(
			firstText(
				normalizedPayload.get("createdAt"),
				normalizedPayload.get("occurredAt"),
				data.get("createdAt"),
				data.get("occurredAt"),
				""
			)
		);

		SweetbookWebhookEvent event = new SweetbookWebhookEvent();
		event.setEventType(eventType);
		event.setSweetbookOrderUid(sweetbookOrderUid.isBlank() ? null : sweetbookOrderUid);
		event.setPayload(normalizedPayload);

		boolean linked = false;
		if (!sweetbookOrderUid.isBlank()) {
			OrderRecord orderRecord = orderRecordRepository.findBySweetbookOrderUid(sweetbookOrderUid).orElse(null);
			if (orderRecord != null) {
				linked = true;
				orderRecord.setStatus(mapStatus(eventType, orderRecord.getStatus()));
				orderRecord.setLastEventType(eventType);
				orderRecord.setLastEventAt(eventAt);
				orderRecordRepository.save(orderRecord);
				syncCustomerOrder(eventType, orderRecord);
			}
		}

		event.setProcessedAt(Instant.now());
		event = sweetbookWebhookEventRepository.save(event);
		return new Receipt(event.getId(), eventType, event.getSweetbookOrderUid(), linked);
	}

	private void syncCustomerOrder(String eventType, OrderRecord orderRecord) {
		CustomerOrder customerOrder = customerOrderRepository.findByFanProjectId(orderRecord.getFanProject().getId()).orElse(null);
		if (customerOrder == null) {
			return;
		}

		if ("order.cancelled".equalsIgnoreCase(eventType)) {
			customerOrder.setStatus(OrderStatus.CANCELLED);
			customerOrderRepository.save(customerOrder);
			return;
		}

		if ("order.restored".equalsIgnoreCase(eventType) && customerOrder.getStatus() == OrderStatus.CANCELLED) {
			customerOrder.setStatus(OrderStatus.PAID);
			customerOrderRepository.save(customerOrder);
		}
	}

	private FulfillmentStatus mapStatus(String eventType, FulfillmentStatus currentStatus) {
		if (eventType == null || eventType.isBlank()) {
			return currentStatus == null ? FulfillmentStatus.PENDING_SUBMISSION : currentStatus;
		}

		return switch (eventType) {
			case "order.created", "order.restored" -> FulfillmentStatus.SUBMITTED;
			case "production.confirmed" -> FulfillmentStatus.PRODUCTION_CONFIRMED;
			case "production.started" -> FulfillmentStatus.PRODUCTION_STARTED;
			case "production.completed" -> FulfillmentStatus.PRODUCTION_COMPLETED;
			case "shipping.departed" -> FulfillmentStatus.SHIPPING_DEPARTED;
			case "shipping.delivered" -> FulfillmentStatus.SHIPPING_DELIVERED;
			case "order.cancelled" -> FulfillmentStatus.CANCELLED;
			default -> currentStatus == null ? FulfillmentStatus.PENDING_SUBMISSION : currentStatus;
		};
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

	public record Receipt(
		Long id,
		String eventType,
		String sweetbookOrderUid,
		boolean linked
	) {
	}
}
