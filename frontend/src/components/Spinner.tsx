export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
