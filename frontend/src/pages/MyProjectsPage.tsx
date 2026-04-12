import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyProjects } from "../api/me";
import { deleteProject as deleteProjectApi } from "../api/projects";
import type { MyProjectSummary } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import {
  fulfillmentEventLabel,
  fulfillmentStatusLabel,
  projectModeLabel,
  projectStageLabel,
  siteOrderLabel,
} from "../lib/sweetbookWorkflow";

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<MyProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);

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

  async function handleDelete(project: MyProjectSummary) {
    if (!project.deletable || deletingProjectId === project.projectId) {
      return;
    }

    const confirmed = window.confirm(`"${project.editionTitle}" 프로젝트를 삭제할까요?`);
    if (!confirmed) {
      return;
    }

    setActionError("");
    setDeletingProjectId(project.projectId);
    try {
      await deleteProjectApi(project.projectId);
      setProjects((current) => current.filter((item) => item.projectId !== project.projectId));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "프로젝트를 삭제하지 못했습니다.");
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <header className="mb-16">
          <p className="editorial-label">마이 라이브러리</p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight text-brand-700 md:text-6xl">
            나의 포토북
            <br />
            <span className="italic font-normal">모아보기.</span>
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-warm-500">
            작업 중인 포토북, 미리보기 확인 중인 포토북, 주문 완료된 포토북까지 한곳에서
            관리할 수 있어요.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-warm-500">
            주문이나 결제 이력이 없는 프로젝트만 여기에서 삭제할 수 있어요.
          </p>
        </header>

        {actionError && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-600">
            {actionError}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="editorial-card px-8 py-20 text-center">
            <p className="font-headline text-3xl text-brand-700">아직 만든 포토북이 없어요</p>
            <p className="mt-4 text-sm leading-relaxed text-warm-500">
              마음에 드는 에디션을 골라 나만의 포토북을 시작하면 여기에 하나씩 쌓여요.
            </p>
            <Link to="/" className="editorial-button-primary mt-8">
              에디션 둘러보기
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
                          {projectStageLabel(featured.status)}
                        </span>
                      </div>
                      <h2 className="mt-6 text-4xl font-bold leading-tight text-brand-700">
                        {featured.editionTitle}
                      </h2>
                      <p className="mt-4 text-sm leading-relaxed text-warm-500">
                        최근 수정 {new Date(featured.updatedAt).toLocaleString("ko-KR")}
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
                      {featured.deletable && (
                        <DeleteProjectButton
                          deleting={deletingProjectId === featured.projectId}
                          onClick={() => handleDelete(featured)}
                        />
                      )}
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
                내 포토북
              </p>
              <div className="my-6 h-px w-14 bg-stone-200/80" />
              <Link to="/" className="editorial-button-link">
                새 포토북 만들기
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
                      {projectStageLabel(project.status)}
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
                    최근 수정 {new Date(project.updatedAt).toLocaleString("ko-KR")}
                  </p>

                    {project.status === "ORDERED" && (
                      <div className="mt-4 space-y-2 text-xs text-warm-500">
                        <p>{siteOrderLabel(project.siteOrderStatus) ?? "주문 상태 확인 필요"}</p>
                        <p>
                          {fulfillmentStatusLabel(project.fulfillmentStatus) ??
                            "제작 상태 확인 필요"}
                        </p>
                        {project.lastFulfillmentEvent && (
                          <p>
                            최근 이벤트: {fulfillmentEventLabel(project.lastFulfillmentEvent)}
                          </p>
                        )}
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
                    {project.deletable && (
                      <DeleteProjectButton
                        deleting={deletingProjectId === project.projectId}
                        onClick={() => handleDelete(project)}
                      />
                    )}
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

function DeleteProjectButton({
  deleting,
  onClick,
}: {
  deleting: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deleting}
      className="inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deleting ? "삭제 중..." : "삭제"}
    </button>
  );
}

