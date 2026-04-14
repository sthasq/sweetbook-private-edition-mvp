import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { chatPersonalization, getPreview, updateProject } from "../api/projects";
import type {
  ChatMessage,
  PersonalizationField,
  ProjectPreview,
} from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";
import { imageObjectPosition } from "../lib/imageFocus";
import { resolveMediaUrl } from "../lib/appPaths";

export default function ChatPersonalizationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const initialPromptRequestedRef = useRef(false);
  const autoApplyTriggeredRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const [done, setDone] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const requestInitialAssistantReply = useEffectEvent(() => {
    void requestAssistantReply([]);
  });
  const applyProposalFromEffect = useEffectEvent(() => {
    void handleApplyProposal();
  });

  useEffect(() => {
    if (!projectId) {
      return;
    }
    getPreview(Number(projectId))
      .then(setPreview)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "프로젝트를 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !preview || initialPromptRequestedRef.current) {
      return;
    }
    initialPromptRequestedRef.current = true;
    requestInitialAssistantReply();
  }, [projectId, preview]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (sending || saving || done) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sending, saving, done, messages.length]);

  const requestAssistantReply = useCallback(async (history: ChatMessage[]) => {
    if (!projectId) {
      return;
    }

    setSending(true);
    setError("");
    try {
      const response = await chatPersonalization(Number(projectId), history);
      const assistantReply = response.reply.trim();
      const nextMessages =
        assistantReply.length > 0
          ? [...history, { role: "assistant", content: assistantReply } as const]
          : history;

      setMessages(nextMessages);
      const hasProposal =
        !!response.proposal && Object.keys(response.proposal).length > 0;
      setProposal(response.proposal);
      setDone(Boolean(response.done && hasProposal));
      setSuggestedReplies(
        Array.isArray(response.suggestedReplies)
          ? response.suggestedReplies.filter(
              (item): item is string => typeof item === "string" && item.trim().length > 0,
            )
          : [],
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "개인화 대화를 불러오지 못했어요.");
    } finally {
      setSending(false);
    }
  }, [projectId]);

  async function handleSend(forcedInput?: string) {
    const trimmed = (forcedInput !== undefined ? forcedInput : input).trim();
    if (!trimmed || sending) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setSuggestedReplies([]);
    await requestAssistantReply(history);
  }

  const handleApplyProposal = useCallback(async () => {
    if (!projectId || !preview || !proposal) {
      return;
    }

    const payload = buildProposalPayload(
      proposal,
      preview.edition.snapshot?.personalizationFields ?? [],
    );
    if (Object.keys(payload).length === 0) {
      autoApplyTriggeredRef.current = false;
      setError("제안 데이터가 비어 있어요. 대화를 조금 더 이어서 정보를 채워볼게요.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await updateProject(Number(projectId), payload);
      navigate(`/projects/${projectId}/preview`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "개인화 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }, [navigate, preview, projectId, proposal]);

  async function handleRestart() {
    if (sending) {
      return;
    }
    autoApplyTriggeredRef.current = false;
    setMessages([]);
    setProposal(null);
    setDone(false);
    setSuggestedReplies([]);
    await requestAssistantReply([]);
  }

  useEffect(() => {
    if (!done || !proposal || saving || !preview || autoApplyTriggeredRef.current) {
      return;
    }

    autoApplyTriggeredRef.current = true;
    applyProposalFromEffect();
  }, [done, proposal, saving, preview]);

  if (loading) return <Spinner />;
  if (error && !preview) return <ErrorBox message={error} />;
  if (!preview) return <ErrorBox message="프로젝트를 찾을 수 없습니다." />;

  const fields = preview.edition.snapshot?.personalizationFields ?? [];
  const proposalEntries = buildProposalEntries(proposal, fields);
  const topVideos = readTopVideos(preview.personalizationData.topVideos);
  const selectedFavoriteVideoId = readString(
    proposal?.favoriteVideoId ?? preview.personalizationData.favoriteVideoId,
  );
  const selectedFavoriteVideo = topVideos.find((video) => video.videoId === selectedFavoriteVideoId) ?? null;
  const personalizationSummary = buildPersonalizationSummary(preview, proposal, topVideos);
  const quickPromptIdeas = buildQuickPromptIdeas(preview, topVideos);
  const lastAssistantIndex = findLastAssistantIndex(messages);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <ProjectStepper current="personalize" className="mb-10" />

        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <section className="lg:col-span-8">
            <div className="editorial-card overflow-hidden p-6 md:p-8">
              <div className="mb-6 grid gap-3 md:grid-cols-4">
                <InterviewMetricCard label="에디션" value={preview.edition.title} hint="지금 개인화 중인 책" />
                <InterviewMetricCard label="장면 후보" value={`${topVideos.length}개`} hint="바로 고를 수 있는 대표 장면" />
                <InterviewMetricCard label="제안 필드" value={`${proposalEntries.length}개`} hint="자동으로 채워진 개인화 문구" />
                <InterviewMetricCard label="진행도" value={personalizationSummary.progressLabel} hint="답변이 쌓일수록 바로 저장" />
              </div>

              <div className="mb-6 rounded bg-surface-low px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="editorial-label text-brand-700">지금 만든 책 재료</p>
                    <p className="mt-2 text-sm leading-relaxed text-warm-500">
                      어떤 장면과 문장이 책에 들어갈지 먼저 보여드리고, 바로 답변을 이어갈 수 있게 정리했어요.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-warm-500 shadow-sm">
                    live summary
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SummaryTile label="팬 이름" value={personalizationSummary.fanNickname} />
                  <SummaryTile label="제작 방식" value={personalizationSummary.modeLabel} />
                  <SummaryTile label="대표 장면" value={selectedFavoriteVideo?.title ?? personalizationSummary.favoriteSceneFallback} />
                  <SummaryTile label="한마디 메시지" value={personalizationSummary.fanNotePreview} />
                </div>
              </div>

              {quickPromptIdeas.length > 0 && (
                <div className="mb-6 rounded bg-surface-low px-5 py-5">
                  <p className="editorial-label text-brand-700">빠르게 답하기</p>
                  <p className="mt-2 text-sm leading-relaxed text-warm-500">
                    막막하면 아래 문장을 눌러서 바로 시작해도 괜찮아요.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickPromptIdeas.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => {
                          setInput(idea);
                          void handleSend(idea);
                        }}
                        disabled={sending || saving}
                        className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200/60 pb-5">
                <div>
                  <p className="editorial-label">LLM 개인화 인터뷰</p>
                  <h1 className="mt-3 text-3xl font-bold leading-tight text-brand-700 md:text-4xl">
                    몇 가지 질문으로 바로 포토북 제안을 만들어요
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-warm-500">
                    답변을 짧게 남기면 대화형 어시스턴트가 개인화 문구를 자동으로 제안하고,
                    바로 미리보기로 연결해줍니다.
                  </p>
                </div>
                <div className="rounded bg-surface-low px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                    선택한 에디션
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    {preview.edition.title}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {topVideos.length > 0 && (
                  <div className="rounded border border-stone-200/70 bg-surface-low px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="editorial-label text-brand-700">참고할 장면 후보</p>
                        <p className="mt-2 text-sm leading-relaxed text-warm-500">
                          아래 후보 중 하나를 골라도 되고, 기억나는 장면이나 콘텐츠 제목을 직접 적어도 괜찮아요.
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-warm-500 shadow-sm">
                        {topVideos.length}개
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {topVideos.map((video) => {
                        const isSelected = selectedFavoriteVideoId === video.videoId;
                        return (
                          <button
                            key={video.videoId}
                            type="button"
                            onClick={() => {
                                handleSend(`'${video.title}' 장면을 이번 포토북의 중심으로 담고 싶어요.`);
                            }}
                            className={`overflow-hidden rounded border bg-white text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm ${
                              isSelected
                                ? "border-brand-300 shadow-sm ring-1 ring-brand-200"
                                : "border-stone-200/70"
                            }`}
                          >
                            {video.thumbnailUrl ? (
                              <img
                                src={resolveMediaUrl(video.thumbnailUrl)}
                                alt={video.title}
                                className="aspect-video w-full object-cover"
                                style={{
                                  objectPosition: imageObjectPosition(
                                    resolveMediaUrl(video.thumbnailUrl),
                                  ),
                                }}
                              />
                            ) : (
                              <div className="flex aspect-video w-full items-center justify-center bg-white text-xs text-warm-500">
                                썸네일 없음
                              </div>
                            )}
                            <div className="p-3">
                              <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-stone-900">
                                {video.title}
                              </p>
                              <p className="mt-2 text-xs text-warm-500">
                                눌러서 이 장면으로 바로 시작할 수 있어요
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className="space-y-3">
                    <MessageBubble message={message} />
                    {message.role === "assistant" &&
                      index === lastAssistantIndex &&
                      suggestedReplies.length > 0 &&
                      !done && (
                        <SuggestedReplyChips
                          replies={suggestedReplies}
                          disabled={sending || saving}
                          onSelect={(reply) => {
                            void handleSend(reply);
                          }}
                        />
                      )}
                  </div>
                ))}

                {messages.length === 0 && sending && (
                  <div className="flex items-center gap-3 rounded border border-brand-100 bg-brand-50/70 px-5 py-4 text-sm text-brand-700">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    첫 질문을 준비하고 있어요...
                  </div>
                )}

                {messages.length > 0 && sending && (
                    <div className="flex animate-pulse items-center gap-1.5 rounded-2xl rounded-tl-sm bg-brand-50/70 px-4 py-3 text-brand-600 shadow-sm w-fit max-w-[88%] border border-brand-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-400"></div>
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-400 animation-delay-200"></div>
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-400 animation-delay-400"></div>
                  </div>
                )}

                {saving && (
                  <div className="max-w-[88%] rounded border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
                    문구를 책에 반영하고 있어요. 바로 미리보기로 이동합니다...
                  </div>
                )}

                {error && (
                  <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <p>{error}</p>
                    {messages.length === 0 && (
                      <button
                        type="button"
                        onClick={() => void requestAssistantReply([])}
                        disabled={sending}
                        className="mt-2 text-xs font-semibold text-red-800 underline"
                      >
                        다시 시도하기
                      </button>
                    )}
                    {done && proposal && (
                      <button
                        type="button"
                        onClick={() => void handleApplyProposal()}
                        disabled={saving}
                        className="mt-2 text-xs font-semibold text-red-800 underline"
                      >
                        저장 다시 시도하기
                      </button>
                    )}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="mt-6 border-t border-stone-200/70 pt-6">
                <label htmlFor="chat-input" className="editorial-label text-brand-700">
                  답변 입력
                </label>
                <div className="mt-3 flex gap-3">
                  <input
                    id="chat-input"
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    className="editorial-input"
                    placeholder="예: 세 사람이 같이 웃던 골든아워 장면을 책의 중심에 두고 싶어요."
                    disabled={sending || saving}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={sending || saving || input.trim().length === 0}
                    className="editorial-button-primary min-w-[120px] disabled:opacity-50"
                  >
                    전송
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleRestart()}
                    disabled={sending || saving}
                    className="editorial-button-secondary"
                  >
                    대화 다시 시작
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-4 lg:sticky lg:top-28">
            <div className="editorial-panel p-6 md:p-8">
              <p className="editorial-label text-gold-500">자동 제안 카드</p>
              <h2 className="mt-4 text-2xl font-bold leading-tight text-brand-700">
                {saving
                  ? "문구를 책에 반영하는 중이에요"
                  : done || proposalEntries.length > 0
                  ? "완성된 문구를 바로 적용하고 있어요"
                  : "대화가 완료되면 제안안이 표시됩니다"}
              </h2>

              {proposalEntries.length > 0 ? (
                <div className="mt-6 space-y-4 rounded bg-white/85 p-5 shadow-sm">
                  {proposalEntries.map((entry) => (
                    <div key={entry.key}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                        {entry.label}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-stone-900">{entry.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded bg-surface-low px-5 py-5 text-sm leading-relaxed text-warm-500">
                  아직 제안안이 없어요. 답변을 조금 더 입력하면 자동으로 개인화 필드를 채워서
                  보여줄게요.
                </div>
              )}

              <div className="mt-8 space-y-3">
                {selectedFavoriteVideo && (
                  <div className="rounded bg-white/85 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                      현재 선택된 대표 장면
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-stone-900">
                      {selectedFavoriteVideo.title}
                    </p>
                  </div>
                )}
                {saving && (
                  <div className="rounded bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-700">
                    인터뷰 내용을 바탕으로 문구를 저장했고, 미리보기 페이지로 이동 중이에요.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/editions/${preview.edition.id}`)}
                  className="editorial-button-link"
                >
                  에디션으로 돌아가기
                </button>
              </div>
            </div>
          </aside>
        </div>

      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-brand-700 text-white"
            : "border border-stone-200/70 bg-surface-low text-stone-900"
        }`}
      >
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
          {isUser ? "fan" : "assistant"}
        </p>
        <p className="whitespace-pre-line">{message.content}</p>
      </div>
    </div>
  );
}

function InterviewMetricCard({
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
      <p className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-brand-700">
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-warm-500">{hint}</p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/85 px-4 py-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-900">{value}</p>
    </div>
  );
}

function SuggestedReplyChips({
  replies,
  disabled,
  onSelect,
}: {
  replies: string[];
  disabled: boolean;
  onSelect: (reply: string) => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded border border-stone-200/70 bg-white/92 px-4 py-3 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
          바로 답하기
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {replies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => onSelect(reply)}
              disabled={disabled}
              className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildProposalEntries(
  proposal: Record<string, unknown> | null,
  fields: PersonalizationField[],
) {
  if (!proposal) {
    return [];
  }

  const labels = new Map(fields.map((field) => [field.fieldKey, field.label]));

  return Object.entries(proposal)
    .flatMap(([key, value]) => expandProposalEntry(key, value, labels))
    .filter((entry) => entry.value.length > 0);
}

function buildProposalPayload(
  proposal: Record<string, unknown>,
  fields: PersonalizationField[],
) {
  const fieldByKey = new Map(fields.map((field) => [field.fieldKey, field]));
  const payload: Record<string, unknown> = {};

  Object.entries(proposal).forEach(([key, value]) => {
    if (key === "bookCopy") {
      const normalizedBookCopy = normalizeBookCopyPayload(value);
      if (normalizedBookCopy && Object.keys(normalizedBookCopy).length > 0) {
        payload[key] = normalizedBookCopy;
      }
      return;
    }

    const field = fieldByKey.get(key);
    if (!field) {
      return;
    }
    const normalized = normalizeProposalValue(field, value);
    if (normalized === null) {
      return;
    }
    payload[key] = normalized;
  });

  return payload;
}

function normalizeProposalValue(field: PersonalizationField, value: unknown) {
  const type = field.inputType.trim().toUpperCase();
  if (type === "NUMBER") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const normalizedDate = type === "DATE" && text.length >= 10 ? text.slice(0, 10) : text;
  if (field.maxLength && normalizedDate.length > field.maxLength) {
    return normalizedDate.slice(0, field.maxLength);
  }
  return normalizedDate;
}

function renderProposalValue(value: unknown) {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function expandProposalEntry(
  key: string,
  value: unknown,
  labels: Map<string, string>,
) {
  if (key === "bookCopy" && typeof value === "object" && value !== null) {
    const bookCopy = value as Record<string, unknown>;
    return Object.entries(bookCopy).map(([copyKey, copyValue]) => ({
      key: `bookCopy.${copyKey}`,
      label: bookCopyLabel(copyKey),
      value: renderProposalValue(copyValue),
    }));
  }

  return [{
    key,
    label: labels.get(key) ?? key,
    value: renderProposalValue(value),
  }];
}

function normalizeBookCopyPayload(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const allowedKeys = [
    "relationshipTitle",
    "relationshipBody",
    "momentTitle",
    "momentBody",
    "fanNoteTitle",
    "fanNoteBody",
  ] as const;

  const result: Record<string, string> = {};
  for (const key of allowedKeys) {
    const next = renderProposalValue((value as Record<string, unknown>)[key]);
    if (next) {
      result[key] = next;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function bookCopyLabel(key: string) {
  switch (key) {
    case "relationshipTitle":
      return "관계 페이지 제목";
    case "relationshipBody":
      return "관계 페이지 문구";
    case "momentTitle":
      return "대표 장면 제목";
    case "momentBody":
      return "대표 장면 문구";
    case "fanNoteTitle":
      return "메시지 페이지 제목";
    case "fanNoteBody":
      return "메시지 페이지 문구";
    default:
      return key;
  }
}

type TopVideo = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
};

function readTopVideos(value: unknown): TopVideo[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      videoId: readString(item.videoId),
      title: readString(item.title),
      thumbnailUrl: readString(item.thumbnailUrl),
    }))
    .filter((video) => video.videoId && video.title);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function buildPersonalizationSummary(
  preview: ProjectPreview,
  proposal: Record<string, unknown> | null,
  topVideos: TopVideo[],
) {
  const fanNickname = readString(
    proposal?.fanNickname ?? preview.personalizationData.fanNickname,
  ) || "팬";
  const fanNote =
    readString(proposal?.fanNote ?? preview.personalizationData.fanNote) ||
    "아직 한마디 메시지를 정리하는 중이에요.";
  const modeValue = readString(
    proposal?.mode ?? preview.personalizationData.mode,
  );
  const favoriteVideoId = readString(
    proposal?.favoriteVideoId ?? preview.personalizationData.favoriteVideoId,
  );
  const favoriteVideo =
    topVideos.find((video) => video.videoId === favoriteVideoId) ?? null;

  return {
    fanNickname,
    fanNotePreview:
      fanNote.length > 48 ? `${fanNote.slice(0, 48)}...` : fanNote,
    modeLabel: modeValue === "demo" ? "LLM 대화형 추천" : modeValue || "대화형 추천",
    favoriteSceneFallback: favoriteVideo?.title ?? "아직 선택 전",
    progressLabel: proposal && Object.keys(proposal).length > 0 ? "정리 중" : "인터뷰 시작",
  };
}

function buildQuickPromptIdeas(preview: ProjectPreview, topVideos: TopVideo[]) {
  const creatorName = preview.edition.creator.displayName;
  const firstVideo = topVideos[0]?.title;
  const ideas = [
    firstVideo ? `'${firstVideo}' 장면이 가장 기억에 남아서 책의 중심으로 넣고 싶어요.` : "",
    `${creatorName}의 분위기 중에서 가장 좋아하는 건 조용하고 오래 남는 감성이에요.`,
    "책 마지막에는 조금 뭉클하지만 과하지 않은 문장으로 마무리하고 싶어요.",
    "내가 이 크리에이터를 좋아하게 된 계절감과 이유가 드러났으면 좋겠어요.",
  ];

  return ideas.filter((idea) => idea.length > 0).slice(0, 4);
}

function findLastAssistantIndex(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") {
      return index;
    }
  }
  return -1;
}
