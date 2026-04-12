import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  createEdition,
  getStudioEdition,
  publishEdition,
  uploadStudioCover,
  updateEdition,
} from "../api/studio";
import {
  getSweetbookIntegrationStatus,
  listSweetbookBookSpecs,
  listSweetbookTemplates,
} from "../api/sweetbook";
import StudioShell from "../components/StudioShell";
import type {
  StudioCuratedAssetInput,
  StudioEditionInput,
  StudioPersonalizationFieldInput,
} from "../api/studio";
import type {
  EditionDetail,
  SweetbookBookSpec,
  SweetbookIntegrationStatus,
  SweetbookTemplate,
} from "../types/api";
import {
  computeBookPlan,
  estimateEditionPricing,
} from "../lib/sweetbookWorkflow";
import {
  resolveAppUrl,
  resolveMediaUrl,
  toAbsoluteAppUrl,
} from "../lib/appPaths";
const ASSET_TYPES = ["IMAGE", "VIDEO", "MESSAGE"] as const;
const FIELD_TYPES = ["TEXT", "TEXTAREA", "DATE"] as const;
const STUDIO_STEPS = [
  {
    id: "structure",
    badge: "1",
    title: "기본 정보",
    description: "에디션 제목, 커버 이미지, 소개 문구를 입력해요.",
  },
  {
    id: "details",
    badge: "2",
    title: "레이아웃 설정",
    description: "조판 방식과 템플릿, 크리에이터 메시지를 설정해요.",
  },
  {
    id: "assets",
    badge: "3",
    title: "콘텐츠 구성",
    description: "페이지에 들어갈 콘텐츠와 팬 입력 항목을 구성해요.",
  },
  {
    id: "review",
    badge: "4",
    title: "검토 및 공개",
    description: "최종 검토 후 저장하거나 팬에게 공개해요.",
  },
] as const;

const SWEETBOOK_EDITOR_TOOLS = [
  { key: "cover", label: "표지 파라미터", description: "커버 이미지와 제목처럼 표지 템플릿에 바로 바인딩될 값을 준비합니다." },
  { key: "publish", label: "발행면 파라미터", description: "제목, 발행일, 저자 정보처럼 오프닝 페이지에 들어갈 값을 정리합니다." },
  { key: "content", label: "본문 파라미터", description: "사진과 캡션을 반복 배치할 본문 템플릿 규칙을 정합니다." },
  { key: "page-rule", label: "페이지 규칙", description: "최소 페이지 수와 증분 단위에 맞는 자동 생성 분량을 확인합니다." },
  { key: "fallback", label: "실패 대비", description: "시뮬레이션 모드와 실제 샌드박스 모드가 언제 쓰이는지 구분합니다." },
  { key: "webhook", label: "주문 추적", description: "출력 후에는 주문 웹훅 기준으로 제작/배송 단계를 추적합니다." },
] as const;

const PLAYPICK_COVER_TEMPLATE_LIMIT = 4;
const PLAYPICK_PUBLISH_TEMPLATE_LIMIT = 3;
const PLAYPICK_CONTENT_TEMPLATE_LIMIT = 6;
const PLAYPICK_COVER_TEMPLATE_CATEGORY_PRIORITY = [
  "구글포토북A",
  "구글포토북B",
  "구글포토북C",
  "일기장A",
  "일기장B",
] as const;
const PLAYPICK_PUBLISH_TEMPLATE_CATEGORY_PRIORITY = [
  "구글포토북A",
  "구글포토북B",
  "구글포토북C",
  "일기장A",
  "일기장B",
] as const;
const PLAYPICK_CONTENT_TEMPLATE_CATEGORY_PRIORITY = [
  "구글포토북C",
  "구글포토북A",
  "구글포토북B",
  "일기장A",
  "일기장B",
] as const;

type StudioStepId = (typeof STUDIO_STEPS)[number]["id"];
type SupportedFieldType = (typeof FIELD_TYPES)[number];

export default function StudioPage() {
  const { editionId } = useParams<{ editionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<StudioEditionInput>(createInitialForm);
  const [created, setCreated] = useState<EditionDetail | null>(null);
  const [loadingEdition, setLoadingEdition] = useState(Boolean(editionId));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [bookSpecs, setBookSpecs] = useState<SweetbookBookSpec[]>([]);
  const [bookSpecsLoading, setBookSpecsLoading] = useState(true);
  const [bookSpecError, setBookSpecError] = useState("");
  const [layoutTemplates, setLayoutTemplates] = useState<SweetbookTemplate[]>([]);
  const [layoutTemplatesLoading, setLayoutTemplatesLoading] = useState(true);
  const [layoutTemplateError, setLayoutTemplateError] = useState("");
  const [integrationStatus, setIntegrationStatus] =
    useState<SweetbookIntegrationStatus | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StudioStepId>("structure");

  const intro = form.officialIntro ?? createCopyBlock();
  const closing = form.officialClosing ?? createCopyBlock();
  const assets = form.curatedAssets ?? [];
  const fields = form.personalizationFields ?? [];
  const selectedBookSpec =
    bookSpecs.find((spec) => spec.uid === form.bookSpecUid) ?? null;
  const bookPlan = computeBookPlan(selectedBookSpec);
  const pricingHint = estimateEditionPricing(form.bookSpecUid);
  const validationMessages = useMemo(() => validateForm(form, bookPlan), [bookPlan, form]);
  const fingerprint = serializeForm(form);
  const hasUnsavedChanges = savedFingerprint != null && savedFingerprint !== fingerprint;
  const currentStepIndex = STUDIO_STEPS.findIndex((step) => step.id === activeStep);
  const currentStep = STUDIO_STEPS[currentStepIndex] ?? STUDIO_STEPS[0];
  const pagePlanningItems = useMemo(
    () =>
      buildSweetbookPagePlan({
        form,
        assetCount: assets.length,
        fieldCount: fields.length,
        layoutTemplates,
        bookPlan,
      }),
    [assets.length, bookPlan, fields.length, form, layoutTemplates],
  );
  const sweetbookTemplateGroups = useMemo(
    () => ({
      cover: curateCoverTemplatesForPlayPick(layoutTemplates),
      publish: curatePublishTemplatesForPlayPick(layoutTemplates),
      content: curateContentTemplatesForPlayPick(layoutTemplates),
    }),
    [layoutTemplates],
  );

  useEffect(() => {
    if (!editionId) {
      setCreated(null);
      setForm(createInitialForm());
      setSavedFingerprint(null);
      setLoadingEdition(false);
      return;
    }

    setLoadingEdition(true);
    getStudioEdition(Number(editionId))
      .then((edition) => {
        const normalized = normalizeEditionToForm(edition);
        setCreated(edition);
        setForm(normalized);
        setSavedFingerprint(serializeForm(normalized));
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          const next = `${location.pathname}${location.search}`;
          navigate(`/login?next=${encodeURIComponent(next)}&reason=session-expired`, {
            replace: true,
          });
          return;
        }
        setError(e instanceof Error ? e.message : "에디션 편집 정보를 불러오지 못했습니다.");
      })
      .finally(() => setLoadingEdition(false));
  }, [editionId, location.pathname, location.search, navigate]);

  useEffect(() => {
    getSweetbookIntegrationStatus()
      .then(setIntegrationStatus)
      .catch(() => setIntegrationStatus(null));
  }, []);

  useEffect(() => {
    listSweetbookBookSpecs()
      .then((specs) => {
        const validSpecs = specs.filter((spec) => spec.uid.trim() && spec.name.trim());
        setBookSpecs(validSpecs);
        if (!form.bookSpecUid && validSpecs[0]?.uid) {
          setForm((current) => ({ ...current, bookSpecUid: validSpecs[0].uid }));
        }
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setError("세션이 만료되어 다시 로그인해 주세요.");
          setSuccess("");
          const next = `${location.pathname}${location.search}`;
          navigate(`/login?next=${encodeURIComponent(next)}&reason=session-expired`, {
            replace: true,
          });
          return;
        }
        setBookSpecError(e instanceof Error ? e.message : "인쇄 규격 목록을 불러오지 못했어요.");
      })
      .finally(() => setBookSpecsLoading(false));
  }, [form.bookSpecUid, location.pathname, location.search, navigate]);

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
        if (e instanceof ApiError && e.status === 401) {
          setError("세션이 만료되어 다시 로그인해 주세요.");
          setSuccess("");
          const next = `${location.pathname}${location.search}`;
          navigate(`/login?next=${encodeURIComponent(next)}&reason=session-expired`, {
            replace: true,
          });
          return;
        }
        setLayoutTemplateError(e instanceof Error ? e.message : "레이아웃 템플릿 목록을 불러오지 못했어요.");
        setLayoutTemplates([]);
      })
      .finally(() => setLayoutTemplatesLoading(false));
  }, [form.bookSpecUid, location.pathname, location.search, navigate]);

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
    setSuccess("새 에디션을 시작합니다.");
    navigate("/studio/editions/new");
  }

  async function handleCoverUpload(file: File | null) {
    if (!file) {
      return;
    }

    setUploadingCover(true);
    setError("");
    setSuccess("");
    try {
      const uploaded = await uploadStudioCover(file);
      setForm((current) => ({ ...current, coverImageUrl: uploaded.url }));
      setSuccess("커버 이미지를 업로드했습니다.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "커버 이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleCopyShareLink() {
    if (!created) {
      return;
    }

    const shareUrl = toAbsoluteAppUrl(`/editions/${created.id}`);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSuccess("팬에게 공유할 링크를 복사했습니다.");
    } catch {
      setError("공유 링크를 복사하지 못했습니다.");
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
      if (e instanceof ApiError && e.status === 401) {
        setError("세션이 만료되어 다시 로그인해 주세요.");
        setSuccess("");
        const next = `${location.pathname}${location.search}`;
        navigate(`/login?next=${encodeURIComponent(next)}&reason=session-expired`, {
          replace: true,
        });
        return;
      }
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
      setSuccess("에디션이 공개되었습니다!");
      setTimeout(() => navigate(`/editions/${editionId}`), 1500);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        setError("세션이 만료되어 다시 로그인해 주세요.");
        setSuccess("");
        const next = `${location.pathname}${location.search}`;
        navigate(`/login?next=${encodeURIComponent(next)}&reason=session-expired`, {
          replace: true,
        });
        return;
      }
      setError(e instanceof Error ? e.message : "퍼블리시 실패");
    } finally {
      setPublishing(false);
    }
  }

  function goToPreviousStep() {
    if (currentStepIndex <= 0) {
      return;
    }
    setActiveStep(STUDIO_STEPS[currentStepIndex - 1]?.id ?? "structure");
  }

  function goToNextStep() {
    if (currentStepIndex >= STUDIO_STEPS.length - 1) {
      return;
    }
    setActiveStep(STUDIO_STEPS[currentStepIndex + 1]?.id ?? "review");
  }

  if (loadingEdition) {
    return (
      <StudioShell
        title="에디션 제작"
        description="저장해 둔 에디션을 불러오는 중입니다."
      >
        <section className="editorial-card p-10 text-center text-sm text-warm-500">
          저장된 에디션을 불러오는 중입니다.
        </section>
      </StudioShell>
    );
  }

  return (
    <StudioShell
      title={created ? "에디션 편집" : "에디션 제작"}
      description="에디션을 단계별로 구성하고, 초안을 저장한 뒤 팬에게 공개할 수 있는 제작 전용 화면이에요."
      meta={
        <>
          {created && (
            <span className="rounded bg-surface-low px-3 py-1 text-[11px] font-medium text-warm-500">
              {created.status} · #{created.id}
            </span>
          )}
          {created && hasUnsavedChanges && (
            <span className="rounded bg-gold-400/15 px-3 py-1 text-[11px] font-medium text-gold-500">
              저장되지 않은 변경사항
            </span>
          )}
        </>
      }
      actions={
        <button
          type="button"
          onClick={resetToNewEdition}
          className="editorial-button-secondary px-4 py-2.5"
        >
          새 에디션 시작
        </button>
      }
    >

      <section className="editorial-card p-4 md:p-6">
        <div className="flex flex-wrap gap-3">
          {STUDIO_STEPS.map((step, index) => {
            const isActive = step.id === activeStep;
            const isCompleted = index < currentStepIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`min-w-[180px] flex-1 rounded border px-4 py-4 text-left transition-colors ${
                  isActive
                    ? "border-brand-400 bg-brand-50/50"
                    : isCompleted
                      ? "border-success-200 bg-success-50/70"
                      : "border-stone-200 bg-surface-low hover:border-brand-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      isActive
                        ? "bg-brand-700 text-white"
                        : isCompleted
                          ? "bg-success-600 text-white"
                          : "bg-white text-warm-500"
                    }`}
                  >
                    {step.badge}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-warm-500">{step.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col gap-2 rounded bg-surface-low px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
              현재 단계
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {currentStep.badge}. {currentStep.title}
            </p>
          </div>
          <p className="text-sm text-warm-500">{currentStep.description}</p>
        </div>
      </section>

      <div className="mt-8 space-y-6">
        <div className="min-w-0 space-y-6">
          {activeStep === "structure" && (
            <>
          <section className="editorial-card p-6 md:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">에디션 기본 정보</h2>
                <p className="mt-1 text-sm text-stone-600">
                  팬이 처음 보게 될 제목과 커버 이미지를 설정해주세요. 인쇄 규격과 레이아웃은 이후 단계에서 설정할 수 있어요.
                </p>
              </div>
              <div className="rounded-full bg-surface-low px-3 py-1 text-[11px] font-medium text-warm-500">
                예상 제작가 {pricingHint.productPrice.toLocaleString("ko-KR")}원부터
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4">
                <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="예: 2026 상반기 여행 포토북" />
                <input value={form.subtitle} onChange={(e) => setForm((current) => ({ ...current, subtitle: e.target.value }))} className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="팬이 처음 보게 될 짧은 소개" />
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">커버 이미지</p>
                      <p className="mt-1 text-sm text-warm-500">
                        파일 업로드를 우선으로 쓰고, 필요하면 아래 URL을 직접 붙여 넣을 수도 있습니다.
                      </p>
                    </div>
                    <label className="editorial-button-secondary cursor-pointer px-4 py-2.5">
                      {uploadingCover ? "업로드 중..." : "파일 업로드"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          void handleCoverUpload(e.target.files?.[0] ?? null);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <input value={form.coverImageUrl} onChange={(e) => setForm((current) => ({ ...current, coverImageUrl: e.target.value }))} className="mt-4 w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="커버 이미지 URL" />
                </div>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-stone-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">미리보기</p>
                <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3">
                  <img
                    src={resolveMediaUrl(form.coverImageUrl)}
                    alt={form.title || "커버 미리보기"}
                    className="aspect-[4/5] w-full rounded-xl object-cover"
                  />
                </div>
                <p className="mt-4 text-lg font-semibold text-stone-900">
                  {form.title || "아직 제목이 없습니다"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-warm-500">
                  {form.subtitle || "부제목을 적으면 팬이 에디션을 이해하기 쉬워집니다."}
                </p>
              </div>
            </div>
          </section>
            </>
          )}

          {activeStep === "details" && (
            <>
          <section className="editorial-card p-6 md:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">조판 가이드</h2>
                <p className="mt-1 text-sm text-stone-600">
                  공개 API 기준으로는 호스팅 에디터 대신 템플릿 조합과 페이지 규칙을 먼저 정하고, 이후 팬 입력이 그 위에 들어갑니다.
                </p>
              </div>
              <p className="text-xs font-medium text-stone-500">
                Sweetbook 템플릿 기반
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-brand-200 bg-brand-50/60 p-5 text-left">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500">
                  기본 흐름
                </span>
                <h3 className="mt-4 text-2xl font-semibold text-stone-900">템플릿과 자산으로 초안 생성</h3>
                <p className="mt-3 text-sm leading-relaxed text-warm-500">
                  표지, 발행면, 본문 템플릿을 고른 뒤 큐레이션 자산과 팬 입력 항목을 조합해 인쇄용 초안을 만듭니다.
                </p>
                <p className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-stone-700">
                  현재 Studio는 하나의 조판 흐름만 제공하며, 선택한 템플릿과 페이지 규칙을 기준으로 미리보기와 출력을 이어갑니다.
                </p>
              </div>
              <div className="rounded-3xl border border-stone-200 bg-stone-50/70 p-5 text-left">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  체크 포인트
                </span>
                <h3 className="mt-4 text-2xl font-semibold text-stone-900">페이지 규칙 먼저 확인</h3>
                <p className="mt-3 text-sm leading-relaxed text-warm-500">
                  인쇄 규격마다 최소 페이지 수와 증분 단위가 다르기 때문에, 대표 장면과 메시지가 현재 분량 계획에 맞는지 먼저 확인하는 것이 중요합니다.
                </p>
                <p className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-stone-700">
                  본문 템플릿은 사진 중심 구성을 기본으로 쓰고, 팬 참여 텍스트는 후반부 개인화 페이지와 미리보기에서 함께 반영됩니다.
                </p>
              </div>
            </div>
          </section>

          <section className="editorial-card p-6 md:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">템플릿 큐레이션</h2>
                <p className="mt-1 text-sm text-stone-600">
                  플레이픽 포토북 컨셉에 맞는 추천 템플릿만 남겨 두었습니다.
                </p>
              </div>
              <p className="text-xs font-medium text-stone-500">
                규격 {selectedBookSpec?.name ?? form.bookSpecUid}
              </p>
            </div>

            {layoutTemplateError ? (
              <p className="mt-5 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-4 text-sm text-red-500">
                {layoutTemplateError}
              </p>
            ) : layoutTemplatesLoading ? (
              <p className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 px-4 py-8 text-center text-sm text-stone-500">
                레이아웃 템플릿을 불러오는 중이에요.
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                <SweetbookTemplateSection
                  title="표지 템플릿"
                  description="플레이픽 포토북 컨셉에 맞는 표지 4종만 추려서 보여줍니다."
                  templates={sweetbookTemplateGroups.cover}
                  selectedUid={form.sweetbookCoverTemplateUid ?? ""}
                  onSelect={(uid) => selectSweetbookTemplate("cover", uid)}
                  defaultExpanded={true}
                />
                <SweetbookTemplateSection
                  title="발행면 템플릿"
                  description="오프닝 톤에 맞는 발행면 3종만 추려서 보여줍니다."
                  templates={sweetbookTemplateGroups.publish}
                  selectedUid={form.sweetbookPublishTemplateUid ?? ""}
                  onSelect={(uid) => selectSweetbookTemplate("publish", uid)}
                  defaultExpanded={false}
                />
                <SweetbookTemplateSection
                  title="본문 템플릿"
                  description="사진 중심 포토북에 잘 맞는 본문 6종만 남겨서 보여줍니다."
                  templates={sweetbookTemplateGroups.content}
                  selectedUid={form.sweetbookContentTemplateUid ?? ""}
                  onSelect={(uid) => selectSweetbookTemplate("content", uid)}
                  defaultExpanded={false}
                />
              </div>
            )}
          </section>

          <section className="editorial-card p-6 md:p-8">
            <h2 className="text-lg font-semibold text-stone-900">크리에이터 메시지</h2>
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
            </>
          )}

          {activeStep === "assets" && (
            <>
          <section className="editorial-card p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-stone-900">큐레이션 자산</h2>
              <button type="button" onClick={addAsset} className="editorial-button-secondary px-4 py-2.5">자산 추가</button>
            </div>
            <p className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 px-4 py-4 text-sm leading-relaxed text-stone-600">
              공식 이미지, 영상 링크, 메시지를 직접 구성해 팬에게 보여줄 핵심 장면을 설계하세요.
            </p>
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
                          <textarea rows={5} value={asset.content} onChange={(e) => updateAsset(index, "content", e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="메시지를 입력해 주세요" />
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
            </>
          )}

          {activeStep === "review" && (
            <section className="rounded-3xl border border-stone-200 bg-white/88 p-6 shadow-sm shadow-brand-100/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">검토 및 공개</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    설정한 템플릿과 입력 내용을 최종 확인한 뒤, 초안을 저장하거나 팬에게 공개하세요.
                  </p>
                </div>
                <p className="text-xs font-medium text-stone-500">
                  저장 후에는 팬 시점 링크를 바로 확인하고 다시 편집할 수 있습니다.
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-5">
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 md:col-span-2">
                  <label htmlFor="review-bookSpecUid" className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    인쇄 규격
                  </label>
                  <select
                    id="review-bookSpecUid"
                    value={form.bookSpecUid ?? ""}
                    onChange={(e) => updateBookSpecUid(e.target.value)}
                    className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    disabled={bookSpecsLoading}
                  >
                    {bookSpecs.map((spec) => (
                      <option key={spec.uid} value={spec.uid}>
                        {spec.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-warm-500">
                    최소 {bookPlan.minimumPages}p · 최대 {bookPlan.maximumPages}p
                  </p>
                  {bookSpecError && <p className="mt-2 text-xs text-red-500">{bookSpecError}</p>}
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">자동 계획 분량</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">{bookPlan.plannedTotalPages}p</p>
                  <p className="mt-2 text-sm text-warm-500">
                    발행면 {bookPlan.publishPages}p · 본문 {bookPlan.contentPages}p
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">규칙 검증</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">
                    {bookPlan.isValid ? "통과" : "보완 필요"}
                  </p>
                  <p className="mt-2 text-sm text-warm-500">{bookPlan.pageIncrement}p 단위 증감</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">연동 모드</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">
                    {integrationStatus?.label ?? "확인 중"}
                  </p>
                  <p className="mt-2 text-sm text-warm-500">
                    예상 제작가 {pricingHint.productPrice.toLocaleString("ko-KR")}원부터
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">에디션 정보</p>
                  <p className="mt-3 text-base font-semibold text-stone-900">
                    {form.title || "아직 제목이 없습니다"}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {form.subtitle || "부제목을 입력하면 여기에서 함께 확인됩니다."}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">레이아웃 선택 요약</p>
                  <div className="mt-3 space-y-2 text-sm text-stone-600">
                    <p>표지: <span className="font-medium text-stone-900">{readTemplateName(layoutTemplates, form.sweetbookCoverTemplateUid)}</span></p>
                    <p>발행면: <span className="font-medium text-stone-900">{readTemplateName(layoutTemplates, form.sweetbookPublishTemplateUid)}</span></p>
                    <p>본문: <span className="font-medium text-stone-900">{readTemplateName(layoutTemplates, form.sweetbookContentTemplateUid)}</span></p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-stone-200 bg-white/80 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    인쇄 규칙 체크
                  </p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {pagePlanningItems.map((item) => (
                    <div key={`review-${item.title}`} className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.tone}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-warm-500">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
                  출력 파라미터 맵
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {SWEETBOOK_EDITOR_TOOLS.map((tool) => (
                    <div key={tool.key} className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3">
                      <p className="text-sm font-semibold text-stone-900">{tool.label}</p>
                      <p className="mt-1 text-sm text-warm-500">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">크리에이터 메시지</p>
                  <p className="mt-2 text-2xl font-bold text-stone-900">
                    {[intro.title, intro.message, closing.title, closing.message].filter(Boolean).length}/4
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">큐레이션 자산</p>
                  <p className="mt-2 text-2xl font-bold text-stone-900">{assets.length}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">팬 입력 항목</p>
                  <p className="mt-2 text-2xl font-bold text-stone-900">{fields.length}</p>
                </div>
              </div>

              {validationMessages.length > 0 ? (
                <ul className="mt-5 space-y-1 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-500">
                  {validationMessages.map((message) => <li key={message}>{message}</li>)}
                </ul>
              ) : (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
                  필수 입력이 모두 채워졌습니다. 초안 저장 또는 퍼블리시를 진행해도 됩니다.
                </div>
              )}
            </section>
          )}

          <div className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white/88 p-4 shadow-sm shadow-brand-100/30 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStepIndex === 0}
              className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              이전 단계
            </button>
            <p className="text-sm text-stone-500">
              {currentStepIndex + 1} / {STUDIO_STEPS.length} 단계
            </p>
            <button
              type="button"
              onClick={goToNextStep}
              disabled={currentStepIndex === STUDIO_STEPS.length - 1}
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              다음 단계
            </button>
          </div>
        </div>
        <section className="rounded-3xl border border-stone-200 bg-white/92 p-5 shadow-sm shadow-brand-100/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">큐레이션 자산</p>
                  <p className="mt-1 text-lg font-bold text-stone-900">{assets.length}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">팬 입력 항목</p>
                  <p className="mt-1 text-lg font-bold text-stone-900">{fields.length}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">선택한 레이아웃</p>
                  <p className="mt-1 text-sm font-medium text-stone-900">
                    {readTemplateName(layoutTemplates, form.sweetbookCoverTemplateUid)}
                    {" / "}
                    {readTemplateName(layoutTemplates, form.sweetbookPublishTemplateUid)}
                    {" / "}
                    {readTemplateName(layoutTemplates, form.sweetbookContentTemplateUid)}
                  </p>
                </div>
              </div>

              {validationMessages.length > 0 && (
                <ul className="space-y-1 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-500">
                  {validationMessages.map((message) => <li key={message}>{message}</li>)}
                </ul>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-emerald-600">{success}</p>}
              {created && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/studio/editions/${created.id}/edit`)}
                    className="editorial-button-secondary px-4 py-2.5"
                  >
                    다시 편집 링크 열기
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        resolveAppUrl(`/editions/${created.id}`),
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    className="editorial-button-secondary px-4 py-2.5"
                  >
                    팬 시점 미리보기
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyShareLink()}
                    className="editorial-button-link"
                  >
                    공유 링크 복사
                  </button>
                </div>
              )}
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[240px]">
              <button type="button" disabled={saving || publishing || validationMessages.length > 0} onClick={handleSave} className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50">
                {saving ? "저장 중..." : created ? "초안 저장" : "에디션 초안 생성"}
              </button>
              <button type="button" disabled={!created || saving || publishing || validationMessages.length > 0} onClick={handlePublish} className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50">
                {publishing ? "공개 중..." : hasUnsavedChanges ? "저장 후 공개하기" : "공개하기"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </StudioShell>
  );
}

function createInitialForm(): StudioEditionInput {
  return {
    title: "",
    subtitle: "",
    coverImageUrl: "/demo-assets/playpick-hero.svg",
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
  return {
    fieldKey: overrides?.fieldKey ?? "",
    label: overrides?.label ?? "",
    inputType: normalizeFieldType(overrides?.inputType) ?? "TEXT",
    required: overrides?.required ?? false,
    maxLength: overrides?.maxLength,
    sortOrder: overrides?.sortOrder ?? 1,
  };
}

function resequenceAssets(items: StudioCuratedAssetInput[]) {
  return items.map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

function resequenceFields(items: StudioPersonalizationFieldInput[]) {
  return items.map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

function isSupportedFieldType(inputType: string): inputType is SupportedFieldType {
  return FIELD_TYPES.includes(inputType as SupportedFieldType);
}

function normalizeFieldType(inputType?: string | null) {
  const normalized = inputType?.trim().toUpperCase() ?? "";
  return isSupportedFieldType(normalized) ? normalized : null;
}

function buildSubmitPayload(form: StudioEditionInput): StudioEditionInput {
  const personalizationFields = (form.personalizationFields ?? []).reduce<StudioPersonalizationFieldInput[]>(
    (result, field) => {
      const inputType = normalizeFieldType(field.inputType);
      if (!inputType) {
        return result;
      }
      result.push({
        ...field,
        fieldKey: field.fieldKey.trim(),
        label: field.label.trim(),
        inputType,
        maxLength: typeof field.maxLength === "string" ? Number(field.maxLength) || undefined : field.maxLength,
      });
      return result;
    },
    [],
  );

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
    personalizationFields: resequenceFields(personalizationFields),
  };
}

function normalizeEditionToForm(edition: EditionDetail): StudioEditionInput {
  const personalizationFields = (edition.snapshot?.personalizationFields ?? []).reduce<StudioPersonalizationFieldInput[]>(
    (result, field) => {
      const inputType = normalizeFieldType(field.inputType);
      if (!inputType) {
        return result;
      }
      result.push(createField({ ...field, inputType, maxLength: field.maxLength ?? undefined }));
      return result;
    },
    [],
  );

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
    personalizationFields: resequenceFields(personalizationFields),
  };
}

function readCopyBlock(data: Record<string, unknown> | null | undefined) {
  return createCopyBlock({
    title: typeof data?.title === "string" ? data.title : typeof data?.heading === "string" ? data.heading : "",
    message: typeof data?.message === "string" ? data.message : typeof data?.body === "string" ? data.body : "",
  });
}

function validateForm(
  form: StudioEditionInput,
  bookPlan: ReturnType<typeof computeBookPlan>,
) {
  const payload = buildSubmitPayload(form);
  const messages: string[] = [];
  if (!payload.title) messages.push("에디션 제목을 입력해 주세요.");
  if (!payload.coverImageUrl) messages.push("커버 이미지 URL을 입력해 주세요.");
  if (!payload.officialIntro?.title || !payload.officialIntro.message) messages.push("인트로 메시지의 제목과 내용을 모두 입력해 주세요.");
  if (!payload.officialClosing?.title || !payload.officialClosing.message) messages.push("클로징 메시지의 제목과 내용을 모두 입력해 주세요.");
  if ((payload.personalizationFields ?? []).length === 0) messages.push("팬 입력 항목을 최소 1개 이상 추가해 주세요.");
  if (!bookPlan.isValid) messages.push("현재 선택한 인쇄 규격의 페이지 수 규칙을 다시 확인해주세요.");

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

function curateCoverTemplatesForPlayPick(templates: SweetbookTemplate[]) {
  const coverTemplates = groupTemplatesByRole(templates, "cover");
  if (coverTemplates.length <= PLAYPICK_COVER_TEMPLATE_LIMIT) {
    return coverTemplates;
  }

  return [...coverTemplates]
    .sort((left, right) => {
      const priorityDiff = readPlayPickCoverPriority(left) - readPlayPickCoverPriority(right);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const categoryDiff = (left.category ?? "").localeCompare(right.category ?? "", "ko");
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return (left.name ?? "").localeCompare(right.name ?? "", "ko");
    })
    .slice(0, PLAYPICK_COVER_TEMPLATE_LIMIT);
}

function curatePublishTemplatesForPlayPick(templates: SweetbookTemplate[]) {
  const publishTemplates = groupTemplatesByRole(templates, "publish");
  if (publishTemplates.length <= PLAYPICK_PUBLISH_TEMPLATE_LIMIT) {
    return publishTemplates;
  }

  return [...publishTemplates]
    .sort((left, right) => {
      const priorityDiff = readTemplateCategoryPriority(left, PLAYPICK_PUBLISH_TEMPLATE_CATEGORY_PRIORITY)
        - readTemplateCategoryPriority(right, PLAYPICK_PUBLISH_TEMPLATE_CATEGORY_PRIORITY);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return compareTemplateIdentity(left, right);
    })
    .slice(0, PLAYPICK_PUBLISH_TEMPLATE_LIMIT);
}

function curateContentTemplatesForPlayPick(templates: SweetbookTemplate[]) {
  const contentTemplates = groupTemplatesByRole(templates, "content");
  if (contentTemplates.length <= PLAYPICK_CONTENT_TEMPLATE_LIMIT) {
    return contentTemplates;
  }

  return [...contentTemplates]
    .sort((left, right) => {
      const categoryDiff = readTemplateCategoryPriority(left, PLAYPICK_CONTENT_TEMPLATE_CATEGORY_PRIORITY)
        - readTemplateCategoryPriority(right, PLAYPICK_CONTENT_TEMPLATE_CATEGORY_PRIORITY);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      const layoutDiff = readPlayPickContentPriority(left) - readPlayPickContentPriority(right);
      if (layoutDiff !== 0) {
        return layoutDiff;
      }

      return compareTemplateIdentity(left, right);
    })
    .slice(0, PLAYPICK_CONTENT_TEMPLATE_LIMIT);
}

function readPlayPickCoverPriority(template: SweetbookTemplate) {
  return readTemplateCategoryPriority(template, PLAYPICK_COVER_TEMPLATE_CATEGORY_PRIORITY);
}

function readPlayPickContentPriority(template: SweetbookTemplate) {
  const normalizedName = normalizeTemplateIdentity(template.name);

  if (normalizedName.includes("photo")) {
    return 0;
  }
  if (normalizedName.includes("gallery")) {
    return 10;
  }
  if (normalizedName.includes("datea")) {
    return 20;
  }
  if (normalizedName.includes("dateb")) {
    return 21;
  }
  if (normalizedName.includes("monthheader") || normalizedName.includes("월시작")) {
    return 30;
  }
  if (normalizedName.includes("contain")) {
    return 40;
  }
  if (normalizedName.includes("cover")) {
    return 45;
  }
  if (normalizedName.includes("내지") || normalizedName === "content") {
    return 50;
  }
  if (normalizedName.includes("a")) {
    return 60;
  }
  if (normalizedName.includes("b")) {
    return 61;
  }
  if (normalizedName.includes("빈내지") || normalizedName.includes("blank")) {
    return 80;
  }
  return 70;
}

function readTemplateCategoryPriority(
  template: SweetbookTemplate,
  priorities: readonly string[],
) {
  const category = normalizeTemplateIdentity(template.category);
  const preferredIndex = priorities.findIndex((item) => normalizeTemplateIdentity(item) === category);

  if (preferredIndex >= 0) {
    return preferredIndex;
  }
  if (category.includes("구글포토북")) {
    return 20;
  }
  if (category.includes("일기장")) {
    return 30;
  }
  if (category.includes("알림장")) {
    return 80;
  }
  if (category.includes("공용")) {
    return 90;
  }
  return 50;
}

function compareTemplateIdentity(left: SweetbookTemplate, right: SweetbookTemplate) {
  const categoryDiff = (left.category ?? "").localeCompare(right.category ?? "", "ko");
  if (categoryDiff !== 0) {
    return categoryDiff;
  }

  return (left.name ?? "").localeCompare(right.name ?? "", "ko");
}

function normalizeTemplateIdentity(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, "").toLowerCase();
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
  const template = templates.find((item) => item.uid === uid);
  return template ? formatTemplateDisplayName(template, templates) : uid;
}

function formatTemplateDisplayName(template: SweetbookTemplate, templates: SweetbookTemplate[]) {
  const fallbackName = humanizeTemplateText(template.name?.trim() || "");
  const baseName = fallbackName || "이름 없는 템플릿";
  const category = humanizeTemplateText(template.category?.trim() || "");
  const duplicateCount = templates.filter(
    (item) => normalizeTemplateKey(item.name) === normalizeTemplateKey(template.name),
  ).length;

  if (duplicateCount > 1 && category && !baseName.startsWith(category)) {
    return `${category} · ${baseName}`;
  }
  if (!fallbackName && category) {
    return category;
  }
  return baseName;
}

function normalizeTemplateKey(value: string | undefined) {
  return humanizeTemplateText(value ?? "").toLowerCase();
}

function humanizeTemplateText(value: string) {
  if (!value.trim()) {
    return "";
  }

  const tokenMap: Record<string, string> = {
    cover: "표지",
    publish: "발행면",
    content: "본문",
    divider: "간지",
    gallery: "갤러리",
    fill: "풀페이지",
    blank: "여백형",
    header: "헤더",
  };

  return value
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => tokenMap[token.toLowerCase()] ?? token)
    .join(" ")
    .trim();
}

function formatTemplateRoleLabel(role: string) {
  const normalized = role.trim().toLowerCase();
  if (normalized.includes("cover")) {
    return "표지";
  }
  if (normalized.includes("publish")) {
    return "발행면";
  }
  if (normalized.includes("content")) {
    return "본문";
  }
  if (normalized.includes("divider")) {
    return "간지";
  }
  return humanizeTemplateText(role) || "레이아웃";
}

function SweetbookTemplateSection({
  title,
  description,
  templates,
  selectedUid,
  onSelect,
  defaultExpanded,
}: {
  title: string;
  description: string;
  templates: SweetbookTemplate[];
  selectedUid: string;
  onSelect: (uid: string) => void;
  defaultExpanded?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? true);
  const selectedTemplate = templates.find((template) => template.uid === selectedUid) ?? null;
  const selectedTemplateName = selectedTemplate
    ? formatTemplateDisplayName(selectedTemplate, templates)
    : "선택되지 않음";

  function scrollTemplates(direction: "prev" | "next") {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const offset = Math.max(track.clientWidth * 0.9, 320);
    track.scrollBy({
      left: direction === "next" ? offset : -offset,
      behavior: "smooth",
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          <p className="mt-1 text-sm text-stone-600">{description}</p>
          <p className="mt-2 text-xs text-stone-500">
            현재 선택: <span className="font-medium text-stone-700">{selectedTemplateName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {isExpanded && (
            <>
              <button
                type="button"
                onClick={() => scrollTemplates("prev")}
                className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => scrollTemplates("next")}
                className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                다음
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-brand-400 hover:text-brand-700"
          >
            {isExpanded ? "접기" : "펼치기"}
          </button>
        </div>
      </div>

      {!isExpanded ? (
        <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white/80 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-stone-500">
              템플릿 {templates.length}개가 준비되어 있습니다. 필요할 때 펼쳐서 살펴보세요.
            </div>
            {selectedTemplate && (
              <div className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-3 sm:w-auto sm:min-w-[260px]">
                <div className="w-24 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <SweetbookTemplatePreview template={selectedTemplate} selected={true} compact />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    선택됨
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-stone-900">
                    {formatTemplateDisplayName(selectedTemplate, templates)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : templates.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white/80 px-4 py-6 text-center text-sm text-stone-500">
          현재 규격에서 제공되는 템플릿이 없습니다.
        </p>
      ) : (
        <div
          ref={trackRef}
          className="mt-4 grid snap-x snap-mandatory grid-flow-col auto-cols-[94%] gap-4 overflow-x-auto pb-2 pr-2 sm:auto-cols-[72%] xl:auto-cols-[52%]"
        >
          {templates.map((template) => {
            const isSelected = selectedUid === template.uid;
            return (
              <button
                key={template.uid}
                type="button"
                onClick={() => onSelect(template.uid)}
                className={`snap-start rounded-2xl border p-5 text-left transition-colors ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-stone-200 bg-white text-stone-700 hover:border-brand-300"
                }`}
              >
                <div className="mb-4 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                  <SweetbookTemplatePreview template={template} selected={isSelected} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  {formatTemplateRoleLabel(template.role)}
                </p>
                <p className="mt-2 text-base font-semibold text-current">
                  {formatTemplateDisplayName(template, templates)}
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
  compact = false,
}: {
  template: SweetbookTemplate;
  selected: boolean;
  compact?: boolean;
}) {
  const role = template.role.toLowerCase();
  const name = template.name.toLowerCase();
  const selectedClass = selected ? "ring-2 ring-brand-400/70" : "";
  const aspectClass = compact ? "aspect-[6/5]" : "aspect-[5/4]";

  if (template.thumbnailUrl) {
    return (
      <div className={`relative ${aspectClass} overflow-hidden bg-stone-100 ${selectedClass}`}>
        <img
          src={resolveMediaUrl(template.thumbnailUrl)}
          alt={`${template.name} 레이아웃 미리보기`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/55 via-stone-900/10 to-transparent px-3 py-2">
          <div className="inline-flex rounded-full bg-white/88 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-stone-700">
            템플릿 미리보기
          </div>
        </div>
      </div>
    );
  }

  if (role.includes("cover")) {
    return (
      <div className={`relative ${aspectClass} overflow-hidden bg-gradient-to-br from-amber-100 via-rose-50 to-orange-200 ${selectedClass}`}>
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
      <div className={`${aspectClass} bg-gradient-to-br from-stone-100 via-white to-stone-200 p-3 ${selectedClass}`}>
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
      <div className={`${aspectClass} bg-stone-100 p-3 ${selectedClass}`}>
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
      <div className={`${aspectClass} bg-white p-3 ${selectedClass}`}>
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
      <div className={`${aspectClass} bg-gradient-to-br from-sky-50 to-white p-3 ${selectedClass}`}>
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
    <div className={`${aspectClass} bg-stone-100 p-3 ${selectedClass}`}>
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
            src={resolveMediaUrl(asset.content)}
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
              src={resolveMediaUrl(videoMeta.thumbnailUrl)}
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

function buildSweetbookPagePlan({
  form,
  assetCount,
  fieldCount,
  layoutTemplates,
  bookPlan,
}: {
  form: StudioEditionInput;
  assetCount: number;
  fieldCount: number;
  layoutTemplates: SweetbookTemplate[];
  bookPlan: ReturnType<typeof computeBookPlan>;
}) {
  const introReady = Boolean(form.officialIntro?.title?.trim() && form.officialIntro?.message?.trim());
  const closingReady = Boolean(form.officialClosing?.title?.trim() && form.officialClosing?.message?.trim());
  const coverReady = Boolean(form.coverImageUrl.trim() && form.title.trim());
  const contentTemplateName = readTemplateName(layoutTemplates, form.sweetbookContentTemplateUid);

  return [
    {
      title: "1p 표지",
      status: coverReady ? "준비됨" : "보완 필요",
      tone: coverReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      description: coverReady
        ? "커버 이미지와 제목이 준비되어 표지 템플릿에 바로 적용할 수 있어요."
        : "커버 이미지와 제목을 먼저 채우면 표지 생성 단계로 자연스럽게 이어집니다.",
    },
    {
      title: "오프닝 페이지",
      status: introReady ? "준비됨" : "보완 필요",
      tone: introReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      description: introReady
        ? "인트로 메시지가 있어 발행면과 첫 페이지에서 세계관을 설명할 수 있습니다."
        : "인트로 제목과 메시지를 채우면 발행면과 첫 페이지의 맥락이 더 선명해집니다.",
    },
    {
      title: "본문 사진 배치",
      status: assetCount > 0 ? `${assetCount}개 준비` : "자산 필요",
      tone: assetCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      description: `본문 템플릿(${contentTemplateName})과 대표 자산 ${assetCount}개를 바탕으로 인쇄용 초안을 만들고, 이후 보정 포인트를 점검하는 흐름입니다.`,
    },
    {
      title: "팬 참여 페이지",
      status: fieldCount > 0 ? `${fieldCount}개 항목` : "항목 필요",
      tone: fieldCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      description:
        fieldCount > 0
          ? "팬 입력 항목이 준비되어 있어 후반부 참여형 페이지나 주문 개인화 영역으로 연결할 수 있습니다."
          : "팬 입력 항목을 추가하면 텍스트/메시지 중심 페이지를 설계하기 쉬워집니다.",
    },
    {
      title: "페이지 수 규칙",
      status: bookPlan.isValid ? `${bookPlan.plannedTotalPages}p 통과` : "규칙 점검 필요",
      tone: bookPlan.isValid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      description: `현재 페이지 계획은 ${bookPlan.plannedTotalPages}p이며, 최소 ${bookPlan.minimumPages}p에서 ${bookPlan.pageIncrement}p 단위로 증감하는 규칙을 기준으로 검토합니다.`,
    },
    {
      title: "엔딩 페이지",
      status: closingReady ? "준비됨" : "보완 필요",
      tone: closingReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      description: closingReady
        ? "클로징 메시지가 있어 마지막 장과 최종화 직전 검수 포인트가 분명합니다."
        : "클로징 제목과 메시지를 채우면 마지막 페이지 감정선을 더 잘 닫을 수 있습니다.",
    },
  ];
}

