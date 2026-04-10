import { invalidateApiCache, post, patch } from "./client";
import type { EditionDetail, YouTubeStudioRecapResult } from "../types/api";

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

export async function createEdition(body: StudioEditionInput) {
  const result = await post<EditionDetail>("/studio/editions", body);
  invalidateApiCache("/editions");
  return result;
}

export async function updateEdition(id: number, body: StudioEditionInput) {
  const result = await patch<EditionDetail>(`/studio/editions/${id}`, body);
  invalidateApiCache(`/editions/${id}`);
  invalidateApiCache("/editions");
  return result;
}

export async function publishEdition(id: number) {
  const result = await post<EditionDetail>(`/studio/editions/${id}/publish`);
  invalidateApiCache(`/editions/${id}`);
  invalidateApiCache("/editions");
  return result;
}

export function importStudioYouTubeRecap(source: string) {
  return post<YouTubeStudioRecapResult>("/studio/youtube-recap", { source });
}
