import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { getAdminWebhooks } from "../api/admin";
import AdminShell from "../components/AdminShell";
import PaginationControls from "../components/PaginationControls";
import { subscribeToAdminWebhookEvents } from "../lib/adminWebhookStream";
import { paginateItems } from "../lib/pagination";
import type { AdminWebhookEvent } from "../types/api";

const WEBHOOKS_PAGE_SIZE = 10;

export default function AdminWebhooksPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState<AdminWebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextEvents = await getAdminWebhooks();
        if (!cancelled) {
          setEvents((current) => mergeWebhookEvents(current, nextEvents));
          setError("");
        }
      } catch (e: unknown) {
        if (e instanceof ApiError && e.status === 401) {
          navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
          return;
        }
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Webhook 로그를 불러오지 못했어요.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    const unsubscribe = subscribeToAdminWebhookEvents((event) => {
      setEvents((current) => mergeWebhookEvents(current, [event]));
      setPage(1);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigate, location.pathname]);

  const pagedEvents = paginateItems(events, page, WEBHOOKS_PAGE_SIZE);

  return (
    <AdminShell
      title="Webhook 로그"
      description="Sweetbook에서 수신한 최근 Webhook 이벤트를 확인합니다."
    >
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-xs text-stone-500">
        <span>관리자 페이지가 열려 있으면 새 Webhook 이벤트를 SSE 스트림으로 바로 받아 알림과 로그에 반영해요.</span>
        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-stone-600">실시간 스트림</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-stone-200 bg-stone-100/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">{error}</div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-500">
          아직 수신된 Webhook 이벤트가 없어요.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">이벤트 타입</th>
                  <th className="px-5 py-4">주문 UID</th>
                  <th className="px-5 py-4 text-center">연결됨</th>
                  <th className="px-5 py-4 text-right">처리 시각</th>
                  <th className="px-5 py-4 text-right">수신 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pagedEvents.items.map((event) => (
                  <tr key={event.id} className="bg-white hover:bg-stone-50/60">
                    <td className="px-5 py-4 font-medium text-stone-900">#{event.id}</td>
                    <td className="px-5 py-4">
                      <span className="rounded bg-stone-100 px-2 py-1 font-mono text-xs text-stone-700">{event.eventType}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-stone-600">
                      {event.sweetbookOrderUid || "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {event.linked ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">연결</span>
                      ) : (
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500">미연결</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-stone-600">
                      {event.processedAt ? fmtDate(event.processedAt) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-stone-600">{fmtDate(event.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={pagedEvents.currentPage}
            pageSize={WEBHOOKS_PAGE_SIZE}
            totalItems={events.length}
            itemLabel="웹훅"
            onPageChange={setPage}
          />
        </div>
      )}
    </AdminShell>
  );
}

function fmtDate(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString("ko-KR");
}

function mergeWebhookEvents(current: AdminWebhookEvent[], incoming: AdminWebhookEvent[]) {
  const merged = new Map<number, AdminWebhookEvent>();

  for (const event of current) {
    merged.set(event.id, event);
  }
  for (const event of incoming) {
    merged.set(event.id, event);
  }

  return Array.from(merged.values())
    .sort((left, right) => compareWebhookEvents(left, right))
    .slice(0, 20);
}

function compareWebhookEvents(left: AdminWebhookEvent, right: AdminWebhookEvent) {
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
