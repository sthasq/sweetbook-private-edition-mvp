import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createOrder,
  createPaymentSession,
  estimateOrder,
  getPreview,
} from "../api/projects";
import { getSweetbookIntegrationStatus } from "../api/sweetbook";
import type {
  EstimateResponse,
  PaymentSessionResponse,
  ProjectPreview,
  ShippingInput,
  SweetbookIntegrationStatus,
} from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";
import { loadTossPayments, type TossWidgetsInstance } from "../lib/tossPayments";
import {
  integrationTone,
  projectModeLabel,
  projectStageLabel,
} from "../lib/sweetbookWorkflow";
import { resolveMediaUrl } from "../lib/appPaths";

const INITIAL_SHIPPING: ShippingInput = {
  recipientName: "",
  recipientPhone: "",
  postalCode: "",
  address1: "",
  address2: "",
  quantity: 1,
};

export default function ShippingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ShippingInput>(INITIAL_SHIPPING);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSessionResponse | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [renderingPayment, setRenderingPayment] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [paymentUnavailable, setPaymentUnavailable] = useState(false);
  const [error, setError] = useState("");
  const [integrationStatus, setIntegrationStatus] =
    useState<SweetbookIntegrationStatus | null>(null);
  const widgetsRef = useRef<TossWidgetsInstance | null>(null);

  const pid = Number(projectId);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    getPreview(pid)
      .then(setPreview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, pid]);

  useEffect(() => {
    if (!paymentSession) {
      widgetsRef.current = null;
      clearPaymentContainers();
      return;
    }

    let cancelled = false;
    setRenderingPayment(true);

    void (async () => {
      try {
        clearPaymentContainers();
        const TossPayments = await loadTossPayments();
        if (cancelled) {
          return;
        }

        const tossPayments = TossPayments(paymentSession.clientKey);
        const widgets = tossPayments.widgets({
          customerKey: paymentSession.customerKey,
        });

        widgetsRef.current = widgets;
        await Promise.resolve(
          widgets.setAmount({ value: paymentSession.amount, currency: "KRW" }),
        );
        await Promise.resolve(
          widgets.renderPaymentMethods({ selector: "#payment-method" }),
        );
        await Promise.resolve(widgets.renderAgreement({ selector: "#agreement" }));
      } catch (e: unknown) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "토스 결제 UI를 불러오지 못했습니다.",
          );
          setPaymentSession(null);
        }
      } finally {
        if (!cancelled) {
          setRenderingPayment(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      widgetsRef.current = null;
      clearPaymentContainers();
    };
  }, [paymentSession]);

  useEffect(() => {
    getSweetbookIntegrationStatus()
      .then(setIntegrationStatus)
      .catch(() => setIntegrationStatus(null));
  }, []);

  async function handleEstimate() {
    if (preview && preview.status !== "FINALIZED") {
      setError("미리보기에서 인쇄 확정을 먼저 완료해주세요.");
      return;
    }
    setEstimating(true);
    setError("");
    try {
      const est = await estimateOrder(pid, form);
      setEstimate(est);
      setPaymentSession(null);
      setPaymentUnavailable(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "견적 실패");
    } finally {
      setEstimating(false);
    }
  }

  async function handlePreparePayment() {
    if (preview && preview.status !== "FINALIZED") {
      setError("미리보기에서 인쇄 확정을 먼저 완료해주세요.");
      return;
    }
    setPreparingPayment(true);
    setError("");
    try {
      const session = await createPaymentSession(pid, form);
      if (!session.enabled) {
        setPaymentSession(null);
        setPaymentUnavailable(true);
        setError("");
      } else {
        setPaymentSession(session);
        setPaymentUnavailable(false);
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "결제 세션을 준비하지 못했습니다.";
      if (isTossUnavailableMessage(message)) {
        setPaymentUnavailable(true);
        setError("");
      } else {
        setError(message);
      }
    } finally {
      setPreparingPayment(false);
    }
  }

  async function handleTossPayment() {
    if (!paymentSession || !widgetsRef.current) {
      setError("결제 위젯이 아직 준비되지 않았습니다.");
      return;
    }

    setRequestingPayment(true);
    setError("");
    try {
      await Promise.resolve(
        widgetsRef.current.requestPayment({
          orderId: paymentSession.orderId,
          orderName: paymentSession.orderName,
          customerEmail: paymentSession.customerEmail || undefined,
          customerName: paymentSession.customerName || undefined,
          customerMobilePhone:
            paymentSession.customerMobilePhone || undefined,
          successUrl: paymentSession.successUrl,
          failUrl: paymentSession.failUrl,
        }),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "결제창을 열지 못했습니다.");
      setRequestingPayment(false);
    }
  }

  async function handleOrder() {
    if (preview && preview.status !== "FINALIZED") {
      setError("미리보기에서 인쇄 확정을 먼저 완료해주세요.");
      return;
    }
    setOrdering(true);
    setError("");
    try {
      await createOrder(pid, form);
      navigate(`/projects/${projectId}/complete`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "주문 실패");
    } finally {
      setOrdering(false);
    }
  }

  function updateField(key: keyof ShippingInput, value: string | number) {
    setForm((current) => ({ ...current, [key]: value }));
    if (estimate) setEstimate(null);
    if (paymentSession) {
      setPaymentSession(null);
      setPaymentUnavailable(false);
      widgetsRef.current = null;
      clearPaymentContainers();
    }
  }

  if (loading) return <Spinner />;
  if (!preview) return <ErrorBox message="프로젝트 정보를 불러올 수 없습니다." />;
  const orderReady = preview.status === "FINALIZED" || preview.status === "ORDERED";

  const phoneDigits = form.recipientPhone.replace(/[^0-9]/g, "");
  const isPhoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11;
  const isPostalValid = /^\d{5}$/.test(form.postalCode.trim());
  const isFormComplete =
    form.recipientName.trim().length > 0 &&
    isPhoneValid &&
    isPostalValid &&
    form.address1.trim().length > 0;

  if (!orderReady) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-3xl">
          <ProjectStepper current="shipping" className="mb-10" />
          <div className="editorial-card p-8 md:p-10">
            <p className="editorial-label">배송 단계 전 확인</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-brand-700">
              미리보기에서
              <br />
              인쇄 확정을 먼저 완료해주세요
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-warm-500">
              배송과 결제는 포토북이 인쇄용으로 확정된 뒤에 진행할 수 있어요.
              미리보기 페이지에서 포토북 만들기를 먼저 완료해주세요.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}/preview`)}
                className="editorial-button-primary"
              >
                미리보기로 돌아가기
              </button>
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}/personalize`)}
                className="editorial-button-secondary"
              >
                개인화 다시 수정하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <ProjectStepper current="shipping" className="mb-10" />

        <div className="mb-12">
          <p className="editorial-label">배송 정보</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight text-brand-700 md:text-6xl">
            어디로 보내드릴까요?
            <br />
            <span className="italic font-normal">배송 정보를 입력해주세요.</span>
          </h1>
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <section className="space-y-12 lg:col-span-7">
            <div>
              <div className="mb-6 flex items-end justify-between border-b border-stone-200/70 pb-4">
                <h2 className="text-3xl font-bold text-brand-700">배송 정보</h2>
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">
                  필수
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Field
                  label="받는 분"
                  required
                  value={form.recipientName}
                  onChange={(value) => updateField("recipientName", value)}
                  placeholder="홍길동"
                />
                <Field
                  label="연락처"
                  required
                  value={form.recipientPhone}
                  onChange={(value) => updateField("recipientPhone", value)}
                  placeholder="010-1234-5678"
                />
                <div className="md:col-span-2">
                  <Field
                    label="주소"
                    required
                    value={form.address1}
                    onChange={(value) => updateField("address1", value)}
                    placeholder="서울특별시 강남구 테헤란로 123"
                  />
                </div>
                <Field
                  label="우편번호"
                  required
                  value={form.postalCode}
                  onChange={(value) => updateField("postalCode", value)}
                  placeholder="12345"
                />
                <Field
                  label="상세주소"
                  value={form.address2 ?? ""}
                  onChange={(value) => updateField("address2", value)}
                  placeholder="101동 1001호"
                />
                <div className="md:col-span-2 max-w-[160px]">
                  <Field
                    label="수량"
                    value={String(form.quantity ?? 1)}
                    onChange={(value) => updateField("quantity", Number(value))}
                    placeholder="1"
                    type="number"
                  />
                </div>
              </div>
            </div>

            {(form.recipientPhone.length > 0 && !isPhoneValid) && (
              <p className="text-sm text-red-600">
                연락처는 숫자 10~11자리로 입력해주세요. (예: 01012345678)
              </p>
            )}
            {(form.postalCode.length > 0 && !isPostalValid) && (
              <p className="text-sm text-red-600">
                우편번호는 5자리 숫자로 입력해주세요.
              </p>
            )}

            <div className="rounded bg-surface-low px-6 py-6">
              <div className="flex items-center justify-between gap-3">
                <p className="editorial-label text-brand-700">주문 안내</p>
                {integrationStatus && (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${integrationTone(integrationStatus)}`}>
                    {integrationStatus.label}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-warm-500">
                배송 정보를 입력하고 예상 금액을 확인한 뒤 결제를 진행하면 포토북 제작이 시작됩니다.
              </p>
            </div>

            {estimate && paymentSession && (
              <div className="editorial-panel p-6 md:p-8">
                <p className="editorial-label">결제</p>
                <h2 className="mt-3 text-2xl font-bold text-brand-700">
                  결제 수단을 선택해주세요
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-warm-500">
                  결제가 완료되면 주문이 확정되고 포토북 제작이 바로 시작됩니다.
                </p>

                <div className="mt-6 rounded-2xl border border-stone-200 bg-white/90 p-4">
                  <div id="payment-method" />
                </div>
                <div className="mt-4 rounded-2xl border border-stone-200 bg-white/90 p-4">
                  <div id="agreement" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-stone-200/70 pt-8">
              <button
                onClick={() => navigate(`/projects/${projectId}/preview`)}
                className="editorial-button-link"
              >
                미리보기로 돌아가기
              </button>

              {!estimate ? (
                <button
                  disabled={estimating || !isFormComplete}
                  onClick={handleEstimate}
                  className="editorial-button-primary min-w-[220px] disabled:opacity-50"
                >
                  {estimating ? "계산 중..." : "예상 금액 확인"}
                </button>
              ) : paymentSession ? (
                <button
                  disabled={renderingPayment || requestingPayment}
                  onClick={handleTossPayment}
                  className="editorial-button-primary min-w-[220px] disabled:opacity-50"
                >
                  {renderingPayment
                    ? "결제창 준비 중..."
                    : requestingPayment
                      ? "결제창 여는 중..."
                      : "토스로 결제하기"}
                </button>
              ) : paymentUnavailable ? (
                <button
                  disabled={ordering}
                  onClick={handleOrder}
                  className="editorial-button-primary min-w-[220px] disabled:opacity-50"
                >
                  {ordering ? "주문 확정 중..." : "주문 확정하기"}
                </button>
              ) : (
                <button
                  disabled={preparingPayment}
                  onClick={handlePreparePayment}
                  className="editorial-button-primary min-w-[220px] disabled:opacity-50"
                >
                  {preparingPayment ? "결제 준비 중..." : "결제 진행하기"}
                </button>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {paymentUnavailable && (
              <p className="text-sm text-amber-700">
                현재 간편결제를 이용할 수 없어 일반 주문으로 전환되었습니다.
              </p>
            )}
          </section>

          <aside className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="editorial-panel p-8 md:p-10">
              <h2 className="border-b border-stone-200/70 pb-5 text-2xl font-bold text-brand-700">
                주문할 포토북
              </h2>

              <div className="mt-6 flex gap-5">
                <div className="w-28 overflow-hidden rounded bg-white p-2 shadow-editorial">
                  <img
                    src={resolveMediaUrl(preview.edition.coverImageUrl)}
                    alt={preview.edition.title}
                    className="aspect-[3/4] w-full rounded object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
                    {projectModeLabel(preview.mode)}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight text-brand-700">
                    {preview.edition.title}
                  </h3>
                  <p className="mt-2 text-sm text-warm-500">
                    나만의 이야기가 담긴 실물 포토북
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4 border-t border-stone-200/70 pt-6">
                <SummaryRow label="진행 상태" value={projectStageLabel(preview.status)} />
                <SummaryRow label="받는 분" value={form.recipientName || "입력 전"} />
                <SummaryRow label="배송지" value={form.address1 || "입력 전"} />
                <SummaryRow label="수량" value={`${form.quantity ?? 1}권`} />
              </div>

              <div className="mt-8 space-y-3 border-t border-stone-200/70 pt-6">
                <PriceRow
                  label="Sweetbook 제작·배송 원가"
                  value={estimate?.vendorCost ?? null}
                />
                <PriceRow label="PlayPick 서비스 금액" value={estimate?.marginAmount ?? null} />
                <PriceRow label="배송비 포함 총 결제액" value={estimate?.totalAmount ?? null} total />
              </div>

              {paymentSession ? (
                <div className="mt-8 rounded bg-white/85 px-5 py-5 shadow-sm">
                  <p className="editorial-label text-brand-700">결제 준비 완료</p>
                  <p className="mt-3 text-sm leading-relaxed text-warm-500">
                    결제 수단을 확인한 뒤 결제하기 버튼을 눌러주세요.
                  </p>
                </div>
              ) : estimate ? (
                <div className="mt-8 rounded bg-white/85 px-5 py-5 shadow-sm">
                  <p className="editorial-label text-brand-700">금액 확인 완료</p>
                  <p className="mt-3 text-sm leading-relaxed text-warm-500">
                    Sweetbook 제작 원가에 PlayPick 서비스 금액을 더한 최종 결제액이에요.
                    결제 진행하기를 눌러 주문을 완료하세요.
                  </p>
                  {estimate.simulated && (
                    <p className="mt-3 text-sm leading-relaxed text-gold-500">
                      현재 체험 모드로 운영 중이라 실제 결제 금액과 다를 수 있어요.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-8 rounded bg-white/85 px-5 py-5 shadow-sm">
                  <p className="text-sm leading-relaxed text-warm-500">
                    배송 정보를 입력하면 제작 원가와 서비스 금액을 반영한 최종 결제액을 먼저 확인할 수 있어요.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function clearPaymentContainers() {
  const paymentMethod = document.getElementById("payment-method");
  const agreement = document.getElementById("agreement");
  if (paymentMethod) {
    paymentMethod.innerHTML = "";
  }
  if (agreement) {
    agreement.innerHTML = "";
  }
}

function isTossUnavailableMessage(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("toss payments is not configured")
    || normalized.includes("toss payments are not configured")
    || normalized.includes("toss payments isn't configured")
    || (normalized.includes("toss payments") && normalized.includes("not configured"));
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block font-headline text-xl text-brand-700">
        {label}
        {required && (
          <span className="ml-2 text-xs uppercase tracking-[0.18em] text-warm-500">
            필수
          </span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="editorial-input mt-3"
        placeholder={placeholder}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-900">{value}</p>
    </div>
  );
}

function PriceRow({
  label,
  value,
  total = false,
}: {
  label: string;
  value: number | null;
  total?: boolean;
}) {
  return (
    <div className="flex items-end justify-between">
      <span className={`text-sm ${total ? "font-semibold text-brand-700" : "text-warm-500"}`}>
        {label}
      </span>
      <span className={total ? "font-headline text-3xl text-brand-700" : "text-sm text-stone-900"}>
        {value == null ? "-" : `${value.toLocaleString()}원`}
      </span>
    </div>
  );
}

