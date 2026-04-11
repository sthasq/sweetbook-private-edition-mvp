import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const STUDIO_NAV_ITEMS = [
  {
    to: "/studio/orders",
    label: "주문 대시보드",
    description: "팬 주문과 배송 상태를 확인해요.",
  },
  {
    to: "/studio/editions/new",
    label: "에디션 제작",
    description: "새 에디션을 만들고 공개해요.",
  },
] as const;

export default function StudioShell({
  title,
  description,
  meta,
  actions,
  children,
}: {
  title: string;
  description: string;
  meta?: ReactNode;
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
                <p className="editorial-label">스튜디오</p>
                <h1 className="mt-3 text-4xl font-bold text-brand-700 md:text-5xl">
                  크리에이터 스튜디오
                </h1>
                <p className="mt-4 text-lg font-semibold text-stone-900 md:text-xl">{title}</p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-warm-500 md:text-base">
                  {description}
                </p>
              </div>
              <span className="rounded bg-gold-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500">
                크리에이터
              </span>
              {meta}
            </div>
            {actions && <div className="flex flex-wrap gap-3 self-start">{actions}</div>}
          </div>

          <nav className="mt-8 grid gap-3 md:grid-cols-2">
            {STUDIO_NAV_ITEMS.map((item) => (
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
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={`text-lg font-semibold ${
                          isActive ? "text-brand-700" : "text-stone-900"
                        }`}
                      >
                        {item.label}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          isActive
                            ? "bg-white text-brand-700"
                            : "bg-surface-low text-warm-500"
                        }`}
                      >
                        {isActive ? "현재 화면" : "바로가기"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-warm-500">{item.description}</p>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl bg-surface-low px-4 py-4 text-sm text-warm-500">
            주문 관리와 에디션 제작을 분리해서 더 빠르고 편하게 작업할 수 있어요.
          </div>
        </section>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
