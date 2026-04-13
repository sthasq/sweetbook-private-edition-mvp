import { get } from "./client";
import type {
  SweetbookBookSpec,
  SweetbookIntegrationStatus,
  SweetbookTemplate,
  SweetbookTemplateDetail,
} from "../types/api";

export function listSweetbookBookSpecs() {
  return get<SweetbookBookSpec[]>("/sweetbook/book-specs", { ttlMs: 300_000 });
}

export function listSweetbookTemplates(bookSpecUid: string) {
  const params = new URLSearchParams({ bookSpecUid });
  return get<SweetbookTemplate[]>(`/sweetbook/templates?${params.toString()}`, {
    ttlMs: 300_000,
  });
}

export function getSweetbookTemplateDetail(templateUid: string) {
  return get<SweetbookTemplateDetail>(`/sweetbook/templates/${templateUid}`, {
    ttlMs: 300_000,
  });
}

export function getSweetbookIntegrationStatus() {
  return get<SweetbookIntegrationStatus>("/sweetbook/status", { ttlMs: 60_000 });
}
