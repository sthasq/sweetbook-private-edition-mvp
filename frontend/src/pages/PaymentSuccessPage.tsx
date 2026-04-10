import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { confirmPayment } from "../api/projects";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = Number(searchParams.get("amount"));
  const initialError = !projectId
    ? "결제 프로젝트 정보를 찾을 수 없습니다."
    : !paymentKey || !orderId || Number.isNaN(amount) || amount <= 0
      ? "결제 승인에 필요한 정보가 누락되었습니다."
      : "";
  const [error, setError] = useState(initialError);

  useEffect(() => {
    if (initialError || !projectId || !paymentKey || !orderId || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    let cancelled = false;

    void confirmPayment(Number(projectId), { paymentKey, orderId, amount })
      .then(() => {
        if (!cancelled) {
          navigate(`/projects/${projectId}/complete`, { replace: true });
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "결제 승인에 실패했습니다.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [amount, initialError, navigate, orderId, paymentKey, projectId]);

  if (error) {
    return (
      <div className="page-shell-narrow">
        <ErrorBox message={error} />
        <div className="mt-8 flex justify-center">
          <Link to={`/projects/${projectId}/shipping`} className="editorial-button-primary">
            배송 정보 화면으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell-narrow text-center">
      <p className="editorial-label">결제 승인 중</p>
      <h1 className="mt-4 text-4xl text-brand-700">결제를 확인하고 있어요</h1>
      <p className="mt-4 text-base leading-8 text-stone-700">
        토스 결제가 성공적으로 돌아왔는지 서버에서 마지막으로 검증하는 중입니다.
      </p>
      <div className="mt-10">
        <Spinner />
      </div>
    </div>
  );
}
