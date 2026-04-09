/* ── Editions ── */

export interface EditionSummary {
  id: number;
  title: string;
  subtitle: string;
  creatorName: string;
  creatorHandle: string;
  isVerified: boolean;
}

export interface Creator {
  id: number;
  displayName: string;
  channelHandle: string;
  avatarUrl: string;
  verified: boolean;
}

export interface CuratedAsset {
  id: number;
  assetType: "IMAGE" | "VIDEO" | "MESSAGE";
  title: string;
  content: string;
  sortOrder: number;
}

export interface PersonalizationField {
  id: number;
  fieldKey: string;
  label: string;
  inputType: string;
  required: boolean;
  maxLength: number | null;
  sortOrder: number;
}

export interface EditionSnapshot {
  id: number;
  versionNumber: number;
  bookSpecUid: string;
  officialIntro: Record<string, unknown>;
  officialClosing: Record<string, unknown>;
  approvedAt: string;
  curatedAssets: CuratedAsset[];
  personalizationFields: PersonalizationField[];
}

export interface EditionDetail {
  id: number;
  title: string;
  subtitle: string;
  coverImageUrl: string;
  status: string;
  creator: Creator;
  snapshot: EditionSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

/* ── Projects ── */

export interface ProjectSnapshot {
  id: number;
  editionId: number;
  editionVersionId: number;
  status: string;
  personalizationData: Record<string, unknown>;
  sweetbookBookUid: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreviewPage {
  key: string;
  title: string;
  description: string;
  imageUrl: string;
  payload: Record<string, unknown>;
}

export interface ProjectPreview {
  projectId: number;
  status: string;
  mode: string;
  edition: EditionDetail;
  personalizationData: Record<string, unknown>;
  pages: PreviewPage[];
}

export interface BookGeneration {
  projectId: number;
  bookUid: string;
  status: string;
  bookSpecUid: string;
  coverTemplateUid: string;
  contentTemplateUid: string;
  simulated: boolean;
}

export interface EstimateResponse {
  totalAmount: number;
  shippingFee: number;
  simulated: boolean;
}

export interface OrderResponse {
  orderUid: string;
  orderStatus: string;
  totalAmount: number;
  simulated: boolean;
}

/* ── Auth ── */

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: "FAN" | "CREATOR";
}

export interface MyProjectSummary {
  projectId: number;
  editionId: number;
  editionTitle: string;
  status: string;
  mode: string;
  updatedAt: string;
  continuePath: string;
}

/* ── YouTube ── */

export interface YouTubeAuthUrl {
  enabled: boolean;
  authUrl: string;
  state: string;
}

export interface YouTubeConnection {
  connected: boolean;
  message: string;
}

export interface YouTubeChannel {
  channelId: string;
  title: string;
  thumbnailUrl: string;
  subscribedAt: string;
}

export interface YouTubeChannelDetail {
  channelId: string;
  title: string;
  description: string;
  bannerUrl: string;
  thumbnailUrl: string;
  uploadsPlaylistId: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  viewCount: number;
  publishedAt: string;
}

export interface YouTubeAnalyzeResult {
  channel: YouTubeChannelDetail;
  topVideos: YouTubeVideo[];
  personalizationData: Record<string, unknown>;
}

/* ── Shipping ── */

export interface ShippingInput {
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address1: string;
  address2?: string;
  quantity?: number;
}
