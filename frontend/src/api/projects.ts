import { del, get, invalidateApiCache, post, patch } from "./client";
import type {
  ProjectSnapshot,
  ProjectPreview,
  BookGeneration,
  ChatMessage,
  ChatPersonalizationResponse,
  EstimateResponse,
  PaymentSessionResponse,
  OrderResponse,
  ProjectOrderSummary,
  ShippingInput,
} from "../types/api";

export async function createProject(body: {
  editionId: number;
  mode: string;
  personalizationData?: Record<string, unknown>;
}) {
  const result = await post<{ projectId: string }>("/projects", body);
  invalidateApiCache("/me/projects");
  return result;
}

export async function updateProject(
  id: number,
  personalizationData: Record<string, unknown>,
) {
  const result = await patch<ProjectSnapshot>(`/projects/${id}`, { personalizationData });
  invalidateApiCache(`/projects/${id}/preview`);
  invalidateApiCache("/me/projects");
  return result;
}

export function getPreview(id: number) {
  return get<ProjectPreview>(`/projects/${id}/preview`, { ttlMs: 20_000 });
}

export function getOrderSummary(id: number) {
  return get<ProjectOrderSummary>(`/projects/${id}/order-summary`, { ttlMs: 20_000 });
}

export async function generateBook(id: number) {
  const result = await post<BookGeneration>(`/projects/${id}/generate-book`);
  invalidateApiCache(`/projects/${id}/preview`);
  invalidateApiCache("/me/projects");
  return result;
}

export async function finalizeBook(id: number) {
  const result = await post<BookGeneration>(`/projects/${id}/finalize-book`);
  invalidateApiCache(`/projects/${id}/preview`);
  invalidateApiCache("/me/projects");
  return result;
}

export function chatPersonalization(id: number, messages: ChatMessage[]) {
  return post<ChatPersonalizationResponse>(`/projects/${id}/chat`, { messages });
}

export function estimateOrder(id: number, shipping?: ShippingInput) {
  return post<EstimateResponse>(`/projects/${id}/estimate`, shipping);
}

export function createPaymentSession(id: number, shipping: ShippingInput) {
  return post<PaymentSessionResponse>(`/projects/${id}/payment-session`, shipping);
}

export function confirmPayment(
  id: number,
  body: { paymentKey: string; orderId: string; amount: number },
) {
  return post<OrderResponse>(`/projects/${id}/payments/confirm`, body);
}

export async function createOrder(id: number, shipping: ShippingInput) {
  const result = await post<OrderResponse>(`/projects/${id}/order`, shipping);
  invalidateApiCache(`/projects/${id}/preview`);
  invalidateApiCache(`/projects/${id}/order-summary`);
  invalidateApiCache("/me/projects");
  return result;
}

export async function deleteProject(id: number) {
  await del<void>(`/projects/${id}`);
  invalidateApiCache(`/projects/${id}/preview`);
  invalidateApiCache(`/projects/${id}/order-summary`);
  invalidateApiCache("/me/projects");
}
