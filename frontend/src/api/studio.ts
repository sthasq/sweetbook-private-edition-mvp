import { get, invalidateApiCache, post, patch, postForm } from "./client";
import type {
  EditionDetail,
  StudioEditionSummary,
  StudioOrderDashboard,
  YouTubeStudioRecapResult,
} from "../types/api";

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
  invalidateApiCache("/studio/editions");
  return result;
}

export async function updateEdition(id: number, body: StudioEditionInput) {
  const result = await patch<EditionDetail>(`/studio/editions/${id}`, body);
  invalidateApiCache(`/editions/${id}`);
  invalidateApiCache("/editions");
  invalidateApiCache("/studio/editions");
  invalidateApiCache(`/studio/editions/${id}`);
  return result;
}

export async function publishEdition(id: number) {
  const result = await post<EditionDetail>(`/studio/editions/${id}/publish`);
  invalidateApiCache(`/editions/${id}`);
  invalidateApiCache("/editions");
  invalidateApiCache("/studio/editions");
  invalidateApiCache(`/studio/editions/${id}`);
  return result;
}

export function listStudioEditions() {
  return get<StudioEditionSummary[]>("/studio/editions");
}

export function getStudioEdition(id: number) {
  return get<EditionDetail>(`/studio/editions/${id}`);
}

export function getStudioOrderDashboard() {
  return get<StudioOrderDashboard>("/studio/orders");
}

export function importStudioYouTubeRecap(source: string) {
  return post<YouTubeStudioRecapResult>("/studio/youtube-recap", { source });
}

export async function uploadStudioCover(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return postForm<{ url: string }>("/studio/assets/cover", formData);
}
