import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { finalizeBook, generateBook, getPreview } from "../api/projects";
import { getSweetbookIntegrationStatus } from "../api/sweetbook";
import type { ProjectPreview } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";
import type { SweetbookIntegrationStatus } from "../types/api";
import {
  estimateEditionPricing,
  integrationTone,
  projectModeLabel,
  projectStageLabel,
} from "../lib/sweetbookWorkflow";

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [activeSpread, setActiveSpread] = useState(0);
  const [integrationStatus, setIntegrationStatus] =
    useState<SweetbookIntegrationStatus | null>(null);

  useEffect(() => {
    if (!projectId) return;
    getPreview(Number(projectId))
      .then(setPreview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    getSweetbookIntegrationStatus()
      .then(setIntegrationStatus)
      .catch(() => setIntegrationStatus(null));
  }, []);

  async function handlePrimaryAction() {
    if (!projectId) return;
    if (preview && preview.status === "FINALIZED") {
      navigate(`/projects/${projectId}/shipping`);
      return;
    }
    if (preview?.status === "BOOK_CREATED") {
      setFinalizing(true);
      try {
        await finalizeBook(Number(projectId));
        const nextPreview = await getPreview(Number(projectId));
        setPreview(nextPreview);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "인쇄 확정에 실패했어요. 다시 시도해주세요.");
      } finally {
        setFinalizing(false);
      }
      return;
    }

    setGenerating(true);
    try {
      await generateBook(Number(projectId));
      const nextPreview = await getPreview(Number(projectId));
      setPreview(nextPreview);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "포토북 생성에 실패했어요. 다시 시도해주세요.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <Spinner />;
  if (error && !preview) return <ErrorBox message={error} />;
  if (!preview) return <ErrorBox message="포토북 정보를 불러올 수 없어요." />;

  const pages = preview.pages;
  const readOnly = preview.status === "ORDERED";
  const leftPage = pages[activeSpread];
  const rightPage = pages[activeSpread + 1];
  const personalizationHighlights = buildPersonalizationHighlights(preview);
  const collabImageUrl = readString(preview.personalizationData.aiCollabSelectedUrl);
  const collabTemplateLabel = readString(preview.personalizationData.aiCollabTemplateLabel);
  const pricingHint = estimateEditionPricing(preview.edition.snapshot?.bookSpecUid);
  const primaryActionLabel =
    preview.status === "BOOK_CREATED"
      ? finalizing
        ? "인쇄 확정 중…"
        : "인쇄용으로 확정하기"
      : preview.status === "FINALIZED"
        ? "배송 · 결제로 이동"
        : generating
          ? "포토북 만드는 중…"
          : "포토북 만들기";

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <ProjectStepper current="preview" className="mb-8" />

        <div className="mb-5 max-w-lg">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-brand-700 md:text-3xl">
            포토북 미리보기
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-warm-500">
            완성된 포토북을 페이지별로 확인하고, 마음에 들면 주문을 진행하세요.
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
                        page={leftPage}
                        fallbackTitle="크리에이터가 구성한 페이지"
                      />
                      <BookPage
                        page={rightPage}
                        fallbackTitle="내가 채운 페이지"
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
                      {activeSpread + 1}–{Math.min(activeSpread + 2, pages.length)} / {pages.length}p
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
                    아직 포토북이 만들어지지 않았어요
                  </p>
                  <p className="mt-3 text-sm text-warm-500">
                    개인화를 완료한 뒤, 아래 '포토북 만들기' 버튼을 눌러주세요.
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
                포토북 요약
              </h2>

              <div className="mt-6 space-y-5">
                <SummaryRow label="현재 단계" value={projectStageLabel(preview.status)} />
                <SummaryRow label="에디션" value={preview.edition.title} />
                <SummaryRow label="제작 방식" value={projectModeLabel(preview.mode)} />
                <SummaryRow label="총 페이지" value={`${pages.length}p`} />
                <SummaryRow
                  label="예상 가격"
                  value={`${pricingHint.productPrice.toLocaleString("ko-KR")}원~`}
                />
                <SummaryRow
                  label="주인공"
                  value={
                    typeof preview.personalizationData.fanNickname === "string"
                      ? preview.personalizationData.fanNickname
                      : "나"
                  }
                />
              </div>

              {integrationStatus && (
                <div className="mt-6 rounded bg-surface-low px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="editorial-label text-brand-700">제작 연동</p>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${integrationTone(integrationStatus)}`}>
                      {integrationStatus.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-warm-500">
                    {integrationStatus.mode === "SIMULATED"
                      ? "체험 모드에서는 실제 인쇄 없이 전체 흐름을 미리 확인할 수 있어요."
                      : "포토북 생성 후 인쇄 확정까지 완료하면 주문할 수 있어요."}
                  </p>
                </div>
              )}

              {personalizationHighlights.length > 0 && (
                <div className="mt-8 rounded bg-surface-low px-5 py-5">
                  <p className="editorial-label text-brand-700">내가 채운 내용</p>
                  <div className="mt-4 space-y-4">
                    {personalizationHighlights.map((item) => (
                      <div key={item.key}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-stone-900">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {collabImageUrl && (
                <div className="mt-8 rounded bg-white/85 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="editorial-label text-brand-700">콜라보 이미지</p>
                      <p className="mt-2 text-sm text-stone-900">
                        {collabTemplateLabel || "크리에이터 콜라보 컷"}
                      </p>
                    </div>
                    <span className="rounded bg-gold-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-500">
                      PICK
                    </span>
                  </div>
                  <img
                    src={collabImageUrl}
                    alt={collabTemplateLabel || "콜라보 이미지"}
                    className="mt-4 aspect-[4/3] w-full rounded object-cover"
                  />
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
                    disabled={generating || finalizing}
                    onClick={handlePrimaryAction}
                    className="editorial-button-primary w-full disabled:opacity-50"
                  >
                    {primaryActionLabel}
                  </button>
                )}

                {readOnly ? (
                  <p className="text-sm leading-relaxed text-warm-500">
                    이미 주문이 완료된 포토북이에요. 주문 내역에서 배송 상태를 확인할 수 있어요.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${projectId}/personalize`)}
                    className="editorial-button-link"
                  >
                    이전 단계로 돌아가기
                  </button>
                )}
              </div>

              {preview.status !== "ORDERED" && (
                <div className="mt-8 rounded bg-gold-400/15 px-4 py-4 text-sm leading-relaxed text-gold-500">
                  {preview.status === "BOOK_CREATED"
                    ? "포토북이 준비됐어요! '인쇄용으로 확정하기'를 누르면 배송 · 결제 단계로 넘어갈 수 있어요."
                    : preview.status === "FINALIZED"
                      ? "모든 준비가 끝났어요. '배송 · 결제로 이동'을 눌러 주문을 완료해주세요."
                      : "아래 '포토북 만들기' 버튼을 누르면 입력한 내용으로 포토북이 완성돼요."}
                </div>
              )}
            </div>
          </aside>
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function BookPage({
  page,
  fallbackTitle,
  right = false,
}: {
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
      {page ? (
        <>
          <h3 className="text-2xl font-bold leading-tight text-brand-700">
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
        <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 text-warm-500">
          <p className="text-sm">빈 페이지</p>
          <p className="text-xs opacity-70">홀수 페이지일 때 자동으로 비워져요</p>
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

type SummaryHighlight = {
  key: string;
  label: string;
  value: string;
};

type SummaryVideo = {
  videoId: string;
  title: string;
};

function buildPersonalizationHighlights(preview: ProjectPreview): SummaryHighlight[] {
  const fieldLabelByKey = new Map(
    (preview.edition.snapshot?.personalizationFields ?? []).map((field) => [field.fieldKey, field.label]),
  );
  const topVideos = readSummaryVideos(preview.personalizationData.topVideos);
  const collabTemplateLabel = readString(preview.personalizationData.aiCollabTemplateLabel);
  const highlights: SummaryHighlight[] = [];

  if (collabTemplateLabel) {
    highlights.push({
      key: "aiCollabTemplateLabel",
      label: "콜라보 이미지",
      value: collabTemplateLabel,
    });
  }

  return [
    ...highlights,
    ...Object.entries(preview.personalizationData)
      .map(([key, value]) => buildSummaryHighlight(key, value, fieldLabelByKey, topVideos))
      .filter((item): item is SummaryHighlight => item !== null),
  ].slice(0, 4);
}

function buildSummaryHighlight(
  key: string,
  value: unknown,
  fieldLabelByKey: Map<string, string>,
  topVideos: SummaryVideo[],
): SummaryHighlight | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (
    !trimmed ||
    key === "uploadedImageUrl" ||
    key === "memoryImageUrl" ||
    key.startsWith("aiCollab")
  ) {
    return null;
  }

  switch (key) {
    case "mode":
      return { key, label: "제작 방식", value: projectModeLabel(trimmed) };
    case "favoriteVideoId": {
      const selectedVideo = topVideos.find((video) => video.videoId === trimmed);
      return {
        key,
        label: fieldLabelByKey.get(key) ?? "대표 장면",
        value: selectedVideo?.title ?? "선택한 장면",
      };
    }
    case "subscribedSince":
      return {
        key,
        label: fieldLabelByKey.get(key) ?? "구독 시작일",
        value: formatSummaryDate(trimmed),
      };
    default:
      return {
        key,
        label: fieldLabelByKey.get(key) ?? fallbackSummaryLabel(key),
        value: trimmed,
      };
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readSummaryVideos(value: unknown): SummaryVideo[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      videoId: typeof item.videoId === "string" ? item.videoId : "",
      title: typeof item.title === "string" ? item.title : "",
    }))
    .filter((video) => video.videoId && video.title);
}

function formatSummaryDate(value: string) {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function fallbackSummaryLabel(key: string) {
  switch (key) {
    case "fanNickname":
      return "닉네임";
    case "fanNote":
      return "한마디 메시지";
    case "favoriteReason":
      return "좋아하는 이유";
    default:
      return key;
  }
}
