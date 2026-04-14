package com.playpick.application;

import com.playpick.domain.SweetbookWebhookEvent;
import com.playpick.domain.SweetbookWebhookEventRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
@RequiredArgsConstructor
class AdminWebhookOverviewService {

	private final SweetbookWebhookEventRepository sweetbookWebhookEventRepository;
	private final AdminWebhookStreamService adminWebhookStreamService;

	List<AdminViews.WebhookEventSummary> listRecentWebhooks() {
		return sweetbookWebhookEventRepository.findTop20ByOrderByCreatedAtDesc()
			.stream()
			.map(this::toSummary)
			.toList();
	}

	SseEmitter subscribe() {
		return adminWebhookStreamService.subscribe();
	}

	void publish(SweetbookWebhookEvent event) {
		adminWebhookStreamService.publish(toSummary(event));
	}

	AdminViews.WebhookEventSummary toSummary(SweetbookWebhookEvent event) {
		return new AdminViews.WebhookEventSummary(
			event.getId(),
			event.getEventType(),
			event.getSweetbookOrderUid(),
			event.getProcessedAt(),
			event.getCreatedAt(),
			event.isLinked()
		);
	}
}
