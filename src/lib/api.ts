// Client for the Punqle backend (Supabase-backed).

import { getAccessToken } from "./supabase";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const headers = {
    ...(init?.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error("Could not reach the server. Check your internet connection.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = Array.isArray(body?.detail)
      ? body.detail.map((d: { msg?: string }) => d.msg).join(", ")
      : body?.detail;
    throw new Error(detail || `Server error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ApiAdCredits {
  credits: number;
}

export interface ApiAdCaptionVariant {
  facebook_caption: string;
  whatsapp_message: string;
}

export interface ApiAdGenerateResponse {
  captions: ApiAdCaptionVariant[];
  banner_image_base64: string;
  credits_remaining: number;
}

export interface ApiAdImageVariantResponse {
  banner_image_base64: string;
  credits_remaining: number;
}

export function fetchAdCredits(): Promise<ApiAdCredits> {
  return apiFetch<ApiAdCredits>("/ads/credits");
}

export interface ApiReferralStatus {
  referral_code: string;
  successful_referrals: number;
  max_referrals: number;
}

export function fetchReferralStatus(): Promise<ApiReferralStatus> {
  return apiFetch<ApiReferralStatus>("/referral/status");
}

export interface ApiReferralRedeemResponse {
  granted: boolean;
  credits_remaining: number;
}

export function redeemReferral(referrerId: string): Promise<ApiReferralRedeemResponse> {
  return apiFetch<ApiReferralRedeemResponse>("/referral/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referrer_id: referrerId }),
  });
}

// Video generation is async under the hood (Veo takes 1-2+ minutes, far
// past a normal request) — the operation object round-trips through the
// client between start and each poll rather than being kept server-side,
// so it survives a backend restart mid-generation. Treated as opaque here.
export type ApiVideoOperation = Record<string, unknown>;

export interface ApiVideoOperationResponse {
  operation: ApiVideoOperation;
  headline: string;
}

export type VideoAspectRatio = "16:9" | "9:16";

// goal/angle are only ever set by Ad Creation's Video Ad flow — Social
// Content's Video tab omits both, leaving the backend's behavior for it
// byte-identical to before (see GenerateVideoRequest in main.py).
export function startVideoGeneration(
  itemDescription: string,
  imageBase64?: string,
  imageMimeType?: string,
  aspectRatio: VideoAspectRatio = "16:9",
  goal?: AdGoal,
  angle?: string | null,
): Promise<ApiVideoOperationResponse> {
  return apiFetch<ApiVideoOperationResponse>("/ads/generate-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_description: itemDescription,
      image_base64: imageBase64,
      image_mime_type: imageMimeType,
      aspect_ratio: aspectRatio,
      goal,
      angle,
    }),
  });
}

export interface ApiVideoStatusResponse {
  done: boolean;
  video_base64: string | null;
  credits_remaining: number | null;
}

export function checkVideoStatus(operation: ApiVideoOperation, headline: string): Promise<ApiVideoStatusResponse> {
  return apiFetch<ApiVideoStatusResponse>("/ads/video-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, headline }),
  });
}

export type AspectRatio = "square" | "feed" | "story";

export function generateAd(
  itemDescription: string,
  file: File | null,
  aspectRatio: AspectRatio = "square",
): Promise<ApiAdGenerateResponse> {
  const formData = new FormData();
  if (file) formData.append("file", file);
  const params = new URLSearchParams({ item_description: itemDescription, aspect_ratio: aspectRatio });
  return apiFetch<ApiAdGenerateResponse>(`/ads/generate?${params}`, {
    method: "POST",
    body: formData,
  });
}

export function generateAdImageVariant(
  itemDescription: string,
  file: File | null,
  aspectRatio: AspectRatio = "square",
): Promise<ApiAdImageVariantResponse> {
  const formData = new FormData();
  if (file) formData.append("file", file);
  const params = new URLSearchParams({ item_description: itemDescription, aspect_ratio: aspectRatio });
  return apiFetch<ApiAdImageVariantResponse>(`/ads/generate-image-variant?${params}`, {
    method: "POST",
    body: formData,
  });
}

// The generated banner images live in state as raw base64 PNG strings
// (that's what the backend returns) — these two tools re-upload that same
// image to a fresh Gemini edit call, so it needs converting back to a
// file-like Blob for multipart upload.
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

export function removeBackground(imageBase64: string): Promise<ApiAdImageVariantResponse> {
  const formData = new FormData();
  formData.append("file", base64ToBlob(imageBase64, "image/png"), "image.png");
  return apiFetch<ApiAdImageVariantResponse>("/ads/remove-background", {
    method: "POST",
    body: formData,
  });
}

export function enhanceImage(imageBase64: string): Promise<ApiAdImageVariantResponse> {
  const formData = new FormData();
  formData.append("file", base64ToBlob(imageBase64, "image/png"), "image.png");
  return apiFetch<ApiAdImageVariantResponse>("/ads/enhance-image", {
    method: "POST",
    body: formData,
  });
}

export function translateCaptions(
  captions: ApiAdCaptionVariant[],
  targetLanguage: string,
): Promise<{ captions: ApiAdCaptionVariant[] }> {
  return apiFetch<{ captions: ApiAdCaptionVariant[] }>("/ads/translate-captions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ captions, target_language: targetLanguage }),
  });
}

export interface ApiFetchProductLinkResponse {
  title: string;
  description: string;
  image_base64: string | null;
  mime_type: string | null;
}

export function fetchProductLink(url: string): Promise<ApiFetchProductLinkResponse> {
  return apiFetch<ApiFetchProductLinkResponse>("/ads/fetch-product-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export interface ApiStockPhotoResult {
  id: string;
  thumbnail_url: string;
  full_url: string;
  photographer: string;
}

export function searchStockPhotos(query: string): Promise<{ results: ApiStockPhotoResult[] }> {
  const params = new URLSearchParams({ query });
  return apiFetch<{ results: ApiStockPhotoResult[] }>(`/ads/stock-photos?${params}`);
}

export interface ApiFetchStockPhotoResponse {
  image_base64: string;
  mime_type: string;
}

export function fetchStockPhoto(url: string): Promise<ApiFetchStockPhotoResponse> {
  return apiFetch<ApiFetchStockPhotoResponse>("/ads/fetch-stock-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export function base64ToFile(base64: string, mimeType: string, filename: string): File {
  return new File([base64ToBlob(base64, mimeType)], filename, { type: mimeType });
}

export type BusinessCategory =
  | "retail"
  | "restaurant_cafe"
  | "health_beauty"
  | "professional_services"
  | "home_services"
  | "real_estate"
  | "automotive"
  | "education_coaching"
  | "fitness_sports"
  | "events_entertainment"
  | "ecommerce"
  | "technology_software"
  | "other";

export interface ApiBusinessProfile {
  category: BusinessCategory;
  brand_color: string | null;
  logo_base64: string | null;
  logo_mime_type: string | null;
  brand_name: string | null;
}

export function fetchBusinessProfile(): Promise<ApiBusinessProfile> {
  return apiFetch<ApiBusinessProfile>("/business-profile");
}

// Partial update — omitted fields keep whatever's already saved
// server-side, so the category picker and the Brand Kit panel can each
// save independently without wiping the other's fields.
export function setBusinessProfile(updates: {
  category?: BusinessCategory;
  brand_color?: string;
  logo_base64?: string;
  logo_mime_type?: string;
  brand_name?: string;
}): Promise<ApiBusinessProfile> {
  return apiFetch<ApiBusinessProfile>("/business-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export interface ApiContentPlanPost {
  day: string;
  theme: string;
  idea_text: string;
  source_items: string[];
  media_type: string;
  status: "idea" | "generated";
  caption: string | null;
  whatsapp_message: string | null;
  image_base64: string | null;
}

export interface ApiContentPlan {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  posts: ApiContentPlanPost[];
}

export function fetchCurrentContentPlan(): Promise<ApiContentPlan | null> {
  return apiFetch<ApiContentPlan | null>("/content-plan/current");
}

export function generateContentPlan(inputText: string): Promise<ApiContentPlan> {
  return apiFetch<ApiContentPlan>("/content-plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input_text: inputText }),
  });
}

export function generateContentPlanPost(planId: string, day: string, file: File | null, ideaText?: string): Promise<ApiAdGenerateResponse> {
  const formData = new FormData();
  if (file) formData.append("file", file);
  if (ideaText) formData.append("idea_text", ideaText);
  return apiFetch<ApiAdGenerateResponse>(`/content-plan/${planId}/posts/${day}/generate`, {
    method: "POST",
    body: formData,
  });
}

export function selectContentPlanPost(
  planId: string,
  day: string,
  caption: string,
  whatsappMessage: string,
  imageBase64?: string,
): Promise<void> {
  return apiFetch<void>(`/content-plan/${planId}/posts/${day}/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caption, whatsapp_message: whatsappMessage, image_base64: imageBase64 }),
  });
}

export interface ApiGeneratedPost {
  id: string;
  item_description: string;
  facebook_caption: string;
  whatsapp_message: string;
  image_base64: string;
  created_at: string;
}

export function fetchHistory(): Promise<{ posts: ApiGeneratedPost[] }> {
  return apiFetch<{ posts: ApiGeneratedPost[] }>("/ads/history");
}

export function deleteHistoryPost(id: string): Promise<void> {
  return apiFetch<void>(`/ads/history/${id}`, { method: "DELETE" });
}

export function suggestHashtags(itemDescription: string): Promise<{ hashtags: string[] }> {
  return apiFetch<{ hashtags: string[] }>("/ads/suggest-hashtags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_description: itemDescription }),
  });
}

export function fetchIdeaLabsIdeas(mode?: "surprise"): Promise<{ ideas: string[] }> {
  const params = mode ? `?${new URLSearchParams({ mode })}` : "";
  return apiFetch<{ ideas: string[] }>(`/ads/idea-labs${params}`);
}

export type VisualDirection = "clean_premium" | "bold_energetic" | "warm_lifestyle";

export interface ApiUnderstandIdeaResponse {
  content_type: string;
  tone: string;
  visual_direction: VisualDirection;
  // Real GPT-derived subject/offer extraction (empty string when the
  // idea genuinely doesn't state one — never guessed) — drives the
  // Step 2 style-preview image search. See VisualDirectionStep.tsx.
  visual_subject: string;
  offer: string;
  summary_sentence: string;
}

export function understandIdea(ideaText: string): Promise<ApiUnderstandIdeaResponse> {
  return apiFetch<ApiUnderstandIdeaResponse>("/ads/understand-idea", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea_text: ideaText }),
  });
}

export type CaptionTone = "professional" | "friendly" | "bold" | "playful" | "luxury";
export type CaptionLength = "short" | "medium" | "long";

export function generateCaptions(
  itemDescription: string,
  tone: CaptionTone,
  length: CaptionLength,
): Promise<{ captions: ApiAdCaptionVariant[] }> {
  return apiFetch<{ captions: ApiAdCaptionVariant[] }>("/ads/generate-captions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_description: itemDescription, tone, length }),
  });
}

export type AdGoal = "sales" | "leads" | "traffic" | "bookings";

export interface ApiAdCaptionVariantWithAngle {
  angle: string;
  facebook_caption: string;
  whatsapp_message: string;
}

export interface ApiGenerateAdCaptionsResponse {
  captions: ApiAdCaptionVariantWithAngle[];
  recommended_index: number;
  recommended_reason: string;
}

// angle=null means "Let Punqle choose" — no forced primary angle, every
// variant is freely AI-picked. When set, it becomes variation #1's angle.
export function generateAdCaptions(
  itemDescription: string,
  goal: AdGoal,
  angle: string | null,
  count: 1 | 3 | 5,
): Promise<ApiGenerateAdCaptionsResponse> {
  return apiFetch<ApiGenerateAdCaptionsResponse>("/ads/generate-ad-captions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_description: itemDescription, goal, angle, count }),
  });
}

export interface ApiBlogToPostsResponse {
  title: string;
  ideas: string[];
}

export function fetchBlogToPosts(url: string): Promise<ApiBlogToPostsResponse> {
  return apiFetch<ApiBlogToPostsResponse>("/ads/blog-to-posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export interface ApiImportedProduct {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  image_url: string | null;
}

export function importProductsCsv(file: File): Promise<{ products: ApiImportedProduct[] }> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<{ products: ApiImportedProduct[] }>("/products/import-csv", {
    method: "POST",
    body: formData,
  });
}

export function fetchProducts(): Promise<{ products: ApiImportedProduct[] }> {
  return apiFetch<{ products: ApiImportedProduct[] }>("/products");
}

export function clearProducts(): Promise<void> {
  return apiFetch<void>("/products", { method: "DELETE" });
}

export interface ApiFetchProductImageResponse {
  image_base64: string;
  mime_type: string;
}

export function fetchProductImage(url: string): Promise<ApiFetchProductImageResponse> {
  return apiFetch<ApiFetchProductImageResponse>("/products/fetch-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export function getShopifyConnectUrl(shop: string): Promise<{ authorize_url: string }> {
  return apiFetch<{ authorize_url: string }>("/shopify/connect-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shop }),
  });
}

export interface ApiShopifyStatus {
  connected: boolean;
  shop_domain: string | null;
}

export function fetchShopifyStatus(): Promise<ApiShopifyStatus> {
  return apiFetch<ApiShopifyStatus>("/shopify/status");
}

export function disconnectShopify(): Promise<void> {
  return apiFetch<void>("/shopify/disconnect", { method: "DELETE" });
}

export function syncShopifyProducts(): Promise<{ products: ApiImportedProduct[] }> {
  return apiFetch<{ products: ApiImportedProduct[] }>("/shopify/sync", { method: "POST" });
}

export function getMetaConnectUrl(): Promise<{ authorize_url: string }> {
  return apiFetch<{ authorize_url: string }>("/meta/connect-url");
}

export interface ApiMetaStatus {
  connected: boolean;
  page_name: string | null;
  ig_username: string | null;
}

export function fetchMetaStatus(): Promise<ApiMetaStatus> {
  return apiFetch<ApiMetaStatus>("/meta/status");
}

export interface ApiMetaAvailablePage {
  page_id: string;
  page_name: string;
  has_instagram: boolean;
  ig_username: string | null;
}

export function fetchMetaAvailablePages(): Promise<{ pages: ApiMetaAvailablePage[] }> {
  return apiFetch<{ pages: ApiMetaAvailablePage[] }>("/meta/available-pages");
}

export function selectMetaPage(pageId: string): Promise<{ connected: boolean; page_name: string; ig_username: string | null }> {
  return apiFetch("/meta/select-page", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page_id: pageId }),
  });
}

export function disconnectMeta(): Promise<void> {
  return apiFetch<void>("/meta/disconnect", { method: "DELETE" });
}

export interface ApiMetaPlatformResult {
  posted: boolean;
  post_id?: string;
  media_id?: string;
  error?: string;
}

export interface ApiMetaPublishResponse {
  facebook?: ApiMetaPlatformResult;
  instagram?: ApiMetaPlatformResult;
}

// compositedDataUrl is a canvas toDataURL() result ("data:image/...;base64,...")
// — parsed here (not passed pre-split) so every call site can just hand over
// PostKit's existing compositedUrl prop as-is, same as CarouselBuilder does.
export function publishToMeta(
  compositedDataUrl: string,
  caption: string,
  postToFacebook: boolean,
  postToInstagram: boolean,
): Promise<ApiMetaPublishResponse> {
  const match = compositedDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return Promise.reject(new Error("Couldn't read the generated image."));
  }
  const [, mimeType, base64] = match;
  const formData = new FormData();
  formData.append("file", base64ToFile(base64, mimeType, "post.jpg"));
  formData.append("caption", caption);
  formData.append("post_to_facebook", String(postToFacebook));
  formData.append("post_to_instagram", String(postToInstagram));
  return apiFetch<ApiMetaPublishResponse>("/meta/publish", {
    method: "POST",
    body: formData,
  });
}

export function getYouTubeConnectUrl(): Promise<{ authorize_url: string }> {
  return apiFetch<{ authorize_url: string }>("/youtube/connect-url");
}

export interface ApiYouTubeStatus {
  connected: boolean;
  channel_title: string | null;
}

export function fetchYouTubeStatus(): Promise<ApiYouTubeStatus> {
  return apiFetch<ApiYouTubeStatus>("/youtube/status");
}

export function disconnectYouTube(): Promise<void> {
  return apiFetch<void>("/youtube/disconnect", { method: "DELETE" });
}

export interface ApiYouTubePublishResponse {
  posted: boolean;
  video_id?: string;
  video_url?: string;
  error?: string;
}

// videoDataUrl is the same "data:video/mp4;base64,..." shape VideoPostForm
// already holds in videoUrl state — parsed here for the same reason
// publishToMeta parses compositedDataUrl inline.
export function publishToYouTube(
  videoDataUrl: string,
  title: string,
  description: string,
  aspectRatio: VideoAspectRatio,
): Promise<ApiYouTubePublishResponse> {
  const match = videoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return Promise.reject(new Error("Couldn't read the generated video."));
  }
  const [, mimeType, base64] = match;
  const formData = new FormData();
  formData.append("file", base64ToFile(base64, mimeType, "ad-video.mp4"));
  formData.append("title", title);
  formData.append("description", description);
  formData.append("aspect_ratio", aspectRatio);
  return apiFetch<ApiYouTubePublishResponse>("/youtube/publish", {
    method: "POST",
    body: formData,
  });
}

export type SubscriptionTier = "starter" | "growth" | "pro";

export interface ApiSubscriptionStatus {
  subscribed: boolean;
  tier: SubscriptionTier | null;
  status: string | null;
  current_period_end: string | null;
}

export function fetchSubscriptionStatus(): Promise<ApiSubscriptionStatus> {
  return apiFetch<ApiSubscriptionStatus>("/billing/subscription");
}

export function createCheckoutSession(tier: SubscriptionTier): Promise<{ checkout_url: string }> {
  return apiFetch<{ checkout_url: string }>("/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier }),
  });
}

export function createPortalSession(): Promise<{ portal_url: string }> {
  return apiFetch<{ portal_url: string }>("/billing/portal", { method: "POST" });
}

export interface ApiCompetitorDifferentiationIdea {
  angle: string;
  idea: string;
  evidence: string;
}

export interface ApiCompetitorAnalysisResponse {
  competitor_name: string;
  summary: string;
  differentiation_ideas: ApiCompetitorDifferentiationIdea[];
}

export function fetchCompetitorAnalysis(url: string): Promise<ApiCompetitorAnalysisResponse> {
  return apiFetch<ApiCompetitorAnalysisResponse>("/ads/competitor-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}
