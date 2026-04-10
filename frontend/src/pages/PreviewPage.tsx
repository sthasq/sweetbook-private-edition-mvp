import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPreview, generateBook } from "../api/projects";
import type { ProjectPreview } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeSpread, setActiveSpread] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    getPreview(Number(projectId))
      .then(setPreview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleGenerate() {
    if (!projectId) return;
    setGenerating(true);
    try {
      await generateBook(Number(projectId));
      navigate(`/projects/${projectId}/shipping`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "책 생성 실패");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <Spinner />;
  if (error && !preview) return <ErrorBox message={error} />;
  if (!preview) return <ErrorBox message="미리보기 데이터가 없습니다." />;

  const pages = preview.pages;
  const readOnly = preview.status === "ORDERED";
  const leftPage = pages[activeSpread];
  const rightPage = pages[activeSpread + 1];
  const personalizationHighlights = Object.entries(preview.personalizationData)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .slice(0, 4);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <ProjectStepper current="preview" className="mb-10" />

        <div className="mb-14 max-w-3xl">
          <p className="editorial-label">Preview Your Archive</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight text-brand-700 md:text-7xl">
            인쇄되기 전,
            <br />
            <span className="italic font-normal">당신의 책을 마지막으로 확인합니다.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-warm-500">
            공식 콘텐츠와 개인화된 문장이 한 권으로 어떻게 섞였는지 확인한 뒤, 제작과 주문
            단계로 넘어갑니다.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <section className="lg:col-span-8">
            <div className="editorial-panel p-6 md:p-10">
              {pages.length > 0 ? (
                <div className="relative">
                  <div className="overflow-hidden rounded bg-white shadow-editorial">
                    <div className="grid min-h-[520px] md:grid-cols-2">
                      <BookPage
                        label="Official creator content"
                        page={leftPage}
                        fallbackTitle="Official content"
                      />
                      <BookPage
                        label="Your personal story"
                        page={rightPage}
                        fallbackTitle="Personalized page"
                        right
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-4">
                    <button
                      disabled={activeSpread <= 0}
                      onClick={() => setActiveSpread((current) => Math.max(0, current - 2))}
                      className="editorial-button-secondary px-4 py-2.5 disabled:opacity-40"
                    >
                      이전
                    </button>
                    <div className="rounded-full bg-white/85 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-warm-500 shadow-sm">
                      Page {activeSpread + 1} / {pages.length}
                    </div>
                    <button
                      disabled={activeSpread + 2 >= pages.length}
                      onClick={() =>
                        setActiveSpread((current) => Math.min(pages.length - 1, current + 2))
                      }
                      className="editorial-button-secondary px-4 py-2.5 disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded bg-white px-8 py-20 text-center shadow-sm">
                  <p className="font-headline text-2xl text-brand-700">
                    아직 생성된 펼침면이 없습니다.
                  </p>
                  <p className="mt-3 text-sm text-warm-500">
                    개인화 내용을 저장한 뒤 다시 미리보기를 열어 주세요.
                  </p>
                </div>
              )}
            </div>

            {pages.length > 0 && (
              <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                {pages.map((page, index) => {
                  const spreadIndex = index % 2 === 0 ? index : index - 1;
                  const selected = spreadIndex === activeSpread;
                  return (
                    <button
                      key={page.key}
                      onClick={() => setActiveSpread(spreadIndex)}
                      className={`shrink-0 overflow-hidden rounded border p-1 transition ${
                        selected
                          ? "border-brand-400 bg-white shadow-sm"
                          : "border-stone-200/70 bg-white/70 opacity-80"
                      }`}
                    >
                      {page.imageUrl ? (
                        <img
                          src={page.imageUrl}
                          alt={page.title}
                          className="h-20 w-16 object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-16 items-center justify-center bg-surface-low text-xs text-warm-500">
                          {index + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="lg:col-span-4 lg:sticky lg:top-28">
            <div className="editorial-card p-8">
              <h2 className="border-b border-stone-200/70 pb-4 text-2xl font-bold text-brand-700">
                Artifact Summary
              </h2>

              <div className="mt-6 space-y-5">
                <SummaryRow label="Edition" value={preview.edition.title} />
                <SummaryRow label="Mode" value={preview.mode.toUpperCase()} />
                <SummaryRow label="Pages prepared" value={`${pages.length} pages`} />
                <SummaryRow
                  label="Personalized for"
                  value={
                    typeof preview.personalizationData.fanNickname === "string"
                      ? preview.personalizationData.fanNickname
                      : "You"
                  }
                />
              </div>

              {personalizationHighlights.length > 0 && (
                <div className="mt-8 rounded bg-surface-low px-5 py-5">
                  <p className="editorial-label text-brand-700">Personal details</p>
                  <div className="mt-4 space-y-4">
                    {personalizationHighlights.map(([key, value]) => (
                      <div key={key}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                          {key}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-stone-900">
                          {String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-4">
                {readOnly ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${projectId}/complete`)}
                    className="editorial-button-primary w-full"
                  >
                    주문 요약 보기
                  </button>
                ) : (
                  <button
                    disabled={generating}
                    onClick={handleGenerate}
                    className="editorial-button-primary w-full disabled:opacity-50"
                  >
                    {generating ? "생성 중..." : "제작 및 주문 단계로"}
                  </button>
                )}

                {readOnly ? (
                  <p className="text-sm leading-relaxed text-warm-500">
                    주문이 완료된 프로젝트입니다. 생성된 주문 정보와 배송 요약을 다시 확인할 수
                    있습니다.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${projectId}/personalize`)}
                    className="editorial-button-link"
                  >
                    개인화 수정하기
                  </button>
                )}
              </div>

              <div className="mt-8 rounded bg-gold-400/15 px-4 py-4 text-sm text-gold-500">
                Official creator-certified archive
              </div>
            </div>
          </aside>
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function BookPage({
  label,
  page,
  fallbackTitle,
  right = false,
}: {
  label: string;
  page: ProjectPreview["pages"][number] | undefined;
  fallbackTitle: string;
  right?: boolean;
}) {
  return (
    <div
      className={`relative border-stone-200/60 p-8 md:p-10 ${
        right ? "bg-[#fffdfa] md:border-l" : "bg-white"
      }`}
    >
      <span
        className={`rounded px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
          right
            ? "bg-brand-50 text-brand-700"
            : "bg-gold-400/15 text-gold-500"
        }`}
      >
        {label}
      </span>

      {page ? (
        <>
          <h3 className="mt-8 text-2xl font-bold leading-tight text-brand-700">
            {page.title || fallbackTitle}
          </h3>
          {page.imageUrl ? (
            <img
              src={page.imageUrl}
              alt={page.title}
              className="mt-6 aspect-[4/3] w-full rounded object-cover"
            />
          ) : (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-stone-900">
              {page.description}
            </p>
          )}
          {page.imageUrl && page.description && (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-warm-500">
              {page.description}
            </p>
          )}
        </>
      ) : (
        <div className="flex h-full min-h-[360px] items-center justify-center text-sm text-warm-500">
          End of book
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">{label}</p>
      <p className="mt-2 text-sm text-stone-900">{value}</p>
    </div>
  );
}
