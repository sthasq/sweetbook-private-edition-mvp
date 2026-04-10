import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getEdition } from "../api/editions";
import { createProject } from "../api/projects";
import { getAvailability as getYouTubeAvailability } from "../api/youtube";
import type { CuratedAsset, EditionDetail } from "../types/api";
import { useAuth } from "../auth/AuthContext";
import VerifiedBadge from "../components/VerifiedBadge";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";

export default function EditionDetailPage() {
  const { editionId } = useParams<{ editionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [edition, setEdition] = useState<EditionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [youtubeEnabled, setYouTubeEnabled] = useState(false);
  const [youtubeAvailabilityLoading, setYouTubeAvailabilityLoading] =
    useState(true);
  const autoStartTriggered = useRef(false);

  useEffect(() => {
    if (!editionId) return;
    getEdition(Number(editionId))
      .then(setEdition)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [editionId]);

  useEffect(() => {
    getYouTubeAvailability()
      .then((result) => setYouTubeEnabled(result.enabled))
      .catch(() => setYouTubeEnabled(false))
      .finally(() => setYouTubeAvailabilityLoading(false));
  }, []);

  async function startProject(mode: "demo" | "youtube") {
    if (mode === "youtube" && !youtubeEnabled) {
      return;
    }
    return startProjectInternal(mode, false);
  }

  async function startProjectInternal(
    mode: "demo" | "youtube",
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

  const handleAutoStart = useEffectEvent((mode: "demo" | "youtube") => {
    void startProjectInternal(mode, true);
  });

  useEffect(() => {
    const startMode = searchParams.get("startMode");
    if (!edition || !user || autoStartTriggered.current) {
      return;
    }
    if (startMode !== "demo" && startMode !== "youtube") {
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

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl">
        <ProjectStepper current="edition" className="mb-10" />

        <section className="grid items-center gap-12 lg:grid-cols-12">
          <div className="relative lg:col-span-5 lg:pr-12">
            <div className="paper-stack relative">
              <div className="relative overflow-hidden rounded bg-white p-3 shadow-editorial">
                <div className="absolute right-6 top-6 z-10 rounded bg-gold-400/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-900">
                  Official edition
                </div>
                <img
                  src={
                    edition.coverImageUrl ||
                    `https://picsum.photos/seed/edition-detail-${edition.id}/900/1200`
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
                {edition.status === "PUBLISHED" ? "Published Drop" : edition.status}
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
                  Curated by
                </p>
                <p className="mt-1 text-lg text-stone-900">{edition.creator.displayName}</p>
                <p className="text-sm text-warm-500">@{edition.creator.channelHandle}</p>
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
                <p className="editorial-label">From The Creator</p>
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
                onClick={() => startProject("demo")}
                className="editorial-button-primary min-w-[220px]"
              >
                데모로 개인화 시작
              </button>
              <button
                disabled={creating || youtubeAvailabilityLoading || !youtubeEnabled}
                onClick={() => startProject("youtube")}
                className="editorial-button-secondary min-w-[220px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                YouTube 자동 채우기
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-warm-500">
              {youtubeAvailabilityLoading
                ? "YouTube 확장 모드 사용 가능 여부를 확인하는 중입니다."
                : youtubeEnabled
                  ? "Google 계정이 연결되면 구독 채널 기반 개인화 데이터를 자동으로 채울 수 있습니다."
                  : "현재 환경에서는 Google 자격 증명이 없어 YouTube 확장 모드를 사용할 수 없습니다."}
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </section>

        <section className="mt-20 grid gap-10 lg:grid-cols-12">
          <div className="editorial-panel p-8 lg:col-span-5">
            <p className="font-headline text-2xl italic text-brand-700">Official Artifacts</p>
            <p className="mt-3 text-sm leading-relaxed text-warm-500">
              크리에이터가 직접 큐레이션한 공식 메시지, 이미지, 기록이 모든 개인화 사본의
              공통 뼈대가 됩니다.
            </p>

            {officialAssets.length > 0 ? (
              <div className="mt-8 space-y-4">
                {officialAssets.slice(0, 4).map((asset) => (
                  <AssetRow key={asset.id} asset={asset} />
                ))}
              </div>
            ) : (
              <p className="mt-8 text-sm text-warm-500">
                아직 등록된 공식 자산이 없습니다. 스튜디오에서 메시지와 미디어를 채우면 이
                영역이 에디션의 고유한 아카이브가 됩니다.
              </p>
            )}
          </div>

          <div className="editorial-card p-8 lg:col-span-7 md:p-12">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="h-px w-10 bg-brand-700" />
                <p className="editorial-label text-brand-700">Your Unique Blueprint</p>
              </div>
              <h2 className="mt-5 text-4xl font-bold leading-tight text-stone-900">
                Personalized by you
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-warm-500">
                팬은 정해진 입력 항목을 통해 자신만의 관계의 시간, 기억, 메시지를 에디션 속에
                각인합니다.
              </p>
            </div>

            {fanFields.length > 0 ? (
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {fanFields.map((field) => (
                  <div key={field.id} className="rounded bg-surface-low px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
                      {field.required ? "Required field" : "Optional field"}
                    </p>
                    <p className="mt-3 text-xl text-brand-700">{field.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-warm-500">
                      입력 타입: {field.inputType}
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
                      Personal field
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
                <h2 className="text-3xl font-bold text-brand-700">Inside the Edition</h2>
                <p className="mt-4 text-sm leading-relaxed text-warm-500">
                  공식 자산은 본문과 분위기를 만들고, 팬의 입력은 그 안에서 개인만의 문장을
                  남깁니다.
                </p>
                {imageAssets.length > 0 && (
                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {imageAssets.slice(0, 2).map((asset) => (
                      <div key={asset.id} className="overflow-hidden rounded bg-white p-3 shadow-sm">
                        <img
                          src={asset.content || `https://picsum.photos/seed/asset-${asset.id}/800/600`}
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
                <p className="editorial-label text-gold-500">Print Spec</p>
                <div className="mt-5 space-y-5">
                  <SpecRow label="Book spec" value={snap?.bookSpecUid ?? "설정 전"} />
                  <SpecRow
                    label="Cover template"
                    value={snap?.sweetbookCoverTemplateUid ?? "설정 전"}
                  />
                  <SpecRow
                    label="Content template"
                    value={snap?.sweetbookContentTemplateUid ?? "설정 전"}
                  />
                  <SpecRow
                    label="Curated assets"
                    value={`${officialAssets.length} items`}
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
  return (
    <div className="rounded bg-white/80 px-5 py-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded bg-gold-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-500">
          {asset.assetType}
        </span>
        <p className="text-base font-semibold text-stone-900">{asset.title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-warm-500">{asset.content}</p>
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
