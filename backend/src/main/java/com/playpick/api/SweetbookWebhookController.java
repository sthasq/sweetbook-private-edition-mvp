package com.playpick.api;

import com.playpick.application.SweetbookWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Sweetbook")
@RestController
@RequestMapping("/api/sweetbook/webhooks")
@RequiredArgsConstructor
public class SweetbookWebhookController {

	private final SweetbookWebhookService sweetbookWebhookService;

	@Operation(summary = "Receive Sweetbook order webhooks")
	@PostMapping("/events")
	public SweetbookWebhookService.Receipt receiveEvent(
		@RequestHeader(value = "X-Webhook-Event", required = false) String webhookEvent,
		@RequestHeader(value = "X-Webhook-Delivery", required = false) String webhookDelivery,
		@RequestHeader(value = "X-Webhook-Timestamp", required = false) String webhookTimestamp,
		@RequestHeader(value = "X-Webhook-Signature", required = false) String webhookSignature,
		@RequestBody(required = false) String rawBody
	) {
		return sweetbookWebhookService.accept(new SweetbookWebhookService.WebhookRequest(
			webhookEvent,
			webhookDelivery,
			webhookTimestamp,
			webhookSignature,
			rawBody == null ? "" : rawBody
		));
	}
}
