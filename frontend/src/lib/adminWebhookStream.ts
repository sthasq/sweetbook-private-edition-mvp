import { resolveAppUrl } from "./appPaths";
import type { AdminWebhookEvent } from "../types/api";

const ADMIN_WEBHOOK_EVENT_NAME = "playpick:admin-webhook";

export function openAdminWebhookStream(
  onWebhook: (event: AdminWebhookEvent) => void,
  onError?: (error: unknown) => void,
) {
  const eventSource = new EventSource(resolveAppUrl("/api/admin/webhooks/stream"), {
    withCredentials: true,
  });

  eventSource.addEventListener("webhook", (event) => {
    const message = event as MessageEvent<string>;
    try {
      const payload = JSON.parse(message.data) as AdminWebhookEvent;
      onWebhook(payload);
      dispatchAdminWebhookEvent(payload);
    } catch (error) {
      onError?.(error);
    }
  });
  eventSource.onerror = (error) => {
    onError?.(error);
  };

  return () => {
    eventSource.close();
  };
}

export function subscribeToAdminWebhookEvents(onWebhook: (event: AdminWebhookEvent) => void) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<AdminWebhookEvent>;
    onWebhook(customEvent.detail);
  };

  window.addEventListener(ADMIN_WEBHOOK_EVENT_NAME, handler as EventListener);
  return () => {
    window.removeEventListener(ADMIN_WEBHOOK_EVENT_NAME, handler as EventListener);
  };
}

function dispatchAdminWebhookEvent(event: AdminWebhookEvent) {
  window.dispatchEvent(new CustomEvent<AdminWebhookEvent>(ADMIN_WEBHOOK_EVENT_NAME, {
    detail: event,
  }));
}
