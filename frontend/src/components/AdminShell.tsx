import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { openAdminWebhookStream } from "../lib/adminWebhookStream";
import type { AdminWebhookEvent } from "../types/api";

const ADMIN_NAV_ITEMS = [
  { to: "/admin/dashboard", label: "대시보드", description: "매출, 원가, 분배 마진 현황을 확인해요." },
  { to: "/admin/settlements", label: "정산 현황", description: "크리에이터별 정산 예정 금액을 조회해요." },
  { to: "/admin/orders", label: "주문 관리", description: "전체 주문과 제작 상태를 확인해요." },
  { to: "/admin/webhooks", label: "Webhook 로그", description: "Sweetbook 이벤트 수신 이력이에요." },
  { to: "/admin/users", label: "사용자 관리", description: "회원 목록과 크리에이터 인증을 관리해요." },
] as const;

export default function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
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
      setWebhookNotifications((current) => mergeWebhookEvents(current, [event], 12));
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
    <div className="studio-page page-shell">
      <div className="mx-auto max-w-screen-2xl">
        <section className="border-b border-stone-200/70 pb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="editorial-label">관리자 콘솔</p>
                <h1 className="mt-3 text-4xl font-bold text-brand-700 md:text-5xl">
                  PlayPick Admin
                </h1>
                <p className="mt-4 text-lg font-semibold text-stone-900 md:text-xl">{title}</p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-warm-500 md:text-base">
                  {description}
                </p>
              </div>
              <span className="rounded bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-600">
                관리자
              </span>
            </div>
            <div className="flex flex-wrap items-start gap-3 self-start">
              {actions}
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
                                      {describeWebhookEvent(event)}
                                    </p>
                                    <p className="mt-2 break-all text-xs leading-5 text-stone-500">
                                      {event.sweetbookOrderUid
                                        ? `주문 UID ${event.sweetbookOrderUid}`
                                        : "주문 UID가 없는 이벤트예요."}
                                    </p>
                                    <p className="mt-1 text-xs text-stone-500">{fmtWebhookDate(event.createdAt)}</p>
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
            </div>
          </div>

          <nav className="mt-8 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-3xl border px-5 py-5 transition-colors ${
                    isActive
                      ? "border-brand-400 bg-brand-50/70"
                      : "border-stone-200 bg-white/90 hover:border-brand-300 hover:bg-brand-50/30"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <p className={`text-sm font-semibold ${isActive ? "text-brand-700" : "text-stone-900"}`}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-warm-500">{item.description}</p>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </section>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

function describeWebhookEvent(event: AdminWebhookEvent) {
  const typeLabel = event.eventType || "unknown";
  if (event.linked) {
    return `${typeLabel} 이벤트가 주문에 반영됐어요.`;
  }
  return `${typeLabel} 이벤트가 들어왔지만 아직 주문 연결이 없어요.`;
}

function fmtWebhookDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

function mergeWebhookEvents(current: AdminWebhookEvent[], incoming: AdminWebhookEvent[], limit: number) {
  const merged = new Map<number, AdminWebhookEvent>();

  for (const event of current) {
    merged.set(event.id, event);
  }
  for (const event of incoming) {
    merged.set(event.id, event);
  }

  return Array.from(merged.values())
    .sort((left, right) => compareWebhookEvents(left, right))
    .slice(0, limit);
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
