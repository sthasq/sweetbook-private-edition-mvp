package com.playpick.api;

import com.playpick.application.SweetbookWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
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
		@RequestHeader(value = "X-Sweetbook-Webhook-Secret", required = false) String webhookSecret,
		@RequestBody(required = false) Map<String, Object> payload
	) {
		sweetbookWebhookService.verifyWebhookSecret(webhookSecret);
		return sweetbookWebhookService.accept(payload);
	}
}
