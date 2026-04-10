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
      className={`editorial-card overflow-hidden p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/60 pb-4">
        <div>
          <p className="editorial-label">Private Edition Flow</p>
          <p className="mt-2 text-sm text-warm-500">{statusLabel}</p>
        </div>
        <div className="h-px min-w-24 flex-1 bg-stone-200/70" />
        <p className="font-headline text-lg italic text-brand-700">
          {current === "complete" ? "Order archived" : STEPS[Math.max(activeIndex, 0)]?.label}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = current !== "complete" && index === activeIndex;

          return (
            <div
              key={step.key}
              className={`rounded border p-4 transition-colors ${
                isActive
                  ? "border-brand-300 bg-brand-50/60"
                  : isCompleted
                    ? "border-success-200 bg-success-50/80"
                    : "border-stone-200/70 bg-surface-low"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-brand-700 text-white"
                      : isCompleted
                        ? "bg-success-600 text-white"
                        : "border border-stone-200 bg-white text-warm-500"
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
                          ? "text-success-600"
                          : "text-stone-800"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-warm-500">{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
