/* ── Editions ── */

export interface EditionSummary {
  id: number;
  title: string;
  subtitle: string;
  coverImageUrl: string;
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
  sweetbookCoverTemplateUid: string;
  sweetbookPublishTemplateUid: string;
  sweetbookContentTemplateUid: string;
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

export interface AiCollabCandidateResponse {
  id: string;
  templateKey: string;
  label: string;
  caption: string;
  imageUrl: string;
  source: string;
}

export interface AiCollabGenerationResponse {
  provider: string;
  model: string;
  candidates: AiCollabCandidateResponse[];
}

export interface EstimateResponse {
  totalAmount: number;
  shippingFee: number;
  simulated: boolean;
}

export interface PaymentSessionResponse {
  provider: string;
  enabled: boolean;
  clientKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerMobilePhone: string;
  successUrl: string;
  failUrl: string;
}

export interface OrderResponse {
  siteOrderUid: string;
  siteOrderStatus: string;
  fulfillmentOrderUid: string | null;
  fulfillmentStatus: string;
  totalAmount: number;
  simulated: boolean;
}

export interface OrderShippingSummary {
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address1: string;
  address2: string;
}

export interface OrderSummaryEdition {
  id: number;
  title: string;
  creator: Creator;
}

export interface ProjectOrderSummary {
  projectId: number;
  projectStatus: string;
  siteOrderStatus: string;
  siteOrderUid: string;
  fulfillmentStatus: string;
  fulfillmentOrderUid: string | null;
  totalAmount: number;
  simulated: boolean;
  orderedAt: string;
  shipping: OrderShippingSummary;
  edition: OrderSummaryEdition;
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
  editionCoverImageUrl: string;
  status: string;
  mode: string;
  siteOrderStatus: string | null;
  fulfillmentStatus: string | null;
  updatedAt: string;
  continuePath: string;
}

export interface StudioOrderSummary {
  projectId: number;
  editionId: number;
  editionTitle: string;
  fanDisplayName: string;
  recipientName: string;
  recipientPhoneMasked: string;
  addressSummary: string;
  quantity: number;
  totalAmount: number;
  siteOrderUid: string;
  siteOrderStatus: string;
  fulfillmentStatus: string;
  paymentProvider: string | null;
  paymentMethod: string | null;
  simulated: boolean;
  orderedAt: string;
}

export interface StudioOrderDashboard {
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  recentOrders: StudioOrderSummary[];
}

/* ── YouTube ── */

export interface YouTubeAuthUrl {
  enabled: boolean;
  authUrl: string;
  state: string;
}

export interface YouTubeAvailability {
  enabled: boolean;
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

export interface YouTubeStudioMonthlyStat {
  month: string;
  uploadCount: number;
  totalViews: number;
}

export interface YouTubeStudioYearlySummary {
  uploadCount: number;
  totalViews: number;
  averageViewsPerVideo: number;
  periodLabel: string;
  monthlyStats: YouTubeStudioMonthlyStat[];
}

export interface StudioCuratedAssetSuggestion {
  assetType: "IMAGE" | "VIDEO" | "MESSAGE";
  title: string;
  content: string;
  sortOrder: number;
}

export interface YouTubeStudioRecapResult {
  channel: YouTubeChannelDetail;
  topVideos: YouTubeVideo[];
  yearlySummary: YouTubeStudioYearlySummary;
  curatedAssets: StudioCuratedAssetSuggestion[];
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

/* ── Sweetbook ── */

export interface SweetbookBookSpec {
  uid: string;
  name: string;
  minPages: number | null;
  maxPages: number | null;
}

export interface SweetbookTemplate {
  uid: string;
  name: string;
  category: string;
  role: string;
  thumbnailUrl: string;
}
