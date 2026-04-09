export default function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-200 bg-white/90 p-6 text-center shadow-sm shadow-red-100/40">
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}
