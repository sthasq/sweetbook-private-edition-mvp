import type { AdminWebhookEvent } from "../types/api";

export function describeAdminWebhookEvent(event: AdminWebhookEvent) {
  const typeLabel = event.eventType || "unknown";
  if (event.linked) {
    return `${typeLabel} 이벤트가 주문에 반영됐어요.`;
  }
  return `${typeLabel} 이벤트가 들어왔지만 아직 주문 연결이 없어요.`;
}

export function formatAdminWebhookDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

export function mergeAdminWebhookEvents(
  current: AdminWebhookEvent[],
  incoming: AdminWebhookEvent[],
  limit = Number.POSITIVE_INFINITY,
) {
  const merged = new Map<number, AdminWebhookEvent>();

  for (const event of current) {
    merged.set(event.id, event);
  }
  for (const event of incoming) {
    merged.set(event.id, event);
  }

  return Array.from(merged.values())
    .sort(compareAdminWebhookEvents)
    .slice(0, limit);
}

function compareAdminWebhookEvents(left: AdminWebhookEvent, right: AdminWebhookEvent) {
  const createdAtDiff = toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }
  return right.id - left.id;
}

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
