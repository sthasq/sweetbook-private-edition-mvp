import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { generateAiCollab, getPreview, updateProject } from "../api/projects";
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
import {
  getFieldHelper,
  getFieldPlaceholder,
} from "../lib/personalizationFieldCopy";
import {
  generatePaniCollabCandidates,
  PANI_COLLAB_ASSET_VERSION,
  PANI_COLLAB_OFFICIAL_PHOTO,
  isPaniBottleEdition,
  PANI_COLLAP_TEMPLATES,
  readAssetImageForCollab,
  readImageFileForCollab,
} from "../lib/paniCollab";
import type { PaniCollabCandidate, PaniCollabTemplateKey } from "../lib/paniCollab";

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
  const [collabSourceUrl, setCollabSourceUrl] = useState("");
  const [collabSourceName, setCollabSourceName] = useState("");
  const [selectedCollabTemplate, setSelectedCollabTemplate] =
    useState<PaniCollabTemplateKey>("travel-selfie");
  const [collabGenerating, setCollabGenerating] = useState(false);
  const [collabCandidates, setCollabCandidates] = useState<PaniCollabCandidate[]>([]);
  const [collabDragActive, setCollabDragActive] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    getPreview(Number(projectId))
      .then((p) => {
        setPreview(p);
        const initial = normalizePersonalizationData(
          p.personalizationData,
          p.edition.id,
        );
        setValues(initial);
        if (wasPaniCollabReset(p.personalizationData, initial)) {
          setInfoMessage(
            "빠니보틀 공식 사진 자산이 바뀌어서 저장된 콜라보 컷을 한 번 비웠어요. 새로 생성하면 최신 컷으로 다시 들어갑니다.",
          );
        }
        const savedTemplate = readCollabTemplateKey(initial.aiCollabTemplate);
        if (savedTemplate) {
          setSelectedCollabTemplate(savedTemplate);
        }
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
    if (!selectedChannelId) {
      setError("분석할 구독 채널을 선택해 주세요.");
      return;
    }

    const fanNickname = readStringValue(values.fanNickname).trim();
    setYoutubeStatus("", "");
    setYouTubeAnalyzing(true);
    try {
      const result = await analyzeChannel({
        channelId: selectedChannelId,
        fanNickname: fanNickname || undefined,
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

  async function handleCollabFileChange(file: File | null) {
    if (!file) {
      return;
    }

    try {
      setError("");
      setInfoMessage("");
      const nextSourceUrl = await readImageFileForCollab(file);
      setCollabSourceUrl(nextSourceUrl);
      setCollabSourceName(file.name);
      setCollabCandidates([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "업로드 이미지를 준비하지 못했어요.");
    }
  }

  function clearCollabSource() {
    setCollabSourceUrl("");
    setCollabSourceName("");
    setCollabCandidates([]);
  }

  async function handleCollabDrop(file: File | null) {
    setCollabDragActive(false);
    await handleCollabFileChange(file);
  }

  async function handleUseSampleCollabSource() {
    try {
      setError("");
      setInfoMessage("");
      setCollabSourceUrl("/demo-assets/fan-collab-sample.svg");
      setCollabSourceName("과제용 샘플 팬 이미지");
      setCollabCandidates([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "샘플 이미지를 불러오지 못했어요.");
    }
  }

  async function handleGenerateCollab() {
    if (!collabSourceUrl) {
      setError("먼저 같이 넣을 사진을 한 장 골라 주세요.");
      return;
    }
    if (!projectId) {
      setError("프로젝트 정보를 찾지 못했어요.");
      return;
    }

    setError("");
    setInfoMessage("");
    setCollabGenerating(true);
    try {
      const sourceImageUrl = collabSourceUrl.startsWith("/")
        ? await readAssetImageForCollab(collabSourceUrl)
        : collabSourceUrl;
      const officialImageUrl = await readAssetImageForCollab(PANI_COLLAB_OFFICIAL_PHOTO);
      const aiResult = await generateAiCollab(Number(projectId), {
        templateKey: selectedCollabTemplate,
        sourceImageUrl,
        officialImageUrl,
      });
      const nextCandidates = (aiResult.candidates.length > 0
        ? aiResult.candidates.map((candidate) => ({
            id: candidate.id,
            templateKey: readCollabTemplateKey(candidate.templateKey) ?? selectedCollabTemplate,
            label: candidate.label,
            caption: candidate.caption,
            imageUrl: candidate.imageUrl,
          }))
        : await generatePaniCollabCandidates(collabSourceUrl, selectedCollabTemplate)).slice(0, 1);
      setCollabCandidates(nextCandidates);
      applyCollabCandidate(nextCandidates[0]);
      setInfoMessage(`OpenRouter ${aiResult.model}로 공식 콜라보 컷 초안을 만들었어요.`);
    } catch (e: unknown) {
      const fallbackReason =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : "AI 생성 응답을 확인하지 못했어요.";
      try {
        const nextCandidates = (await generatePaniCollabCandidates(
          collabSourceUrl,
          selectedCollabTemplate,
        )).slice(0, 1);
        setCollabCandidates(nextCandidates);
        applyCollabCandidate(nextCandidates[0]);
        setInfoMessage(`OpenRouter 응답이 "${fallbackReason}"라서 로컬 데모 컷으로 먼저 보여드렸어요.`);
      } catch {
        setError(e instanceof Error ? e.message : "공식 콜라보 컷 생성에 실패했어요.");
      }
    } finally {
      setCollabGenerating(false);
    }
  }

  function applyCollabCandidate(candidate: PaniCollabCandidate) {
    setValues((current) => ({
      ...current,
      aiCollabAssetVersion: PANI_COLLAB_ASSET_VERSION,
      aiCollabSelectedUrl: candidate.imageUrl,
      aiCollabTemplate: candidate.templateKey,
      aiCollabTemplateLabel: candidate.label,
    }));
  }

  if (loading) return <Spinner />;
  if (error && !preview) return <ErrorBox message={error} />;
  if (!preview) return <ErrorBox message="프로젝트를 찾을 수 없습니다." />;

  const fields: PersonalizationField[] =
    preview.edition.snapshot?.personalizationFields ?? [];
  const paniCollabEnabled = isPaniBottleEdition(preview.edition.id);
  const orderedFields = orderFieldsForMode(fields, preview.mode);
  const summaryEntries = buildSummaryEntries(values, orderedFields, topVideos);
  const previewTitle = preview.edition.title;
  const previewSubtitle =
    resolvePreviewSubtitle(values) ??
    "나의 이야기가 이 포토북의 마지막 분위기를 완성해요.";
  const selectedCollabImage = readStringValue(values.aiCollabSelectedUrl);
  const selectedCollabLabel = readStringValue(values.aiCollabTemplateLabel);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <ProjectStepper current="personalize" className="mb-10" />

        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <section className="min-w-0">
            <div className="mb-10">
              <p className="editorial-label">개인화</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-brand-700 md:text-5xl">
                나만의 이야기를 담아주세요
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-warm-500">
                아래 항목을 채우면 크리에이터의 장면과 합쳐져 세상에 하나뿐인 포토북이 만들어져요.
              </p>
            </div>

            {preview.mode === "youtube" && (
              <div className="editorial-card mb-8 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="editorial-label text-brand-700">YouTube 연동</p>
                    <p className="mt-3 text-lg font-semibold text-stone-900">
                      YouTube 활동을 바탕으로 빠르게 채워보세요
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-warm-500">
                      {youtubeConnected
                        ? "채널과 영상을 먼저 불러온 뒤, 나머지는 자유롭게 수정하면 돼요."
                        : "Google 계정을 연결하면 구독 채널과 영상 정보를 가져올 수 있어요."}
                    </p>
                  </div>
                  <button onClick={handleYouTubeConnect} className="editorial-button-secondary">
                    {youtubeConnected ? "Google 다시 연결하기" : "Google 연결하기"}
                  </button>
                </div>

                {youtubeSyncing && (
                  <p className="mt-4 text-sm text-warm-500">YouTube 연결 상태를 확인하고 있어요.</p>
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

            {paniCollabEnabled && (
              <div className="editorial-card mb-8 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="editorial-label text-brand-700">공식 콜라보 컷 만들기</p>
                    <p className="mt-3 text-lg font-semibold text-stone-900">
                      내 사진을 빠니보틀 여행 무드에 맞춰 한 장의 기념컷으로 바꿔볼 수 있어요.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-warm-500">
                      지금은 빠니보틀 에디션에서만 열리고, 포토리얼 합성 대신 여행 무드에 맞춘
                      스타일 컷으로 정리해 줍니다.
                    </p>
                  </div>
                  <span className="rounded bg-gold-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-500">
                    빠니보틀 전용
                  </span>
                </div>

                <div className="mt-6 rounded bg-surface-low px-5 py-5">
                  <label
                    htmlFor="pani-collab-upload"
                    className="editorial-label text-warm-500"
                  >
                    같이 넣을 사진
                  </label>
                  <div
                    className={`mt-2 rounded border border-dashed px-4 py-5 transition ${
                      collabDragActive
                        ? "border-brand-700 bg-brand-700/5"
                        : "border-stone-300 bg-white/80"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setCollabDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setCollabDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      void handleCollabDrop(e.dataTransfer.files?.[0] ?? null);
                    }}
                  >
                    <p className="text-sm font-semibold text-stone-900">
                      버튼으로 고르거나 여기에 사진을 끌어다 놓아도 됩니다.
                    </p>
                    <input
                      id="pani-collab-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        void handleCollabFileChange(e.target.files?.[0] ?? null);
                        e.currentTarget.value = "";
                      }}
                      className="editorial-input mt-3 cursor-pointer file:mr-4 file:rounded-full file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                    />
                    <div className="mt-4 flex items-center gap-4">
                      {collabSourceUrl ? (
                        <img
                          src={collabSourceUrl}
                          alt="선택한 콜라보 소스 이미지"
                          className="h-20 w-20 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded bg-surface-low text-xs text-warm-500">
                          사진 없음
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {collabSourceName || "아직 선택한 파일이 없어요."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleUseSampleCollabSource()}
                      className="editorial-button-secondary"
                    >
                      샘플 팬 이미지로 테스트하기
                    </button>
                    {collabSourceUrl && (
                      <button
                        type="button"
                        onClick={clearCollabSource}
                        className="editorial-button-secondary"
                      >
                        선택 초기화
                      </button>
                    )}
                  </div>
                  <input
                    readOnly
                    value={collabSourceName}
                    className="editorial-input mt-3"
                    placeholder="선택한 파일명이 여기 표시됩니다"
                  />
                  <p className="mt-3 text-sm leading-relaxed text-warm-500">
                    업로드한 원본은 이 화면에서만 쓰고, 저장되는 건 선택한 결과 컷 한 장입니다.
                  </p>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {PANI_COLLAP_TEMPLATES.map((template) => {
                      const selected = template.key === selectedCollabTemplate;
                      return (
                        <button
                          key={template.key}
                          type="button"
                          onClick={() => setSelectedCollabTemplate(template.key)}
                          className={`rounded border px-4 py-4 text-left transition ${
                            selected
                              ? "border-brand-700 bg-white shadow-sm"
                              : "border-stone-200/70 bg-white/70"
                          }`}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-500">
                            {template.badge}
                          </p>
                          <p className="mt-2 text-base font-semibold text-stone-900">
                            {template.label}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-warm-500">
                            {template.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      {collabSourceUrl ? (
                        <img
                          src={collabSourceUrl}
                          alt="콜라보 컷 생성에 사용할 업로드 이미지"
                          className="h-20 w-20 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded bg-white text-xs text-warm-500">
                          사진 준비
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          선택한 템플릿:{" "}
                          {
                            PANI_COLLAP_TEMPLATES.find((template) => template.key === selectedCollabTemplate)
                              ?.label
                          }
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-warm-500">
                          여행 무드 한 장을 만들어서 바로 아래에서 확인할 수 있어요.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateCollab}
                      disabled={!collabSourceUrl || collabGenerating}
                      className="editorial-button-primary disabled:opacity-50"
                    >
                      {collabGenerating ? "생성 중..." : "공식 콜라보 컷 만들기"}
                    </button>
                  </div>

                  {collabCandidates.length > 0 && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {collabCandidates.map((candidate) => {
                        const selected = candidate.imageUrl === selectedCollabImage;
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => applyCollabCandidate(candidate)}
                            className={`overflow-hidden rounded border text-left transition ${
                              selected
                                ? "border-brand-700 bg-white shadow-sm"
                                : "border-stone-200/70 bg-white/80"
                            }`}
                          >
                            <img
                              src={candidate.imageUrl}
                              alt={candidate.caption}
                              className="aspect-[4/3] w-full object-cover"
                            />
                            <div className="px-4 py-4">
                              <p className="text-sm font-semibold text-stone-900">
                                {candidate.caption}
                              </p>
                              <p className="mt-2 text-sm text-warm-500">
                                {selected ? "현재 선택된 컷" : "이 컷으로 미리보기에 반영하기"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {collabCandidates.length === 0 && selectedCollabImage && (
                    <div className="mt-6 overflow-hidden rounded border border-stone-200/70 bg-white">
                      <img
                        src={selectedCollabImage}
                        alt={selectedCollabLabel || "저장된 공식 콜라보 컷"}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <div className="px-4 py-4">
                        <p className="text-sm font-semibold text-stone-900">
                          {selectedCollabLabel || "저장된 공식 콜라보 컷"}
                        </p>
                        <p className="mt-2 text-sm text-warm-500">
                          이미 저장된 결과예요. 사진을 다시 올리면 새 후보를 만들 수 있습니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-8">
              {fields.length > 0 ? (
                orderedFields.map((field) => (
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
                    {getFieldHelper(field.fieldKey) && (
                      <p className="mt-3 text-sm leading-relaxed text-warm-500">
                        {getFieldHelper(field.fieldKey)}
                      </p>
                    )}
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
                {saving ? "저장 중..." : "미리보기로 이동"}
              </button>
            </div>
          </section>

          <section className="lg:sticky lg:top-28">
            <div className="editorial-panel overflow-hidden p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="editorial-label text-gold-500">실시간 미리보기</p>
                  <p className="mt-2 text-sm text-warm-500">{preview.edition.title}</p>
                </div>
                <div className="rounded bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                  초안
                </div>
              </div>

              <div className="editorial-card bg-[linear-gradient(180deg,#fffefb_0%,#f7f3ec_100%)] p-8">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-500">
                    작성 중
                  </span>
                  <span className="rounded bg-gold-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-500">
                    공식 에디션
                  </span>
                </div>
                <h2 className="mt-8 text-3xl font-bold leading-tight text-brand-700">
                  {previewTitle}
                </h2>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">
                  {readStringValue(values.fanNickname)
                    ? `${readStringValue(values.fanNickname)}님의 포토북`
                    : "나만의 포토북"}
                </p>

                <div className="mt-8 overflow-hidden rounded">
                  <img
                      src={
                        preview.edition.coverImageUrl ||
                      "/demo-assets/playpick-hero.svg"
                      }
                    alt={preview.edition.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>

                <p className="mt-8 text-sm leading-relaxed text-stone-800">
                  {previewSubtitle}
                </p>

                {selectedCollabImage && (
                  <div className="mt-8 rounded bg-white/80 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="editorial-label text-brand-700">공식 콜라보 컷</p>
                        <p className="mt-2 text-sm text-stone-900">
                          {selectedCollabLabel || "빠니보틀 여행 무드 컷"}
                        </p>
                      </div>
                      <span className="rounded bg-gold-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-500">
                        MVP
                      </span>
                    </div>
                    <img
                      src={selectedCollabImage}
                      alt={selectedCollabLabel || "공식 콜라보 컷"}
                      className="mt-4 aspect-[4/3] w-full rounded object-cover"
                    />
                  </div>
                )}

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
                      항목을 채우기 시작하면 여기에 내용이 하나씩 정리돼요.
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
        placeholder={getFieldPlaceholder(field.fieldKey, field.label)}
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
      placeholder={getFieldPlaceholder(field.fieldKey, field.label)}
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
        placeholder={getFieldPlaceholder(fieldKey, label)}
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
        placeholder={getFieldPlaceholder(fieldKey, label)}
      />
    </div>
  );
}

function normalizePersonalizationData(
  data: Record<string, unknown> | null | undefined,
  editionId?: number,
) {
  const result: Record<string, unknown> = { ...(data ?? {}) };
  const subscribedSince = result.subscribedSince;
  if (typeof subscribedSince === "string" && subscribedSince.length >= 10) {
    result.subscribedSince = subscribedSince.slice(0, 10);
  }

  if (
    editionId === 1 &&
    typeof result.aiCollabSelectedUrl === "string" &&
    result.aiCollabSelectedUrl.trim() &&
    result.aiCollabAssetVersion !== PANI_COLLAB_ASSET_VERSION
  ) {
    delete result.aiCollabSelectedUrl;
    delete result.aiCollabTemplateLabel;
    result.aiCollabAssetVersion = PANI_COLLAB_ASSET_VERSION;
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

function readCollabTemplateKey(value: unknown): PaniCollabTemplateKey | null {
  if (value === "travel-selfie" || value === "passport-poster" || value === "night-train") {
    return value;
  }
  return null;
}

function wasPaniCollabReset(
  original: Record<string, unknown> | null | undefined,
  normalized: Record<string, unknown>,
) {
  return (
    typeof original?.aiCollabSelectedUrl === "string" &&
    original.aiCollabSelectedUrl.trim().length > 0 &&
    !readStringValue(normalized.aiCollabSelectedUrl)
  );
}

function buildSummaryEntries(
  values: Record<string, unknown>,
  fields: PersonalizationField[],
  topVideos: YouTubeVideo[],
) {
  const candidates = fields.length > 0
    ? fields.map((field) => ({
        label: field.label,
        value:
          field.fieldKey === "favoriteVideoId"
            ? resolveFavoriteVideoSummary(readStringValue(values[field.fieldKey]).trim(), topVideos)
            : readStringValue(values[field.fieldKey]).trim(),
      }))
    : Object.entries(values).map(([key, value]) => ({
        label: key,
        value: readStringValue(value).trim(),
      }));

  return candidates.filter((item) => item.value.length > 0);
}

function resolveFavoriteVideoSummary(value: string, topVideos: YouTubeVideo[]) {
  if (!value) {
    return "";
  }
  return topVideos.find((video) => video.videoId === value)?.title ?? "선택한 대표 영상";
}

function orderFieldsForMode(fields: PersonalizationField[], mode: string) {
  if (mode !== "youtube") {
    return fields;
  }

  return [...fields].sort((left, right) => {
    const leftPriority = getYouTubeFieldPriority(left.fieldKey);
    const rightPriority = getYouTubeFieldPriority(right.fieldKey);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return left.sortOrder - right.sortOrder;
  });
}

function getYouTubeFieldPriority(fieldKey: string) {
  switch (fieldKey) {
    case "favoriteVideoId":
      return 0;
    case "subscribedSince":
      return 1;
    case "favoriteMemory":
    case "fanNote":
    case "fanMessage":
      return 2;
    case "uploadedImageUrl":
      return 3;
    case "fanNickname":
      return 4;
    default:
      return 5;
  }
}

function resolvePreviewSubtitle(values: Record<string, unknown>) {
  const candidates = [
    readStringValue(values.fanNote).trim(),
    readStringValue(values.favoriteMemory).trim(),
    readStringValue(values.fanMessage).trim(),
  ];

  return candidates.find((value) => value.length > 0) ?? null;
}
