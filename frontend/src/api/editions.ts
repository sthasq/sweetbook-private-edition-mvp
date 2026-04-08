import { get } from "./client";
import type { EditionSummary, EditionDetail } from "../types/api";

export function listEditions() {
  return get<EditionSummary[]>("/editions");
}

export function getEdition(id: number) {
  return get<EditionDetail>(`/editions/${id}`);
}
