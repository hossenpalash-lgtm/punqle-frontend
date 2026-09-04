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
  narration: string;
}

export type VideoAspectRatio = "16:9" | "9:16";

// goal/angle are only ever set by Ad Creation's Video Ad flow — Social
// Content's Video tab omits both, leaving the backend's behavior for it
// byte-identical to before (see GenerateVideoRequest in main.py).
// scriptOverride is set when the caller already has an exact headline +
// narration the user reviewed and picked (Video Ad's angle picker) — the
// backend uses it verbatim instead of writing a fresh (non-deterministic)
// script, so the video gets exactly the script the user chose.
export function startVideoGeneration(
  itemDescription: string,
  imageBase64?: string,
  imageMimeType?: string,
  aspectRatio: VideoAspectRatio = "16:9",
  goal?: AdGoal,
  angle?: string | null,
  scriptOverride?: { headline: string; narration: string },
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
      headline: scriptOverride?.headline,
      narration: scriptOverride?.narration,
    }),
  });
}

export interface ApiVideoScriptAngle {
  angle: string;
  explanation: string;
  headline: string;
  narration: string;
}

export interface ApiVideoScriptAnglesResponse {
  angles: ApiVideoScriptAngle[];
  recommended_index: number;
  recommended_reason: string;
}

export type AvatarLanguage = "english" | "bangla";

// language only matters to the Avatar path (defaults to "english",
// matching every other caller's existing behavior) — Veo-based styles
// always burn English text regardless, so passing "bangla" there would
// do nothing useful.
export function generateVideoScriptAngles(
  itemDescription: string,
  goal: AdGoal,
  language: AvatarLanguage = "english",
): Promise<ApiVideoScriptAnglesResponse> {
  return apiFetch<ApiVideoScriptAnglesResponse>("/ads/generate-video-angles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_description: itemDescription, goal, language }),
  });
}

export interface ApiVideoStatusResponse {
  done: boolean;
  video_base64: string | null;
  credits_remaining: number | null;
}

// aspectRatio determines the logo overlay's target size server-side
// (Veo's two 720p frame sizes differ) — defaults to "16:9" so it's
// optional at call sites that don't care.
export function checkVideoStatus(
  operation: ApiVideoOperation,
  headline: string,
  aspectRatio: VideoAspectRatio = "16:9",
): Promise<ApiVideoStatusResponse> {
  return apiFetch<ApiVideoStatusResponse>("/ads/video-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, headline, aspect_ratio: aspectRatio }),
  });
}

// Talking-avatar video (HeyGen) — a second, parallel video path picked
// from Video Ad's Style step, alongside (not replacing) Veo. See
// AvatarPickerStep.tsx for the tier+avatar picker UI this powers.
export interface ApiAvatarOption {
  avatar_id: string;
  name: string;
  gender: string | null;
  preview_image_url: string | null;
  preview_video_url: string | null;
}

export interface ApiAvatarOptionsResponse {
  avatars: ApiAvatarOption[];
}

export function fetchAvatarOptions(): Promise<ApiAvatarOptionsResponse> {
  return apiFetch<ApiAvatarOptionsResponse>("/ads/avatar-options");
}

export interface ApiAvatarVoice {
  voice_id: string;
  name: string;
}

export interface ApiAvatarVoicesResponse {
  english: { female: ApiAvatarVoice[]; male: ApiAvatarVoice[] };
  bangla: { female: ApiAvatarVoice[]; male: ApiAvatarVoice[] };
}

export function fetchAvatarVoices(): Promise<ApiAvatarVoicesResponse> {
  return apiFetch<ApiAvatarVoicesResponse>("/ads/avatar-voices");
}

export type AvatarTier = "standard" | "premium";

export interface ApiAvatarVideoOperation {
  video_id: string;
  // True when the requested tier wasn't supported by this avatar and the
  // backend automatically retried with Standard instead of failing —
  // the lower price is what actually gets charged in this case.
  fell_back: boolean;
  actual_tier: AvatarTier;
}

export function startAvatarVideoGeneration(
  narration: string,
  avatarId: string,
  gender: string | null,
  tier: AvatarTier,
  aspectRatio: VideoAspectRatio,
  voiceId?: string | null,
): Promise<ApiAvatarVideoOperation> {
  return apiFetch<ApiAvatarVideoOperation>("/ads/generate-avatar-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      narration,
      avatar_id: avatarId,
      gender,
      tier,
      aspect_ratio: aspectRatio,
      voice_id: voiceId || undefined,
    }),
  });
}

export interface ApiAvatarVideoStatusResponse {
  done: boolean;
  video_base64: string | null;
  credits_remaining: number | null;
}

export function checkAvatarVideoStatus(videoId: string): Promise<ApiAvatarVideoStatusResponse> {
  return apiFetch<ApiAvatarVideoStatusResponse>("/ads/avatar-video-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_id: videoId }),
  });
}

export type AvatarMusicMood = "upbeat" | "calm" | "energetic" | "corporate";

// Free — mixes a real licensed background track (HeyGen's own music
// catalog) under the avatar's existing dialogue audio, ducked low so it
// never competes with the speech. Returns the whole re-mixed video, same
// "always start fresh" pattern EditVideoPanel's Veo-based edits use.
export function addMusicToAvatarVideo(
  videoBase64: string,
  mood: AvatarMusicMood,
): Promise<{ video_base64: string }> {
  return apiFetch<{ video_base64: string }>("/ads/avatar-video-add-music", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_base64: videoBase64, mood }),
  });
}

export type CaptionStyle = "bold" | "clean" | "highlight" | "box" | "glow" | "minimal";

// Free — real cost is a fraction of a cent (whisper-1 transcription on an
// ~8-15s clip). Transcribes whatever audio the video currently has (the
// avatar's real spoken dialogue, not a script) and burns synced caption
// bars on top, keeping the existing audio untouched.
//
// narration (only used for Bangla) is the exact script that was actually
// spoken — whisper-1 mis-transcribes real Bangla speech as phonetic
// Hindi/Devanagari without this, a real bug found live, not a
// theoretical one (see main.py's AddCaptionsToAvatarVideoRequest).
export function addCaptionsToAvatarVideo(
  videoBase64: string,
  aspectRatio: string,
  style: CaptionStyle = "bold",
  language: AvatarLanguage = "english",
  narration?: string,
): Promise<{ video_base64: string }> {
  return apiFetch<{ video_base64: string }>("/ads/avatar-video-add-captions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_base64: videoBase64, aspect_ratio: aspectRatio, style, language, narration }),
  });
}

// Free — pure local ffmpeg compositing of two already-generated (already-paid-for)
// videos into one, hard cut, no transition. Used for multi-scene ad assembly:
// avatar clip + a separately-generated Veo B-roll product clip.
export function concatVideos(
  firstVideoBase64: string,
  secondVideoBase64: string,
  aspectRatio: string,
): Promise<{ video_base64: string }> {
  return apiFetch<{ video_base64: string }>("/ads/concat-videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_video_base64: firstVideoBase64,
      second_video_base64: secondVideoBase64,
      aspect_ratio: aspectRatio,
    }),
  });
}

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type TextPosition = "top" | "center" | "bottom";
export type TtsVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface EditVideoOptions {
  headline: string;
  narration: string;
  aspectRatio: VideoAspectRatio;
  showLogo: boolean;
  logoPosition: LogoPosition;
  useBrandColor: boolean;
  textPosition: TextPosition;
  voiceoverEnabled: boolean;
  voice: TtsVoice;
  captionsEnabled: boolean;
  muted: boolean;
}

export interface ApiEditVideoResponse {
  video_base64: string;
  credits_remaining: number;
  credits_charged: number;
}

// Re-downloads the same Veo output fresh server-side (via the same
// operation handle) rather than re-sending the already-composited video
// — that version has the full-duration headline permanently baked in,
// which every un-edited video keeps unchanged. Free unless voiceover
// audio actually gets (re)synthesized (credits_charged tells the truth,
// don't just assume 0 client-side).
export function editVideo(
  operation: ApiVideoOperation,
  options: EditVideoOptions,
): Promise<ApiEditVideoResponse> {
  return apiFetch<ApiEditVideoResponse>("/ads/edit-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation,
      headline: options.headline,
      narration: options.narration,
      aspect_ratio: options.aspectRatio,
      show_logo: options.showLogo,
      logo_position: options.logoPosition,
      use_brand_color: options.useBrandColor,
      text_position: options.textPosition,
      voiceover_enabled: options.voiceoverEnabled,
      voice: options.voice,
      captions_enabled: options.captionsEnabled,
      muted: options.muted,
    }),
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

export interface ApiProductUnderstanding {
  title: string;
  description: string;
  image_base64: string | null;
  mime_type: string | null;
  // Everything below is grounded in the page's real body text, not just
  // its Open Graph tags — see understand_product_link on the backend.
  enriched_description: string;
  product_name: string;
  benefits: string[];
  features: string[];
  offer: string | null;
  target_audience: string | null;
  tone: string | null;
}

// Quick Create's product-understanding step (Image and Video both use
// this instead of fetchProductLink) — same shape plus a richer,
// AI-synthesized description built from the page's actual content, used
// as the item_description passed into angle/caption generation.
export function understandProductLink(url: string): Promise<ApiProductUnderstanding> {
  return apiFetch<ApiProductUnderstanding>("/ads/understand-product-link", {
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

export interface ApiTryOnStartResponse {
  id: string;
}

// Either productImageUrl (a catalog product's existing image_url — FASHN
// accepts URLs directly, no fetch/base64 round trip needed) or
// productImageBase64+productImageMimeType (an uploaded garment photo) —
// exactly one must be passed. modelImage is always base64 since the
// uploaded person photo never has a public URL.
export function startTryOn(
  modelImageBase64: string,
  modelImageMimeType: string,
  productImageUrl: string | null,
  productImageBase64: string | null,
  productImageMimeType: string | null,
): Promise<ApiTryOnStartResponse> {
  return apiFetch<ApiTryOnStartResponse>("/tryon/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_image_base64: modelImageBase64,
      model_image_mime_type: modelImageMimeType,
      product_image_url: productImageUrl ?? undefined,
      product_image_base64: productImageBase64 ?? undefined,
      product_image_mime_type: productImageMimeType ?? undefined,
    }),
  });
}

export interface ApiTryOnStatusResponse {
  done: boolean;
  image_base64: string | null;
  credits_remaining: number | null;
}

export function checkTryOnStatus(id: string): Promise<ApiTryOnStatusResponse> {
  return apiFetch<ApiTryOnStatusResponse>("/tryon/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

// Feeds a Try-On result image into Veo as the starting frame. Reuses
// ApiVideoOperation/ApiVideoStatusResponse as-is — the shape is identical
// to Ad Video's, no new types needed.
export function startTryOnAnimation(imageBase64: string): Promise<{ operation: ApiVideoOperation }> {
  return apiFetch<{ operation: ApiVideoOperation }>("/tryon/animate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
}

export function checkTryOnAnimationStatus(operation: ApiVideoOperation): Promise<ApiVideoStatusResponse> {
  return apiFetch<ApiVideoStatusResponse>("/tryon/animate-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation }),
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
  scheduled?: boolean;
}

export interface ApiMetaPublishResponse {
  facebook?: ApiMetaPlatformResult;
  instagram?: ApiMetaPlatformResult;
}

// compositedDataUrl is a canvas toDataURL() result ("data:image/...;base64,...")
// — parsed here (not passed pre-split) so every call site can just hand over
// PostKit's existing compositedUrl prop as-is, same as CarouselBuilder does.
// scheduledTime (ISO8601, optional) only affects Facebook — Instagram has no
// native scheduling, so it always posts immediately regardless; the caller
// is responsible for disclosing that to the user before submitting.
export function publishToMeta(
  compositedDataUrl: string,
  caption: string,
  postToFacebook: boolean,
  postToInstagram: boolean,
  scheduledTime?: string,
  contentPlanId?: string,
  contentPlanDay?: string,
  goal?: string | null,
  angle?: string | null,
  style?: string | null,
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
  if (scheduledTime) formData.append("scheduled_time", scheduledTime);
  if (contentPlanId && contentPlanDay) {
    formData.append("source", "weekly_plan");
    formData.append("content_plan_id", contentPlanId);
    formData.append("content_plan_day", contentPlanDay);
  }
  if (goal) formData.append("goal", goal);
  if (angle) formData.append("angle", angle);
  if (style) formData.append("style", style);
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

export function getTikTokConnectUrl(): Promise<{ authorize_url: string }> {
  return apiFetch<{ authorize_url: string }>("/tiktok/connect-url");
}

export interface ApiTikTokStatus {
  connected: boolean;
  display_name: string | null;
}

export function fetchTikTokStatus(): Promise<ApiTikTokStatus> {
  return apiFetch<ApiTikTokStatus>("/tiktok/status");
}

export function disconnectTikTok(): Promise<void> {
  return apiFetch<void>("/tiktok/disconnect", { method: "DELETE" });
}

export interface ApiYouTubePublishResponse {
  posted: boolean;
  video_id?: string;
  video_url?: string;
  error?: string;
  scheduled?: boolean;
}

// videoDataUrl is the same "data:video/mp4;base64,..." shape VideoPostForm
// already holds in videoUrl state — parsed here for the same reason
// publishToMeta parses compositedDataUrl inline. scheduledTime (ISO8601,
// optional) uses YouTube's own native scheduled-release (uploads "private"
// with a future publishAt) — no polling or job needed on our side.
export function publishToYouTube(
  videoDataUrl: string,
  title: string,
  description: string,
  aspectRatio: VideoAspectRatio,
  scheduledTime?: string,
  contentPlanId?: string,
  contentPlanDay?: string,
  goal?: string | null,
  angle?: string | null,
  style?: string | null,
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
  if (scheduledTime) formData.append("scheduled_time", scheduledTime);
  if (contentPlanId && contentPlanDay) {
    formData.append("source", "weekly_plan");
    formData.append("content_plan_id", contentPlanId);
    formData.append("content_plan_day", contentPlanDay);
  }
  if (goal) formData.append("goal", goal);
  if (angle) formData.append("angle", angle);
  if (style) formData.append("style", style);
  return apiFetch<ApiYouTubePublishResponse>("/youtube/publish", {
    method: "POST",
    body: formData,
  });
}

export interface ApiTikTokPublishResponse {
  posted: boolean;
  publish_id?: string;
  error?: string;
}

// isOwnBrand maps to TikTok's own mandatory branded-content disclosure
// (brand_organic_toggle vs brand_content_toggle) — TikTok's guidelines
// require this be a real, visible user choice, never silently defaulted.
export function publishToTikTok(
  videoDataUrl: string,
  caption: string,
  isOwnBrand: boolean,
  contentPlanId?: string,
  contentPlanDay?: string,
  goal?: string | null,
  angle?: string | null,
  style?: string | null,
): Promise<ApiTikTokPublishResponse> {
  const match = videoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return Promise.reject(new Error("Couldn't read the generated video."));
  }
  const [, mimeType, base64] = match;
  const formData = new FormData();
  formData.append("file", base64ToFile(base64, mimeType, "ad-video.mp4"));
  formData.append("caption", caption);
  formData.append("is_own_brand", String(isOwnBrand));
  if (contentPlanId && contentPlanDay) {
    formData.append("source", "weekly_plan");
    formData.append("content_plan_id", contentPlanId);
    formData.append("content_plan_day", contentPlanDay);
  }
  if (goal) formData.append("goal", goal);
  if (angle) formData.append("angle", angle);
  if (style) formData.append("style", style);
  return apiFetch<ApiTikTokPublishResponse>("/tiktok/publish", {
    method: "POST",
    body: formData,
  });
}

// ---- Content Calendar ----

export interface ApiScheduledPost {
  id: string;
  platform: "facebook" | "youtube" | "tiktok";
  external_post_id: string | null;
  caption: string;
  description: string | null;
  image_base64: string | null;
  scheduled_time: string;
  status: "scheduled" | "published" | "failed";
  error: string | null;
  source: "single" | "weekly_plan";
  content_plan_id: string | null;
  content_plan_day: string | null;
  created_at: string;
  updated_at: string;
}

export function fetchScheduledPosts(start: Date, end: Date): Promise<{ posts: ApiScheduledPost[] }> {
  const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  return apiFetch<{ posts: ApiScheduledPost[] }>(`/scheduled-posts?${params.toString()}`);
}

// Combined reschedule + caption-edit — either or both fields, matching
// the backend's single POST /scheduled-posts/{id}/update endpoint (this
// codebase never uses PATCH).
export function updateScheduledPost(
  id: string,
  updates: { caption?: string; scheduledTime?: string },
): Promise<ApiScheduledPost> {
  return apiFetch<ApiScheduledPost>(`/scheduled-posts/${id}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caption: updates.caption, scheduled_time: updates.scheduledTime }),
  });
}

export function postScheduledPostNow(id: string): Promise<ApiScheduledPost> {
  return apiFetch<ApiScheduledPost>(`/scheduled-posts/${id}/post-now`, { method: "POST" });
}

export function deleteScheduledPost(id: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/scheduled-posts/${id}`, { method: "DELETE" });
}

// ---- Organic Performance ----
// Reach/impressions are deliberately absent — neither platform exposes
// them with the permissions Punqle currently has (Facebook needs a
// separate read_insights grant; YouTube's impression data lives only in
// the distinct YouTube Analytics API). Only real, currently-fetchable
// organic numbers are represented here.

export interface ApiPostMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  fetched_at: string | null;
}

export interface ApiPerformancePost {
  id: string;
  platform: "facebook" | "youtube" | "tiktok";
  external_post_id: string | null;
  caption: string;
  image_base64: string | null;
  scheduled_time: string;
  metrics: ApiPostMetrics | null;
  metrics_unavailable_reason: string | null;
  goal: string | null;
  angle: string | null;
  style: string | null;
}

export function fetchOrganicPerformance(): Promise<{ posts: ApiPerformancePost[] }> {
  return apiFetch<{ posts: ApiPerformancePost[] }>("/performance/posts");
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
