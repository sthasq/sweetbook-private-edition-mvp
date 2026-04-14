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

const WEBHOOK_TOAST_MS = 9_000;

type WebhookToast = {
  toastId: string;
  event: AdminWebhookEvent;
};

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
  const [webhookToasts, setWebhookToasts] = useState<WebhookToast[]>([]);
  const toastTimersRef = useRef<number[]>([]);

  useEffect(() => {
    const closeStream = openAdminWebhookStream((event) => {
      setWebhookToasts((current) => {
        const seenEventIds = new Set(current.map((toast) => toast.event.id));
        if (seenEventIds.has(event.id)) {
          return current;
        }

        const next = [
          ...current,
          {
            toastId: `${event.id}-${Date.now()}`,
            event,
          },
        ];

        const timer = window.setTimeout(() => {
          setWebhookToasts((items) => items.filter((item) => item.event.id !== event.id));
        }, WEBHOOK_TOAST_MS);
        toastTimersRef.current.push(timer);

        return next.slice(-4);
      });
    });

    return () => {
      closeStream();
      for (const timer of toastTimersRef.current) {
        window.clearTimeout(timer);
      }
      toastTimersRef.current = [];
    };
  }, []);

  return (
    <div className="studio-page page-shell">
      <div className="mx-auto max-w-screen-2xl">
        {webhookToasts.length > 0 ? (
          <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,26rem)] flex-col gap-3">
            {webhookToasts.map((toast) => (
              <article
                key={toast.toastId}
                className="pointer-events-auto rounded-3xl border border-emerald-200 bg-white/95 p-4 shadow-[0_24px_60px_-28px_rgba(5,150,105,0.38)] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                      새 Webhook 이벤트
                    </p>
                    <p className="mt-2 text-sm font-semibold text-stone-900">
                      {describeWebhookEvent(toast.event)}
                    </p>
                    <p className="mt-2 text-xs text-stone-500">
                      {toast.event.sweetbookOrderUid
                        ? `주문 UID ${toast.event.sweetbookOrderUid}`
                        : "주문 UID가 없는 이벤트예요."}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {fmtWebhookDate(toast.event.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWebhookToasts((items) => items.filter((item) => item.toastId !== toast.toastId))}
                    className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-200 hover:text-stone-700"
                  >
                    닫기
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      toast.event.linked
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {toast.event.linked ? "주문 연결 완료" : "주문 미연결"}
                  </span>
                  <Link
                    to="/admin/webhooks"
                    className="text-xs font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 transition hover:decoration-brand-500"
                  >
                    로그 보기
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}

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
            {actions && <div className="flex flex-wrap gap-3 self-start">{actions}</div>}
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
