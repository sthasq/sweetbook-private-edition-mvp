import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
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
      setInfoMessage(
        "YouTube 데이터를 바탕으로 초안을 채웠습니다. 필요한 문장만 다듬고 저장하면 됩니다.",
      );
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
  const summaryEntries = buildSummaryEntries(values, fields);
  const previewTitle = summaryEntries[0]?.value ?? preview.edition.title;
  const previewSubtitle =
    summaryEntries[1]?.value ??
    "당신의 기억과 문장이 이 굿즈의 마지막 분위기를 완성합니다.";

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <ProjectStepper current="personalize" className="mb-10" />

        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <section className="min-w-0">
            <div className="mb-10">
              <p className="editorial-label">이제 내 얘기 넣기</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-brand-700 md:text-5xl">
                이제 내 이야기를 넣을 차례
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-warm-500">
                좋아하는 장면에 내 이야기를 더해 주세요. 입력 내용은 미리보기 단계에서 한 권의
                구성으로 합쳐집니다.
              </p>
            </div>

            {preview.mode === "youtube" && (
              <div className="editorial-card mb-8 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="editorial-label text-brand-700">YouTube로 먼저 채우기</p>
                    <p className="mt-3 text-lg font-semibold text-stone-900">
                      구독 채널과 대표 영상을 바탕으로 초안을 먼저 채울 수 있어요.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-warm-500">
                      {youtubeConnected
                        ? "채널을 고르고 채워보기를 누르면 지금 폼에 바로 들어와요."
                        : "Google 계정을 연결하면 YouTube 데이터를 가져올 수 있어요."}
                    </p>
                  </div>
                  <button onClick={handleYouTubeConnect} className="editorial-button-secondary">
                    {youtubeConnected ? "Google 다시 연결하기" : "Google 연결하기"}
                  </button>
                </div>

                {youtubeSyncing && (
                  <p className="mt-4 text-sm text-warm-500">YouTube 연결 상태 확인 중이에요.</p>
                )}

                {youtubeConnected && (
                  <div className="mt-6 rounded bg-surface-low px-5 py-5">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div>
                        <label htmlFor="youtube-channel" className="editorial-label text-warm-500">
                          구독 채널
                        </label>
                        <select
                          id="youtube-channel"
                          value={selectedChannelId}
                          onChange={(e) => setSelectedChannelId(e.target.value)}
                          className="editorial-input mt-2"
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
                        className="editorial-button-primary disabled:opacity-50"
                      >
                        {youtubeAnalyzing ? "불러오는 중..." : "채워보기"}
                      </button>
                    </div>

                    {subscriptions.length === 0 && !youtubeSyncing && (
                      <p className="mt-4 text-sm text-warm-500">
                        불러올 구독 채널이 없어요. 다른 계정으로 다시 연결하거나 직접 입력해
                        주세요.
                      </p>
                    )}

                    {topVideos.length > 0 && (
                      <div className="mt-5">
                        <p className="editorial-label text-warm-500">같이 불러온 영상</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {topVideos.slice(0, 5).map((video) => (
                            <span
                              key={video.videoId}
                              className="rounded bg-white px-3 py-2 text-xs text-warm-500 shadow-sm"
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

            <div className="space-y-8">
              {fields.length > 0 ? (
                fields.map((field) => (
                  <div key={field.fieldKey}>
                    <label htmlFor={field.fieldKey} className="block">
                      <span className="font-headline text-xl text-brand-700">{field.label}</span>
                      <span className="ml-3 text-xs uppercase tracking-[0.18em] text-warm-500">
                        {field.required ? "필수" : "선택"}
                      </span>
                    </label>
                    <div className="mt-3">
                      {renderField(
                        field,
                        values,
                        setValues,
                        topVideos,
                        preview.mode,
                      )}
                    </div>
                    {field.maxLength && (
                      <p className="mt-2 text-right text-[11px] uppercase tracking-[0.16em] text-warm-500">
                        {readStringValue(values[field.fieldKey]).length}/{field.maxLength}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <>
                  <FallbackField
                    label="닉네임"
                    fieldKey="fanNickname"
                    value={readStringValue(values.fanNickname)}
                    onChange={(next) =>
                      setValues((current) => ({ ...current, fanNickname: next }))
                    }
                  />
                  <FallbackTextarea
                    label="가장 기억에 남는 순간"
                    fieldKey="favoriteMemory"
                    value={readStringValue(values.favoriteMemory)}
                    onChange={(next) =>
                      setValues((current) => ({ ...current, favoriteMemory: next }))
                    }
                  />
                  <FallbackTextarea
                    label="크리에이터에게 한마디"
                    fieldKey="fanMessage"
                    value={readStringValue(values.fanMessage)}
                    onChange={(next) =>
                      setValues((current) => ({ ...current, fanMessage: next }))
                    }
                  />
                </>
              )}
            </div>

            {(error || infoMessage) && (
              <div className="mt-8 space-y-3">
                {error && <p className="text-sm text-red-600">{error}</p>}
                {infoMessage && <p className="text-sm text-brand-700">{infoMessage}</p>}
              </div>
            )}

            <div className="mt-10 flex items-center justify-between border-t border-stone-200/70 pt-8">
              <button
                type="button"
                onClick={() => navigate(`/editions/${preview.edition.id}`)}
                className="editorial-button-link"
              >
                에디션으로 돌아가기
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className="editorial-button-primary min-w-[220px] disabled:opacity-50"
              >
                {saving ? "저장 중..." : "다음으로 넘어가기"}
              </button>
            </div>
          </section>

          <section className="lg:sticky lg:top-28">
            <div className="editorial-panel overflow-hidden p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="editorial-label text-gold-500">옆에서 바로 보기</p>
                  <p className="mt-2 text-sm text-warm-500">{preview.edition.title}</p>
                </div>
                <div className="rounded bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                  초안
                </div>
              </div>

              <div className="editorial-card bg-[linear-gradient(180deg,#fffefb_0%,#f7f3ec_100%)] p-8">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-500">
                    지금 초안
                  </span>
                  <span className="rounded bg-gold-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-500">
                    기본 드롭
                  </span>
                </div>
                <h2 className="mt-8 text-3xl font-bold leading-tight text-brand-700">
                  {previewTitle}
                </h2>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">
                  {readStringValue(values.fanNickname)
                    ? `${readStringValue(values.fanNickname)}님을 위한 미리보기`
                    : "당신을 위한 미리보기"}
                </p>

                <div className="mt-8 overflow-hidden rounded">
                  <img
                    src={
                      preview.edition.coverImageUrl ||
                      `https://picsum.photos/seed/personalization-${preview.edition.id}/800/520`
                    }
                    alt={preview.edition.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>

                <p className="mt-8 text-sm leading-relaxed text-stone-800">
                  {previewSubtitle}
                </p>

                <div className="mt-8 space-y-4 border-t border-stone-200/70 pt-6">
                  {summaryEntries.slice(0, 4).map((entry) => (
                    <div key={entry.label}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                        {entry.label}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-stone-900">{entry.value}</p>
                    </div>
                  ))}
                  {summaryEntries.length === 0 && (
                    <p className="text-sm leading-relaxed text-warm-500">
                      입력이 시작되면 이 영역에 실제 미리보기용 문장이 차곡차곡 정리됩니다.
                    </p>
                  )}
                </div>
              </div>

              {topVideos.length > 0 && (
                <div className="mt-6 rounded bg-white/80 p-5 shadow-sm">
                  <p className="editorial-label text-brand-700">가져온 영상</p>
                  <div className="mt-4 space-y-3">
                    {topVideos.slice(0, 3).map((video) => (
                      <div key={video.videoId} className="flex items-center gap-3">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="h-14 w-20 rounded object-cover"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm text-stone-900">{video.title}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-warm-500">
                            {new Date(video.publishedAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function renderField(
  field: PersonalizationField,
  values: Record<string, unknown>,
  setValues: Dispatch<SetStateAction<Record<string, unknown>>>,
  topVideos: YouTubeVideo[],
  mode: string,
) {
  const normalizedType = normalizeFieldType(field.inputType);

  if (normalizedType === "textarea") {
    return (
      <textarea
        id={field.fieldKey}
        rows={5}
        maxLength={field.maxLength ?? undefined}
        value={readStringValue(values[field.fieldKey])}
        onChange={(e) =>
          setValues((current) => ({ ...current, [field.fieldKey]: e.target.value }))
        }
        className="editorial-input min-h-[160px] resize-none"
        placeholder={field.label}
      />
    );
  }

  if (normalizedType === "video_picker") {
    return (
      <select
        id={field.fieldKey}
        value={readStringValue(values[field.fieldKey])}
        onChange={(e) =>
          setValues((current) => ({ ...current, [field.fieldKey]: e.target.value }))
        }
        disabled={topVideos.length === 0}
        className="editorial-input disabled:opacity-60"
      >
        <option value="">
          {mode === "demo"
            ? "영상 선택 (Demo)"
            : topVideos.length === 0
              ? "YouTube 데이터를 먼저 불러와 주세요"
              : "대표 영상을 선택하세요"}
        </option>
        {topVideos.map((video) => (
          <option key={video.videoId} value={video.videoId}>
            {video.title}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={field.fieldKey}
      type={resolveInputType(field.inputType)}
      maxLength={field.maxLength ?? undefined}
      value={readInputValue(field, values[field.fieldKey])}
      onChange={(e) =>
        setValues((current) => ({ ...current, [field.fieldKey]: e.target.value }))
      }
      className="editorial-input"
      placeholder={field.label}
    />
  );
}

function FallbackField({
  label,
  fieldKey,
  value,
  onChange,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <label htmlFor={fieldKey} className="font-headline text-xl text-brand-700">
        {label}
      </label>
      <input
        id={fieldKey}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="editorial-input mt-3"
        placeholder={label}
      />
    </div>
  );
}

function FallbackTextarea({
  label,
  fieldKey,
  value,
  onChange,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <label htmlFor={fieldKey} className="font-headline text-xl text-brand-700">
        {label}
      </label>
      <textarea
        id={fieldKey}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="editorial-input mt-3 min-h-[160px] resize-none"
        placeholder={label}
      />
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

function buildSummaryEntries(
  values: Record<string, unknown>,
  fields: PersonalizationField[],
) {
  const candidates = fields.length > 0
    ? fields.map((field) => ({
        label: field.label,
        value: readStringValue(values[field.fieldKey]).trim(),
      }))
    : Object.entries(values).map(([key, value]) => ({
        label: key,
        value: readStringValue(value).trim(),
      }));

  return candidates.filter((item) => item.value.length > 0);
}
