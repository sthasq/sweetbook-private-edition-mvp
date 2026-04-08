import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { estimateOrder, createOrder, getPreview } from "../api/projects";
import type { ShippingInput, ProjectPreview, EstimateResponse } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";

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
      const res = await createOrder(pid, form);
      navigate(`/projects/${projectId}/complete`, {
        state: {
          orderUid: res.orderUid,
          totalAmount: res.totalAmount,
          edition: preview?.edition,
        },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "주문 실패");
    } finally {
      setOrdering(false);
    }
  }

  function updateField(key: keyof ShippingInput, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
    setEstimate(null);
  }

  if (loading) return <Spinner />;
  if (!preview) return <ErrorBox message="프로젝트 정보를 불러올 수 없습니다." />;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-xs text-neutral-500">
        <span>1. 개인화</span>
        <span className="text-neutral-700">/</span>
        <span>2. 미리보기</span>
        <span className="text-neutral-700">/</span>
        <span className="text-brand-400 font-medium">3. 주문</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">배송 정보</h1>
      <p className="text-sm text-neutral-400 mb-8">
        실물 책 배송을 위한 정보를 입력하세요
      </p>

      <div className="space-y-5">
        <div>
          <label htmlFor="recipientName" className="block text-sm font-medium text-neutral-300 mb-1.5">
            받는 분 <span className="text-red-400">*</span>
          </label>
          <input
            id="recipientName"
            value={form.recipientName}
            onChange={(e) => updateField("recipientName", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            placeholder="홍길동"
          />
        </div>

        <div>
          <label htmlFor="recipientPhone" className="block text-sm font-medium text-neutral-300 mb-1.5">
            연락처 <span className="text-red-400">*</span>
          </label>
          <input
            id="recipientPhone"
            value={form.recipientPhone}
            onChange={(e) => updateField("recipientPhone", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            placeholder="010-1234-5678"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-neutral-300 mb-1.5">
              우편번호 <span className="text-red-400">*</span>
            </label>
            <input
              id="postalCode"
              value={form.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              placeholder="12345"
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="address1" className="block text-sm font-medium text-neutral-300 mb-1.5">
              주소 <span className="text-red-400">*</span>
            </label>
            <input
              id="address1"
              value={form.address1}
              onChange={(e) => updateField("address1", e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              placeholder="서울특별시 강남구 테헤란로 123"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address2" className="block text-sm font-medium text-neutral-300 mb-1.5">
            상세주소
          </label>
          <input
            id="address2"
            value={form.address2}
            onChange={(e) => updateField("address2", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            placeholder="101동 1001호"
          />
        </div>

        <div className="w-32">
          <label htmlFor="quantity" className="block text-sm font-medium text-neutral-300 mb-1.5">
            수량
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => updateField("quantity", Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          />
        </div>
      </div>

      {/* Estimate result */}
      {estimate && (
        <div className="mt-6 rounded-lg border border-brand-600/30 bg-brand-600/5 p-5">
          <h3 className="text-sm font-semibold text-brand-400 mb-3">견적 결과</h3>
          <div className="flex justify-between text-sm text-neutral-300 mb-1">
            <span>배송비</span>
            <span>{estimate.shippingFee.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-white pt-2 border-t border-neutral-800 mt-2">
            <span>총 금액</span>
            <span className="text-brand-400">
              {estimate.totalAmount.toLocaleString()}원
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => navigate(`/projects/${projectId}/preview`)}
          className="text-sm text-neutral-400 hover:text-brand-400 transition-colors"
        >
          ← 미리보기
        </button>
        <div className="flex gap-3">
          {!estimate ? (
            <button
              disabled={estimating || !form.recipientName || !form.postalCode || !form.address1}
              onClick={handleEstimate}
              className="rounded-full border border-brand-600 px-6 py-3 text-sm font-semibold text-brand-400 hover:bg-brand-600 hover:text-white transition-colors disabled:opacity-50"
            >
              {estimating ? "계산 중..." : "견적 보기"}
            </button>
          ) : (
            <button
              disabled={ordering}
              onClick={handleOrder}
              className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
            >
              {ordering ? "주문 처리 중..." : "주문하기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
