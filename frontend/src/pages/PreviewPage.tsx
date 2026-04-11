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
  if (!preview) return <ErrorBox message="미리보기 데이터가 없습니다." />;

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
        ? "인쇄용 확정 중..."
        : "인쇄용으로 확정하기"
      : preview.status === "FINALIZED"
        ? "배송 · 결제로 이동"
        : generating
          ? "포토북 생성 중..."
          : "포토북 만들기";

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <ProjectStepper current="preview" className="mb-8" />

        <div className="mb-5 max-w-sm">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-brand-700 md:text-3xl">
            포토북 미리보기
          </h1>
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <section className="lg:col-span-8">
            <div className="editorial-panel p-6 md:p-10">
              {pages.length > 0 ? (
                <div className="relative">
                  <div className="overflow-hidden rounded bg-white shadow-editorial">
                    <div className="grid min-h-[520px] md:grid-cols-2">
                      <BookPage
                        label="크리에이터 페이지"
                        page={leftPage}
                        fallbackTitle="크리에이터 페이지"
                      />
                      <BookPage
                        label="내 페이지"
                        page={rightPage}
                        fallbackTitle="내 페이지"
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
                      페이지 {activeSpread + 1} / {pages.length}
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
                    아직 만들어진 페이지가 없어요
                  </p>
                  <p className="mt-3 text-sm text-warm-500">
                    개인화 내용을 저장한 뒤 포토북을 만들어보세요.
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
                <SummaryRow label="진행 상태" value={projectStageLabel(preview.status)} />
                <SummaryRow label="에디션" value={preview.edition.title} />
                <SummaryRow label="제작 방식" value={projectModeLabel(preview.mode)} />
                <SummaryRow label="페이지 수" value={`${pages.length}페이지`} />
                <SummaryRow
                  label="예상 제작가"
                  value={`${pricingHint.productPrice.toLocaleString("ko-KR")}원부터`}
                />
                <SummaryRow
                  label="맞춤 대상"
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
                    <p className="editorial-label text-brand-700">제작 상태</p>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${integrationTone(integrationStatus)}`}>
                      {integrationStatus.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-warm-500">
                    {integrationStatus.mode === "SIMULATED"
                      ? "현재 체험 모드로 운영 중이에요. 실제 인쇄 없이 전체 흐름을 확인할 수 있습니다."
                      : "포토북 생성과 인쇄 확정을 순서대로 진행합니다."}
                  </p>
                </div>
              )}

              {personalizationHighlights.length > 0 && (
                <div className="mt-8 rounded bg-surface-low px-5 py-5">
                  <p className="editorial-label text-brand-700">내 입력 요약</p>
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
                      <p className="editorial-label text-brand-700">공식 콜라보 컷</p>
                      <p className="mt-2 text-sm text-stone-900">
                        {collabTemplateLabel || "빠니보틀 여행 무드 컷"}
                      </p>
                    </div>
                    <span className="rounded bg-gold-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-500">
                      MVP
                    </span>
                  </div>
                  <img
                    src={collabImageUrl}
                    alt={collabTemplateLabel || "공식 콜라보 컷"}
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
                    주문이 완료된 포토북이에요. 주문 정보와 배송 상태를 다시 확인할 수 있습니다.
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
                {preview.status === "BOOK_CREATED"
                  ? "포토북이 만들어졌어요! 인쇄용으로 확정하면 배송과 결제만 남습니다."
                  : preview.status === "FINALIZED"
                    ? "인쇄 준비가 끝났어요. 배송지와 결제만 입력하면 주문할 수 있습니다."
                    : "포토북 만들기 버튼을 눌러 완성된 포토북을 확인해보세요."}
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
          마지막 페이지
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
      label: "공식 콜라보 컷",
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
      return { key, label: "만드는 방식", value: projectModeLabel(trimmed) };
    case "favoriteVideoId": {
      const selectedVideo = topVideos.find((video) => video.videoId === trimmed);
      return {
        key,
        label: fieldLabelByKey.get(key) ?? "가장 좋아하는 영상",
        value: selectedVideo?.title ?? "선택한 영상",
      };
    }
    case "subscribedSince":
      return {
        key,
        label: fieldLabelByKey.get(key) ?? "함께 보기 시작한 날",
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
      return "남긴 한마디";
    case "favoriteReason":
      return "좋아한 이유";
    default:
      return key;
  }
}
