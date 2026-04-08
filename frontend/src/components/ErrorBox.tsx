export default function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg mt-20 rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
      <p className="text-red-400 text-sm">{message}</p>
    </div>
  );
}
