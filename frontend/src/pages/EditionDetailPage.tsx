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
import { formatBookSpecLabel, formatTemplateLabel } from "../lib/sweetbookDisplay";
import { estimateEditionPricing } from "../lib/sweetbookWorkflow";
import { imageObjectPosition } from "../lib/imageFocus";
import { resolveMediaUrl } from "../lib/appPaths";

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
  const officialAssets = snap?.curatedAssets ?? [];
  const fanFields = snap?.personalizationFields ?? [];
  const imageAssets = officialAssets.filter((asset) => asset.assetType === "IMAGE");
  const pricingHint = estimateEditionPricing(snap?.bookSpecUid);
  const quickPreviewImages = buildQuickPreviewImages(
    edition.coverImageUrl,
    imageAssets,
  );

  return (
    <div className="page-shell-narrow mx-auto">
      <ProjectStepper current="edition" className="mb-10" />
      
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-12">
        <div className="min-w-0 space-y-12">
          {/* Main Info */}
          <section className="editorial-card overflow-hidden p-6 md:p-10">
            <div className="grid items-start gap-10 md:grid-cols-2">
              <div className="relative">
                <div className="paper-stack relative aspect-[4/5] w-full">
                  <img
                    src={resolveMediaUrl(edition.coverImageUrl)}
                    alt={edition.title}
                    className="absolute inset-0 h-full w-full rounded border border-slate-200/50 object-cover shadow-sm"
                  />
                  <div className="absolute right-4 top-4 z-10 rounded bg-slate-900/90 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-white backdrop-blur">
                    NOW OPEN
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded bg-slate-100 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-slate-600">
                    {editionStatusLabel(edition.status)}
                  </span>
                  {edition.creator.verified && <VerifiedBadge />}
                </div>

                <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
                  {edition.title}
                </h1>
                
                {edition.subtitle && (
                  <p className="mt-4 text-lg leading-relaxed text-slate-500">
                    {edition.subtitle}
                  </p>
                )}

                <div className="mt-8 flex items-center gap-4 rounded-lg bg-slate-50 p-4 border border-slate-100">
                  {edition.creator.avatarUrl && (
                    <img
                      src={resolveMediaUrl(edition.creator.avatarUrl)}
                      alt={edition.creator.displayName}
                      className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                  )}
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400">
                      CREATOR
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {edition.creator.displayName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

        <section className="grid gap-10 lg:grid-cols-12">
          <div className="editorial-panel p-8 lg:col-span-5">
            <p className="font-headline text-2xl italic text-slate-900">에디션에 담긴 장면</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              크리에이터가 직접 고른 메시지와 이미지가 포토북의 분위기를 만들어줘요.
            </p>

            {officialAssets.length > 0 ? (
              <div className="mt-8 space-y-4">
                {officialAssets.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} />
                ))}
              </div>
            ) : (
              <p className="mt-8 text-sm text-slate-500">
                크리에이터가 장면을 준비 중이에요. 곧 새로운 콘텐츠로 채워집니다.
              </p>
            )}
          </div>

          <div className="editorial-card p-8 lg:col-span-7">
            <h2 className="text-3xl font-bold text-slate-900">포토북 미리보기</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              크리에이터가 담은 장면 위에 나의 이야기가 더해져 한 권의 포토북이 완성돼요.
            </p>
            {imageAssets.length > 0 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {imageAssets.map((asset) => (
                  <div key={asset.id} className="overflow-hidden rounded bg-slate-50 border border-slate-100 p-3 shadow-sm">
                    <img
                      src={resolveMediaUrl(asset.content || edition.coverImageUrl)}
                      alt={asset.title}
                      className="aspect-[4/3] w-full rounded object-cover"
                      style={{ objectPosition: imageObjectPosition(asset.content) }}
                    />
                    <p className="mt-4 text-sm font-semibold text-slate-900">{asset.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded bg-slate-50 border border-slate-100 px-5 py-10 text-center text-sm leading-relaxed text-slate-500">
                미리보기 이미지를 준비 중이에요. 공식 장면이 추가되면 이곳에 바로 보여드릴게요.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-12">
          <div className="editorial-card p-8 lg:col-span-7 md:p-12">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="h-px w-10 bg-brand-700" />
                <p className="editorial-label text-slate-900">여기서부터 내 버전</p>
              </div>
              <h2 className="mt-5 text-4xl font-bold leading-tight text-slate-900">
                내 이야기로 채우기
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                몇 가지 질문에 나만의 답을 적으면, 같은 에디션도 완전히 다른 포토북이 됩니다.
              </p>
            </div>

            {fanFields.length > 0 ? (
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {fanFields.map((field) => (
                  <div key={field.id} className="rounded bg-slate-50 border border-slate-100 px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {field.required ? "필수 입력" : "선택 입력"}
                    </p>
                    <p className="mt-3 text-xl text-slate-900">{field.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
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
                  <div key={label} className="rounded bg-slate-50 border border-slate-100 px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      개인화 항목
                    </p>
                    <p className="mt-3 text-xl text-slate-900">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="editorial-card p-8 lg:col-span-5">
            <p className="editorial-label text-slate-600">한눈에 보기</p>
            {quickPreviewImages.length > 0 && (
              <div className="mt-5 rounded bg-slate-50 border border-slate-100 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  미리보기 구성
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(148px,0.85fr)]">
                  <div className="overflow-hidden rounded bg-white p-2 shadow-sm">
                    <div className="relative overflow-hidden rounded">
                      <img
                        src={resolveMediaUrl(quickPreviewImages[0].url)}
                        alt={quickPreviewImages[0].label}
                        className="aspect-[4/5] w-full object-cover"
                        style={{
                          objectPosition: imageObjectPosition(
                            resolveMediaUrl(quickPreviewImages[0].url),
                          ),
                        }}
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-900 shadow-sm">
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
                              src={resolveMediaUrl(image.url)}
                              alt={image.label}
                              className="aspect-[4/5] w-full object-cover"
                              style={{
                                objectPosition: imageObjectPosition(
                                  resolveMediaUrl(image.url),
                                ),
                              }}
                            />
                            <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
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
        </section>

        </div>

        <aside className="mt-10 h-fit lg:sticky lg:top-28 lg:mt-0 lg:self-start">
          <div className="editorial-card p-6 md:p-7 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <p className="editorial-label text-slate-900">질문으로 포토북 만들기</p>
            <h2 className="mt-4 text-2xl font-bold leading-tight text-slate-900">
              몇 가지 답변만 남기면
              <br />
              바로 내 책 초안이 잡혀요
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              LLM이 개인화 내용을 정리해주고, 곧바로 내 포토북 미리보기까지 이어집니다.
            </p>

            <button
              disabled={creating}
              onClick={() => startProject()}
              className="editorial-button-primary mt-6 w-full"
            >
              {creating ? "준비 중..." : "질문으로 포토북 만들기"}
            </button>

            <div className="mt-6 rounded bg-slate-50 border border-slate-100 px-5 py-5">
              <p className="editorial-label text-slate-900">예상 가격</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {pricingHint.productPrice.toLocaleString("ko-KR")}원~
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                1권 기준 예상 가격이에요. 배송비는 배송지 입력 시 자동으로 계산됩니다.
              </p>
            </div>

            <div className="mt-4 rounded bg-slate-50 border border-slate-100 px-5 py-5">
              <p className="editorial-label text-slate-900">제작 방식</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">LLM 대화형 추천</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                질문에 답하면 분위기와 문장을 먼저 정리해주고, 필요한 경우 바로 다듬어 볼 수 있어요.
              </p>
            </div>

            {error && (
              <p className="mt-4 text-sm leading-relaxed text-red-600">{error}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function AssetRow({ asset }: { asset: CuratedAsset }) {
  const summary =
    asset.assetType === "IMAGE"
      ? "포토북 전체 분위기를 만들어주는 대표 이미지예요."
      : asset.content;

  return (
    <div className="rounded bg-white border border-slate-100 px-5 py-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {assetTypeLabel(asset.assetType)}
        </span>
        <p className="text-base font-semibold text-slate-900">{asset.title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">{summary}</p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-none last:pb-0">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm text-slate-900">{value}</p>
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
    ...imageAssets.slice(0, 5).map((asset, index) => ({
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


