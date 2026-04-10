import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { estimateOrder, createOrder, getPreview } from "../api/projects";
import type { ShippingInput, ProjectPreview, EstimateResponse } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import ProjectStepper from "../components/ProjectStepper";

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
  const [estimating, setEstimating] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");

  const pid = Number(projectId);

  useEffect(() => {
    if (!projectId) return;
    getPreview(pid)
      .then(setPreview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, pid]);

  async function handleEstimate() {
    setEstimating(true);
    setError("");
    try {
      const est = await estimateOrder(pid, form);
      setEstimate(est);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "견적 실패");
    } finally {
      setEstimating(false);
    }
  }

  async function handleOrder() {
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
    setEstimate(null);
  }

  if (loading) return <Spinner />;
  if (!preview) return <ErrorBox message="프로젝트 정보를 불러올 수 없습니다." />;

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl">
        <ProjectStepper current="shipping" className="mb-10" />

        <div className="mb-12">
          <p className="editorial-label">Shipping & Order</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight text-brand-700 md:text-6xl">
            주문 전에 배송 정보를
            <br />
            <span className="italic font-normal">정확하게 기록합니다.</span>
          </h1>
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <section className="space-y-12 lg:col-span-7">
            <div>
              <div className="mb-6 flex items-end justify-between border-b border-stone-200/70 pb-4">
                <h2 className="text-3xl font-bold text-brand-700">배송 정보</h2>
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">
                  Required
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

            <div className="rounded bg-surface-low px-6 py-6">
              <p className="editorial-label text-brand-700">Archive Note</p>
              <p className="mt-3 text-sm leading-relaxed text-warm-500">
                견적을 먼저 확인하면 배송비와 총 금액을 계산하고, 그 다음 최종 주문을 확정할 수
                있습니다. 실제 Sweetbook 호출이 되지 않는 환경에서는 데모 금액이 표시될 수
                있습니다.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-stone-200/70 pt-8">
              <button
                onClick={() => navigate(`/projects/${projectId}/preview`)}
                className="editorial-button-link"
              >
                미리보기로 돌아가기
              </button>
              {!estimate ? (
                <button
                  disabled={
                    estimating ||
                    !form.recipientName ||
                    !form.recipientPhone ||
                    !form.postalCode ||
                    !form.address1
                  }
                  onClick={handleEstimate}
                  className="editorial-button-primary min-w-[220px] disabled:opacity-50"
                >
                  {estimating ? "계산 중..." : "견적 보기"}
                </button>
              ) : (
                <button
                  disabled={ordering}
                  onClick={handleOrder}
                  className="editorial-button-primary min-w-[220px] disabled:opacity-50"
                >
                  {ordering ? "주문 확정 중..." : "최종 주문하기"}
                </button>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </section>

          <aside className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="editorial-panel p-8 md:p-10">
              <h2 className="border-b border-stone-200/70 pb-5 text-2xl font-bold text-brand-700">
                Your Artifact
              </h2>

              <div className="mt-6 flex gap-5">
                <div className="w-28 overflow-hidden rounded bg-white p-2 shadow-editorial">
                  <img
                    src={
                      preview.edition.coverImageUrl ||
                      `https://picsum.photos/seed/shipping-${preview.edition.id}/800/1200`
                    }
                    alt={preview.edition.title}
                    className="aspect-[3/4] w-full rounded object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
                    {preview.mode.toUpperCase()}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight text-brand-700">
                    {preview.edition.title}
                  </h3>
                  <p className="mt-2 text-sm text-warm-500">
                    개인화 후 실물 제작되는 Private Edition 아카이브
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4 border-t border-stone-200/70 pt-6">
                <SummaryRow label="Recipient" value={form.recipientName || "입력 전"} />
                <SummaryRow label="Address" value={form.address1 || "입력 전"} />
                <SummaryRow label="Quantity" value={`${form.quantity ?? 1}권`} />
              </div>

              <div className="mt-8 space-y-3 border-t border-stone-200/70 pt-6">
                <PriceRow label="상품 소계" value={estimate ? estimate.totalAmount - estimate.shippingFee : null} />
                <PriceRow label="배송비" value={estimate?.shippingFee ?? null} />
                <PriceRow label="예상 총액" value={estimate?.totalAmount ?? null} total />
              </div>

              {estimate ? (
                <div className="mt-8 rounded bg-white/85 px-5 py-5 shadow-sm">
                  <p className="editorial-label text-brand-700">Estimate ready</p>
                  <p className="mt-3 text-sm leading-relaxed text-warm-500">
                    다음 단계에서 사이트 주문이 먼저 저장되고, 이후 Sweetbook 제작/출고 연동이
                    이어집니다.
                  </p>
                  {estimate.simulated && (
                    <p className="mt-3 text-sm leading-relaxed text-gold-500">
                      실제 Sweetbook 견적 호출 대신 데모 금액이 표시되고 있습니다.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-8 rounded bg-white/85 px-5 py-5 shadow-sm">
                  <p className="text-sm leading-relaxed text-warm-500">
                    필수 배송 정보를 입력한 뒤 견적 보기를 누르면 오른쪽 카드에 총액이 채워집니다.
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
        {required && <span className="ml-2 text-xs uppercase tracking-[0.18em] text-warm-500">Required</span>}
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">{label}</p>
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
