import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getEdition } from "../api/editions";
import { createProject } from "../api/projects";
import { listSweetbookBookSpecs, listSweetbookTemplates } from "../api/sweetbook";
import type {
  CuratedAsset,
  EditionDetail,
  SweetbookBookSpec,
  SweetbookTemplate,
} from "../types/api";
import { useAuth } from "../auth/AuthContext";
import VerifiedBadge from "../components/VerifiedBadge";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";
import { formatChannelHandle } from "../lib/channelHandle";
import { formatBookSpecLabel, formatTemplateLabel } from "../lib/sweetbookDisplay";
import { estimateEditionPricing } from "../lib/sweetbookWorkflow";

export default function EditionDetailPage() {
  const { editionId } = useParams<{ editionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [edition, setEdition] = useState<EditionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [bookSpecs, setBookSpecs] = useState<SweetbookBookSpec[]>([]);
  const [templates, setTemplates] = useState<SweetbookTemplate[]>([]);
  const autoStartTriggered = useRef(false);

  useEffect(() => {
    if (!editionId) return;
    getEdition(Number(editionId))
      .then(setEdition)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [editionId]);

  useEffect(() => {
    const bookSpecUid = edition?.snapshot?.bookSpecUid;
    if (!bookSpecUid) {
      setBookSpecs([]);
      setTemplates([]);
      return;
    }

    listSweetbookBookSpecs()
      .then(setBookSpecs)
      .catch(() => setBookSpecs([]));

    listSweetbookTemplates(bookSpecUid)
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [edition?.snapshot?.bookSpecUid]);

  async function startProject() {
    return startProjectInternal("demo", false);
  }

  async function startProjectInternal(
    mode: "demo",
    fromRedirect: boolean,
  ) {
    if (!edition) return;
    if (!user) {
      navigate(
        `/login?next=${encodeURIComponent(`/editions/${edition.id}?startMode=${mode}`)}`,
      );
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await createProject({
        editionId: edition.id,
        mode,
      });
      navigate(`/projects/${res.projectId}/personalize`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "프로젝트 생성 실패");
      if (fromRedirect) {
        navigate(`/editions/${edition.id}`, { replace: true });
      }
    } finally {
      setCreating(false);
    }
  }

  const handleAutoStart = useEffectEvent((mode: "demo") => {
    void startProjectInternal(mode, true);
  });

  useEffect(() => {
    const startMode = searchParams.get("startMode");
    if (!edition || !user || autoStartTriggered.current) {
      return;
    }
    if (startMode !== "demo") {
      return;
    }

    autoStartTriggered.current = true;
    handleAutoStart(startMode);
  }, [edition, user, searchParams]);

  if (loading) return <Spinner />;
  if (error && !edition) return <ErrorBox message={error} />;
  if (!edition) return <ErrorBox message="에디션을 찾을 수 없습니다." />;

  const snap = edition.snapshot;
  const intro = snap?.officialIntro as Record<string, string> | undefined;
  const introTitle = intro?.title ?? intro?.heading;
  const introBody = intro?.message ?? intro?.body;
  const officialAssets = snap?.curatedAssets ?? [];
  const fanFields = snap?.personalizationFields ?? [];
  const imageAssets = officialAssets.filter((asset) => asset.assetType === "IMAGE");
  const textAssets = officialAssets.filter((asset) => asset.assetType !== "IMAGE");
  const pricingHint = estimateEditionPricing(snap?.bookSpecUid);
  const quickPreviewImages = buildQuickPreviewImages(
    edition.coverImageUrl,
    imageAssets,
  );

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl">
        <ProjectStepper current="edition" className="mb-10" />

        <section className="grid items-center gap-12 lg:grid-cols-12">
          <div className="relative lg:col-span-5 lg:pr-12">
            <div className="paper-stack relative">
              <div className="relative overflow-hidden rounded bg-white p-3 shadow-editorial">
                <div className="absolute right-6 top-6 z-10 rounded bg-gold-400/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-900">
                  NOW OPEN
                </div>
                <img
                  src={
                    edition.coverImageUrl ||
                    "/demo-assets/playpick-hero.svg"
                  }
                  alt={edition.title}
                  className="aspect-[4/5] w-full rounded object-cover"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded bg-gold-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500">
                {editionStatusLabel(edition.status)}
              </span>
              {edition.creator.verified && <VerifiedBadge />}
            </div>

            <div className="mt-6 flex items-center gap-4">
              {edition.creator.avatarUrl && (
                <img
                  src={edition.creator.avatarUrl}
                  alt={edition.creator.displayName}
                  className="h-12 w-12 rounded-full border border-stone-200/70 object-cover"
                />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
                  크리에이터
                </p>
                <p className="mt-1 text-lg text-stone-900">{edition.creator.displayName}</p>
                <p className="text-sm text-warm-500">
                  {formatChannelHandle(edition.creator.channelHandle)}
                </p>
              </div>
            </div>

            <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight text-brand-700 md:text-7xl">
              {edition.title}
            </h1>
            {edition.subtitle && (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-warm-500">
                {edition.subtitle}
              </p>
            )}

            {(introTitle || introBody) && (
              <div className="mt-8 rounded bg-surface-low px-6 py-6">
                <p className="editorial-label">크리에이터의 한마디</p>
                {introTitle && (
                  <p className="mt-4 font-headline text-2xl text-brand-700">{introTitle}</p>
                )}
                {introBody && (
                  <p className="mt-3 text-sm leading-relaxed text-warm-500">{introBody}</p>
                )}
              </div>
            )}

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                disabled={creating}
                onClick={() => startProject()}
                className="editorial-button-primary min-w-[220px]"
              >
                {creating ? "준비 중..." : "질문으로 포토북 만들기"}
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-warm-500">
              몇 가지 질문에 답하면 LLM이 개인화 내용을 제안하고, 바로 내 포토북 미리보기로 이어집니다.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded bg-surface-low px-5 py-5">
                <p className="editorial-label text-brand-700">예상 가격</p>
                <p className="mt-3 text-3xl font-semibold text-stone-900">
                  {pricingHint.productPrice.toLocaleString("ko-KR")}원~
                </p>
                <p className="mt-2 text-sm leading-relaxed text-warm-500">
                  1권 기준 예상 가격이에요. 배송비는 배송지 입력 시 자동으로 계산됩니다.
                </p>
              </div>
              <div className="rounded bg-surface-low px-5 py-5">
                <p className="editorial-label text-brand-700">제작 방식</p>
                <p className="mt-3 text-lg font-semibold text-stone-900">LLM 대화형 추천</p>
                <p className="mt-2 text-sm leading-relaxed text-warm-500">
                  질문-답변 기반으로 개인화 문구를 자동 제안받고, 필요하면 바로 수정할 수 있어요.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-10 lg:grid-cols-12">
          <div className="editorial-panel p-8 lg:col-span-5">
            <p className="font-headline text-2xl italic text-brand-700">에디션에 담긴 장면</p>
            <p className="mt-3 text-sm leading-relaxed text-warm-500">
              크리에이터가 직접 고른 메시지와 이미지가 포토북의 분위기를 만들어줘요.
            </p>

            {officialAssets.length > 0 ? (
              <div className="mt-8 space-y-4">
                {officialAssets.slice(0, 4).map((asset) => (
                  <AssetRow key={asset.id} asset={asset} />
                ))}
              </div>
            ) : (
              <p className="mt-8 text-sm text-warm-500">
                크리에이터가 장면을 준비 중이에요. 곧 새로운 콘텐츠로 채워집니다.
              </p>
            )}
          </div>

          <div className="editorial-card p-8 lg:col-span-7 md:p-12">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="h-px w-10 bg-brand-700" />
                <p className="editorial-label text-brand-700">여기서부터 내 버전</p>
              </div>
              <h2 className="mt-5 text-4xl font-bold leading-tight text-stone-900">
                내 이야기로 채우기
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-warm-500">
                몇 가지 질문에 나만의 답을 적으면, 같은 에디션도 완전히 다른 포토북이 됩니다.
              </p>
            </div>

            {fanFields.length > 0 ? (
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {fanFields.map((field) => (
                  <div key={field.id} className="rounded bg-surface-low px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
                      {field.required ? "필수 입력" : "선택 입력"}
                    </p>
                    <p className="mt-3 text-xl text-brand-700">{field.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-warm-500">
                      입력 타입: {inputTypeLabel(field.inputType)}
                      {field.maxLength ? ` · 최대 ${field.maxLength}자` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {[
                  "팬 닉네임",
                  "가장 좋아하는 순간",
                  "관계를 설명하는 한 문장",
                  "크리에이터에게 남길 메시지",
                ].map((label) => (
                  <div key={label} className="rounded bg-surface-low px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
                      개인화 항목
                    </p>
                    <p className="mt-3 text-xl text-brand-700">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {(imageAssets.length > 0 || textAssets.length > 0) && (
          <section className="mt-20 bg-surface-low py-16">
            <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <h2 className="text-3xl font-bold text-brand-700">포토북 미리보기</h2>
                <p className="mt-4 text-sm leading-relaxed text-warm-500">
                  크리에이터가 담은 장면 위에 나의 이야기가 더해져 한 권의 포토북이 완성돼요.
                </p>
                {imageAssets.length > 0 && (
                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {imageAssets.slice(0, 2).map((asset) => (
                      <div key={asset.id} className="overflow-hidden rounded bg-white p-3 shadow-sm">
                        <img
                          src={asset.content || edition.coverImageUrl || "/demo-assets/playpick-hero.svg"}
                          alt={asset.title}
                          className="aspect-[4/3] w-full rounded object-cover"
                        />
                        <p className="mt-4 text-sm font-semibold text-stone-900">{asset.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="editorial-card p-8 lg:col-span-5">
                <p className="editorial-label text-gold-500">한눈에 보기</p>
                {quickPreviewImages.length > 0 && (
                  <div className="mt-5 rounded bg-surface-low p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                      미리보기 구성
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(148px,0.85fr)]">
                      <div className="overflow-hidden rounded bg-white p-2 shadow-sm">
                        <div className="relative overflow-hidden rounded">
                          <img
                            src={quickPreviewImages[0].url}
                            alt={quickPreviewImages[0].label}
                            className="aspect-[4/5] w-full object-cover"
                          />
                          <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700 shadow-sm">
                            {quickPreviewImages[0].label}
                          </span>
                        </div>
                      </div>

                      {quickPreviewImages.length > 1 && (
                        <div
                          className={`grid gap-3 ${
                            quickPreviewImages.length > 2 ? "grid-rows-2" : "grid-cols-1"
                          }`}
                        >
                          {quickPreviewImages.slice(1).map((image) => (
                            <div
                              key={`${image.label}-${image.url}`}
                              className="overflow-hidden rounded bg-white p-1.5 shadow-sm"
                            >
                              <div className="relative overflow-hidden rounded">
                                <img
                                  src={image.url}
                                  alt={image.label}
                                  className="aspect-[4/5] w-full object-cover"
                                />
                                <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-warm-500 shadow-sm">
                                  {image.label}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-5 space-y-5">
                  <SpecRow
                    label="사이즈"
                    value={formatBookSpecLabel(snap?.bookSpecUid, bookSpecs)}
                  />
                  <SpecRow
                    label="표지 스타일"
                    value={formatTemplateLabel(
                      snap?.sweetbookCoverTemplateUid,
                      "cover",
                      templates,
                    )}
                  />
                  <SpecRow
                    label="내지 스타일"
                    value={formatTemplateLabel(
                      snap?.sweetbookContentTemplateUid,
                      "content",
                      templates,
                    )}
                  />
                  <SpecRow
                    label="기본 구성"
                    value={`${officialAssets.length}개`}
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AssetRow({ asset }: { asset: CuratedAsset }) {
  const summary =
    asset.assetType === "IMAGE"
      ? "포토북 전체 분위기를 만들어주는 대표 이미지예요."
      : asset.assetType === "VIDEO"
        ? "이 에디션의 영감이 된 대표 영상이에요."
        : asset.content;

  return (
    <div className="rounded bg-white/80 px-5 py-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded bg-gold-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-500">
          {assetTypeLabel(asset.assetType)}
        </span>
        <p className="text-base font-semibold text-stone-900">{asset.title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-warm-500">{summary}</p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-stone-200/60 pb-4 last:border-none last:pb-0">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">{label}</p>
      <p className="mt-2 break-all text-sm text-stone-900">{value}</p>
    </div>
  );
}

function editionStatusLabel(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "공개중";
    case "DRAFT":
      return "초안";
    default:
      return status;
  }
}

function assetTypeLabel(assetType: string) {
  switch (assetType) {
    case "IMAGE":
      return "이미지";
    case "VIDEO":
      return "영상";
    case "MESSAGE":
      return "메시지";
    default:
      return assetType;
  }
}

function inputTypeLabel(inputType: string) {
  switch (inputType) {
    case "TEXT":
      return "한 줄 입력";
    case "TEXTAREA":
      return "긴 글 입력";
    case "DATE":
      return "날짜";
    case "VIDEO_PICKER":
      return "영상 선택";
    case "IMAGE_URL":
      return "이미지 링크";
    default:
      return inputType;
  }
}

function buildQuickPreviewImages(
  coverImageUrl: string,
  imageAssets: CuratedAsset[],
) {
  const previewItems = [
    { label: "표지", url: coverImageUrl },
    ...imageAssets.slice(0, 2).map((asset, index) => ({
      label: `내지 ${index + 1}`,
      url: asset.content,
    })),
  ];

  const seen = new Set<string>();
  return previewItems.filter((item) => {
    if (!item.url || seen.has(item.url)) {
      return false;
    }
    seen.add(item.url);
    return true;
  });
}
