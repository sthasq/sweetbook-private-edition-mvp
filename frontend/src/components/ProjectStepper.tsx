import { Link } from "react-router-dom";

type StepKey = "edition" | "personalize" | "preview" | "shipping" | "complete";

interface ProjectStepperProps {
  current: StepKey;
  className?: string;
  projectId?: string;
}

const STEPS = [
  {
    key: "edition",
    number: "01",
    label: "에디션 선택",
    description: "마음에 드는 에디션 고르기",
  },
  {
    key: "personalize",
    number: "02",
    label: "LLM 개인화",
    description: "질문에 답하고 제안 받기",
  },
  {
    key: "preview",
    number: "03",
    label: "미리보기",
    description: "완성된 포토북 확인하기",
  },
  {
    key: "shipping",
    number: "04",
    label: "배송 · 결제",
    description: "배송지 입력 후 주문하기",
  },
] as const;

export default function ProjectStepper({
  current,
  className = "",
  projectId,
}: ProjectStepperProps) {
  const activeIndex =
    current === "complete"
      ? STEPS.length
      : STEPS.findIndex((step) => step.key === current);
  const statusLabel =
    current === "complete"
      ? "주문 완료"
      : `${STEPS[Math.max(activeIndex, 0)]?.label ?? "진행"} 단계`;

  const getStepLink = (stepKey: StepKey) => {
    if (!projectId) return undefined;
    switch (stepKey) {
      case "edition":
        return `/editions`; // Assuming they go back to list or need project edition detail, but returning to list is safe if no project edition context
      case "personalize":
        return `/projects/${projectId}/personalization`;
      case "preview":
        return `/projects/${projectId}/preview`;
      case "shipping":
        return `/projects/${projectId}/checkout`;
      default:
        return undefined;
    }
  };

  return (
    <section
      className={`editorial-card overflow-hidden p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/60 pb-4">
        <div>
          <p className="editorial-label">주문 과정</p>
          <p className="mt-2 text-sm text-warm-500">{statusLabel}</p>
        </div>
        <div className="h-px min-w-24 flex-1 bg-stone-200/70" />
        <p className="font-headline text-lg italic text-brand-700">
          {current === "complete" ? "주문 완료" : STEPS[Math.max(activeIndex, 0)]?.label}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = current !== "complete" && index === activeIndex;
          const href = isCompleted ? getStepLink(step.key as StepKey) : undefined;

          const StepContent = (
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-700 text-white"
                    : isCompleted
                      ? "bg-success-600 text-white group-hover:bg-success-700"
                      : "border border-stone-200 bg-white text-warm-500"
                }`}
              >
                {isCompleted ? "✓" : step.number}
              </span>
              <div>
                <p
                  className={`text-sm font-semibold transition-colors ${
                    isActive
                      ? "text-brand-700"
                    : isCompleted
                        ? "text-success-600 group-hover:text-success-700 underline-offset-2 group-hover:underline"
                        : "text-stone-800"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-warm-500">{step.description}</p>
              </div>
            </div>
          );

          const classNameStr = `rounded border p-4 transition-colors group ${
            isActive
              ? "border-brand-300 bg-brand-50/60"
              : isCompleted
                ? "border-success-200 bg-success-50/80 hover:bg-success-100/60 cursor-pointer"
                : "border-stone-200/70 bg-surface-low"
          }`;

          return href ? (
            <Link key={step.key} to={href} className={classNameStr}>
              {StepContent}
            </Link>
          ) : (
            <div key={step.key} className={classNameStr}>
              {StepContent}
            </div>
          );
        })}
      </div>
    </section>
  );
}
