export default function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-20 max-w-2xl rounded-lg border border-red-200/70 bg-white/95 p-8 shadow-editorial">
      <p className="editorial-label text-red-500">계속 진행할 수 없어요</p>
      <p className="mt-4 text-lg font-semibold text-stone-900">요청한 화면을 준비하지 못했습니다.</p>
      <p className="mt-3 text-sm leading-relaxed text-red-600">{message}</p>
    </div>
  );
}
