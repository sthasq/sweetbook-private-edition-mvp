import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getEdition } from "../api/editions";
import { createProject } from "../api/projects";
import { getAvailability as getYouTubeAvailability } from "../api/youtube";
import type { EditionDetail } from "../types/api";
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
  if (error) return <ErrorBox message={error} />;
  if (!edition) return <ErrorBox message="에디션을 찾을 수 없습니다." />;

  const snap = edition.snapshot;
  const intro = snap?.officialIntro as Record<string, string> | undefined;
  const introTitle = intro?.title ?? intro?.heading;
  const introBody = intro?.message ?? intro?.body;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <ProjectStepper current="edition" className="mb-8" />

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-80 shrink-0">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg shadow-brand-100/40">
            <img
              src={edition.coverImageUrl || `https://picsum.photos/seed/ed${edition.id}/600/600`}
              alt={edition.title}
              className="w-full aspect-square object-cover"
            />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold tracking-widest uppercase text-gold-400 border border-gold-400/40 rounded px-2 py-0.5">
              Official Drop
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${edition.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
              {edition.status}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-stone-900">{edition.title}</h1>
          {edition.subtitle && (
            <p className="mt-2 text-stone-600">{edition.subtitle}</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            {edition.creator.avatarUrl && (
              <img
                src={edition.creator.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full border border-stone-200"
              />
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-stone-900 text-sm">
                  {edition.creator.displayName}
                </span>
                {edition.creator.verified && <VerifiedBadge />}
              </div>
              <span className="text-xs text-stone-500">
                @{edition.creator.channelHandle}
              </span>
            </div>
          </div>

          {/* Official intro message */}
          {introTitle && (
            <div className="mt-6 rounded-2xl border border-brand-100 bg-white/90 p-5 shadow-sm shadow-brand-100/40">
              <h3 className="text-sm font-semibold text-brand-700 mb-2">
                From the Creator
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed">
                {introTitle}
              </p>
              {introBody && (
                <p className="mt-2 text-sm text-stone-600">{introBody}</p>
              )}
            </div>
          )}

          {/* Curated assets */}
          {snap && snap.curatedAssets.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">
                Curated Content
              </h3>
              <div className="space-y-2">
                {snap.curatedAssets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white/80 p-3"
                  >
                    <span className="text-xs font-mono text-brand-600 shrink-0 mt-0.5">
                      {a.assetType}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {a.title}
                      </p>
                      <p className="text-xs text-stone-600 mt-0.5 line-clamp-2">
                        {a.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-12 rounded-3xl border border-stone-200 bg-white/88 p-8 text-center shadow-sm shadow-brand-100/40">
        <h2 className="text-xl font-bold text-stone-900 mb-2">
          나만의 책 만들기
        </h2>
        <p className="text-sm text-stone-600 mb-6">
          먼저 데모 플로우로 핵심 주문 경험을 확인하고, 필요하면 YouTube 확장 모드를 사용하세요
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            disabled={creating}
            onClick={() => startProject("demo")}
            className="w-full sm:w-auto rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
          >
            Demo로 바로 시작
          </button>
          <button
            disabled={creating || youtubeAvailabilityLoading || !youtubeEnabled}
            onClick={() => startProject("youtube")}
            className="w-full sm:w-auto rounded-full border border-red-300 bg-white px-8 py-3 text-sm font-semibold text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1c.4-1.8.5-5.8.5-5.8s0-4-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z"/>
            </svg>
            YouTube 확장 모드
          </button>
        </div>
        <p className="mt-4 text-xs text-stone-500">
          {youtubeAvailabilityLoading
            ? "YouTube 확장 모드 사용 가능 여부를 확인하는 중입니다."
            : youtubeEnabled
              ? "YouTube 확장 모드는 Google 계정 로그인 후 사용할 수 있습니다."
              : "현재 환경에서는 Google 자격증명이 없어 YouTube 확장 모드가 비활성화되어 있습니다."}
        </p>
      </div>
    </div>
  );
}
