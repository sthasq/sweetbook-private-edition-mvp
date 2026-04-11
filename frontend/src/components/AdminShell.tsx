import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const ADMIN_NAV_ITEMS = [
  { to: "/admin/dashboard", label: "대시보드", description: "플랫폼 매출과 수수료 현황을 확인해요." },
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
