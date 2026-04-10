import { Link, useParams, useSearchParams } from "react-router-dom";

export default function PaymentFailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");
  const orderId = searchParams.get("orderId");

  return (
    <div className="page-shell-narrow">
      <div className="editorial-card p-8 text-center md:p-10">
        <p className="editorial-label text-red-500">결제 실패</p>
        <h1 className="mt-4 text-4xl text-brand-700">결제가 완료되지 않았습니다</h1>
        <p className="mt-4 text-base leading-8 text-stone-700">
          다시 시도할 수 있도록 배송 정보 화면으로 돌아갈게요. 실패 사유는 아래에서
          확인할 수 있습니다.
        </p>

        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/70 p-5 text-left text-sm text-red-700">
          <p>
            <span className="font-semibold">에러 코드:</span> {code ?? "알 수 없음"}
          </p>
          <p className="mt-2">
            <span className="font-semibold">메시지:</span> {message ?? "사유를 받지 못했습니다."}
          </p>
          {orderId && (
            <p className="mt-2">
              <span className="font-semibold">주문번호:</span> {orderId}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to={`/projects/${projectId}/shipping`}
            className="editorial-button-primary"
          >
            배송 정보 화면으로 돌아가기
          </Link>
          <Link to="/" className="editorial-button-secondary">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
