import { useEffect, useState } from "react";

export default function Spinner({
  className = "",
  delayMs = 260,
}: {
  className?: string;
  delayMs?: number;
}) {
  const [visible, setVisible] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) {
      setVisible(true);
      return;
    }

    setVisible(false);
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs]);

  if (!visible) {
    return <div className={`py-20 ${className}`} aria-hidden="true" />;
  }

  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <div className="flex items-center gap-4 rounded-lg bg-white/80 px-6 py-4 shadow-editorial">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        <p className="text-sm text-warm-500">아카이브를 불러오는 중입니다.</p>
      </div>
    </div>
  );
}
