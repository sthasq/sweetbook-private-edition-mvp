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
import java.util.List;
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
	private final SweetbookWebhookRequestVerifier requestVerifier;
	private final SweetbookWebhookEventInterpreter eventInterpreter;
	private final AdminWebhookOverviewService adminWebhookOverviewService;

	public Receipt accept(WebhookRequest request) {
		requestVerifier.verify(request);
		SweetbookWebhookEventInterpreter.ParsedWebhookPayload parsedPayload = eventInterpreter.parse(request);
		String sweetbookOrderUid = parsedPayload.sweetbookOrderUid();
		String deliveryUid = parsedPayload.deliveryUid();

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
		event.setEventType(parsedPayload.rawEventType());
		event.setSweetbookOrderUid(sweetbookOrderUid.isBlank() ? null : sweetbookOrderUid);
		event.setDeliveryUid(deliveryUid.isBlank() ? null : deliveryUid);
		event.setPayload(parsedPayload.payload());

		boolean linked = false;
		if (!sweetbookOrderUid.isBlank()) {
			OrderRecord orderRecord = orderRecordRepository.findBySweetbookOrderUid(sweetbookOrderUid).orElse(null);
			if (orderRecord != null) {
				reconcilePendingEvents(orderRecord);
				linked = true;
				applyEventToOrderRecord(orderRecord, parsedPayload);
				orderRecordRepository.save(orderRecord);
			}
		}

		event.setLinked(linked);
		event.setProcessedAt(Instant.now());
		event = sweetbookWebhookEventRepository.save(event);
		adminWebhookOverviewService.publish(event);
		return new Receipt(event.getId(), event.getEventType(), event.getSweetbookOrderUid(), linked, false);
	}

	public void reconcilePendingEvents(OrderRecord orderRecord) {
		if (orderRecord == null
			|| orderRecord.getSweetbookOrderUid() == null
			|| orderRecord.getSweetbookOrderUid().isBlank()) {
			return;
		}

		List<SweetbookWebhookEvent> pendingEvents = sweetbookWebhookEventRepository
			.findBySweetbookOrderUidAndLinkedFalseOrderByCreatedAtAsc(orderRecord.getSweetbookOrderUid());
		if (pendingEvents.isEmpty()) {
			return;
		}

		for (SweetbookWebhookEvent pendingEvent : pendingEvents) {
			SweetbookWebhookEventInterpreter.ParsedWebhookPayload parsedPayload = eventInterpreter.parse(pendingEvent);

			applyEventToOrderRecord(orderRecord, parsedPayload);
			pendingEvent.setLinked(true);
			pendingEvent.setSweetbookOrderUid(orderRecord.getSweetbookOrderUid());
			sweetbookWebhookEventRepository.save(pendingEvent);
			adminWebhookOverviewService.publish(pendingEvent);
		}

		orderRecordRepository.save(orderRecord);
	}

	public void reconcilePendingEventsByOrderUid(String sweetbookOrderUid) {
		if (sweetbookOrderUid == null || sweetbookOrderUid.isBlank()) {
			return;
		}
		orderRecordRepository.findBySweetbookOrderUid(sweetbookOrderUid)
			.ifPresent(this::reconcilePendingEvents);
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

	private void applyEventToOrderRecord(
		OrderRecord orderRecord,
		SweetbookWebhookEventInterpreter.ParsedWebhookPayload parsedPayload
	) {
		Instant eventAt = parsedPayload.eventAt();
		FulfillmentStatus nextStatus = eventInterpreter.mapStatus(parsedPayload, orderRecord.getStatus());
		if (orderRecord.getLastEventAt() != null
			&& eventAt.isBefore(orderRecord.getLastEventAt())) {
			return;
		}
		orderRecord.setStatus(nextStatus);
		orderRecord.setLastEventType(parsedPayload.normalizedEventType());
		orderRecord.setLastEventAt(eventAt);
		syncCustomerOrder(parsedPayload.normalizedEventType(), nextStatus, orderRecord);
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
