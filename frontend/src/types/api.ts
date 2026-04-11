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

export interface StudioEditionSummary {
  id: number;
  title: string;
  subtitle: string;
  coverImageUrl: string;
  status: string;
  creator: Creator;
  updatedAt: string;
  snapshot: EditionSnapshot | null;
}

/* ── Projects ── */

export interface ProjectSnapshot {
  id: number;
  editionId: number;
  editionVersionId: number;
  status: string;
  personalizationData: Record<string, unknown>;
  sweetbookBookUid: string | null;
  sweetbookExternalRef: string | null;
  sweetbookDraftCreatedAt: string | null;
  sweetbookFinalizedAt: string | null;
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
  sweetbookBookUid: string | null;
  sweetbookExternalRef: string | null;
  sweetbookDraftCreatedAt: string | null;
  sweetbookFinalizedAt: string | null;
  pages: PreviewPage[];
}

export interface BookGeneration {
  projectId: number;
  bookUid: string;
  status: string;
  projectStatus: string;
  bookSpecUid: string;
  coverTemplateUid: string;
  publishTemplateUid: string;
  contentTemplateUid: string;
  plannedPageCount: number;
  simulated: boolean;
  reused: boolean;
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatPersonalizationResponse {
  reply: string;
  proposal: Record<string, unknown> | null;
  done: boolean;
}

export interface EstimateResponse {
  totalAmount: number;
  vendorCost: number;
  shippingFee: number;
  marginAmount: number;
  platformFee: number;
  creatorPayout: number;
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
  lastFulfillmentEvent: string | null;
  lastFulfillmentEventAt: string | null;
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
  role: "FAN" | "CREATOR" | "ADMIN";
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
  lastFulfillmentEvent: string | null;
  lastFulfillmentEventAt: string | null;
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
  lastEventType: string | null;
  lastEventAt: string | null;
  paymentProvider: string | null;
  paymentMethod: string | null;
  simulated: boolean;
  orderedAt: string;
}

export interface StudioOrderDashboard {
  totalOrders: number;
  paidOrders: number;
  productionOrders: number;
  shippingOrders: number;
  deliveredOrders: number;
  simulatedOrders: number;
  totalRevenue: number;
  recentOrders: StudioOrderSummary[];
}

/* ── External channels ── */

export interface ExternalChannelDetail {
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

export interface ExternalChannelVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  viewCount: number;
  publishedAt: string;
}

export interface ExternalChannelMonthlyStat {
  month: string;
  uploadCount: number;
  totalViews: number;
}

export interface ExternalChannelYearlySummary {
  uploadCount: number;
  totalViews: number;
  averageViewsPerVideo: number;
  periodLabel: string;
  monthlyStats: ExternalChannelMonthlyStat[];
}

export interface StudioCuratedAssetSuggestion {
  assetType: "IMAGE" | "VIDEO" | "MESSAGE";
  title: string;
  content: string;
  sortOrder: number;
}

export interface StudioChannelRecapResult {
  channel: ExternalChannelDetail;
  topVideos: ExternalChannelVideo[];
  yearlySummary: ExternalChannelYearlySummary;
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
  pageIncrement: number | null;
}

export interface SweetbookTemplate {
  uid: string;
  name: string;
  category: string;
  role: string;
  thumbnailUrl: string;
}

export interface SweetbookIntegrationStatus {
  mode: "SIMULATED" | "SANDBOX" | "LIVE";
  liveEnabled: boolean;
  label: string;
}

/* ── Admin ── */

export interface AdminDashboard {
  totalOrders: number;
  totalRevenue: number;
  vendorCosts: number;
  grossMargin: number;
  platformRevenue: number;
  creatorPayouts: number;
  commissionRate: number;
  marginRate: number;
  activeEditions: number;
  totalUsers: number;
  totalCreators: number;
  simulatedOrders: number;
}

export interface AdminCreatorSettlement {
  creatorId: number;
  displayName: string;
  channelHandle: string;
  verified: boolean;
  totalOrders: number;
  totalRevenue: number;
  vendorCost: number;
  grossMargin: number;
  platformCommission: number;
  creatorPayout: number;
}

export interface AdminOrderSummary {
  projectId: number;
  editionId: number;
  editionTitle: string;
  creatorName: string;
  fanDisplayName: string;
  recipientName: string;
  quantity: number;
  totalAmount: number;
  vendorCost: number;
  marginAmount: number;
  platformFee: number;
  creatorPayout: number;
  commissionRate: number;
  marginRate: number;
  siteOrderUid: string;
  siteOrderStatus: string;
  fulfillmentStatus: string;
  lastEventType: string | null;
  lastEventAt: string | null;
  paymentProvider: string | null;
  paymentMethod: string | null;
  simulated: boolean;
  orderedAt: string;
}

export interface AdminWebhookEvent {
  id: number;
  eventType: string;
  sweetbookOrderUid: string | null;
  processedAt: string | null;
  createdAt: string;
  linked: boolean;
}

export interface AdminUserSummary {
  id: number;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  creatorVerified: boolean | null;
}
