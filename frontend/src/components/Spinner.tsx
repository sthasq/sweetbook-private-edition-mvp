export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <div className="flex items-center gap-4 rounded-lg bg-white/80 px-6 py-4 shadow-editorial">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        <p className="text-sm text-warm-500">아카이브를 불러오는 중입니다.</p>
      </div>
    </div>
  );
}
