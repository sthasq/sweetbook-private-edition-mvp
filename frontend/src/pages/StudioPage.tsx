import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEdition, publishEdition, updateEdition } from "../api/studio";
import { getEdition, listEditions } from "../api/editions";
import { listSweetbookBookSpecs, listSweetbookTemplates } from "../api/sweetbook";
import type {
  StudioCuratedAssetInput,
  StudioEditionInput,
  StudioPersonalizationFieldInput,
} from "../api/studio";
import type {
  EditionDetail,
  EditionSummary,
  SweetbookBookSpec,
  SweetbookTemplate,
} from "../types/api";

const ASSET_TYPES = ["IMAGE", "VIDEO", "MESSAGE"] as const;
const FIELD_TYPES = ["TEXT", "TEXTAREA", "DATE", "VIDEO_PICKER", "IMAGE_URL"] as const;

export default function StudioPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<StudioEditionInput>(createInitialForm);
  const [created, setCreated] = useState<EditionDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editionTemplates, setEditionTemplates] = useState<EditionSummary[]>([]);
  const [editionTemplatesLoading, setEditionTemplatesLoading] = useState(true);
  const [editionTemplateError, setEditionTemplateError] = useState("");
  const [applyingTemplateId, setApplyingTemplateId] = useState<number | null>(null);
  const [bookSpecs, setBookSpecs] = useState<SweetbookBookSpec[]>([]);
  const [bookSpecsLoading, setBookSpecsLoading] = useState(true);
  const [bookSpecError, setBookSpecError] = useState("");
  const [layoutTemplates, setLayoutTemplates] = useState<SweetbookTemplate[]>([]);
  const [layoutTemplatesLoading, setLayoutTemplatesLoading] = useState(true);
  const [layoutTemplateError, setLayoutTemplateError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);

  const intro = form.officialIntro ?? createCopyBlock();
  const closing = form.officialClosing ?? createCopyBlock();
  const assets = form.curatedAssets ?? [];
  const fields = form.personalizationFields ?? [];
  const validationMessages = useMemo(() => validateForm(form), [form]);
  const fingerprint = serializeForm(form);
  const hasUnsavedChanges = savedFingerprint != null && savedFingerprint !== fingerprint;
  const sweetbookTemplateGroups = useMemo(
    () => ({
      cover: groupTemplatesByRole(layoutTemplates, "cover"),
      publish: groupTemplatesByRole(layoutTemplates, "publish"),
      content: groupTemplatesByRole(layoutTemplates, "content"),
    }),
    [layoutTemplates],
  );

  useEffect(() => {
    listEditions()
      .then(setEditionTemplates)
      .catch((e: unknown) => {
        setEditionTemplateError(e instanceof Error ? e.message : "에디션 템플릿 목록을 불러오지 못했습니다.");
      })
      .finally(() => setEditionTemplatesLoading(false));
  }, []);

  useEffect(() => {
    listSweetbookBookSpecs()
      .then((specs) => {
        setBookSpecs(specs);
        if (!form.bookSpecUid && specs[0]?.uid) {
          setForm((current) => ({ ...current, bookSpecUid: specs[0].uid }));
        }
      })
      .catch((e: unknown) => {
        setBookSpecError(e instanceof Error ? e.message : "Sweetbook 규격 목록을 불러오지 못했습니다.");
      })
      .finally(() => setBookSpecsLoading(false));
  }, []);

  useEffect(() => {
    const bookSpecUid = form.bookSpecUid?.trim();
    if (!bookSpecUid) {
      setLayoutTemplates([]);
      setLayoutTemplatesLoading(false);
      return;
    }

    setLayoutTemplatesLoading(true);
    setLayoutTemplateError("");

    listSweetbookTemplates(bookSpecUid)
      .then(setLayoutTemplates)
      .catch((e: unknown) => {
        setLayoutTemplateError(e instanceof Error ? e.message : "Sweetbook 템플릿 목록을 불러오지 못했습니다.");
        setLayoutTemplates([]);
      })
      .finally(() => setLayoutTemplatesLoading(false));
  }, [form.bookSpecUid]);

  useEffect(() => {
    if (layoutTemplates.length === 0) {
      return;
    }

    setForm((current) => {
      const nextCoverUid = resolveTemplateSelection(
        sweetbookTemplateGroups.cover,
        current.sweetbookCoverTemplateUid,
      );
      const nextPublishUid = resolveTemplateSelection(
        sweetbookTemplateGroups.publish,
        current.sweetbookPublishTemplateUid,
      );
      const nextContentUid = resolveTemplateSelection(
        sweetbookTemplateGroups.content,
        current.sweetbookContentTemplateUid,
      );

      if (
        nextCoverUid === current.sweetbookCoverTemplateUid &&
        nextPublishUid === current.sweetbookPublishTemplateUid &&
        nextContentUid === current.sweetbookContentTemplateUid
      ) {
        return current;
      }

      return {
        ...current,
        sweetbookCoverTemplateUid: nextCoverUid,
        sweetbookPublishTemplateUid: nextPublishUid,
        sweetbookContentTemplateUid: nextContentUid,
      };
    });
  }, [layoutTemplates, sweetbookTemplateGroups.cover, sweetbookTemplateGroups.publish, sweetbookTemplateGroups.content]);

  function updateCopy(target: "officialIntro" | "officialClosing", key: "title" | "message", value: string) {
    setForm((current) => ({
      ...current,
      [target]: { ...(current[target] ?? createCopyBlock()), [key]: value },
    }));
  }

  function updateAsset(index: number, key: keyof StudioCuratedAssetInput, value: string) {
    setForm((current) => ({
      ...current,
      curatedAssets: (current.curatedAssets ?? []).map((asset, assetIndex) =>
        assetIndex === index ? { ...asset, [key]: value } : asset,
      ),
    }));
  }

  function updateField(
    index: number,
    key: keyof StudioPersonalizationFieldInput,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      personalizationFields: (current.personalizationFields ?? []).map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [key]: value } : field,
      ),
    }));
  }

  function updateBookSpecUid(bookSpecUid: string) {
    setForm((current) => ({
      ...current,
      bookSpecUid,
      sweetbookCoverTemplateUid: "",
      sweetbookPublishTemplateUid: "",
      sweetbookContentTemplateUid: "",
    }));
  }

  function selectSweetbookTemplate(role: "cover" | "publish" | "content", uid: string) {
    setForm((current) => ({
      ...current,
      sweetbookCoverTemplateUid:
        role === "cover" ? uid : current.sweetbookCoverTemplateUid,
      sweetbookPublishTemplateUid:
        role === "publish" ? uid : current.sweetbookPublishTemplateUid,
      sweetbookContentTemplateUid:
        role === "content" ? uid : current.sweetbookContentTemplateUid,
    }));
  }

  function addAsset() {
    setForm((current) => ({
      ...current,
      curatedAssets: resequenceAssets([...(current.curatedAssets ?? []), createAsset()]),
    }));
  }

  function removeAsset(index: number) {
    setForm((current) => ({
      ...current,
      curatedAssets: resequenceAssets(
        (current.curatedAssets ?? []).filter((_, assetIndex) => assetIndex !== index),
      ),
    }));
  }

  function addField() {
    setForm((current) => ({
      ...current,
      personalizationFields: resequenceFields([
        ...(current.personalizationFields ?? []),
        createField(),
      ]),
    }));
  }

  function removeField(index: number) {
    setForm((current) => ({
      ...current,
      personalizationFields: resequenceFields(
        (current.personalizationFields ?? []).filter((_, fieldIndex) => fieldIndex !== index),
      ),
    }));
  }

  function resetToNewEdition() {
    setForm(createInitialForm());
    setCreated(null);
    setSavedFingerprint(null);
    setError("");
    setSuccess("새 에디션 작성을 시작합니다.");
  }

  async function applyTemplate(templateId: number) {
    if ((created || hasUnsavedChanges) && !window.confirm("현재 작업 중인 내용이 초기화됩니다. 이 템플릿으로 다시 시작할까요?")) {
      return;
    }

    setApplyingTemplateId(templateId);
    setError("");
    setSuccess("");

    try {
      const template = await getEdition(templateId);
      const normalized = normalizeEditionToForm(template);
      setForm(normalized);
      setCreated(null);
      setSavedFingerprint(null);
      setSuccess(`"${template.title}" 템플릿으로 새 초안을 시작합니다.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "템플릿을 불러오지 못했습니다.");
    } finally {
      setApplyingTemplateId(null);
    }
  }

  async function handleSave() {
    if (validationMessages.length > 0) {
      setError(validationMessages[0]);
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    const payload = buildSubmitPayload(form);

    try {
      const edition = created
        ? await updateEdition(created.id, payload)
        : await createEdition(payload);
      const normalized = normalizeEditionToForm(edition);
      setCreated(edition);
      setForm(normalized);
      setSavedFingerprint(serializeForm(normalized));
      setSuccess(created ? "초안 변경사항을 저장했습니다." : "에디션 초안을 생성했습니다.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "초안 저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!created) return;
    if (validationMessages.length > 0) {
      setError(validationMessages[0]);
      setSuccess("");
      return;
    }

    setPublishing(true);
    setError("");
    setSuccess("");

    try {
      let editionId = created.id;
      if (hasUnsavedChanges) {
        const updated = await updateEdition(created.id, buildSubmitPayload(form));
        const normalized = normalizeEditionToForm(updated);
        setCreated(updated);
        setForm(normalized);
        setSavedFingerprint(serializeForm(normalized));
        editionId = updated.id;
      }

      await publishEdition(editionId);
      setSuccess("에디션이 퍼블리시되었습니다!");
      setTimeout(() => navigate(`/editions/${editionId}`), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "퍼블리시 실패");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-900">크리에이터 스튜디오</h1>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-gold-400 border border-gold-400/40 rounded px-1.5 py-0.5">
            크리에이터
          </span>
          {created && (
            <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-[11px] font-medium text-stone-600">
              {created.status} · #{created.id}
            </span>
          )}
          {created && hasUnsavedChanges && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
              저장되지 않은 변경사항
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={resetToNewEdition}
          className="self-start rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors"
        >
          새 에디션 시작
        </button>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">내부 에디션 템플릿</h2>
                <p className="mt-1 text-sm text-stone-600">
                  공식 메시지, 큐레이션 자산, 팬 입력 필드 구조를 빠르게 가져오는 내부 시작점입니다.
                </p>
              </div>
              <p className="text-xs font-medium text-stone-500">
                선택 후 수정해도 원본 에디션은 바뀌지 않고 새 초안에만 복사됩니다.
              </p>
            </div>

            {editionTemplatesLoading ? (
              <p className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 px-4 py-8 text-center text-sm text-stone-500">
                에디션 템플릿 목록을 불러오는 중입니다.
              </p>
            ) : editionTemplateError ? (
              <p className="mt-5 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-4 text-sm text-red-500">
                {editionTemplateError}
              </p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {editionTemplates.map((template) => (
                  <article
                    key={template.id}
                    className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/70"
                  >
                    <div className="aspect-[4/3] bg-stone-100">
                      <img
                        src={`https://picsum.photos/seed/studio-template-${template.id}/720/540`}
                        alt={template.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
                          시작 템플릿
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-stone-900">
                          {template.title}
                        </h3>
                        <p className="mt-1 text-sm text-stone-600">
                          {template.subtitle || "미리 준비된 구조로 새 에디션 초안을 시작합니다."}
                        </p>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-white/80 px-3 py-2 text-xs text-stone-500">
                        스위트북에서 바로 시작할 수 있도록 준비한 기본 템플릿
                      </div>
                      <button
                        type="button"
                        onClick={() => applyTemplate(template.id)}
                        disabled={applyingTemplateId === template.id}
                        className="w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
                      >
                        {applyingTemplateId === template.id ? "불러오는 중..." : "이 템플릿으로 시작"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Sweetbook 레이아웃 템플릿</h2>
                <p className="mt-1 text-sm text-stone-600">
                  실제 출력 시 사용할 Sweetbook 표지, 발행면, 본문 레이아웃을 선택합니다.
                </p>
              </div>
              <p className="text-xs font-medium text-stone-500">
                이 영역은 내부 에디션 템플릿과 별개로, 인쇄 레이아웃만 담당합니다.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                <div>
                  <label
                    htmlFor="bookSpecUid"
                    className="block text-sm font-medium text-stone-700 mb-1.5"
                  >
                    Sweetbook 규격
                  </label>
                  <select
                    id="bookSpecUid"
                    value={form.bookSpecUid ?? ""}
                    onChange={(e) => updateBookSpecUid(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    disabled={bookSpecsLoading}
                  >
                    {bookSpecs.map((spec) => (
                      <option key={spec.uid} value={spec.uid}>
                        {spec.name}
                      </option>
                    ))}
                  </select>
                  {bookSpecError && (
                    <p className="mt-2 text-xs text-red-500">{bookSpecError}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 text-sm text-stone-600">
                  {bookSpecsLoading ? (
                    <p>Sweetbook 규격 정보를 불러오는 중입니다.</p>
                  ) : (
                    <p>
                      현재 선택 규격:
                      {" "}
                      <span className="font-semibold text-stone-900">
                        {bookSpecs.find((spec) => spec.uid === form.bookSpecUid)?.name ?? form.bookSpecUid}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {layoutTemplateError ? (
              <p className="mt-5 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-4 text-sm text-red-500">
                {layoutTemplateError}
              </p>
            ) : layoutTemplatesLoading ? (
              <p className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 px-4 py-8 text-center text-sm text-stone-500">
                Sweetbook 레이아웃 템플릿을 불러오는 중입니다.
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                <SweetbookTemplateSection
                  title="표지 템플릿"
                  description="책의 커버와 첫인상을 결정하는 표지 레이아웃입니다."
                  templates={sweetbookTemplateGroups.cover}
                  selectedUid={form.sweetbookCoverTemplateUid ?? ""}
                  onSelect={(uid) => selectSweetbookTemplate("cover", uid)}
                />
                <SweetbookTemplateSection
                  title="발행면 템플릿"
                  description="제목, 발행 정보, 오프닝 페이지 구성을 담당합니다."
                  templates={sweetbookTemplateGroups.publish}
                  selectedUid={form.sweetbookPublishTemplateUid ?? ""}
                  onSelect={(uid) => selectSweetbookTemplate("publish", uid)}
                />
                <SweetbookTemplateSection
                  title="본문 템플릿"
                  description="반복되는 본문 페이지의 사진/텍스트 배치를 결정합니다."
                  templates={sweetbookTemplateGroups.content}
                  selectedUid={form.sweetbookContentTemplateUid ?? ""}
                  onSelect={(uid) => selectSweetbookTemplate("content", uid)}
                />
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30">
            <h2 className="text-lg font-semibold text-stone-900">기본 정보</h2>
            <div className="mt-5 grid gap-4">
              <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="에디션 제목" />
              <input value={form.subtitle} onChange={(e) => setForm((current) => ({ ...current, subtitle: e.target.value }))} className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="부제목" />
              <input value={form.coverImageUrl} onChange={(e) => setForm((current) => ({ ...current, coverImageUrl: e.target.value }))} className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="커버 이미지 URL" />
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30">
            <h2 className="text-lg font-semibold text-stone-900">공식 메시지</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-sm font-semibold text-stone-900">인트로 메시지</p>
                <input value={intro.title} onChange={(e) => updateCopy("officialIntro", "title", e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="인트로 제목" />
                <textarea rows={4} value={intro.message} onChange={(e) => updateCopy("officialIntro", "message", e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="인트로 메시지" />
              </div>
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-sm font-semibold text-stone-900">클로징 메시지</p>
                <input value={closing.title} onChange={(e) => updateCopy("officialClosing", "title", e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="클로징 제목" />
                <textarea rows={4} value={closing.message} onChange={(e) => updateCopy("officialClosing", "message", e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="클로징 메시지" />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-stone-900">큐레이션 자산</h2>
              <button type="button" onClick={addAsset} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">자산 추가</button>
            </div>
            <div className="mt-5 space-y-4">
              {assets.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 px-4 py-8 text-center text-sm text-stone-500">이미지, 영상 링크, 메시지를 추가해 팬용 템플릿을 구성하세요.</p>
              ) : (
                assets.map((asset, index) => (
                  <div key={`${asset.sortOrder}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
                    <div className="grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)_auto]">
                      <select value={asset.assetType} onChange={(e) => updateAsset(index, "assetType", e.target.value)} className="min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                        {ASSET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                      <input value={asset.title} onChange={(e) => updateAsset(index, "title", e.target.value)} className="min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="자산 제목" />
                      <button type="button" onClick={() => removeAsset(index)} className="justify-self-start rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors">삭제</button>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)]">
                      <div className="min-w-0">
                        {asset.assetType === "MESSAGE" ? (
                          <textarea rows={5} value={asset.content} onChange={(e) => updateAsset(index, "content", e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="공식 메시지 내용" />
                        ) : (
                          <input value={asset.content} onChange={(e) => updateAsset(index, "content", e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder={asset.assetType === "VIDEO" ? "영상 링크" : "이미지 URL"} />
                        )}
                      </div>
                      <div className="min-w-0 rounded-2xl border border-stone-200 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                          미리보기
                        </p>
                        <div className="mt-3">
                          <AssetPreview asset={asset} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-stone-900">팬 입력 항목</h2>
              <button type="button" onClick={addField} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">필드 추가</button>
            </div>
            <div className="mt-5 space-y-4">
              {fields.map((field, index) => (
                <div key={`${field.sortOrder}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_auto]">
                    <input value={field.fieldKey} onChange={(e) => updateField(index, "fieldKey", e.target.value)} className="min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="내부 키" />
                    <input value={field.label} onChange={(e) => updateField(index, "label", e.target.value)} className="min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="표시 라벨" />
                    <select value={field.inputType} onChange={(e) => updateField(index, "inputType", e.target.value)} className="min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                      {FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button type="button" onClick={() => removeField(index)} className="justify-self-start rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors">삭제</button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-stone-700">
                      <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, "required", e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500" />
                      필수 입력
                    </label>
                    <input value={field.maxLength ?? ""} onChange={(e) => updateField(index, "maxLength", e.target.value)} className="w-28 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="최대 길이" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30 xl:sticky xl:top-24">
            <h2 className="text-lg font-semibold text-stone-900">템플릿 요약</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/80">
              <div className="aspect-square bg-stone-100">
                <img src={form.coverImageUrl || "https://picsum.photos/seed/studio-empty/900/900"} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">에디션 미리보기</p>
                <h3 className="mt-2 text-lg font-semibold text-stone-900">{form.title || "에디션 제목"}</h3>
                <p className="mt-1 text-sm text-stone-600">{form.subtitle || "부제목이 여기에 표시됩니다."}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-stone-900">{intro.title || "인트로 제목"}</p>
                <p className="mt-1 text-sm text-stone-600">{intro.message || "인트로 메시지를 입력해 주세요."}</p>
              </div>
              <div className="border-t border-stone-200 pt-3">
                <p className="text-sm font-medium text-stone-900">{closing.title || "클로징 제목"}</p>
                <p className="mt-1 text-sm text-stone-600">{closing.message || "클로징 메시지를 입력해 주세요."}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">큐레이션 자산</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{assets.length}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">팬 입력 항목</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{fields.length}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                선택한 레이아웃
              </p>
              <div className="mt-3 space-y-2 text-sm text-stone-600">
                <p>
                  표지:
                  {" "}
                  <span className="font-medium text-stone-900">
                    {readTemplateName(layoutTemplates, form.sweetbookCoverTemplateUid)}
                  </span>
                </p>
                <p>
                  발행면:
                  {" "}
                  <span className="font-medium text-stone-900">
                    {readTemplateName(layoutTemplates, form.sweetbookPublishTemplateUid)}
                  </span>
                </p>
                <p>
                  본문:
                  {" "}
                  <span className="font-medium text-stone-900">
                    {readTemplateName(layoutTemplates, form.sweetbookContentTemplateUid)}
                  </span>
                </p>
              </div>
            </div>

            {validationMessages.length > 0 && (
              <ul className="mt-5 space-y-1 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-500">
                {validationMessages.map((message) => <li key={message}>{message}</li>)}
              </ul>
            )}
            {error && <p className="mt-5 text-sm text-red-500">{error}</p>}
            {success && <p className="mt-5 text-sm text-emerald-600">{success}</p>}

            <div className="mt-6 flex flex-col gap-3">
              <button type="button" disabled={saving || publishing || validationMessages.length > 0} onClick={handleSave} className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50">
                {saving ? "저장 중..." : created ? "초안 저장" : "에디션 초안 생성"}
              </button>
              <button type="button" disabled={!created || saving || publishing || validationMessages.length > 0} onClick={handlePublish} className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50">
                {publishing ? "퍼블리시 중..." : hasUnsavedChanges ? "저장 후 퍼블리시" : "퍼블리시하기"}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function createInitialForm(): StudioEditionInput {
  return {
    title: "",
    subtitle: "",
    coverImageUrl: "https://picsum.photos/seed/studio/900/900",
    bookSpecUid: "SQUAREBOOK_HC",
    sweetbookCoverTemplateUid: "",
    sweetbookPublishTemplateUid: "",
    sweetbookContentTemplateUid: "",
    officialIntro: createCopyBlock(),
    officialClosing: createCopyBlock(),
    curatedAssets: [],
    personalizationFields: resequenceFields([
      createField({ fieldKey: "fanNickname", label: "닉네임", inputType: "TEXT", required: true, maxLength: 30 }),
      createField({ fieldKey: "favoriteMemory", label: "기억에 남는 순간", inputType: "TEXTAREA", required: false, maxLength: 240 }),
      createField({ fieldKey: "fanMessage", label: "크리에이터에게 한마디", inputType: "TEXTAREA", required: false, maxLength: 200 }),
    ]),
  };
}

function createCopyBlock(overrides?: Partial<NonNullable<StudioEditionInput["officialIntro"]>>) {
  return { title: overrides?.title ?? "", message: overrides?.message ?? "" };
}

function createAsset(overrides?: Partial<StudioCuratedAssetInput>): StudioCuratedAssetInput {
  return { assetType: overrides?.assetType ?? "IMAGE", title: overrides?.title ?? "", content: overrides?.content ?? "", sortOrder: overrides?.sortOrder ?? 1 };
}

function createField(overrides?: Partial<StudioPersonalizationFieldInput>): StudioPersonalizationFieldInput {
  return { fieldKey: overrides?.fieldKey ?? "", label: overrides?.label ?? "", inputType: overrides?.inputType ?? "TEXT", required: overrides?.required ?? false, maxLength: overrides?.maxLength, sortOrder: overrides?.sortOrder ?? 1 };
}

function resequenceAssets(items: StudioCuratedAssetInput[]) {
  return items.map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

function resequenceFields(items: StudioPersonalizationFieldInput[]) {
  return items.map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

function buildSubmitPayload(form: StudioEditionInput): StudioEditionInput {
  return {
    title: form.title.trim(),
    subtitle: form.subtitle?.trim() ?? "",
    coverImageUrl: form.coverImageUrl.trim(),
    bookSpecUid: form.bookSpecUid ?? "SQUAREBOOK_HC",
    sweetbookCoverTemplateUid: form.sweetbookCoverTemplateUid?.trim() ?? "",
    sweetbookPublishTemplateUid: form.sweetbookPublishTemplateUid?.trim() ?? "",
    sweetbookContentTemplateUid: form.sweetbookContentTemplateUid?.trim() ?? "",
    officialIntro: { title: form.officialIntro?.title.trim() ?? "", message: form.officialIntro?.message.trim() ?? "" },
    officialClosing: { title: form.officialClosing?.title.trim() ?? "", message: form.officialClosing?.message.trim() ?? "" },
    curatedAssets: resequenceAssets((form.curatedAssets ?? []).map((asset) => ({ ...asset, title: asset.title.trim(), content: asset.content.trim() }))),
    personalizationFields: resequenceFields((form.personalizationFields ?? []).map((field) => ({ ...field, fieldKey: field.fieldKey.trim(), label: field.label.trim(), maxLength: typeof field.maxLength === "string" ? Number(field.maxLength) || undefined : field.maxLength }))),
  };
}

function normalizeEditionToForm(edition: EditionDetail): StudioEditionInput {
  return {
    title: edition.title,
    subtitle: edition.subtitle,
    coverImageUrl: edition.coverImageUrl,
    bookSpecUid: edition.snapshot?.bookSpecUid ?? "SQUAREBOOK_HC",
    sweetbookCoverTemplateUid: edition.snapshot?.sweetbookCoverTemplateUid ?? "",
    sweetbookPublishTemplateUid: edition.snapshot?.sweetbookPublishTemplateUid ?? "",
    sweetbookContentTemplateUid: edition.snapshot?.sweetbookContentTemplateUid ?? "",
    officialIntro: readCopyBlock(edition.snapshot?.officialIntro),
    officialClosing: readCopyBlock(edition.snapshot?.officialClosing),
    curatedAssets: resequenceAssets((edition.snapshot?.curatedAssets ?? []).map((asset) => createAsset(asset))),
    personalizationFields: resequenceFields((edition.snapshot?.personalizationFields ?? []).map((field) => createField({ ...field, inputType: field.inputType.toUpperCase(), maxLength: field.maxLength ?? undefined }))),
  };
}

function readCopyBlock(data: Record<string, unknown> | null | undefined) {
  return createCopyBlock({
    title: typeof data?.title === "string" ? data.title : typeof data?.heading === "string" ? data.heading : "",
    message: typeof data?.message === "string" ? data.message : typeof data?.body === "string" ? data.body : "",
  });
}

function validateForm(form: StudioEditionInput) {
  const payload = buildSubmitPayload(form);
  const messages: string[] = [];
  if (!payload.title) messages.push("에디션 제목을 입력해 주세요.");
  if (!payload.coverImageUrl) messages.push("커버 이미지 URL을 입력해 주세요.");
  if (!payload.officialIntro?.title || !payload.officialIntro.message) messages.push("인트로 메시지의 제목과 내용을 모두 입력해 주세요.");
  if (!payload.officialClosing?.title || !payload.officialClosing.message) messages.push("클로징 메시지의 제목과 내용을 모두 입력해 주세요.");
  if ((payload.personalizationFields ?? []).length === 0) messages.push("팬 입력 항목을 최소 1개 이상 추가해 주세요.");

  const fieldKeys = new Set<string>();
  for (const field of payload.personalizationFields ?? []) {
    if (!field.fieldKey || !field.label) {
      messages.push("모든 팬 입력 항목에 내부 키와 표시 라벨을 입력해 주세요.");
      break;
    }
    if (fieldKeys.has(field.fieldKey)) {
      messages.push("팬 입력 항목의 내부 키는 서로 달라야 합니다.");
      break;
    }
    fieldKeys.add(field.fieldKey);
  }

  for (const asset of payload.curatedAssets ?? []) {
    if ((asset.title || asset.content) && (!asset.title || !asset.content)) {
      messages.push("큐레이션 자산은 제목과 내용을 모두 입력해야 합니다.");
      break;
    }
  }
  return messages;
}

function serializeForm(form: StudioEditionInput) {
  return JSON.stringify(buildSubmitPayload(form));
}

function groupTemplatesByRole(templates: SweetbookTemplate[], role: "cover" | "publish" | "content") {
  return templates.filter((template) => template.role.toLowerCase().includes(role));
}

function resolveTemplateSelection(templates: SweetbookTemplate[], currentUid: string | undefined) {
  if (templates.length === 0) {
    return "";
  }
  if (currentUid && templates.some((template) => template.uid === currentUid)) {
    return currentUid;
  }
  return templates[0]?.uid ?? "";
}

function readTemplateName(templates: SweetbookTemplate[], uid: string | undefined) {
  if (!uid) {
    return "선택되지 않음";
  }
  return templates.find((template) => template.uid === uid)?.name ?? uid;
}

function SweetbookTemplateSection({
  title,
  description,
  templates,
  selectedUid,
  onSelect,
}: {
  title: string;
  description: string;
  templates: SweetbookTemplate[];
  selectedUid: string;
  onSelect: (uid: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
      <div>
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>

      {templates.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white/80 px-4 py-6 text-center text-sm text-stone-500">
          현재 규격에서 제공되는 템플릿이 없습니다.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const isSelected = selectedUid === template.uid;
            return (
              <button
                key={template.uid}
                type="button"
                onClick={() => onSelect(template.uid)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-stone-200 bg-white text-stone-700 hover:border-brand-300"
                }`}
              >
                <div className="mb-3 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                  <SweetbookTemplatePreview template={template} selected={isSelected} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  {template.role || "layout"}
                </p>
                <p className="mt-2 text-sm font-semibold text-current">
                  {template.name}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SweetbookTemplatePreview({
  template,
  selected,
}: {
  template: SweetbookTemplate;
  selected: boolean;
}) {
  const role = template.role.toLowerCase();
  const name = template.name.toLowerCase();
  const selectedClass = selected ? "ring-2 ring-brand-400/70" : "";

  if (role.includes("cover")) {
    return (
      <div className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-100 via-rose-50 to-orange-200 ${selectedClass}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_40%),linear-gradient(135deg,rgba(120,53,15,0.1),transparent_55%)]" />
        <div className="absolute inset-x-4 top-4 rounded-lg bg-white/85 px-3 py-2 shadow-sm">
          <div className="h-2.5 w-16 rounded-full bg-gold-300/80" />
          <div className="mt-2 h-3 w-24 rounded-full bg-stone-800/80" />
        </div>
        <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/60 bg-white/70 p-3 backdrop-blur-sm">
          <div className="h-16 rounded-lg bg-gradient-to-br from-brand-200 via-brand-100 to-white" />
          <div className="mt-3 h-2 w-20 rounded-full bg-stone-700/70" />
        </div>
      </div>
    );
  }

  if (role.includes("publish")) {
    return (
      <div className={`aspect-[4/3] bg-gradient-to-br from-stone-100 via-white to-stone-200 p-3 ${selectedClass}`}>
        <div className="flex h-full gap-2">
          <div className="flex-1 rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <div className="h-2 w-12 rounded-full bg-brand-300/80" />
            <div className="mt-3 h-3 w-20 rounded-full bg-stone-800/80" />
            <div className="mt-2 space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-stone-200" />
              <div className="h-1.5 w-5/6 rounded-full bg-stone-200" />
              <div className="h-1.5 w-2/3 rounded-full bg-stone-200" />
            </div>
          </div>
          <div className="w-[38%] rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <div className="h-20 rounded-md bg-gradient-to-br from-gold-100 to-brand-100" />
            <div className="mt-3 h-2 w-10 rounded-full bg-stone-300" />
            <div className="mt-1 h-2 w-14 rounded-full bg-stone-200" />
          </div>
        </div>
      </div>
    );
  }

  if (name.includes("gallery")) {
    return (
      <div className={`aspect-[4/3] bg-stone-100 p-3 ${selectedClass}`}>
        <div className="grid h-full grid-cols-2 gap-2">
          {["from-rose-100 to-orange-200", "from-sky-100 to-cyan-200", "from-lime-100 to-emerald-200", "from-violet-100 to-fuchsia-200"].map((gradient) => (
            <div
              key={gradient}
              className={`rounded-lg bg-gradient-to-br ${gradient}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (name.includes("blank") || name.includes("빈내지")) {
    return (
      <div className={`aspect-[4/3] bg-white p-3 ${selectedClass}`}>
        <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-stone-50">
          <div className="text-center text-xs text-stone-400">
            <div className="mx-auto h-10 w-10 rounded-full border border-stone-200 bg-white" />
            <p className="mt-2">여백 중심 레이아웃</p>
          </div>
        </div>
      </div>
    );
  }

  if (name.includes("month") || name.includes("월시작") || name.includes("header") || name.includes("date")) {
    return (
      <div className={`aspect-[4/3] bg-gradient-to-br from-sky-50 to-white p-3 ${selectedClass}`}>
        <div className="h-full rounded-xl border border-sky-100 bg-white shadow-sm">
          <div className="rounded-t-xl bg-gradient-to-r from-brand-500 to-sky-400 px-3 py-2">
            <div className="h-2.5 w-16 rounded-full bg-white/80" />
          </div>
          <div className="space-y-2 p-3">
            <div className="h-12 rounded-lg bg-sky-50" />
            <div className="h-2 w-5/6 rounded-full bg-stone-200" />
            <div className="h-2 w-2/3 rounded-full bg-stone-200" />
            <div className="h-16 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`aspect-[4/3] bg-stone-100 p-3 ${selectedClass}`}>
      <div className="grid h-full grid-cols-[1.15fr_0.85fr] gap-2">
        <div className="rounded-xl bg-gradient-to-br from-brand-100 via-brand-50 to-white p-3">
          <div className="h-full rounded-lg bg-white/70 p-2 shadow-sm">
            <div className="h-2 w-10 rounded-full bg-stone-700/70" />
            <div className="mt-2 space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-stone-200" />
              <div className="h-1.5 w-5/6 rounded-full bg-stone-200" />
              <div className="h-1.5 w-2/3 rounded-full bg-stone-200" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-2 shadow-sm">
          <div
            className={`h-full rounded-lg ${
              name.includes("photo") || name.includes("fill") || name.includes("contain") || name.includes("cover")
                ? "bg-gradient-to-br from-rose-100 via-orange-100 to-amber-200"
                : "bg-gradient-to-br from-sky-100 via-indigo-50 to-white"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

function AssetPreview({ asset }: { asset: StudioCuratedAssetInput }) {
  if (asset.assetType === "IMAGE") {
    return (
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        {asset.content ? (
          <img
            src={asset.content}
            alt={asset.title || "큐레이션 이미지 미리보기"}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center px-4 text-center text-sm text-stone-500">
            이미지 URL을 입력하면 여기에서 바로 미리 볼 수 있습니다.
          </div>
        )}
        <div className="border-t border-stone-200 bg-white/90 px-3 py-2">
          <p className="text-sm font-medium text-stone-900">
            {asset.title || "이미지 자산 제목"}
          </p>
        </div>
      </div>
    );
  }

  if (asset.assetType === "VIDEO") {
    const videoMeta = parseVideoPreview(asset.content);

    return (
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        {videoMeta.thumbnailUrl ? (
          <div className="relative">
            <img
              src={videoMeta.thumbnailUrl}
              alt={asset.title || "영상 미리보기"}
              className="aspect-video w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/20">
              <div className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-stone-900 shadow-sm">
                VIDEO
              </div>
            </div>
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center px-4 text-center text-sm text-stone-500">
            영상 링크를 입력하면 썸네일 또는 링크 프리뷰가 표시됩니다.
          </div>
        )}
        <div className="space-y-1 border-t border-stone-200 bg-white/90 px-3 py-3">
          <p className="text-sm font-medium text-stone-900">
            {asset.title || "영상 자산 제목"}
          </p>
          <p className="line-clamp-2 text-xs text-stone-500 break-all">
            {asset.content || "영상 링크가 여기에 표시됩니다."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-gradient-to-br from-white to-stone-50 p-4">
      <p className="text-sm font-medium text-stone-900">
        {asset.title || "메시지 자산 제목"}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">
        {asset.content || "메시지를 입력하면 이 영역에서 실제 카드처럼 읽어볼 수 있습니다."}
      </p>
    </div>
  );
}

function parseVideoPreview(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return { thumbnailUrl: "" };
  }

  const youtubeId = extractYouTubeVideoId(trimmed);
  if (youtubeId) {
    return {
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  return { thumbnailUrl: "" };
}

function extractYouTubeVideoId(url: string) {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /embed\/([a-zA-Z0-9_-]{6,})/,
    /shorts\/([a-zA-Z0-9_-]{6,})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}
