type StepKey = "edition" | "personalize" | "preview" | "shipping" | "complete";

interface ProjectStepperProps {
  current: StepKey;
  className?: string;
}

const STEPS = [
  {
    key: "edition",
    number: "01",
    label: "에디션 선택",
    description: "Official Edition 고르기",
  },
  {
    key: "personalize",
    number: "02",
    label: "개인화",
    description: "팬 정보와 추억 입력",
  },
  {
    key: "preview",
    number: "03",
    label: "미리보기",
    description: "합쳐진 책 구성 확인",
  },
  {
    key: "shipping",
    number: "04",
    label: "배송/주문",
    description: "배송지 입력과 주문 확정",
  },
] as const;

export default function ProjectStepper({
  current,
  className = "",
}: ProjectStepperProps) {
  const activeIndex =
    current === "complete"
      ? STEPS.length
      : STEPS.findIndex((step) => step.key === current);
  const statusLabel =
    current === "complete"
      ? "주문 완료"
      : `${STEPS[Math.max(activeIndex, 0)]?.label ?? "진행"} 단계`;

  return (
    <section
      className={`rounded-3xl border border-stone-200 bg-white/80 p-5 shadow-sm shadow-brand-100/30 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-gold-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
          Private Edition Flow
        </span>
        <span className="text-xs font-medium text-stone-500">{statusLabel}</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = current !== "complete" && index === activeIndex;

          return (
            <div
              key={step.key}
              className={`rounded-2xl border p-4 transition-colors ${
                isActive
                  ? "border-brand-300 bg-brand-50/70"
                  : isCompleted
                    ? "border-emerald-200 bg-emerald-50/80"
                    : "border-stone-200 bg-stone-50/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-stone-500 border border-stone-200"
                  }`}
                >
                  {isCompleted ? "✓" : step.number}
                </span>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isActive
                        ? "text-brand-700"
                        : isCompleted
                          ? "text-emerald-700"
                          : "text-stone-700"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-stone-500">{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
