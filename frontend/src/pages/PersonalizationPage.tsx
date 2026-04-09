import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPreview, updateProject } from "../api/projects";
import { analyzeChannel, getAuthUrl, getSubscriptions } from "../api/youtube";
import { ApiError } from "../api/client";
import type {
  ProjectPreview,
  PersonalizationField,
  YouTubeChannel,
  YouTubeVideo,
} from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";

export default function PersonalizationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [youtubeConnected, setYouTubeConnected] = useState(false);
  const [youtubeSyncing, setYouTubeSyncing] = useState(false);
  const [youtubeAnalyzing, setYouTubeAnalyzing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<YouTubeChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [topVideos, setTopVideos] = useState<YouTubeVideo[]>([]);

  useEffect(() => {
    if (!projectId) return;
    getPreview(Number(projectId))
      .then((p) => {
        setPreview(p);
        const initial = normalizePersonalizationData(p.personalizationData);
        setValues(initial);
        const initialChannelId = readChannelId(initial);
        setSelectedChannelId(initialChannelId);
        setTopVideos(readTopVideos(initial));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!preview || preview.mode !== "youtube") {
      return;
    }
    void syncYouTubeState();
  }, [preview]);

  async function syncYouTubeState() {
    setYouTubeSyncing(true);
    try {
      const nextSubscriptions = await getSubscriptions();
      setYouTubeConnected(true);
      setSubscriptions(nextSubscriptions);
      setSelectedChannelId((current) => {
        if (current && nextSubscriptions.some((item) => item.channelId === current)) {
          return current;
        }
        return nextSubscriptions[0]?.channelId ?? "";
      });
    } catch (e: unknown) {
      if (
        e instanceof ApiError &&
        (e.status === 401 || e.status === 400) &&
        (e.message.includes("YouTube session not connected") ||
          e.message.includes("YouTube access token missing"))
      ) {
        setYouTubeConnected(false);
        setSubscriptions([]);
        return;
      }
      setError(e instanceof Error ? e.message : "YouTube 구독 목록 불러오기 실패");
    } finally {
      setYouTubeSyncing(false);
    }
  }

  async function handleYouTubeConnect() {
    try {
      setError("");
      setInfoMessage("");
      const auth = await getAuthUrl();
      if (auth.enabled && auth.authUrl) {
        sessionStorage.setItem(
          "youtube:returnTo",
          `${location.pathname}${location.search}`,
        );
        window.location.href = auth.authUrl;
      } else {
        setError("YouTube 연동이 비활성화 상태입니다. (Google 자격증명 미설정)");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "YouTube 인증 URL 가져오기 실패");
    }
  }

  async function handleAnalyzeChannel() {
    const fanNickname = readStringValue(values.fanNickname).trim();
    if (!fanNickname) {
      setError("팬 닉네임을 먼저 입력해 주세요.");
      return;
    }
    if (!selectedChannelId) {
      setError("분석할 구독 채널을 선택해 주세요.");
      return;
    }

    setYoutubeStatus("", "");
    setYouTubeAnalyzing(true);
    try {
      const result = await analyzeChannel({
        channelId: selectedChannelId,
        fanNickname,
        favoriteVideoId: readStringValue(values.favoriteVideoId) || undefined,
        fanNote: readStringValue(values.fanNote) || undefined,
      });
      const nextValues = {
        ...values,
        ...normalizePersonalizationData(result.personalizationData),
      };
      setValues(nextValues);
      setTopVideos(result.topVideos);
      setInfoMessage("YouTube 데이터로 폼을 자동 채웠습니다. 필요한 내용만 다듬고 저장하면 됩니다.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "YouTube 분석 결과 반영 실패");
    } finally {
      setYouTubeAnalyzing(false);
    }
  }

  function setYoutubeStatus(nextError: string, nextInfo: string) {
    setError(nextError);
    setInfoMessage(nextInfo);
  }

  async function handleSave() {
    if (!projectId) return;
    setSaving(true);
    try {
      await updateProject(Number(projectId), values);
      navigate(`/projects/${projectId}/preview`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (error && !preview) return <ErrorBox message={error} />;
  if (!preview) return <ErrorBox message="프로젝트를 찾을 수 없습니다." />;

  const fields: PersonalizationField[] =
    preview.edition.snapshot?.personalizationFields ?? [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <ProjectStepper current="personalize" className="mb-8" />

      <h1 className="text-2xl font-bold text-stone-900 mb-2">
        나만의 정보 입력
      </h1>
      <p className="text-sm text-stone-600 mb-8">
        <span className="text-brand-700 font-medium">{preview.edition.title}</span>
        {" "}에디션을 나만의 것으로 만드세요.
      </p>

      {/* YouTube connect option */}
      {preview.mode === "youtube" && (
        <div className="rounded-2xl border border-red-200 bg-white/88 p-5 mb-8 shadow-sm shadow-red-100/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">
                YouTube 데이터 자동 채우기
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                구독 채널, 인기 영상 분석 결과를 자동으로 반영합니다
              </p>
              <p className="mt-2 text-xs text-stone-500">
                {youtubeConnected
                  ? "Google 계정 연동 완료. 채널을 선택한 뒤 자동 채우기를 누르세요."
                  : "먼저 Google 계정을 연결하면 구독 채널 목록을 불러올 수 있습니다."}
              </p>
            </div>
            <button
              onClick={handleYouTubeConnect}
              className="shrink-0 rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
            >
              {youtubeConnected ? "Google 다시 연결" : "Google 로그인"}
            </button>
          </div>

          {youtubeSyncing && (
            <p className="mt-4 text-xs text-stone-500">YouTube 연결 상태를 확인하는 중...</p>
          )}

          {youtubeConnected && (
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/80 p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <label
                    htmlFor="youtube-channel"
                    className="block text-xs font-medium text-stone-700 mb-1.5"
                  >
                    구독 채널 선택
                  </label>
                  <select
                    id="youtube-channel"
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                  >
                    <option value="">채널을 선택하세요</option>
                    {subscriptions.map((channel) => (
                      <option key={channel.channelId} value={channel.channelId}>
                        {channel.title}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!selectedChannelId || youtubeAnalyzing}
                  onClick={handleAnalyzeChannel}
                  className="rounded-full bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
                >
                  {youtubeAnalyzing ? "불러오는 중..." : "자동 채우기"}
                </button>
              </div>

              {subscriptions.length === 0 && !youtubeSyncing && (
                <p className="mt-3 text-xs text-stone-500">
                  읽어올 수 있는 구독 채널이 없습니다. 다른 계정으로 다시 연결하거나 직접 입력해 주세요.
                </p>
              )}

              {topVideos.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-stone-700 mb-2">불러온 인기 영상</p>
                  <div className="flex flex-wrap gap-2">
                    {topVideos.slice(0, 5).map((video) => (
                      <span
                        key={video.videoId}
                        className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600"
                      >
                        {video.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dynamic form fields */}
      <div className="space-y-5">
        {fields.length > 0 ? (
          fields.map((f) => (
            <div key={f.fieldKey}>
              <label
                htmlFor={f.fieldKey}
                className="block text-sm font-medium text-stone-700 mb-1.5"
              >
                {f.label}
                {f.required && (
                  <span className="text-red-400 ml-1">*</span>
                )}
              </label>
              {normalizeFieldType(f.inputType) === "textarea" ? (
                <textarea
                  id={f.fieldKey}
                  rows={3}
                  maxLength={f.maxLength ?? undefined}
                  value={readStringValue(values[f.fieldKey])}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.fieldKey]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white/85 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                  placeholder={f.label}
                />
              ) : normalizeFieldType(f.inputType) === "video_picker" ? (
                <select
                  id={f.fieldKey}
                  value={readStringValue(values[f.fieldKey])}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.fieldKey]: e.target.value }))
                  }
                  disabled={topVideos.length === 0}
                  className="w-full rounded-lg border border-stone-300 bg-white/85 px-4 py-2.5 text-sm text-stone-900 disabled:opacity-60 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                >
                  <option value="">
                    {preview.mode === "demo" 
                      ? "영상을 선택하세요 (Demo)" 
                      : topVideos.length === 0
                        ? "YouTube 데이터를 먼저 불러와 주세요"
                        : "가장 좋아하는 영상을 선택하세요"}
                  </option>
                  {topVideos.map((video) => (
                    <option key={video.videoId} value={video.videoId}>
                      {video.title}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={f.fieldKey}
                  type={resolveInputType(f.inputType)}
                  maxLength={f.maxLength ?? undefined}
                  value={readInputValue(f, values[f.fieldKey])}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.fieldKey]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white/85 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                  placeholder={f.label}
                />
              )}
              {f.maxLength && (
                <p className="mt-1 text-xs text-stone-500 text-right">
                  {readStringValue(values[f.fieldKey]).length}/{f.maxLength}
                </p>
              )}
            </div>
          ))
        ) : (
          <>
            <div>
              <label
                htmlFor="fanNickname"
                className="block text-sm font-medium text-stone-700 mb-1.5"
              >
                닉네임 <span className="text-red-400">*</span>
              </label>
              <input
                id="fanNickname"
                value={readStringValue(values.fanNickname)}
                onChange={(e) =>
                  setValues((v) => ({ ...v, fanNickname: e.target.value }))
                }
                className="w-full rounded-lg border border-stone-300 bg-white/85 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                placeholder="책에 들어갈 나의 닉네임"
              />
            </div>
            <div>
              <label
                htmlFor="favoriteMemory"
                className="block text-sm font-medium text-stone-700 mb-1.5"
              >
                가장 기억에 남는 순간
              </label>
              <textarea
                id="favoriteMemory"
                rows={3}
                value={readStringValue(values.favoriteMemory)}
                onChange={(e) =>
                  setValues((v) => ({ ...v, favoriteMemory: e.target.value }))
                }
                className="w-full rounded-lg border border-stone-300 bg-white/85 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                placeholder="크리에이터와 관련된 기억에 남는 순간을 적어주세요"
              />
            </div>
            <div>
              <label
                htmlFor="fanMessage"
                className="block text-sm font-medium text-stone-700 mb-1.5"
              >
                크리에이터에게 한마디
              </label>
              <textarea
                id="fanMessage"
                rows={2}
                value={readStringValue(values.fanMessage)}
                onChange={(e) =>
                  setValues((v) => ({ ...v, fanMessage: e.target.value }))
                }
                className="w-full rounded-lg border border-stone-300 bg-white/85 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                placeholder="짧은 메시지를 남겨주세요"
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}
      {infoMessage && (
        <p className="mt-4 text-sm text-emerald-400">{infoMessage}</p>
      )}

      <div className="mt-8 flex justify-end">
        <button
          disabled={saving}
          onClick={handleSave}
          className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
        >
          {saving ? "저장 중..." : "미리보기로 →"}
        </button>
      </div>
    </div>
  );
}

function normalizePersonalizationData(data: Record<string, unknown> | null | undefined) {
  const result: Record<string, unknown> = { ...(data ?? {}) };
  const subscribedSince = result.subscribedSince;
  if (typeof subscribedSince === "string" && subscribedSince.length >= 10) {
    result.subscribedSince = subscribedSince.slice(0, 10);
  }
  return result;
}

function normalizeFieldType(inputType: string) {
  return inputType.trim().toLowerCase();
}

function resolveInputType(inputType: string) {
  const normalized = normalizeFieldType(inputType);
  if (normalized === "date") {
    return "date";
  }
  if (normalized === "number") {
    return "number";
  }
  if (normalized === "image_url") {
    return "url";
  }
  return "text";
}

function readStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readInputValue(field: PersonalizationField, value: unknown) {
  if (normalizeFieldType(field.inputType) === "date") {
    return readStringValue(value).slice(0, 10);
  }
  return readStringValue(value);
}

function readChannelId(values: Record<string, unknown>) {
  const channel = values.channel;
  if (
    channel &&
    typeof channel === "object" &&
    "channelId" in channel &&
    typeof channel.channelId === "string"
  ) {
    return channel.channelId;
  }
  return "";
}

function readTopVideos(values: Record<string, unknown>): YouTubeVideo[] {
  const raw = values.topVideos;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    if (
      typeof item.videoId === "string" &&
      typeof item.title === "string" &&
      typeof item.thumbnailUrl === "string" &&
      typeof item.viewCount === "number" &&
      typeof item.publishedAt === "string"
    ) {
      return [item as YouTubeVideo];
    }
    return [];
  });
}
