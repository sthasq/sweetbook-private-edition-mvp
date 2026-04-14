package com.playpick.application;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
@Slf4j
public class AdminWebhookStreamService {

	private static final long SSE_TIMEOUT_MS = 30L * 60L * 1000L;

	private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

	public SseEmitter subscribe() {
		SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
		emitters.add(emitter);

		emitter.onCompletion(() -> emitters.remove(emitter));
		emitter.onTimeout(() -> {
			emitters.remove(emitter);
			emitter.complete();
		});
		emitter.onError(error -> emitters.remove(emitter));

		try {
			emitter.send(SseEmitter.event()
				.name("connected")
				.data("admin-webhook-stream-ready"));
		} catch (Exception exception) {
			emitters.remove(emitter);
			emitter.completeWithError(exception);
		}

		return emitter;
	}

	public void publish(AdminViews.WebhookEventSummary event) {
		for (SseEmitter emitter : emitters) {
			try {
				emitter.send(SseEmitter.event()
					.name("webhook")
					.id(String.valueOf(event.id()))
					.data(event));
			} catch (Exception exception) {
				log.debug("Removing stale admin webhook emitter", exception);
				emitters.remove(emitter);
				emitter.completeWithError(exception);
			}
		}
	}
}
