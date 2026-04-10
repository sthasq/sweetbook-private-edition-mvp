import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrderSummary } from "../api/projects";
import type { ProjectOrderSummary } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";

function siteOrderLabel(status: string) {
  switch (status) {
    case "CREATED":
      return "주문 접수됨";
    case "PAID":
      return "주문 확정";
    case "CANCELLED":
      return "주문 취소";
    default:
      return status;
  }
}

function fulfillmentLabel(status: string) {
  switch (status) {
    case "PENDING_SUBMISSION":
      return "제작 대기";
    case "SUBMITTED":
      return "제작 접수 완료";
    case "SIMULATED":
      return "데모 처리";
    case "FAILED":
      return "제작 요청 실패";
    case "CANCELLED":
      return "제작 취소";
    default:
      return status;
  }
}

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
    <div className="page-shell-narrow">
      <ProjectStepper current="complete" className="mb-10" />

      <div className="text-center">
        <p className="editorial-label">주문 완료</p>
        <div className="mx-auto mb-8 mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100/70">
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

        <h1 className="text-3xl text-brand-700 md:text-5xl">
          {summary.simulated ? "데모 주문 접수 완료" : "주문이 접수되었습니다"}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-stone-700">
          <span className="text-brand-700">{creatorName}</span>의{" "}
          <span className="font-medium text-stone-900">{editionTitle}</span>
          {summary.simulated
            ? " 주문을 시뮬레이션으로 저장했습니다."
            : " 주문과 배송 준비가 시작되었습니다."}
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="editorial-card p-6 md:p-8">
          <p className="editorial-label">주문 접수</p>
          <h2 className="mt-3 text-2xl text-stone-900">주문 정보</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">주문번호</span>
              <span className="font-mono text-stone-900">{summary.siteOrderUid}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">주문 상태</span>
              <span className="font-medium text-stone-900">
                {siteOrderLabel(summary.siteOrderStatus)}
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

        <section className="editorial-card p-6 md:p-8">
          <p className="editorial-label">제작 진행</p>
          <h2 className="mt-3 text-2xl text-stone-900">제작 진행 정보</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">진행 상태</span>
              <span className="font-medium text-stone-900">
                {fulfillmentLabel(summary.fulfillmentStatus)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">제작 번호</span>
              <span className="max-w-[14rem] break-all text-right font-mono text-stone-900">
                {summary.fulfillmentOrderUid ?? "아직 발급되지 않음"}
              </span>
            </div>
          </div>
        </section>

        <section className="editorial-panel p-6 md:p-8 lg:col-span-2">
          <p className="editorial-label">받는 곳</p>
          <h2 className="mt-3 text-2xl text-stone-900">받는 곳 정보</h2>
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
        <div className="mt-6 rounded-sm border border-amber-300/80 bg-amber-50/70 p-5">
          <p className="text-sm font-semibold text-amber-800">
            주문은 저장됐고, 제작 연결은 데모로 처리됐습니다.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            실제 제작은 아직 들어가지 않았고, 주문 흐름만 미리 확인할 수 있는 상태예요.
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
          className="editorial-button-primary"
        >
          내 프로젝트 보기
        </Link>
        <Link
          to="/"
          className="editorial-button-secondary"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
