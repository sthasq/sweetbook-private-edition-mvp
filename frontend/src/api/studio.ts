import { post, patch } from "./client";
import type { EditionDetail } from "../types/api";

export interface StudioEditionInput {
  title: string;
  subtitle?: string;
  coverImageUrl: string;
  bookSpecUid?: string;
  officialIntro?: Record<string, unknown>;
  officialClosing?: Record<string, unknown>;
  curatedAssets?: {
    assetType: string;
    title: string;
    content: string;
    sortOrder: number;
  }[];
  personalizationFields?: {
    fieldKey: string;
    label: string;
    inputType: string;
    required: boolean;
    maxLength?: number;
    sortOrder: number;
  }[];
}

export function createEdition(body: StudioEditionInput) {
  return post<EditionDetail>("/studio/editions", body);
}

export function updateEdition(id: number, body: StudioEditionInput) {
  return patch<EditionDetail>(`/studio/editions/${id}`, body);
}

export function publishEdition(id: number) {
  return post<EditionDetail>(`/studio/editions/${id}/publish`);
}
