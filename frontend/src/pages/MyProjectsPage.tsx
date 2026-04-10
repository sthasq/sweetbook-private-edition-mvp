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
      return "주문 접수됨";
    case "PAID":
      return "주문 확정";
    case "CANCELLED":
      return "주문 취소";
    default:
      return status;
  }
}

function fulfillmentLabel(status: string | null) {
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

  const featured = projects[0];
  const remainder = projects.slice(1);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <header className="mb-16">
          <p className="editorial-label">내 프로젝트</p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight text-brand-700 md:text-6xl">
            저장해 둔 프로젝트를
            <br />
            <span className="italic font-normal">다시 펼쳐 보는 공간.</span>
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-warm-500">
            작업 중인 개인화 초안, 주문 직전의 미리보기, 이미 보관된 주문 기록까지 한 곳에서
            이어서 관리합니다.
          </p>
        </header>

        {projects.length === 0 ? (
          <div className="editorial-card px-8 py-20 text-center">
            <p className="font-headline text-3xl text-brand-700">아직 저장된 프로젝트가 없습니다.</p>
            <p className="mt-4 text-sm leading-relaxed text-warm-500">
              드롭을 고르고 프로젝트를 시작하면 여기에 내 작업이 하나씩 쌓이기 시작합니다.
            </p>
            <Link to="/" className="editorial-button-primary mt-8">
              에디션 보러가기
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-12">
            {featured && (
              <article className="editorial-panel overflow-hidden p-8 md:col-span-8 md:p-10">
                <div className="grid h-full gap-8 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded bg-gold-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500">
                          {projectModeLabel(featured.mode)}
                        </span>
                        <span className="rounded bg-white/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-warm-500">
                          {statusLabel(featured.status)}
                        </span>
                      </div>
                      <h2 className="mt-6 text-4xl font-bold leading-tight text-brand-700">
                        {featured.editionTitle}
                      </h2>
                      <p className="mt-4 text-sm leading-relaxed text-warm-500">
                        마지막 업데이트: {new Date(featured.updatedAt).toLocaleString("ko-KR")}
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4">
                      <Link to={featured.continuePath} className="editorial-button-primary">
                        이어서 진행
                      </Link>
                      <Link
                        to={`/editions/${featured.editionId}`}
                        className="editorial-button-secondary"
                      >
                        에디션 보기
                      </Link>
                    </div>
                  </div>

                  <div className="relative min-h-[260px]">
                    <div className="absolute inset-0 rotate-2 rounded bg-white/70 shadow-sm" />
                    <div className="absolute inset-0 -rotate-2 overflow-hidden rounded bg-white p-3 shadow-editorial">
                      <img
                        src={featured.editionCoverImageUrl || "/demo-assets/playpick-hero.svg"}
                        alt={featured.editionTitle}
                        className="h-full w-full rounded object-cover"
                      />
                    </div>
                  </div>
                </div>
              </article>
            )}

            <aside className="editorial-card flex flex-col items-center justify-center px-8 py-12 text-center md:col-span-4">
              <p className="text-5xl font-bold text-brand-700">{projects.length}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">
                저장된 프로젝트
              </p>
              <div className="my-6 h-px w-14 bg-stone-200/80" />
              <Link to="/" className="editorial-button-link">
                새 에디션 시작하기
              </Link>
            </aside>

            {remainder.map((project) => (
              <article
                key={project.projectId}
                className="editorial-card flex h-full flex-col overflow-hidden p-6 md:col-span-4"
              >
                <div className="relative overflow-hidden rounded bg-surface-low p-3">
                  <img
                    src={project.editionCoverImageUrl || "/demo-assets/playpick-hero.svg"}
                    alt={project.editionTitle}
                    className="aspect-[3/4] w-full rounded object-cover"
                  />
                  <div className="absolute right-6 top-6 rounded bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                    {statusLabel(project.status)}
                  </div>
                </div>

                <div className="mt-6 flex flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-gold-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-500">
                      {projectModeLabel(project.mode)}
                    </span>
                    {project.status === "ORDERED" && (
                      <span className="rounded bg-brand-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                        보관됨
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-2xl font-bold leading-tight text-brand-700">
                    {project.editionTitle}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-warm-500">
                    마지막 업데이트: {new Date(project.updatedAt).toLocaleString("ko-KR")}
                  </p>

                  {project.status === "ORDERED" && (
                    <div className="mt-4 space-y-2 text-xs text-warm-500">
                      <p>{siteOrderLabel(project.siteOrderStatus) ?? "주문 상태 확인 필요"}</p>
                      <p>
                        {fulfillmentLabel(project.fulfillmentStatus) ??
                          "제작 상태 확인 필요"}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-200/70 pt-5">
                    <Link to={project.continuePath} className="editorial-button-primary px-4 py-2.5">
                      이어서 진행
                    </Link>
                    <Link
                      to={`/editions/${project.editionId}`}
                      className="editorial-button-secondary px-4 py-2.5"
                    >
                      에디션 보기
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function projectModeLabel(mode: string) {
  switch (mode.toUpperCase()) {
    case "DEMO":
      return "데모";
    case "YOUTUBE":
      return "YouTube 연동";
    default:
      return mode;
  }
}
