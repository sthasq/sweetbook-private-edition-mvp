import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { useParams, useNavigate } from "react-router-dom";
import { finalizeBook, generateBook, getPreview } from "../api/projects";
import type { ProjectPreview } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";
import {
  estimateEditionPricing,
  projectStageLabel,
} from "../lib/sweetbookWorkflow";
import { imageObjectPosition } from "../lib/imageFocus";
import { resolveMediaUrl } from "../lib/appPaths";

type FlipBookHandle = {
  pageFlip: () => {
    flip: (pageNum: number, corner?: "top" | "bottom") => void;
    flipNext: (corner?: "top" | "bottom") => void;
    flipPrev: (corner?: "top" | "bottom") => void;
  };
};

type FlipBookEvent = {
  data?: number | { page?: number };
};

type PreviewCoverPayload = {
  title: string;
  subtitle: string;
  periodText: string;
  spineTitle: string;
  coverPhoto: string;
  templateLabel?: string;
};

type PreviewLeaf =
  | {
    kind: "cover-back";
    key: string;
    cover: PreviewCoverPayload;
  }
  | {
    kind: "cover-front";
    key: string;
    cover: PreviewCoverPayload;
  }
  | {
    kind: "inside-blank";
    key: string;
  }
  | {
    kind: "page";
    key: string;
    page: ProjectPreview["pages"][number];
    interiorPageNumber: number;
  };

type PreviewSpread = {
  key: string;
  leafStart: number;
  label: string;
  interiorPageNumbers: number[];
  thumbnailPage: ProjectPreview["pages"][number] | null;
};

type PreviewThumbnail = {
  key: string;
  leafStart: number;
  label: string;
  imageUrl: string;
};

type PreviewBookModel = {
  coverPage: ProjectPreview["pages"][number] | null;
  interiorPages: ProjectPreview["pages"];
  leaves: PreviewLeaf[];
  spreads: PreviewSpread[];
  thumbnails: PreviewThumbnail[];
  interiorPageCount: number;
};

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [activeSpread, setActiveSpread] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    getPreview(Number(projectId))
      .then(setPreview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!preview) {
      return;
    }
    const nextLeafCount = buildPreviewBookModel(preview.pages).leaves.length;
    setActiveSpread((current) =>
      normalizePreviewSpreadStart(current, nextLeafCount),
    );
  }, [preview]);

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
  const bookModel = buildPreviewBookModel(pages);
  const readOnly = preview.status === "ORDERED";
  const normalizedActiveSpread = normalizePreviewSpreadStart(activeSpread, bookModel.leaves.length);
  const currentSpreadView =
    bookModel.spreads.find((spread) => spread.leafStart === normalizedActiveSpread) ??
    bookModel.spreads[0] ??
    null;
  const personalizationHighlights = buildPersonalizationHighlights(preview);
  const previewSummary = buildPreviewSummary(pages);
  const quickJumps = buildPreviewQuickJumps(bookModel);
  const pricingHint = estimateEditionPricing(preview.edition.snapshot?.bookSpecUid);
  const previousSpread = previousPreviewSpreadStart(normalizedActiveSpread);
  const nextSpread = nextPreviewSpreadStart(normalizedActiveSpread, bookModel.leaves.length);
  const currentPageLabel = currentSpreadView?.label ?? "표지";
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

  function syncActiveSpread(flipEvent: FlipBookEvent) {
    setActiveSpread(
      normalizePreviewSpreadStart(readFlipBookPageIndex(flipEvent), bookModel.leaves.length),
    );
  }

  function navigateToSpread(targetSpread: number) {
    const normalizedTargetSpread = normalizePreviewSpreadStart(targetSpread, bookModel.leaves.length);
    if (normalizedTargetSpread === normalizedActiveSpread) {
      return;
    }
    const pageFlip = flipBookRef.current?.pageFlip();
    if (!pageFlip) {
      setActiveSpread(normalizedTargetSpread);
      return;
    }
    if (normalizedTargetSpread === previousSpread) {
      pageFlip.flipPrev("top");
      return;
    }
    if (normalizedTargetSpread === nextSpread) {
      pageFlip.flipNext("top");
      return;
    }
    pageFlip.flip(normalizedTargetSpread, "top");
  }

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
            <div className="mb-5 grid gap-3 md:grid-cols-4">
              <MetricCard label="선택 컷" value={`${previewSummary.photoCount}장`} hint="책에 들어가는 대표 사진 수" />
              <MetricCard label="스토리 페이지" value={`${previewSummary.storyPageCount}p`} hint="사진+글 또는 글 중심 내지 수" />
              <MetricCard label="갤러리 페이지" value={`${previewSummary.galleryPageCount}p`} hint="컷을 여러 장 묶은 아카이브 페이지" />
              <MetricCard label="템플릿 믹스" value={previewSummary.structureLabel} hint="표지 · 발행면 · 사진+글 · 글만 · 갤러리" />
            </div>

            {quickJumps.length > 0 && (
              <div className="mb-5 rounded bg-surface-low px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                    빠른 이동
                  </p>
                  {quickJumps.map((item) => (
                    <button
                      key={`${item.key}-${item.label}`}
                      type="button"
                      onClick={() => navigateToSpread(item.spreadIndex)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        item.spreadIndex === normalizedActiveSpread
                          ? "border-brand-300 bg-white text-brand-700 shadow-sm"
                          : "border-stone-200 bg-white/70 text-warm-500 hover:border-brand-200 hover:text-brand-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="editorial-panel p-6 md:p-10">
              {bookModel.leaves.length > 0 ? (
                <div className="relative">
                  <HTMLFlipBook
                    ref={flipBookRef}
                    width={420}
                    height={525}
                    minWidth={280}
                    maxWidth={520}
                    minHeight={360}
                    maxHeight={650}
                    startPage={0}
                    size="stretch"
                    drawShadow
                    flippingTime={900}
                    usePortrait={false}
                    startZIndex={12}
                    autoSize
                    maxShadowOpacity={0.22}
                    showCover={false}
                    mobileScrollSupport
                    swipeDistance={24}
                    clickEventForward
                    useMouseEvents
                    showPageCorners
                    disableFlipByClick={false}
                    className="preview-flipbook"
                    style={{ margin: "0 auto" }}
                    onInit={syncActiveSpread}
                    onUpdate={syncActiveSpread}
                    onFlip={syncActiveSpread}
                  >
                    {bookModel.leaves.map((leaf, leafIndex) => (
                      <FlipBookLeaf
                        key={leaf.key}
                        leaf={leaf}
                        templateDetail={preview.contentTemplateDetail}
                        right={isRightHandBookPage(leafIndex)}
                      />
                    ))}
                  </HTMLFlipBook>

                  <div className="mt-6 flex items-center justify-center gap-4">
                    <button
                      disabled={previousSpread === normalizedActiveSpread}
                      onClick={() => navigateToSpread(previousSpread)}
                      className="editorial-button-secondary px-4 py-2.5 disabled:opacity-40"
                    >
                      이전
                    </button>
                    <div className="rounded-full bg-white/85 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-warm-500 shadow-sm">
                      {currentPageLabel}
                    </div>
                    <button
                      disabled={nextSpread === normalizedActiveSpread}
                      onClick={() => navigateToSpread(nextSpread)}
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

            {bookModel.thumbnails.length > 0 && (
              <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                {bookModel.thumbnails.map((thumbnail) => {
                  const selected = thumbnail.leafStart === normalizedActiveSpread;
                  return (
                    <button
                      key={thumbnail.key}
                      onClick={() => navigateToSpread(thumbnail.leafStart)}
                      className={`shrink-0 overflow-hidden rounded border p-1 transition ${
                        selected
                          ? "border-brand-400 bg-white shadow-sm"
                          : "border-stone-200/70 bg-white/70 opacity-80"
                      }`}
                    >
                      {thumbnail.imageUrl ? (
                        <img
                          src={resolveMediaUrl(thumbnail.imageUrl)}
                          alt={thumbnail.label}
                          className="h-20 w-16 object-cover"
                          style={{
                            objectPosition: imageObjectPosition(
                              resolveMediaUrl(thumbnail.imageUrl),
                            ),
                          }}
                        />
                      ) : (
                        <div className="flex h-20 w-16 items-center justify-center bg-surface-low text-xs text-warm-500">
                          {thumbnail.label}
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
                <SummaryRow label="총 페이지" value={`${bookModel.interiorPageCount}p`} />
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

const FlipBookLeaf = forwardRef<
  HTMLDivElement,
  {
    leaf: PreviewLeaf;
    templateDetail: ProjectPreview["contentTemplateDetail"];
    right?: boolean;
  }
>(function FlipBookLeaf(
  {
    leaf,
    templateDetail,
    right = false,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-density={leaf.kind.startsWith("cover") ? "hard" : "soft"}
    >
      <div className="preview-flipbook-page">
        <PreviewLeafPage leaf={leaf} templateDetail={templateDetail} right={right} />
      </div>
    </div>
  );
});

function PreviewLeafPage({
  leaf,
  templateDetail,
  right = false,
}: {
  leaf: PreviewLeaf;
  templateDetail: ProjectPreview["contentTemplateDetail"];
  right?: boolean;
}) {
  switch (leaf.kind) {
    case "cover-back":
      return <WrapCoverBackPage cover={leaf.cover} />;
    case "cover-front":
      return <WrapCoverFrontPage cover={leaf.cover} />;
    case "inside-blank":
      return <InsideCoverBlankPage right={right} />;
    case "page":
      return (
        <BookPage
          page={leaf.page}
          fallbackTitle={`페이지 ${leaf.interiorPageNumber}`}
          pageNumber={leaf.interiorPageNumber}
          templateDetail={templateDetail}
          right={right}
        />
      );
    default:
      return null;
  }
}

function BookPage({
  page,
  fallbackTitle,
  pageNumber,
  templateDetail,
  right = false,
}: {
  page: ProjectPreview["pages"][number] | undefined;
  fallbackTitle: string;
  pageNumber: number;
  templateDetail: ProjectPreview["contentTemplateDetail"];
  right?: boolean;
}) {
  const notebookPage = readNotebookPagePayload(page);
  const cover = readNotebookCoverPayload(page);
  const publish = readNotebookPublishPayload(page);
  const divider = readNotebookDividerPayload(page);
  const blank = readNotebookBlankPayload(page);
  const mixedCover = readMixedCoverPayload(page);
  const mixedPublish = readMixedPublishPayload(page);
  const mixedBlank = readMixedBlankPayload(page);
  const notebookPageTone = readNotebookPageTone(templateDetail, pageNumber, right);
  const galleryImageUrls = readGalleryImageUrls(page);
  const templateLabel = readTemplateLabel(page);

  return (
    <div
      className={`relative h-full min-h-0 overflow-hidden border-stone-200/60 p-8 md:p-10 ${
        right ? "md:border-l" : ""
      }`}
      style={{ backgroundColor: notebookPageTone.backgroundColor }}
    >
      {page ? (
        <>
          {mixedCover ? (
            <MixedCoverPage cover={mixedCover} />
          ) : mixedPublish ? (
            <MixedPublishPage publish={mixedPublish} />
          ) : mixedBlank ? (
            <MixedBlankPage blank={mixedBlank} />
          ) : cover ? (
            <NotebookCoverPage cover={cover} />
          ) : publish ? (
            <NotebookPublishPage publish={publish} />
          ) : divider ? (
            <NotebookDividerPage divider={divider} />
          ) : blank ? (
            <NotebookBlankPage blank={blank} />
          ) : notebookPage ? (
            <NotebookCombinedPage entries={notebookPage.entries} pageNumber={pageNumber} />
          ) : (
            <GenericPreviewPage
              key={[
                page.key,
                page.title ?? "",
                page.description ?? "",
                page.imageUrl ?? "",
                galleryImageUrls.join("|"),
              ].join("::")}
              page={page}
              fallbackTitle={fallbackTitle}
              templateLabel={templateLabel}
              galleryImageUrls={galleryImageUrls}
            />
          )}
        </>
      ) : (
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 text-warm-500">
          <p className="text-sm">빈 페이지</p>
          <p className="text-xs opacity-70">홀수 페이지일 때 자동으로 비워져요</p>
        </div>
      )}
    </div>
  );
}

type NotebookPreviewPayload = {
  previewTemplate: "NOTEBOOK_C";
  bookTitle?: string;
  entryTitle?: string;
  entryDescription?: string;
  entryImageUrl?: string;
  monthLabel: string;
  year: number;
  month: number;
  dateLabel: string;
  weekdayLabel: string;
  pointColor: string;
  parentComment: string;
  teacherComment: string;
  photos: string[];
  weatherEmoji?: string;
  showMonthHeading?: boolean;
};

type MixedCoverPayload = {
  title: string;
  subtitle: string;
  periodText: string;
  spineTitle: string;
  coverPhoto: string;
  templateLabel?: string;
};

type MixedPublishPayload = {
  photo: string;
  title: string;
  publishDate: string;
  author: string;
  publisher: string;
  hashtags: string;
  templateLabel?: string;
};

type MixedBlankPayload = {
  bookTitle: string;
  year: number;
  month: number;
  templateLabel?: string;
};

type NotebookPageTone = {
  backgroundColor: string;
};

function NotebookCombinedPage({
  entries,
  pageNumber,
}: {
  entries: NotebookPreviewPayload[];
  pageNumber: number;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col text-stone-900">
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-5">
        {entries.map((entry, index) => (
          <NotebookEntryCard
            key={`${entry.dateLabel}-${index}`}
            entry={entry}
            showMonthHeading={index === 0 && Boolean(entry.showMonthHeading)}
          />
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between pt-6 text-[11px] text-stone-500">
        <span>{pageNumber % 2 === 0 ? `${entries[0]?.year ?? ""}년 ${entries[0]?.month ?? ""}월` : ""}</span>
        <span className="font-medium text-stone-700">{pageNumber}</span>
        <span>{pageNumber % 2 === 0 ? "" : entries[0]?.bookTitle ?? "PlayPick Creator Photobook"}</span>
      </div>
    </div>
  );
}

function NotebookEntryCard({
  entry,
  showMonthHeading,
}: {
  entry: NotebookPreviewPayload;
  showMonthHeading: boolean;
}) {
  const photos = entry.photos;
  const accent = entry.pointColor || "#F9B96E";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showMonthHeading && (
        <div className="mb-5">
          <p className="text-center text-sm font-semibold text-[#f0aa59]">
            {entry.year}
          </p>
          <h3 className="text-4xl font-black tracking-tight text-[#f0aa59] md:text-[2.65rem]">
            {entry.monthLabel}
          </h3>
        </div>
      )}

      <div
        className="mb-4 flex items-center justify-between rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm"
        style={{ backgroundColor: accent }}
      >
        <span>
          {entry.dateLabel} | {entry.weekdayLabel}
        </span>
        <span className="text-sm">{entry.weatherEmoji ?? "☀"}</span>
      </div>

      <div className="space-y-4">
        <CommentBlock label="부모님" text={entry.parentComment || entry.entryTitle || ""} />
        <CommentBlock label="선생님" text={entry.teacherComment || entry.entryDescription || ""} />
      </div>

      {photos.length > 0 && (
        <div className={`mt-5 grid gap-3 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {photos.map((imageUrl, index) => {
            const featured = photos.length >= 3 && index === 0;
            return (
              <div
                key={`${entry.dateLabel}-${index}`}
                className={`overflow-hidden rounded-2xl bg-white shadow-sm ${featured ? "col-span-2" : ""}`}
              >
                <img
                  src={resolveMediaUrl(imageUrl)}
                  alt={`${entry.entryTitle ?? entry.bookTitle ?? "노트"} ${index + 1}`}
                  className={`w-full object-cover ${featured ? "aspect-[16/9]" : "aspect-[4/5]"}`}
                  style={{
                    objectPosition: imageObjectPosition(resolveMediaUrl(imageUrl)),
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NotebookCoverPage({
  cover,
}: {
  cover: {
    childName: string;
    schoolName: string;
    volumeLabel: string;
    periodText: string;
    coverPhoto: string;
  };
}) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-6 bg-[#fdf5ec] text-stone-900">
      <div className="min-h-0">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f0aa59]">
          {cover.volumeLabel}
        </p>
        <h3 className={`mt-3 font-black tracking-tight text-[#f0aa59] ${previewHeadingSizeClass(cover.childName)}`}>
          {cover.childName}
        </h3>
        <p className="mt-2 text-lg font-medium text-stone-700">{cover.schoolName}</p>
        <p className="mt-2 text-sm text-stone-500">{cover.periodText}</p>
      </div>
      <div className="min-h-0 overflow-hidden rounded-[28px] bg-white shadow-lg">
        <img
          src={resolveMediaUrl(cover.coverPhoto)}
          alt={cover.childName}
          className="h-full w-full object-contain"
          style={{
            objectPosition: imageObjectPosition(resolveMediaUrl(cover.coverPhoto)),
          }}
        />
      </div>
    </div>
  );
}

function GenericPreviewPage({
  page,
  fallbackTitle,
  templateLabel,
  galleryImageUrls,
}: {
  page: ProjectPreview["pages"][number];
  fallbackTitle: string;
  templateLabel: string;
  galleryImageUrls: string[];
}) {
  const title = page.title || fallbackTitle;
  const description = page.description?.trim() ?? "";
  const hasDescription = description.length > 0;
  const visibleGalleryImages = galleryImageUrls.slice(0, 6);
  const hasGallery = visibleGalleryImages.length > 0;
  const hasSingleImage = Boolean(page.imageUrl);
  const hasMedia = hasGallery || hasSingleImage;
  const extraGalleryCount = Math.max(galleryImageUrls.length - visibleGalleryImages.length, 0);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [compactLevel, setCompactLevel] = useState(0);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const body = bodyRef.current;
    if (!frame) {
      return;
    }
    let frameId = 0;

    const measureOverflow = () => {
      const frameOverflow =
        frame.scrollHeight > frame.clientHeight + 1 ||
        frame.scrollWidth > frame.clientWidth + 1;
      const bodyOverflow =
        body !== null &&
        (body.scrollHeight > body.clientHeight + 1 ||
          body.scrollWidth > body.clientWidth + 1);

      if (frameOverflow || bodyOverflow) {
        setCompactLevel((current) => (current < 4 ? current + 1 : current));
      }
    };

    frameId = requestAnimationFrame(measureOverflow);
    return () => cancelAnimationFrame(frameId);
  }, [compactLevel]);

  return (
    <div ref={frameRef} className="flex h-full min-h-0 flex-col overflow-hidden">
      {templateLabel && (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
          {templateLabel}
        </p>
      )}
      <h3
        className={`font-bold tracking-tight text-brand-700 ${previewPageTitleSizeClass(
          title,
          compactLevel,
        )}`}
      >
        {title}
      </h3>

      {hasGallery ? (
        <div
          className={`mt-5 grid min-h-0 gap-3 ${
            hasDescription
              ? previewMediaBasisClass(compactLevel)
              : "flex-1"
          } ${visibleGalleryImages.length > 3 ? "grid-cols-3 grid-rows-2" : "grid-cols-3 grid-rows-1"}`}
        >
          {visibleGalleryImages.map((imageUrl, index) => {
            const showOverflowBadge =
              extraGalleryCount > 0 && index === visibleGalleryImages.length - 1;

            return (
              <div
                key={`${page.key}-${index}`}
                className="relative min-h-0 overflow-hidden rounded bg-stone-100 shadow-sm"
              >
                <img
                  src={resolveMediaUrl(imageUrl)}
                  alt={`${page.title} ${index + 1}`}
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: imageObjectPosition(resolveMediaUrl(imageUrl)),
                  }}
                />
                {showOverflowBadge && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 text-lg font-semibold text-white backdrop-blur-[1px]">
                    +{extraGalleryCount}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : hasSingleImage ? (
        <div
          className={`mt-5 min-h-0 overflow-hidden rounded bg-stone-100 shadow-sm ${
            hasDescription ? previewMediaBasisClass(compactLevel) : "flex-1"
          }`}
        >
          <img
            src={resolveMediaUrl(page.imageUrl!)}
            alt={page.title}
            className="h-full w-full object-cover"
            style={{
              objectPosition: imageObjectPosition(resolveMediaUrl(page.imageUrl!)),
            }}
          />
        </div>
      ) : null}

      {hasDescription && (
        <div
          ref={bodyRef}
          className={`${hasMedia ? "mt-4" : "mt-5"} min-h-0 flex-1 overflow-hidden`}
        >
          <p
            className={`whitespace-pre-line ${
              hasMedia
                ? previewBodyTextClass(description, true, compactLevel)
                : previewBodyTextClass(description, false, compactLevel)
            } ${hasMedia ? "text-warm-500" : "text-stone-900"}`}
          >
            {description}
          </p>
        </div>
      )}
    </div>
  );
}

function MixedCoverPage({
  cover,
}: {
  cover: MixedCoverPayload;
}) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-6 bg-[#f8f2ea] text-stone-900">
      <div className="min-h-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
          {cover.templateLabel ?? "표지"}
        </p>
        <h3 className={`mt-3 font-black tracking-tight text-brand-700 ${previewHeadingSizeClass(cover.title)}`}>
          {cover.title}
        </h3>
        {cover.subtitle && (
          <p className="mt-3 text-base leading-relaxed text-stone-600">{cover.subtitle}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-warm-500">
          {cover.periodText && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{cover.periodText}</span>}
          {cover.spineTitle && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{cover.spineTitle}</span>}
        </div>
      </div>
      <div className="min-h-0 overflow-hidden rounded-[28px] bg-white shadow-lg">
        <img
          src={resolveMediaUrl(cover.coverPhoto)}
          alt={cover.title}
          className="h-full w-full object-contain"
          style={{
            objectPosition: imageObjectPosition(resolveMediaUrl(cover.coverPhoto)),
          }}
        />
      </div>
    </div>
  );
}

function NotebookPublishPage({
  publish,
}: {
  publish: {
    photo: string;
    title: string;
    publishDate: string;
    author: string;
    publisher: string;
    hashtags: string;
  };
}) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-6 bg-[#fdf5ec] text-stone-900">
      <div className="min-h-0">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">발행면</p>
        <h3 className="mt-3 text-3xl font-bold text-brand-700">{publish.title}</h3>
        <div className="mt-5 space-y-3 text-sm leading-relaxed text-stone-700">
          <p>발행일: {publish.publishDate}</p>
          <p>만든이: {publish.author}</p>
          <p>제작사: {publish.publisher}</p>
          <p>{publish.hashtags}</p>
        </div>
      </div>
      <div className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-md">
        <img
          src={resolveMediaUrl(publish.photo)}
          alt={publish.title}
          className="h-full w-full object-contain"
          style={{
            objectPosition: imageObjectPosition(resolveMediaUrl(publish.photo)),
          }}
        />
      </div>
    </div>
  );
}

function MixedPublishPage({
  publish,
}: {
  publish: MixedPublishPayload;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-between bg-white text-stone-900">
      <div className="max-w-[13rem] space-y-4">
        {publish.photo && (
          <div className="overflow-hidden rounded bg-stone-100 shadow-sm">
            <img
              src={resolveMediaUrl(publish.photo)}
              alt={publish.title}
              className="aspect-square w-full object-cover"
              style={{
                objectPosition: imageObjectPosition(resolveMediaUrl(publish.photo)),
              }}
            />
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
            {publish.templateLabel ?? "발행면"}
          </p>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-stone-800">
            {publish.title}
          </h3>
        </div>
        <div className="space-y-1.5 text-[11px] leading-5 text-stone-500">
          <p>발행일 · {publish.publishDate}</p>
          <p>만든이 · {publish.author}</p>
          <p>제작 · {publish.publisher}</p>
          <p>{publish.hashtags}</p>
        </div>
      </div>

      <div className="space-y-5">
        <p className="font-headline text-3xl font-semibold tracking-tight text-[#ea5b6b]">
          Sweetbook
        </p>
        <PreviewBarcodeMark />
      </div>
    </div>
  );
}

function NotebookDividerPage({
  divider,
}: {
  divider: {
    year: number;
    monthName: string;
    monthNum: string;
    chapterNum: number;
    bgColor: string;
  };
}) {
  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center rounded-3xl text-center text-white"
      style={{ backgroundColor: divider.bgColor }}
    >
      <p className="text-sm font-semibold tracking-[0.3em] opacity-90">{divider.year}</p>
      <h3 className="mt-4 text-5xl font-black tracking-tight">{divider.monthName}</h3>
      <p className="mt-4 text-lg font-medium">CHAPTER {divider.chapterNum}</p>
      <p className="mt-2 text-sm opacity-90">{divider.monthNum}</p>
    </div>
  );
}

function NotebookBlankPage({
  blank,
}: {
  blank: {
    bookTitle: string;
    year: number;
    month: number;
  };
}) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-end bg-[#fdf5ec] text-stone-400">
      <p className="text-sm">{blank.year}년 {blank.month}월</p>
      <p className="mt-2 text-sm">{blank.bookTitle}</p>
    </div>
  );
}

function MixedBlankPage({
  blank,
}: {
  blank: MixedBlankPayload;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-end bg-[#fcf8f2] text-stone-400">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-400">
        {blank.templateLabel ?? "빈내지"}
      </p>
      <p className="mt-3 text-sm">{blank.year}년 {blank.month}월</p>
      <p className="mt-2 text-sm">{blank.bookTitle}</p>
    </div>
  );
}

function CommentBlock({ label, text }: { label: string; text: string }) {
  if (!text.trim()) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-stone-600">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-500 px-1.5 text-[10px] text-white">
          💬
        </span>
        <span>{label}</span>
      </div>
      <p className="whitespace-pre-line text-[13px] leading-6 text-stone-800">
        {text}
      </p>
    </div>
  );
}

function readNotebookEntryPayload(value: unknown): NotebookPreviewPayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  if (payload.previewTemplate !== "NOTEBOOK_C") {
    return null;
  }

  return {
    previewTemplate: "NOTEBOOK_C" as const,
    bookTitle: typeof payload.bookTitle === "string" ? payload.bookTitle : undefined,
    entryTitle: typeof payload.entryTitle === "string" ? payload.entryTitle : undefined,
    entryDescription: typeof payload.entryDescription === "string" ? payload.entryDescription : undefined,
    entryImageUrl: typeof payload.entryImageUrl === "string" ? payload.entryImageUrl : undefined,
    monthLabel: typeof payload.monthLabel === "string" ? payload.monthLabel : "",
    year: typeof payload.year === "number" ? payload.year : Number(payload.year ?? 0),
    month: typeof payload.month === "number" ? payload.month : Number(payload.month ?? 0),
    dateLabel: typeof payload.dateLabel === "string" ? payload.dateLabel : "",
    weekdayLabel: typeof payload.weekdayLabel === "string" ? payload.weekdayLabel : "",
    pointColor: typeof payload.pointColor === "string" ? payload.pointColor : "#F9B96E",
    parentComment:
      typeof payload.parentComment === "string" ? payload.parentComment : "",
    teacherComment:
      typeof payload.teacherComment === "string" ? payload.teacherComment : "",
    photos: Array.isArray(payload.photos)
      ? payload.photos.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
    weatherEmoji: typeof payload.weatherEmoji === "string" ? payload.weatherEmoji : undefined,
    showMonthHeading: Boolean(payload.showMonthHeading),
  };
}

function readNotebookPagePayload(page: ProjectPreview["pages"][number] | undefined) {
  if (!page || typeof page.payload !== "object" || page.payload === null) {
    return null;
  }

  const payload = page.payload as Record<string, unknown>;
  if (payload.previewTemplate !== "NOTEBOOK_C_PAGE" || !Array.isArray(payload.entries)) {
    return null;
  }

  return {
    entries: payload.entries
      .map((entry) => readNotebookEntryPayload(entry))
      .filter((entry): entry is NotebookPreviewPayload => entry !== null),
  };
}

function readNotebookCoverPayload(page: ProjectPreview["pages"][number] | undefined) {
  const payload = page?.payload as Record<string, unknown> | undefined;
  if (!payload || payload.previewTemplate !== "NOTEBOOK_COVER") return null;
  return {
    childName: typeof payload.childName === "string" ? payload.childName : "",
    schoolName: typeof payload.schoolName === "string" ? payload.schoolName : "",
    volumeLabel: typeof payload.volumeLabel === "string" ? payload.volumeLabel : "",
    periodText: typeof payload.periodText === "string" ? payload.periodText : "",
    coverPhoto: typeof payload.coverPhoto === "string" ? payload.coverPhoto : "",
  };
}

function readMixedCoverPayload(page: ProjectPreview["pages"][number] | undefined): MixedCoverPayload | null {
  const payload = page?.payload as Record<string, unknown> | undefined;
  if (!payload || payload.previewTemplate !== "MIXED_COVER") return null;
  return {
    title: typeof payload.title === "string" ? payload.title : "",
    subtitle: typeof payload.subtitle === "string" ? payload.subtitle : "",
    periodText: typeof payload.periodText === "string" ? payload.periodText : "",
    spineTitle: typeof payload.spineTitle === "string" ? payload.spineTitle : "",
    coverPhoto: typeof payload.coverPhoto === "string" ? payload.coverPhoto : "",
    templateLabel: typeof payload.templateLabel === "string" ? payload.templateLabel : undefined,
  };
}

function readNotebookPublishPayload(page: ProjectPreview["pages"][number] | undefined) {
  const payload = page?.payload as Record<string, unknown> | undefined;
  if (!payload || payload.previewTemplate !== "NOTEBOOK_PUBLISH") return null;
  return {
    photo: typeof payload.photo === "string" ? payload.photo : "",
    title: typeof payload.title === "string" ? payload.title : "",
    publishDate: typeof payload.publishDate === "string" ? payload.publishDate : "",
    author: typeof payload.author === "string" ? payload.author : "",
    publisher: typeof payload.publisher === "string" ? payload.publisher : "",
    hashtags: typeof payload.hashtags === "string" ? payload.hashtags : "",
  };
}

function readMixedPublishPayload(page: ProjectPreview["pages"][number] | undefined): MixedPublishPayload | null {
  const payload = page?.payload as Record<string, unknown> | undefined;
  if (!payload || payload.previewTemplate !== "MIXED_PUBLISH") return null;
  return {
    photo: typeof payload.photo === "string" ? payload.photo : "",
    title: typeof payload.title === "string" ? payload.title : "",
    publishDate: typeof payload.publishDate === "string" ? payload.publishDate : "",
    author: typeof payload.author === "string" ? payload.author : "",
    publisher: typeof payload.publisher === "string" ? payload.publisher : "",
    hashtags: typeof payload.hashtags === "string" ? payload.hashtags : "",
    templateLabel: typeof payload.templateLabel === "string" ? payload.templateLabel : undefined,
  };
}

function readNotebookDividerPayload(page: ProjectPreview["pages"][number] | undefined) {
  const payload = page?.payload as Record<string, unknown> | undefined;
  if (!payload || payload.previewTemplate !== "NOTEBOOK_DIVIDER") return null;
  return {
    year: typeof payload.year === "number" ? payload.year : Number(payload.year ?? 0),
    monthName: typeof payload.monthName === "string" ? payload.monthName : "",
    monthNum: typeof payload.monthNum === "string" ? payload.monthNum : "",
    chapterNum:
      typeof payload.chapterNum === "number" ? payload.chapterNum : Number(payload.chapterNum ?? 1),
    bgColor: typeof payload.bgColor === "string" ? payload.bgColor : "#F9B96E",
  };
}

function readNotebookBlankPayload(page: ProjectPreview["pages"][number] | undefined) {
  const payload = page?.payload as Record<string, unknown> | undefined;
  if (!payload || payload.previewTemplate !== "NOTEBOOK_BLANK") return null;
  return {
    bookTitle: typeof payload.bookTitle === "string" ? payload.bookTitle : "",
    year: typeof payload.year === "number" ? payload.year : Number(payload.year ?? 0),
    month: typeof payload.month === "number" ? payload.month : Number(payload.month ?? 0),
  };
}

function readMixedBlankPayload(page: ProjectPreview["pages"][number] | undefined): MixedBlankPayload | null {
  const payload = page?.payload as Record<string, unknown> | undefined;
  if (!payload || payload.previewTemplate !== "MIXED_BLANK") return null;
  return {
    bookTitle: typeof payload.bookTitle === "string" ? payload.bookTitle : "",
    year: typeof payload.year === "number" ? payload.year : Number(payload.year ?? 0),
    month: typeof payload.month === "number" ? payload.month : Number(payload.month ?? 0),
    templateLabel: typeof payload.templateLabel === "string" ? payload.templateLabel : undefined,
  };
}

function readPreviewCoverPayload(page: ProjectPreview["pages"][number] | null) {
  const mixedCover = readMixedCoverPayload(page ?? undefined);
  if (mixedCover) {
    return mixedCover;
  }

  const notebookCover = readNotebookCoverPayload(page ?? undefined);
  if (!notebookCover) {
    return null;
  }

  return {
    title: notebookCover.childName,
    subtitle: notebookCover.schoolName,
    periodText: notebookCover.periodText,
    spineTitle: notebookCover.schoolName || notebookCover.childName,
    coverPhoto: notebookCover.coverPhoto,
    templateLabel: notebookCover.volumeLabel || "표지",
  };
}

function isCoverPreviewPage(page: ProjectPreview["pages"][number] | undefined) {
  return Boolean(readPreviewCoverPayload(page ?? null));
}

function buildPreviewBookModel(pages: ProjectPreview["pages"]): PreviewBookModel {
  const coverPage = isCoverPreviewPage(pages[0]) ? pages[0] : null;
  const interiorPages = coverPage ? pages.slice(1) : pages;
  const leaves: PreviewLeaf[] = [];
  const cover = readPreviewCoverPayload(coverPage);

  if (cover) {
    leaves.push(
      { kind: "cover-back", key: `${coverPage?.key ?? "cover"}-back`, cover },
      { kind: "cover-front", key: `${coverPage?.key ?? "cover"}-front`, cover },
    );
  }

  if (cover && interiorPages.length > 0) {
    leaves.push({ kind: "inside-blank", key: "inside-front-cover" });
  }

  interiorPages.forEach((page, index) => {
    leaves.push({
      kind: "page",
      key: page.key,
      page,
      interiorPageNumber: index + 1,
    });
  });

  if (cover && interiorPages.length > 0) {
    leaves.push({ kind: "inside-blank", key: "inside-back-cover" });
  }

  if (leaves.length % 2 === 1) {
    leaves.push({ kind: "inside-blank", key: "inside-balancer" });
  }

  const spreads: PreviewSpread[] = [];
  for (let leafStart = 0; leafStart < leaves.length; leafStart += 2) {
    const spreadLeaves = leaves.slice(leafStart, leafStart + 2);
    const interiorPageNumbers = spreadLeaves.flatMap((leaf) =>
      leaf.kind === "page" ? [leaf.interiorPageNumber] : [],
    );
    const label = labelPreviewSpread(interiorPageNumbers, leafStart === 0 && Boolean(cover));
    const thumbnailLeaf =
      spreadLeaves.find((leaf) => leaf.kind === "page") ??
      spreadLeaves.find((leaf) => leaf.kind === "cover-front") ??
      null;

    spreads.push({
      key: spreadLeaves.map((leaf) => leaf.key).join(":"),
      leafStart,
      label,
      interiorPageNumbers,
      thumbnailPage:
        thumbnailLeaf?.kind === "page"
          ? thumbnailLeaf.page
          : coverPage,
    });
  }

  const thumbnails: PreviewThumbnail[] = [
    ...(coverPage
      ? [{
        key: `${coverPage.key}-thumb`,
        leafStart: 0,
        label: "표지",
        imageUrl: cover?.coverPhoto || coverPage.imageUrl || "",
      }]
      : []),
    ...interiorPages.map((page, index) => {
      const interiorPageNumber = index + 1;
      return {
        key: `${page.key}-thumb`,
        leafStart: findSpreadStartForInteriorPage(spreads, interiorPageNumber),
        label: String(interiorPageNumber),
        imageUrl: page.imageUrl || "",
      };
    }),
  ];

  return {
    coverPage,
    interiorPages,
    leaves,
    spreads,
    thumbnails,
    interiorPageCount: interiorPages.length,
  };
}

function labelPreviewSpread(interiorPageNumbers: number[], isCoverSpread: boolean) {
  if (isCoverSpread || interiorPageNumbers.length === 0) {
    return "표지";
  }

  if (interiorPageNumbers.length === 1) {
    return `페이지 ${interiorPageNumbers[0]}`;
  }

  return `페이지 ${interiorPageNumbers[0]}-${interiorPageNumbers[interiorPageNumbers.length - 1]}`;
}

function findSpreadStartForInteriorPage(spreads: PreviewSpread[], interiorPageNumber: number) {
  return (
    spreads.find((spread) => spread.interiorPageNumbers.includes(interiorPageNumber))
      ?.leafStart ?? 0
  );
}

function readTemplateLabel(page: ProjectPreview["pages"][number] | undefined) {
  if (!page || typeof page.payload !== "object" || page.payload === null) {
    return "";
  }
  const payload = page.payload as Record<string, unknown>;
  return typeof payload.templateLabel === "string" ? payload.templateLabel : "";
}

function readNotebookPageTone(
  templateDetail: ProjectPreview["contentTemplateDetail"],
  pageNumber: number,
  right?: boolean,
): NotebookPageTone {
  const evenPage = pageNumber % 2 === 0;
  const layerKey = evenPage ? "even" : "odd";
  const backgroundColor =
    readBaseLayerRectangleColor(templateDetail?.baseLayer, layerKey) ??
    (right ? "#fffdfa" : "#fdf5ec");

  return {
    backgroundColor,
  };
}

function readBaseLayerRectangleColor(
  baseLayer: Record<string, unknown> | null | undefined,
  layerKey: "odd" | "even",
) {
  if (!baseLayer || typeof baseLayer !== "object") {
    return null;
  }

  const layer = baseLayer[layerKey];
  if (!layer || typeof layer !== "object") {
    return null;
  }

  const elements = (layer as Record<string, unknown>).elements;
  if (!Array.isArray(elements)) {
    return null;
  }

  const rectangle = elements.find(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      (item as Record<string, unknown>).type === "rectangle" &&
      typeof (item as Record<string, unknown>).color === "string",
  ) as Record<string, unknown> | undefined;

  return typeof rectangle?.color === "string" ? normalizeArgbColor(rectangle.color) : null;
}

function normalizeArgbColor(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("#") || trimmed.length !== 9) {
    return trimmed;
  }

  return `#${trimmed.slice(3)}`;
}

function readGalleryImageUrls(page: ProjectPreview["pages"][number] | undefined) {
  if (!page || typeof page.payload !== "object" || page.payload === null) {
    return [];
  }

  const payload = page.payload as Record<string, unknown>;
  if (payload.assetType !== "IMAGE_GROUP" || !Array.isArray(payload.imageUrls)) {
    return [];
  }

  return payload.imageUrls.filter(
    (item): item is string =>
      typeof item === "string" && isRenderableImageReference(item),
  );
}

function WrapCoverBackPage({
  cover,
}: {
  cover: PreviewCoverPayload;
}) {
  return (
    <div className="relative h-full overflow-hidden bg-[#fbf6ee] text-stone-900">
      <div className="absolute inset-y-0 right-0 w-10 bg-[#912f34]" />
      <div className="flex h-full flex-col justify-between px-8 py-9">
        <div className="pr-10" />
        <div className="space-y-5 pr-12">
          {cover.subtitle && (
            <p className="text-sm leading-6 text-stone-500">
              {cover.subtitle}
            </p>
          )}
          <div className="space-y-3">
            <p className="font-headline text-3xl font-semibold tracking-tight text-[#ea5b6b]">
              Sweetbook
            </p>
            <PreviewBarcodeMark />
          </div>
        </div>
      </div>
    </div>
  );
}

function WrapCoverFrontPage({
  cover,
}: {
  cover: PreviewCoverPayload;
}) {
  const coverPhotoUrl = resolveMediaUrl(cover.coverPhoto);

  return (
    <div className="relative h-full overflow-hidden bg-[#fbf6ee] text-stone-900">
      <div className="absolute inset-y-0 left-0 flex w-10 items-center justify-center bg-[#912f34]">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
          style={{ writingMode: "vertical-rl" }}
        >
          {cover.spineTitle || cover.title}
        </span>
      </div>
      <div
        className="absolute right-9 top-0 h-14 w-7 bg-[#912f34]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)" }}
      />

      <div className="flex h-full flex-col px-10 py-9">
        <div className="ml-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a16f6a]">
            {cover.templateLabel ?? "표지"}
          </p>
          <div className="mt-4 border-b border-[#b65256]/40 pb-3">
            <h3 className={`font-headline font-bold tracking-tight text-[#9c3035] ${previewHeadingSizeClass(cover.title)}`}>
              {cover.title}
            </h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b07068]">
            <div className="border-b border-[#d2b8ad] pb-2">
              <span>to.</span>
            </div>
            <div className="border-b border-[#d2b8ad] pb-2 text-right">
              <span>{cover.periodText || "date."}</span>
            </div>
          </div>
        </div>

        <div className="mt-7 ml-10 flex-1 overflow-hidden bg-[#efe7dc] shadow-sm">
          {coverPhotoUrl ? (
            <img
              src={coverPhotoUrl}
              alt={cover.title}
              className="h-full w-full object-cover"
              style={{
                objectPosition: imageObjectPosition(coverPhotoUrl),
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone-400">
              표지 이미지
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InsideCoverBlankPage({ right = false }: { right?: boolean }) {
  return (
    <div
      className={`h-full bg-white ${right ? "border-l border-stone-200/60" : ""}`}
    />
  );
}

function PreviewBarcodeMark() {
  return (
    <div className="inline-flex flex-col gap-2">
      <div
        className="h-6 w-28 bg-white"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #111827 0 2px, transparent 2px 4px, #111827 4px 5px, transparent 5px 7px)",
        }}
      />
      <p className="text-[9px] tracking-[0.18em] text-stone-400">
        PREVIEW EDITION
      </p>
    </div>
  );
}

function readFlipBookPageIndex(flipEvent: FlipBookEvent) {
  const data = flipEvent?.data;
  if (typeof data === "number") {
    return data;
  }
  if (typeof data === "object" && data !== null && typeof data.page === "number") {
    return data.page;
  }
  return 0;
}

function isRenderableImageReference(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }

  const normalized = trimmed.toLowerCase();
  if (
    normalized.startsWith("data:image/") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("//") ||
    normalized.includes("/api/assets/")
  ) {
    return true;
  }

  const path = normalized.split(/[?#]/, 1)[0];
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg", ".bmp", ".jfif", ".heic"].some((extension) =>
    path.endsWith(extension),
  );
}

function isRightHandBookPage(pageIndex: number) {
  return pageIndex % 2 === 1;
}

type PreviewSummary = {
  photoCount: number;
  storyPageCount: number;
  photoStoryCount: number;
  textStoryCount: number;
  galleryPageCount: number;
  blankCount: number;
  hasCover: boolean;
  hasPublish: boolean;
  structureLabel: string;
};

type PreviewJump = {
  label: string;
  key: string;
  spreadIndex: number;
};

function buildPreviewSummary(pages: ProjectPreview["pages"]): PreviewSummary {
  let photoCount = 0;
  let storyPageCount = 0;
  let photoStoryCount = 0;
  let textStoryCount = 0;
  let galleryPageCount = 0;
  let blankCount = 0;
  let hasCover = false;
  let hasPublish = false;

  for (const page of pages) {
    const mixedCover = readMixedCoverPayload(page);
    const mixedPublish = readMixedPublishPayload(page);
    const mixedBlank = readMixedBlankPayload(page);
    const cover = readNotebookCoverPayload(page);
    const publish = readNotebookPublishPayload(page);
    const blank = readNotebookBlankPayload(page);
    const notebookPage = readNotebookPagePayload(page);
    const galleryImageUrls = readGalleryImageUrls(page);
    const payload = page?.payload ?? {};
    const pageKind = typeof payload.pageKind === "string" ? payload.pageKind : "";

    if (mixedCover) {
      hasCover = true;
      if (mixedCover.coverPhoto) photoCount += 1;
      continue;
    }
    if (cover) {
      hasCover = true;
      if (cover.coverPhoto) photoCount += 1;
      continue;
    }
    if (mixedPublish) {
      hasPublish = true;
      continue;
    }
    if (publish) {
      hasPublish = true;
      if (publish.photo) photoCount += 1;
      continue;
    }
    if (mixedBlank) {
      blankCount += 1;
      continue;
    }
    if (blank) {
      blankCount += 1;
      continue;
    }
    if (notebookPage) {
      storyPageCount += 1;
      photoStoryCount += 1;
      for (const entry of notebookPage.entries) {
        photoCount += entry.photos.length;
      }
      continue;
    }
    if (galleryImageUrls.length > 0 || pageKind === "GALLERY") {
      galleryPageCount += 1;
      photoCount += galleryImageUrls.length;
      continue;
    }
    if (page) {
      storyPageCount += 1;
      if (page.imageUrl) {
        photoStoryCount += 1;
        photoCount += 1;
      } else {
        textStoryCount += 1;
      }
    }
  }

  const parts = [
    hasCover ? "표지" : "",
    hasPublish ? "발행면" : "",
    photoStoryCount > 0 ? "사진+글" : "",
    textStoryCount > 0 ? "글만" : "",
    galleryPageCount > 0 ? "갤러리" : "",
  ].filter(Boolean);

  return {
    photoCount,
    storyPageCount,
    photoStoryCount,
    textStoryCount,
    galleryPageCount,
    blankCount,
    hasCover,
    hasPublish,
    structureLabel: parts.join(" · "),
  };
}

function buildPreviewQuickJumps(bookModel: PreviewBookModel): PreviewJump[] {
  const jumps: PreviewJump[] = [];

  if (bookModel.coverPage) {
    jumps.push({ key: "cover", label: "표지", spreadIndex: 0 });
  }

  bookModel.interiorPages.forEach((page, index) => {
    const interiorPageNumber = index + 1;
    const spreadIndex = findSpreadStartForInteriorPage(bookModel.spreads, interiorPageNumber);
    const mixedPublish = readMixedPublishPayload(page);
    const mixedBlank = readMixedBlankPayload(page);
    const galleryImageUrls = readGalleryImageUrls(page);

    if (mixedBlank) {
      return;
    }
    if (mixedPublish || readNotebookPublishPayload(page)) {
      jumps.push({ key: page.key, label: "발행면", spreadIndex });
      return;
    }

    const notebookPage = readNotebookPagePayload(page);
    if (notebookPage) {
      const firstEntry = notebookPage.entries[0];
      jumps.push({
        key: page.key,
        label: firstEntry ? `${firstEntry.monthLabel} ${firstEntry.dateLabel}` : `페이지 ${interiorPageNumber}`,
        spreadIndex,
      });
      return;
    }

    if (galleryImageUrls.length > 0) {
      jumps.push({
        key: page.key,
        label: page.title || `페이지 ${interiorPageNumber}`,
        spreadIndex,
      });
      return;
    }

    if (page.title) {
      jumps.push({ key: page.key, label: page.title, spreadIndex });
    }
  });

  const deduped = jumps.filter(
    (item, index, array) =>
      array.findIndex((candidate) => candidate.spreadIndex === item.spreadIndex) === index,
  );

  return deduped.slice(0, 8);
}

function normalizePreviewSpreadStart(spreadStart: number, pageCount: number) {
  if (pageCount <= 0) {
    return 0;
  }
  const bounded = Math.max(0, Math.min(spreadStart, pageCount - 1));
  return bounded % 2 === 0 ? bounded : bounded - 1;
}

function previousPreviewSpreadStart(spreadStart: number) {
  return spreadStart <= 0 ? 0 : Math.max(0, spreadStart - 2);
}

function nextPreviewSpreadStart(spreadStart: number, pageCount: number) {
  if (pageCount <= 1) {
    return 0;
  }
  const lastSpreadStart = normalizePreviewSpreadStart(pageCount - 1, pageCount);
  const candidate = spreadStart + 2;
  return candidate <= lastSpreadStart ? candidate : spreadStart;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded bg-surface-low px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-brand-700">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-warm-500">{hint}</p>
    </div>
  );
}

function previewHeadingSizeClass(text: string) {
  const length = text.trim().length;

  if (length > 42) {
    return "text-2xl leading-[1.05] md:text-[1.95rem]";
  }
  if (length > 28) {
    return "text-3xl leading-[1.02] md:text-[2.2rem]";
  }
  return "text-4xl leading-[1] md:text-[2.7rem]";
}

function previewPageTitleSizeClass(text: string, compactLevel = 0) {
  const length = text.trim().length;
  const level =
    Math.min(
      compactLevel + (length > 58 ? 2 : length > 34 ? 1 : 0),
      4,
    );

  switch (level) {
    case 0:
      return "text-2xl leading-tight";
    case 1:
      return "text-[1.65rem] leading-[1.14] md:text-[1.8rem]";
    case 2:
      return "text-[1.45rem] leading-[1.16] md:text-[1.6rem]";
    case 3:
      return "text-[1.25rem] leading-[1.14] md:text-[1.4rem]";
    default:
      return "text-[1.1rem] leading-[1.12] md:text-[1.2rem]";
  }
}

function previewBodyTextClass(
  text: string,
  withMedia: boolean,
  compactLevel = 0,
) {
  const length = text.trim().length;
  const level = Math.min(
    compactLevel +
      (withMedia ? (length > 260 ? 2 : length > 160 ? 1 : 0) : length > 320 ? 1 : 0),
    4,
  );

  if (!withMedia) {
    switch (level) {
      case 0:
        return "text-sm leading-7";
      case 1:
        return "text-[13px] leading-[1.65]";
      case 2:
        return "text-[12px] leading-[1.55]";
      case 3:
        return "text-[11px] leading-[1.45]";
      default:
        return "text-[10.5px] leading-[1.38]";
    }
  }

  switch (level) {
    case 0:
      return "text-sm leading-7";
    case 1:
      return "text-[13px] leading-[1.65]";
    case 2:
      return "text-[12.5px] leading-[1.56]";
    case 3:
      return "text-[11.5px] leading-[1.46]";
    default:
      return "text-[10.5px] leading-[1.36]";
  }
}

function previewMediaBasisClass(compactLevel: number) {
  switch (Math.min(compactLevel, 4)) {
    case 0:
      return "flex-[0_0_42%]";
    case 1:
      return "flex-[0_0_36%]";
    case 2:
      return "flex-[0_0_31%]";
    case 3:
      return "flex-[0_0_26%]";
    default:
      return "flex-[0_0_22%]";
  }
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

  return [
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
    key === "memoryImageUrl"
  ) {
    return null;
  }

  switch (key) {
    case "mode":
      return null;
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
