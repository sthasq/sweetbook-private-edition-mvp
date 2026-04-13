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
import { imageObjectPosition } from "../lib/imageFocus";
import { resolveMediaUrl } from "../lib/appPaths";

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
  const previewSummary = buildPreviewSummary(pages);
  const quickJumps = buildPreviewQuickJumps(pages);
  const autoFilledBookData = buildAutoFilledBookData(pages);
  const notebookOutline = buildNotebookOutline(pages);
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
                      key={`${item.pageIndex}-${item.label}`}
                      type="button"
                      onClick={() => setActiveSpread(item.spreadIndex)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        item.spreadIndex === activeSpread
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
              {pages.length > 0 ? (
                <div className="relative">
                  <div className="overflow-hidden rounded bg-white shadow-editorial">
                    <div className="grid min-h-[520px] md:grid-cols-2">
                      <BookPage
                        page={leftPage}
                        fallbackTitle="크리에이터가 구성한 페이지"
                        pageNumber={activeSpread + 1}
                        templateDetail={preview.contentTemplateDetail}
                      />
                      <BookPage
                        page={rightPage}
                        fallbackTitle="내가 채운 페이지"
                        pageNumber={Math.min(activeSpread + 2, pages.length)}
                        templateDetail={preview.contentTemplateDetail}
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
                          src={resolveMediaUrl(page.imageUrl)}
                          alt={page.title}
                          className="h-20 w-16 object-cover"
                          style={{
                            objectPosition: imageObjectPosition(
                              resolveMediaUrl(page.imageUrl),
                            ),
                          }}
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

              {preview.contentTemplateDetail?.thumbnailUrl && (
                <div className="mt-6 rounded bg-surface-low px-5 py-5">
                  <p className="editorial-label text-brand-700">실제 템플릿 레이아웃</p>
                  <p className="mt-2 text-sm leading-relaxed text-warm-500">
                    Sweetbook 템플릿 상세 API에서 받은 대표 사진+글 템플릿을 기준으로, 여러 내지 템플릿을 섞어 구성하고 있어요.
                  </p>
                  <img
                    src={resolveMediaUrl(preview.contentTemplateDetail.thumbnailUrl)}
                    alt={preview.contentTemplateDetail.theme || preview.contentTemplateDetail.name}
                    className="mt-4 w-full rounded-xl border border-stone-200 bg-white object-cover"
                  />
                </div>
              )}

              <div className="mt-6 rounded bg-surface-low px-5 py-5">
                <p className="editorial-label text-brand-700">책 구성 요약</p>
                <div className="mt-4 space-y-3 text-sm text-stone-900">
                  <StructureRow label="표지" value={previewSummary.hasCover ? "일기장B 표지 적용" : "없음"} />
                  <StructureRow label="발행면" value={previewSummary.hasPublish ? "일기장B 발행면 적용" : "없음"} />
                  <StructureRow label="사진+글" value={`${previewSummary.photoStoryCount}페이지`} />
                  <StructureRow label="글 중심" value={`${previewSummary.textStoryCount}페이지`} />
                  <StructureRow label="갤러리" value={`${previewSummary.galleryPageCount}페이지`} />
                  <StructureRow label="빈내지" value={`${previewSummary.blankCount}페이지`} />
                </div>
              </div>

              {autoFilledBookData && (
                <div className="mt-6 rounded bg-surface-low px-5 py-5">
                  <p className="editorial-label text-brand-700">자동 반영 항목</p>
                  <p className="mt-2 text-sm leading-relaxed text-warm-500">
                    표지와 발행면에 들어갈 핵심 문구를 책 구성에 맞춰 자동으로 정리해 보여드려요.
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded bg-white/85 px-4 py-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                        표지
                      </p>
                      <div className="mt-3 space-y-2 text-sm leading-relaxed text-stone-900">
                        <p>제목: {autoFilledBookData.cover.childName}</p>
                        <p>서브카피: {autoFilledBookData.cover.schoolName}</p>
                        <p>책등 텍스트: {autoFilledBookData.cover.volumeLabel}</p>
                        <p>기간: {autoFilledBookData.cover.periodText}</p>
                      </div>
                    </div>
                    <div className="rounded bg-white/85 px-4 py-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                        발행면
                      </p>
                      <div className="mt-3 space-y-2 text-sm leading-relaxed text-stone-900">
                        <p>제목: {autoFilledBookData.publish.title}</p>
                        <p>발행일: {autoFilledBookData.publish.publishDate}</p>
                        <p>만든이: {autoFilledBookData.publish.author}</p>
                        <p>제작사: {autoFilledBookData.publish.publisher}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {notebookOutline.length > 0 && (
                <div className="mt-6 rounded bg-surface-low px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="editorial-label text-brand-700">내지 설계도</p>
                      <p className="mt-2 text-sm leading-relaxed text-warm-500">
                        어떤 페이지가 사진+글인지, 글 중심인지, 갤러리인지 먼저 훑고 원하는 위치로 바로 이동할 수 있어요.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-warm-500 shadow-sm">
                      {notebookOutline.length} entries
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {notebookOutline.slice(0, 6).map((entry) => (
                      <button
                        key={`${entry.pageIndex}-${entry.dateLabel}`}
                        type="button"
                        onClick={() => setActiveSpread(entry.spreadIndex)}
                        className="w-full rounded bg-white/85 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                              {entry.monthLabel} {entry.dateLabel}
                            </p>
                            <p className="mt-2 text-sm font-semibold leading-relaxed text-stone-900">
                              {entry.title}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-warm-500">
                              {entry.summary}
                            </p>
                          </div>
                          <div className="shrink-0 rounded-full border border-stone-200 px-3 py-1 text-[11px] font-semibold text-brand-700">
                            사진 {entry.photoCount}장
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
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
      className={`relative border-stone-200/60 p-8 md:p-10 ${
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
            <>
              {templateLabel && (
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                  {templateLabel}
                </p>
              )}
              <h3 className="text-2xl font-bold leading-tight text-brand-700">
                {page.title || fallbackTitle}
              </h3>
              {galleryImageUrls.length > 0 ? (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {galleryImageUrls.map((imageUrl, index) => (
                    <div
                      key={`${page.key}-${index}`}
                      className="overflow-hidden rounded bg-stone-100 shadow-sm"
                    >
                      <img
                        src={resolveMediaUrl(imageUrl)}
                        alt={`${page.title} ${index + 1}`}
                        className="aspect-square w-full object-cover"
                        style={{
                          objectPosition: imageObjectPosition(resolveMediaUrl(imageUrl)),
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : page.imageUrl ? (
                <img
                  src={resolveMediaUrl(page.imageUrl)}
                  alt={page.title}
                  className="mt-6 aspect-[4/3] w-full rounded object-cover"
                  style={{
                    objectPosition: imageObjectPosition(resolveMediaUrl(page.imageUrl)),
                  }}
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
              {galleryImageUrls.length > 0 && page.description && (
                <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-warm-500">
                  {page.description}
                </p>
              )}
            </>
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
    <div className="flex min-h-[440px] flex-col text-stone-900">
      <div className="grid flex-1 grid-cols-2 gap-5">
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
    <div className="flex min-h-[360px] flex-col">
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
    <div className="flex min-h-[440px] flex-col justify-between bg-[#fdf5ec] text-stone-900">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f0aa59]">
          {cover.volumeLabel}
        </p>
        <h3 className="mt-3 text-4xl font-black tracking-tight text-[#f0aa59]">
          {cover.childName}
        </h3>
        <p className="mt-2 text-lg font-medium text-stone-700">{cover.schoolName}</p>
        <p className="mt-2 text-sm text-stone-500">{cover.periodText}</p>
      </div>
      <div className="mt-8 overflow-hidden rounded-[28px] bg-white shadow-lg">
        <img
          src={resolveMediaUrl(cover.coverPhoto)}
          alt={cover.childName}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
    </div>
  );
}

function MixedCoverPage({
  cover,
}: {
  cover: MixedCoverPayload;
}) {
  return (
    <div className="flex min-h-[440px] flex-col justify-between bg-[#f8f2ea] text-stone-900">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
          {cover.templateLabel ?? "표지"}
        </p>
        <h3 className="mt-3 text-4xl font-black tracking-tight text-brand-700">
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
      <div className="mt-8 overflow-hidden rounded-[28px] bg-white shadow-lg">
        <img
          src={resolveMediaUrl(cover.coverPhoto)}
          alt={cover.title}
          className="aspect-[4/3] w-full object-cover"
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
    <div className="flex min-h-[440px] flex-col justify-between bg-[#fdf5ec] text-stone-900">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">발행면</p>
        <h3 className="mt-3 text-3xl font-bold text-brand-700">{publish.title}</h3>
        <div className="mt-5 space-y-3 text-sm leading-relaxed text-stone-700">
          <p>발행일: {publish.publishDate}</p>
          <p>만든이: {publish.author}</p>
          <p>제작사: {publish.publisher}</p>
          <p>{publish.hashtags}</p>
        </div>
      </div>
      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-md">
        <img
          src={resolveMediaUrl(publish.photo)}
          alt={publish.title}
          className="aspect-[4/3] w-full object-cover"
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
    <div className="flex min-h-[440px] flex-col justify-between bg-[#fcf8f2] text-stone-900">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
          {publish.templateLabel ?? "발행면"}
        </p>
        <h3 className="mt-3 text-3xl font-bold text-brand-700">{publish.title}</h3>
        <div className="mt-6 grid gap-3 text-sm leading-relaxed text-stone-700">
          <p>발행일: {publish.publishDate}</p>
          <p>만든이: {publish.author}</p>
          <p>제작사: {publish.publisher}</p>
          <p>{publish.hashtags}</p>
        </div>
      </div>
      <div className="mt-8 rounded-2xl bg-white px-5 py-5 shadow-sm">
        <p className="text-xs leading-6 text-warm-500">
          이번 책은 사진+글, 글만, 갤러리 템플릿을 섞어서 한 권의 흐름으로 구성했어요.
        </p>
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
      className="flex min-h-[440px] flex-col items-center justify-center rounded-3xl text-center text-white"
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
    <div className="flex min-h-[440px] flex-col justify-end bg-[#fdf5ec] text-stone-400">
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
    <div className="flex min-h-[440px] flex-col justify-end bg-[#fcf8f2] text-stone-400">
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

  return payload.imageUrls.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
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
  pageIndex: number;
  spreadIndex: number;
};

type AutoFilledBookData = {
  cover: {
    childName: string;
    schoolName: string;
    volumeLabel: string;
    periodText: string;
  };
  publish: {
    title: string;
    publishDate: string;
    author: string;
    publisher: string;
  };
};

type NotebookOutlineEntry = {
  pageIndex: number;
  spreadIndex: number;
  monthLabel: string;
  dateLabel: string;
  title: string;
  summary: string;
  photoCount: number;
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

function buildPreviewQuickJumps(pages: ProjectPreview["pages"]): PreviewJump[] {
  const jumps: PreviewJump[] = [];

  pages.forEach((page, pageIndex) => {
    const spreadIndex = pageIndex % 2 === 0 ? pageIndex : pageIndex - 1;
    const mixedCover = readMixedCoverPayload(page);
    const mixedPublish = readMixedPublishPayload(page);
    const mixedBlank = readMixedBlankPayload(page);
    const galleryImageUrls = readGalleryImageUrls(page);
    if (readNotebookCoverPayload(page)) {
      jumps.push({ label: "표지", pageIndex, spreadIndex });
      return;
    }
    if (mixedCover) {
      jumps.push({ label: "표지", pageIndex, spreadIndex });
      return;
    }
    if (mixedPublish) {
      jumps.push({ label: "발행면", pageIndex, spreadIndex });
      return;
    }
    if (readNotebookPublishPayload(page)) {
      jumps.push({ label: "발행면", pageIndex, spreadIndex });
      return;
    }
    if (mixedBlank) {
      return;
    }
    const notebookPage = readNotebookPagePayload(page);
    if (notebookPage) {
      const firstEntry = notebookPage.entries[0];
      const label = firstEntry
        ? `${firstEntry.monthLabel} ${firstEntry.dateLabel}`
        : `내지 ${pageIndex + 1}`;
      jumps.push({ label, pageIndex, spreadIndex });
      return;
    }
    if (galleryImageUrls.length > 0) {
      jumps.push({ label: page.title || `갤러리 ${pageIndex + 1}`, pageIndex, spreadIndex });
      return;
    }
    if (page.title) {
      jumps.push({ label: page.title, pageIndex, spreadIndex });
    }
  });

  return jumps.slice(0, 8);
}

function buildAutoFilledBookData(
  pages: ProjectPreview["pages"],
): AutoFilledBookData | null {
  const coverPage = pages.find((page) => readMixedCoverPayload(page) || readNotebookCoverPayload(page));
  const publishPage = pages.find((page) => readMixedPublishPayload(page) || readNotebookPublishPayload(page));
  const mixedCover = readMixedCoverPayload(coverPage);
  const cover = readNotebookCoverPayload(coverPage);
  const mixedPublish = readMixedPublishPayload(publishPage);
  const publish = readNotebookPublishPayload(publishPage);

  if (!cover && !publish && !mixedCover && !mixedPublish) {
    return null;
  }

  return {
    cover: {
      childName: mixedCover?.title || cover?.childName || "-",
      schoolName: mixedCover?.subtitle || cover?.schoolName || "-",
      volumeLabel: mixedCover?.spineTitle || cover?.volumeLabel || "-",
      periodText: mixedCover?.periodText || cover?.periodText || "-",
    },
    publish: {
      title: mixedPublish?.title || publish?.title || "-",
      publishDate: mixedPublish?.publishDate || publish?.publishDate || "-",
      author: mixedPublish?.author || publish?.author || "-",
      publisher: mixedPublish?.publisher || publish?.publisher || "-",
    },
  };
}

function buildNotebookOutline(
  pages: ProjectPreview["pages"],
): NotebookOutlineEntry[] {
  return pages.flatMap((page, pageIndex) => {
    const notebookPage = readNotebookPagePayload(page);
    if (!notebookPage) {
      const galleryImageUrls = readGalleryImageUrls(page);
      const mixedBlank = readMixedBlankPayload(page);
      const mixedCover = readMixedCoverPayload(page);
      const mixedPublish = readMixedPublishPayload(page);
      if (mixedBlank || mixedCover || mixedPublish || !page) {
        return [];
      }

      const spreadIndex = pageIndex % 2 === 0 ? pageIndex : pageIndex - 1;
      const summarySource =
        page.description?.trim() ||
        (galleryImageUrls.length > 0
          ? `${galleryImageUrls.length}장의 컷을 모아둔 갤러리 페이지`
          : "글 중심으로 읽히는 스토리 페이지");

      return [{
        pageIndex,
        spreadIndex,
        monthLabel: readTemplateLabel(page) || "Story",
        dateLabel: `p.${pageIndex + 1}`,
        title: page.title?.trim() || `페이지 ${pageIndex + 1}`,
        summary: summarySource.length > 72 ? `${summarySource.slice(0, 72).trim()}...` : summarySource,
        photoCount: galleryImageUrls.length > 0 ? galleryImageUrls.length : page.imageUrl ? 1 : 0,
      }];
    }

    const spreadIndex = pageIndex % 2 === 0 ? pageIndex : pageIndex - 1;
    return notebookPage.entries.map((entry, entryIndex) => ({
      pageIndex,
      spreadIndex,
      monthLabel: entry.monthLabel || `${entry.month}월`,
      dateLabel: entry.dateLabel || `${entryIndex + 1}일`,
      title:
        entry.entryTitle?.trim() ||
        entry.bookTitle?.trim() ||
        `${entry.monthLabel || `${entry.month}월`} 기록`,
      summary: summarizeNotebookEntry(entry),
      photoCount: entry.photos.length,
    }));
  });
}

function summarizeNotebookEntry(entry: NotebookPreviewPayload) {
  const source =
    entry.entryDescription?.trim() ||
    entry.teacherComment?.trim() ||
    entry.parentComment?.trim() ||
    "사진과 코멘트가 함께 들어가는 스토리 엔트리";

  return source.length > 72 ? `${source.slice(0, 72).trim()}...` : source;
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

function StructureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-200/60 pb-3 last:border-b-0 last:pb-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">{label}</p>
      <p className="text-right leading-relaxed">{value}</p>
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
