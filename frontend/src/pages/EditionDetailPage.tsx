import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEdition } from "../api/editions";
import { createProject } from "../api/projects";
import type { EditionDetail } from "../types/api";
import VerifiedBadge from "../components/VerifiedBadge";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";

export default function EditionDetailPage() {
  const { editionId } = useParams<{ editionId: string }>();
  const navigate = useNavigate();
  const [edition, setEdition] = useState<EditionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!editionId) return;
    getEdition(Number(editionId))
      .then(setEdition)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [editionId]);

  async function startProject(mode: "demo" | "youtube") {
    if (!edition) return;
    setCreating(true);
    try {
      const res = await createProject({
        editionId: edition.id,
        mode,
      });
      navigate(`/projects/${res.projectId}/personalize`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "프로젝트 생성 실패");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  if (!edition) return <ErrorBox message="에디션을 찾을 수 없습니다." />;

  const snap = edition.snapshot;
  const intro = snap?.officialIntro as Record<string, string> | undefined;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-80 shrink-0">
          <div className="rounded-xl overflow-hidden border border-neutral-800 shadow-lg shadow-brand-900/10">
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
            <span className={`text-xs px-2 py-0.5 rounded ${edition.status === "PUBLISHED" ? "bg-green-600/20 text-green-400" : "bg-neutral-700 text-neutral-400"}`}>
              {edition.status}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white">{edition.title}</h1>
          {edition.subtitle && (
            <p className="mt-2 text-neutral-400">{edition.subtitle}</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            {edition.creator.avatarUrl && (
              <img
                src={edition.creator.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full border border-neutral-700"
              />
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-white text-sm">
                  {edition.creator.displayName}
                </span>
                {edition.creator.verified && <VerifiedBadge />}
              </div>
              <span className="text-xs text-neutral-500">
                @{edition.creator.channelHandle}
              </span>
            </div>
          </div>

          {/* Official intro message */}
          {intro?.heading && (
            <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/50 p-5">
              <h3 className="text-sm font-semibold text-brand-400 mb-2">
                From the Creator
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {intro.heading}
              </p>
              {intro.body && (
                <p className="mt-2 text-sm text-neutral-400">{intro.body}</p>
              )}
            </div>
          )}

          {/* Curated assets */}
          {snap && snap.curatedAssets.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-300 mb-3">
                Curated Content
              </h3>
              <div className="space-y-2">
                {snap.curatedAssets.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-neutral-800 p-3 flex items-start gap-3"
                  >
                    <span className="text-xs font-mono text-brand-400 shrink-0 mt-0.5">
                      {a.assetType}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {a.title}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">
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
      <div className="mt-12 rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">
          나만의 책 만들기
        </h2>
        <p className="text-sm text-neutral-400 mb-6">
          모드를 선택하고 개인화를 시작하세요
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            disabled={creating}
            onClick={() => startProject("demo")}
            className="w-full sm:w-auto rounded-full border border-neutral-700 px-8 py-3 text-sm font-semibold text-neutral-300 hover:border-brand-500 hover:text-brand-400 transition-colors disabled:opacity-50"
          >
            Demo Mode
          </button>
          <button
            disabled={creating}
            onClick={() => startProject("youtube")}
            className="w-full sm:w-auto rounded-full bg-red-600 px-8 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1c.4-1.8.5-5.8.5-5.8s0-4-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z"/>
            </svg>
            YouTube 연동
          </button>
        </div>
        <p className="mt-4 text-xs text-neutral-600">
          YouTube 연동 시 Google 계정 로그인이 필요합니다
        </p>
      </div>
    </div>
  );
}
