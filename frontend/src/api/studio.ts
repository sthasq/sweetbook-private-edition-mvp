import { post, patch } from "./client";
import type { EditionDetail } from "../types/api";

export interface StudioCopyBlock {
  title: string;
  message: string;
}

export interface StudioCuratedAssetInput {
  assetType: string;
  title: string;
  content: string;
  sortOrder: number;
}

export interface StudioPersonalizationFieldInput {
  fieldKey: string;
  label: string;
  inputType: string;
  required: boolean;
  maxLength?: number;
  sortOrder: number;
}

export interface StudioEditionInput {
  title: string;
  subtitle?: string;
  coverImageUrl: string;
  bookSpecUid?: string;
  sweetbookCoverTemplateUid?: string;
  sweetbookPublishTemplateUid?: string;
  sweetbookContentTemplateUid?: string;
  officialIntro?: StudioCopyBlock;
  officialClosing?: StudioCopyBlock;
  curatedAssets?: StudioCuratedAssetInput[];
  personalizationFields?: StudioPersonalizationFieldInput[];
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
