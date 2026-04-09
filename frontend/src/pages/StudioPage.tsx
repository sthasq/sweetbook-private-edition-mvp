import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEdition, publishEdition } from "../api/studio";
import type { StudioEditionInput } from "../api/studio";
import type { EditionDetail } from "../types/api";

const INITIAL_FORM: StudioEditionInput = {
  title: "",
  subtitle: "",
  coverImageUrl: "https://picsum.photos/seed/studio/600/600",
  bookSpecUid: "SQUAREBOOK_HC",
  officialIntro: { heading: "", body: "" },
  officialClosing: { heading: "", body: "" },
  curatedAssets: [],
  personalizationFields: [
    { fieldKey: "fanNickname", label: "닉네임", inputType: "text", required: true, maxLength: 30, sortOrder: 1 },
    { fieldKey: "favoriteMemory", label: "기억에 남는 순간", inputType: "textarea", required: false, maxLength: 240, sortOrder: 2 },
    { fieldKey: "fanMessage", label: "크리에이터에게 한마디", inputType: "textarea", required: false, maxLength: 200, sortOrder: 3 },
  ],
};

export default function StudioPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<StudioEditionInput>(INITIAL_FORM);
  const [created, setCreated] = useState<EditionDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateIntro(key: string, val: string) {
    setForm((f) => ({
      ...f,
      officialIntro: { ...(f.officialIntro as Record<string, string>), [key]: val },
    }));
  }

  function updateClosing(key: string, val: string) {
    setForm((f) => ({
      ...f,
      officialClosing: { ...(f.officialClosing as Record<string, string>), [key]: val },
    }));
  }

  async function handleCreate() {
    setSaving(true);
    setError("");
    try {
      const ed = await createEdition(form);
      setCreated(ed);
      setSuccess("에디션 초안이 생성되었습니다.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!created) return;
    setPublishing(true);
    setError("");
    try {
      await publishEdition(created.id);
      setSuccess("에디션이 퍼블리시되었습니다!");
      setTimeout(() => navigate(`/editions/${created.id}`), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "퍼블리시 실패");
    } finally {
      setPublishing(false);
    }
  }

  const introObj = form.officialIntro as Record<string, string>;
  const closingObj = form.officialClosing as Record<string, string>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Creator Studio</h1>
        <span className="text-[10px] font-semibold tracking-widest uppercase text-gold-400 border border-gold-400/40 rounded px-1.5 py-0.5">
          Creator
        </span>
      </div>

      <div className="space-y-6">
        {/* Basic info */}
        <fieldset className="rounded-2xl border border-stone-200 bg-white/85 p-6 space-y-4 shadow-sm shadow-brand-100/20">
          <legend className="text-sm font-semibold text-stone-700 px-2">기본 정보</legend>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-1.5">
              에디션 제목 <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              placeholder="2nd Anniversary Edition"
            />
          </div>
          <div>
            <label htmlFor="subtitle" className="block text-sm font-medium text-stone-700 mb-1.5">
              부제목
            </label>
            <input
              id="subtitle"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              placeholder="함께한 2년의 기록"
            />
          </div>
          <div>
            <label htmlFor="coverImageUrl" className="block text-sm font-medium text-stone-700 mb-1.5">
              커버 이미지 URL <span className="text-red-400">*</span>
            </label>
            <input
              id="coverImageUrl"
              value={form.coverImageUrl}
              onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              placeholder="https://..."
            />
          </div>
        </fieldset>

        {/* Official intro */}
        <fieldset className="rounded-2xl border border-stone-200 bg-white/85 p-6 space-y-4 shadow-sm shadow-brand-100/20">
          <legend className="text-sm font-semibold text-stone-700 px-2">Official Intro (첫 페이지)</legend>
          <input
            value={introObj?.heading ?? ""}
            onChange={(e) => updateIntro("heading", e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            placeholder="인사말 제목"
          />
          <textarea
            rows={3}
            value={introObj?.body ?? ""}
            onChange={(e) => updateIntro("body", e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            placeholder="크리에이터 인사말 본문"
          />
        </fieldset>

        {/* Official closing */}
        <fieldset className="rounded-2xl border border-stone-200 bg-white/85 p-6 space-y-4 shadow-sm shadow-brand-100/20">
          <legend className="text-sm font-semibold text-stone-700 px-2">Official Closing (마지막 페이지)</legend>
          <input
            value={closingObj?.heading ?? ""}
            onChange={(e) => updateClosing("heading", e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            placeholder="마무리 제목"
          />
          <textarea
            rows={3}
            value={closingObj?.body ?? ""}
            onChange={(e) => updateClosing("body", e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            placeholder="마무리 메시지"
          />
        </fieldset>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-4 text-sm text-green-400">{success}</p>}

      <div className="mt-8 flex gap-3 justify-end">
        {!created ? (
          <button
            disabled={saving || !form.title}
            onClick={handleCreate}
            className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
          >
            {saving ? "저장 중..." : "에디션 생성"}
          </button>
        ) : (
          <button
            disabled={publishing}
            onClick={handlePublish}
            className="rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {publishing ? "처리 중..." : "퍼블리시하기"}
          </button>
        )}
      </div>
    </div>
  );
}
