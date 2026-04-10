export default function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm bg-gold-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-500 ${className}`}
      title="인증된 크리에이터"
    >
      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
        <path d="M10 0l2.5 3.2 4-.8-1.2 3.9L18 10l-2.7 3.7 1.2 3.9-4-.8L10 20l-2.5-3.2-4 .8 1.2-3.9L2 10l2.7-3.7-1.2-3.9 4 .8z" />
        <path d="M8.5 12.5l-2-2 1-1 1 1 3.5-3.5 1 1z" fill="white" />
      </svg>
      <span>인증됨</span>
    </span>
  );
}
