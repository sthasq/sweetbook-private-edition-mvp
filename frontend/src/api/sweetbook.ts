import { get } from "./client";
import type { SweetbookBookSpec, SweetbookTemplate } from "../types/api";

export function listSweetbookBookSpecs() {
  return get<SweetbookBookSpec[]>("/sweetbook/book-specs");
}

export function listSweetbookTemplates(bookSpecUid: string) {
  const params = new URLSearchParams({ bookSpecUid });
  return get<SweetbookTemplate[]>(`/sweetbook/templates?${params.toString()}`);
}
