import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrderSummary } from "../api/projects";
import type { ProjectOrderSummary } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";

export default function OrderCompletePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const missingProjectId = !projectId;
  const [summary, setSummary] = useState<ProjectOrderSummary | null>(null);
  const [loading, setLoading] = useState(!missingProjectId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (missingProjectId) {
      return;
    }

    getOrderSummary(Number(projectId))
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [missingProjectId, projectId]);

  if (missingProjectId) return <ErrorBox message="주문 프로젝트 정보를 찾을 수 없습니다." />;
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  if (!summary) return <ErrorBox message="주문 요약을 불러올 수 없습니다." />;

  const creatorName = summary.edition.creator.displayName;
  const editionTitle = summary.edition.title;
  const orderedAt = new Date(summary.orderedAt).toLocaleString("ko-KR");
  const fullAddress = [summary.shipping.address1, summary.shipping.address2]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <ProjectStepper current="complete" className="mb-10" />

      <div className="text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
          <svg
            className="h-10 w-10 text-brand-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-stone-900 mb-3">
          {summary.simulated ? "데모 주문 접수 완료" : "주문이 접수되었습니다"}
        </h1>
        <p className="text-stone-600">
          <span className="text-brand-700">{creatorName}</span>의{" "}
          <span className="font-medium text-stone-900">{editionTitle}</span>
          {summary.simulated
            ? " 주문을 시뮬레이션으로 저장했습니다."
            : " 주문과 배송 준비가 시작되었습니다."}
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30">
          <h2 className="text-sm font-semibold text-stone-900">주문 정보</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">주문번호</span>
              <span className="font-mono text-stone-900">{summary.orderUid}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">주문 상태</span>
              <span className="font-medium text-stone-900">
                {summary.orderStatus}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">결제 금액</span>
              <span className="font-semibold text-brand-700">
                {summary.totalAmount.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">주문 시각</span>
              <span className="text-right text-stone-900">{orderedAt}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30">
          <h2 className="text-sm font-semibold text-stone-900">배송 정보</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">받는 분</span>
              <span className="text-stone-900">{summary.shipping.recipientName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">연락처</span>
              <span className="text-stone-900">{summary.shipping.recipientPhone}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">우편번호</span>
              <span className="text-stone-900">{summary.shipping.postalCode}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">배송지</span>
              <span className="max-w-[16rem] text-right text-stone-900">
                {fullAddress}
              </span>
            </div>
          </div>
        </section>
      </div>

      {summary.simulated && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-800">
            현재 주문은 데모 모드로 저장되었습니다.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Sweetbook 실주문 연동이 비활성화되어 있어 실제 주문 시스템에는 반영되지 않았습니다.
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-stone-500">
        {summary.simulated
          ? "실제 주문 반영이 필요하면 Sweetbook API 키와 연동 환경을 설정한 뒤 다시 주문을 진행해야 합니다."
          : "인쇄 및 배송에는 영업일 기준 5~7일이 소요될 수 있습니다."}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/me/projects"
          className="inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
        >
          내 프로젝트 보기
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-8 py-3 text-sm font-semibold text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
