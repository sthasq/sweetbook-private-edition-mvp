import { get, post, patch } from "./client";
import type {
  ProjectSnapshot,
  ProjectPreview,
  BookGeneration,
  EstimateResponse,
  OrderResponse,
  ShippingInput,
} from "../types/api";

export function createProject(body: {
  editionId: number;
  mode: string;
  personalizationData?: Record<string, unknown>;
}) {
  return post<{ projectId: string }>("/projects", body);
}

export function updateProject(
  id: number,
  personalizationData: Record<string, unknown>,
) {
  return patch<ProjectSnapshot>(`/projects/${id}`, { personalizationData });
}

export function getPreview(id: number) {
  return get<ProjectPreview>(`/projects/${id}/preview`);
}

export function generateBook(id: number) {
  return post<BookGeneration>(`/projects/${id}/generate-book`);
}

export function estimateOrder(id: number, shipping?: ShippingInput) {
  return post<EstimateResponse>(`/projects/${id}/estimate`, shipping);
}

export function createOrder(id: number, shipping: ShippingInput) {
  return post<OrderResponse>(`/projects/${id}/order`, shipping);
}
