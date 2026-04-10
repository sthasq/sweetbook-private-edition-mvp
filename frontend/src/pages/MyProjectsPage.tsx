import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyProjects } from "../api/me";
import type { MyProjectSummary } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "개인화 작성 중";
    case "PERSONALIZED":
      return "미리보기 준비";
    case "BOOK_CREATED":
    case "FINALIZED":
      return "주문 단계";
    case "ORDERED":
      return "주문 완료";
    default:
      return status;
  }
}

function siteOrderLabel(status: string | null) {
  switch (status) {
    case "CREATED":
      return "사이트 주문 생성됨";
    case "PAID":
      return "사이트 주문 확정";
    case "CANCELLED":
      return "사이트 주문 취소";
    default:
      return status;
  }
}

function fulfillmentLabel(status: string | null) {
  switch (status) {
    case "PENDING_SUBMISSION":
      return "Sweetbook 발주 대기";
    case "SUBMITTED":
      return "Sweetbook 발주 완료";
    case "SIMULATED":
      return "Sweetbook 데모 발주";
    case "FAILED":
      return "Sweetbook 발주 실패";
    case "CANCELLED":
      return "Sweetbook 발주 취소";
    default:
      return status;
  }
}

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<MyProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-400">
            My Projects
          </p>
          <h1 className="mt-3 text-3xl font-bold text-stone-900">
            저장된 개인화 프로젝트
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            마지막으로 작업한 단계에서 바로 이어서 진행할 수 있습니다.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white/75 px-8 py-16 text-center">
          <p className="text-lg font-semibold text-stone-900">
            아직 저장된 프로젝트가 없습니다
          </p>
          <p className="mt-2 text-sm text-stone-600">
            Official Edition을 고른 뒤 개인화 프로젝트를 시작해보세요.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            에디션 보러가기
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-4">
          {projects.map((project) => (
            <div
              key={project.projectId}
              className="rounded-3xl border border-stone-200 bg-white/85 p-6 shadow-sm shadow-brand-100/30"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-gold-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
                      {project.mode}
                    </span>
                    <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-[11px] font-medium text-stone-600">
                      {statusLabel(project.status)}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-stone-900">
                    {project.editionTitle}
                  </h2>
                  <p className="mt-2 text-sm text-stone-600">
                    마지막 업데이트:{" "}
                    {new Date(project.updatedAt).toLocaleString("ko-KR")}
                  </p>
                  {project.status === "ORDERED" && (
                    <div className="mt-3 flex flex-col gap-2 text-xs text-stone-600">
                      <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 w-fit">
                        {siteOrderLabel(project.siteOrderStatus) ?? "사이트 주문 상태 확인 필요"}
                      </span>
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 w-fit">
                        {fulfillmentLabel(project.fulfillmentStatus) ?? "Sweetbook 연동 상태 확인 필요"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Link
                    to={`/editions/${project.editionId}`}
                    className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-brand-400 hover:text-brand-700"
                  >
                    에디션 보기
                  </Link>
                  <Link
                    to={project.continuePath}
                    className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
                  >
                    이어서 진행
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
