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

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <ProjectStepper current="preview" className="mb-8" />

      <h1 className="text-2xl font-bold text-stone-900 mb-2">책 미리보기</h1>
      <p className="text-sm text-stone-600 mb-8">
        <span className="text-brand-700">To. {String(preview.personalizationData?.fanNickname ?? "You")}</span>
        &nbsp;&mdash;&nbsp;{preview.edition.title}
      </p>

      {/* Book spread viewer */}
      <div className="rounded-3xl border border-stone-200 bg-white/88 overflow-hidden shadow-lg shadow-brand-100/30">
        {pages.length > 0 ? (
          <>
            {/* Main spread */}
            <div className="relative aspect-[16/10] bg-[#f7f1e8] flex items-center justify-center">
              <div className="absolute inset-0 flex">
                {/* Left page */}
                <div className="flex-1 border-r border-stone-200 bg-[#fbf7f0] p-8 flex flex-col justify-center">
                  {pages[activeSpread]?.imageUrl ? (
                    <img
                      src={pages[activeSpread].imageUrl}
                      alt=""
                      className="w-full h-full object-contain rounded"
                    />
                  ) : (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-stone-900">
                        {pages[activeSpread]?.title}
                      </p>
                      <p className="mt-2 text-sm text-stone-600 whitespace-pre-line">
                        {pages[activeSpread]?.description}
                      </p>
                    </div>
                  )}
                </div>
                {/* Right page */}
                <div className="flex-1 bg-[#fdfaf4] p-8 flex flex-col justify-center">
                  {activeSpread + 1 < pages.length ? (
                    pages[activeSpread + 1]?.imageUrl ? (
                      <img
                        src={pages[activeSpread + 1].imageUrl}
                        alt=""
                        className="w-full h-full object-contain rounded"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-lg font-semibold text-stone-900">
                          {pages[activeSpread + 1]?.title}
                        </p>
                        <p className="mt-2 text-sm text-stone-600 whitespace-pre-line">
                          {pages[activeSpread + 1]?.description}
                        </p>
                      </div>
                    )
                  ) : (
                    <p className="text-center text-stone-400 text-sm italic">
                      End of book
                    </p>
                  )}
                </div>
              </div>
              {/* Center spine */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-stone-300" />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t border-stone-200 bg-white/70 px-6 py-3">
              <button
                disabled={activeSpread <= 0}
                onClick={() =>
                  setActiveSpread((s) => Math.max(0, s - 2))
                }
                className="text-sm text-stone-500 hover:text-brand-700 disabled:opacity-30 transition-colors"
              >
                ← 이전
              </button>
              <span className="text-xs text-stone-500">
                {activeSpread + 1}–
                {Math.min(activeSpread + 2, pages.length)}{" "}
                / {pages.length} pages
              </span>
              <button
                disabled={activeSpread + 2 >= pages.length}
                onClick={() =>
                  setActiveSpread((s) =>
                    Math.min(pages.length - 1, s + 2),
                  )
                }
                className="text-sm text-stone-500 hover:text-brand-700 disabled:opacity-30 transition-colors"
              >
                다음 →
              </button>
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-stone-500 text-sm">
            미리보기 페이지가 아직 생성되지 않았습니다.
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {pages.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {pages.map((p, i) => (
            <button
              key={p.key}
              onClick={() => setActiveSpread(i % 2 === 0 ? i : i - 1)}
              className={`shrink-0 w-16 h-16 rounded border overflow-hidden transition-all ${
                i >= activeSpread && i < activeSpread + 2
                  ? "border-brand-500 ring-1 ring-brand-500"
                  : "border-stone-300 bg-white opacity-70 hover:opacity-100"
              }`}
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-100 text-[10px] text-stone-500">
                  {i + 1}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        {readOnly ? (
          <p className="text-sm text-stone-500">
            주문이 완료된 프로젝트입니다. 주문 요약과 배송 정보를 다시 확인할 수 있습니다.
          </p>
        ) : (
          <button
            onClick={() =>
              navigate(`/projects/${projectId}/personalize`)
            }
            className="text-sm text-stone-500 hover:text-brand-700 transition-colors"
          >
            ← 개인화 수정
          </button>
        )}
        {readOnly ? (
          <button
            type="button"
            onClick={() => navigate(`/projects/${projectId}/complete`)}
            className="rounded-full border border-stone-300 bg-white px-8 py-3 text-sm font-semibold text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors"
          >
            주문 요약 보기
          </button>
        ) : (
          <button
            disabled={generating}
            onClick={handleGenerate}
            className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
          >
            {generating ? "생성 중..." : "책 제작 & 주문하기 →"}
          </button>
        )}
      </div>
    </div>
  );
}
