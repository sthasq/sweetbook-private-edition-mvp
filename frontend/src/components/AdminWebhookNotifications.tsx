import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { openAdminWebhookStream } from "../lib/adminWebhookStream";
import {
  describeAdminWebhookEvent,
  formatAdminWebhookDate,
  mergeAdminWebhookEvents,
} from "../lib/adminWebhookEvents";
import type { AdminWebhookEvent } from "../types/api";

const MAX_WEBHOOK_NOTIFICATIONS = 12;

export default function AdminWebhookNotifications() {
  const [webhookNotifications, setWebhookNotifications] = useState<AdminWebhookEvent[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const notificationPanelOpenRef = useRef(false);

  useEffect(() => {
    notificationPanelOpenRef.current = notificationPanelOpen;
  }, [notificationPanelOpen]);

  useEffect(() => {
    const closeStream = openAdminWebhookStream((event) => {
      setWebhookNotifications((current) =>
        mergeAdminWebhookEvents(current, [event], MAX_WEBHOOK_NOTIFICATIONS),
      );
      if (!notificationPanelOpenRef.current) {
        setUnreadCount((current) => Math.min(current + 1, 99));
      }
    });

    return () => {
      closeStream();
    };
  }, []);

  useEffect(() => {
    if (!notificationPanelOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!notificationPanelRef.current?.contains(event.target as Node)) {
        setNotificationPanelOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationPanelOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [notificationPanelOpen]);

  return (
    <div ref={notificationPanelRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setNotificationPanelOpen((current) => {
            const next = !current;
            if (next) {
              setUnreadCount(0);
            }
            return next;
          });
        }}
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
        aria-label="웹훅 알림 열기"
        aria-expanded={notificationPanelOpen}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.7}
            d="M14.857 17H9.143m9.571 0A2.857 2.857 0 0 1 15.857 19.857H8.143A2.857 2.857 0 0 1 5.286 17m13.428 0v-4.286A6.714 6.714 0 0 0 12 6a6.714 6.714 0 0 0-6.714 6.714V17m13.428 0H5.286"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {notificationPanelOpen ? (
        <div className="absolute right-0 top-full z-30 mt-3 w-[min(24rem,calc(100vw-3rem))] max-w-[calc(100vw-3rem)] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_28px_70px_-32px_rgba(15,23,42,0.35)]">
          <div className="border-b border-stone-100 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-900">Webhook 알림</p>
                <p className="mt-1 text-xs text-stone-500">Sweetbook 이벤트를 관리자 화면에서 바로 확인해요.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                실시간
              </span>
            </div>
          </div>

          {webhookNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-stone-500">
              아직 도착한 웹훅 알림이 없어요.
            </div>
          ) : (
            <div className="max-h-[min(65vh,28rem)] overflow-y-auto px-3 py-3">
              <ul className="space-y-3">
                {webhookNotifications.map((event) => (
                  <li key={event.id}>
                    <Link
                      to="/admin/webhooks"
                      onClick={() => setNotificationPanelOpen(false)}
                      className="block rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold leading-6 text-stone-900">
                            {describeAdminWebhookEvent(event)}
                          </p>
                          <p className="mt-2 break-all text-xs leading-5 text-stone-500">
                            {event.sweetbookOrderUid
                              ? `주문 UID ${event.sweetbookOrderUid}`
                              : "주문 UID가 없는 이벤트예요."}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {formatAdminWebhookDate(event.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            event.linked ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {event.linked ? "연결됨" : "미연결"}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-stone-100 px-4 py-3">
            <Link
              to="/admin/webhooks"
              onClick={() => setNotificationPanelOpen(false)}
              className="text-xs font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 transition hover:decoration-brand-500"
            >
              전체 Webhook 로그 보기
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
