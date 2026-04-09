import { Link, useLocation } from "react-router-dom";

interface LocationState {
  orderUid?: string;
  totalAmount?: number;
  simulated?: boolean;
  edition?: { title?: string; creator?: { displayName?: string } };
}

export default function OrderCompletePage() {
  const { state } = useLocation() as { state: LocationState | null };
  const orderUid = state?.orderUid ?? "N/A";
  const totalAmount = state?.totalAmount;
  const simulated = state?.simulated ?? false;
  const editionTitle = state?.edition?.title ?? "Private Edition";
  const creatorName = state?.edition?.creator?.displayName;

  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      {/* Checkmark */}
      <div className="mx-auto w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center mb-8">
        <svg
          className="w-10 h-10 text-brand-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-stone-900 mb-3">
        {simulated ? "데모 주문 완료" : "주문 완료!"}
      </h1>
      <p className="text-stone-600 mb-8">
        {creatorName && (
          <span className="text-brand-700">{creatorName}</span>
        )}{" "}
        {editionTitle}{" "}
        {simulated
          ? "주문을 시뮬레이션으로 처리했습니다."
          : "주문이 정상적으로 접수되었습니다."}
      </p>

      <div className="rounded-2xl border border-stone-200 bg-white/88 p-6 text-left space-y-3 mb-8 shadow-sm shadow-brand-100/30">
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">주문번호</span>
          <span className="font-mono text-stone-900">{orderUid}</span>
        </div>
        {totalAmount != null && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">결제 금액</span>
            <span className="font-semibold text-brand-700">
              {totalAmount.toLocaleString()}원
            </span>
          </div>
        )}
      </div>

      {simulated && (
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
          <p className="text-sm font-semibold text-amber-200">실제 Sweetbook 주문에는 반영되지 않았습니다.</p>
          <p className="mt-1 text-xs text-amber-100/80">
            현재 백엔드에서 Sweetbook HTTPS 인증서 검증이 실패해 시뮬레이션 응답으로 대체된 상태입니다.
          </p>
        </div>
      )}

      <p className="text-xs text-stone-500 mb-8">
        {simulated
          ? "실제 주문 반영 여부는 Sweetbook 연동 오류를 해결한 뒤 다시 확인해야 합니다."
          : "인쇄 및 배송에는 영업일 기준 5~7일이 소요됩니다."}
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
