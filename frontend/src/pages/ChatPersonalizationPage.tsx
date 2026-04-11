import { useEffect, useRef, useState } from "react";
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

export default function ChatPersonalizationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const initialPromptRequestedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

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
    void requestAssistantReply([]);
  }, [projectId, preview]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function requestAssistantReply(history: ChatMessage[]) {
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
      setDone(Boolean(response.done || hasProposal));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "개인화 대화를 불러오지 못했어요.");
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    await requestAssistantReply(history);
  }

  async function handleApplyProposal() {
    if (!projectId || !preview || !proposal) {
      return;
    }

    const payload = buildProposalPayload(
      proposal,
      preview.edition.snapshot?.personalizationFields ?? [],
    );
    if (Object.keys(payload).length === 0) {
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
  }

  async function handleRestart() {
    if (sending) {
      return;
    }
    setMessages([]);
    setProposal(null);
    setDone(false);
    await requestAssistantReply([]);
  }

  if (loading) return <Spinner />;
  if (error && !preview) return <ErrorBox message={error} />;
  if (!preview) return <ErrorBox message="프로젝트를 찾을 수 없습니다." />;

  const fields = preview.edition.snapshot?.personalizationFields ?? [];
  const proposalEntries = buildProposalEntries(proposal, fields);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <ProjectStepper current="personalize" className="mb-10" />

        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <section className="lg:col-span-8">
            <div className="editorial-card overflow-hidden p-6 md:p-8">
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
                {messages.map((message, index) => (
                  <MessageBubble key={`${message.role}-${index}`} message={message} />
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
                  <div className="max-w-[88%] rounded border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm text-brand-700">
                    개인화 제안을 정리하는 중...
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
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    className="editorial-input"
                    placeholder="예: 가장 기억나는 장면은 밤기차 창가 장면이었어요."
                    disabled={sending}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={sending || input.trim().length === 0}
                    className="editorial-button-primary min-w-[120px] disabled:opacity-50"
                  >
                    전송
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleRestart()}
                    disabled={sending}
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
                {done || proposalEntries.length > 0
                  ? "지금 이대로 미리보기로 갈 수 있어요"
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
                <button
                  type="button"
                  onClick={() => void handleApplyProposal()}
                  disabled={saving || proposalEntries.length === 0}
                  className="editorial-button-primary w-full disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "이대로 진행하기"}
                </button>
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

function buildProposalEntries(
  proposal: Record<string, unknown> | null,
  fields: PersonalizationField[],
) {
  if (!proposal) {
    return [];
  }

  const labels = new Map(fields.map((field) => [field.fieldKey, field.label]));

  return Object.entries(proposal)
    .map(([key, value]) => ({
      key,
      label: labels.get(key) ?? key,
      value: renderProposalValue(value),
    }))
    .filter((entry) => entry.value.length > 0);
}

function buildProposalPayload(
  proposal: Record<string, unknown>,
  fields: PersonalizationField[],
) {
  const fieldByKey = new Map(fields.map((field) => [field.fieldKey, field]));
  const payload: Record<string, unknown> = {};

  Object.entries(proposal).forEach(([key, value]) => {
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
