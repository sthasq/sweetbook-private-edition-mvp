export default function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-brand-400 ${className}`}
      title="Verified Creator"
    >
      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
        <path d="M10 0l2.5 3.2 4-.8-1.2 3.9L18 10l-2.7 3.7 1.2 3.9-4-.8L10 20l-2.5-3.2-4 .8 1.2-3.9L2 10l2.7-3.7-1.2-3.9 4 .8z" />
        <path d="M8.5 12.5l-2-2 1-1 1 1 3.5-3.5 1 1z" fill="white" />
      </svg>
    </span>
  );
}
