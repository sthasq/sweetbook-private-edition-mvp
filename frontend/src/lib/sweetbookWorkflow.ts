import type { SweetbookBookSpec, SweetbookIntegrationStatus } from "../types/api";

const DEFAULT_TOTAL_PAGES = 24;
const DEFAULT_INCREMENT = 2;
const PRICE_HINTS: Record<string, { product: number; shipping: number }> = {
  SQUAREBOOK_HC: { product: 22900, shipping: 3500 },
  PHOTOBOOK_A5_SC: { product: 20900, shipping: 3500 },
  PHOTOBOOK_A4_SC: { product: 28900, shipping: 4000 },
};

export function siteOrderLabel(status: string | null | undefined) {
  switch (status) {
    case "CREATED":
      return "주문 접수됨";
    case "PAID":
      return "주문 확정";
    case "CANCELLED":
      return "주문 취소";
    default:
      return status ?? "-";
  }
}

export function projectStageLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "작성 중";
    case "PERSONALIZED":
      return "개인화 완료";
    case "BOOK_CREATED":
      return "포토북 생성 완료";
    case "FINALIZED":
      return "인쇄 준비 완료";
    case "ORDERED":
      return "주문 완료";
    default:
      return status;
  }
}

export function fulfillmentStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "PENDING_SUBMISSION":
      return "제작 준비 중";
    case "SUBMITTED":
      return "제작 접수 완료";
    case "PRODUCTION_CONFIRMED":
      return "제작 확정";
    case "PRODUCTION_STARTED":
      return "인쇄 진행 중";
    case "PRODUCTION_COMPLETED":
      return "인쇄 완료";
    case "SHIPPING_DEPARTED":
      return "배송 출발";
    case "SHIPPING_DELIVERED":
      return "배송 완료";
    case "SIMULATED":
      return "체험 모드";
    case "FAILED":
      return "제작 실패";
    case "CANCELLED":
      return "제작 취소";
    default:
      return status ?? "-";
  }
}

export function fulfillmentEventLabel(eventType: string | null | undefined) {
  switch (eventType) {
    case "order.created":
      return "주문 생성";
    case "order.restored":
      return "주문 복원";
    case "production.confirmed":
      return "제작 확정";
    case "production.started":
      return "제작 시작";
    case "production.completed":
      return "제작 완료";
    case "shipping.departed":
      return "배송 출발";
    case "shipping.delivered":
      return "배송 완료";
    case "order.cancelled":
      return "주문 취소";
    case "simulation.ready":
      return "체험 주문";
    case "order.pending_submission":
      return "제작 대기";
    default:
      return eventType ?? "-";
  }
}

export function integrationTone(status: SweetbookIntegrationStatus | null) {
  if (!status) {
    return "bg-stone-100 text-stone-600";
  }
  switch (status.mode) {
    case "LIVE":
      return "bg-emerald-50 text-emerald-700";
    case "SANDBOX":
      return "bg-sky-50 text-sky-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export function computeBookPlan(spec: SweetbookBookSpec | null | undefined) {
  const minimumPages = positive(spec?.minPages, DEFAULT_TOTAL_PAGES);
  const maximumPages = Math.max(minimumPages, positive(spec?.maxPages, minimumPages));
  const pageIncrement = positive(spec?.pageIncrement, DEFAULT_INCREMENT);
  const plannedTotalPages = minimumPages;
  const publishPages = 1;
  const contentPages = Math.max(1, plannedTotalPages - publishPages);
  const isValid =
    plannedTotalPages >= minimumPages &&
    plannedTotalPages <= maximumPages &&
    (plannedTotalPages - minimumPages) % pageIncrement === 0;

  return {
    minimumPages,
    maximumPages,
    pageIncrement,
    plannedTotalPages,
    publishPages,
    contentPages,
    isValid,
  };
}

export function estimateEditionPricing(specUid: string | null | undefined) {
  const pricing = PRICE_HINTS[specUid ?? ""] ?? PRICE_HINTS.SQUAREBOOK_HC;
  return {
    productPrice: pricing.product,
    shippingFee: pricing.shipping,
    totalPrice: pricing.product + pricing.shipping,
  };
}

export function projectModeLabel(mode: string) {
  switch (mode.toUpperCase()) {
    case "DEMO":
      return "LLM 대화형 추천";
    default:
      return mode;
  }
}

function positive(value: number | null | undefined, fallback: number) {
  if (typeof value !== "number" || value <= 0) {
    return fallback;
  }
  return value;
}
