import { Link, useLocation } from "react-router-dom";

interface LocationState {
  orderUid?: string;
  totalAmount?: number;
  edition?: { title?: string; creator?: { displayName?: string } };
}

export default function OrderCompletePage() {
  const { state } = useLocation() as { state: LocationState | null };
  const orderUid = state?.orderUid ?? "N/A";
  const totalAmount = state?.totalAmount;
  const editionTitle = state?.edition?.title ?? "Private Edition";
  const creatorName = state?.edition?.creator?.displayName;

  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      {/* Checkmark */}
      <div className="mx-auto w-20 h-20 rounded-full bg-brand-600/20 flex items-center justify-center mb-8">
        <svg
          className="w-10 h-10 text-brand-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-white mb-3">주문 완료!</h1>
      <p className="text-neutral-400 mb-8">
        {creatorName && (
          <span className="text-brand-400">{creatorName}</span>
        )}{" "}
        {editionTitle} 주문이 정상적으로 접수되었습니다.
      </p>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-left space-y-3 mb-8">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">주문번호</span>
          <span className="font-mono text-white">{orderUid}</span>
        </div>
        {totalAmount != null && (
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">결제 금액</span>
            <span className="font-semibold text-brand-400">
              {totalAmount.toLocaleString()}원
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-500 mb-8">
        인쇄 및 배송에는 영업일 기준 5~7일이 소요됩니다.
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
