import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Facebook,
  Images,
  Instagram,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Package,
  PackageOpen,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Shirt,
  Smartphone,
  Sparkles,
  Upload,
  UserRound,
  Video,
  X,
  ZoomIn,
} from "lucide-react";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { useEffect, useRef, useState } from "react";
import {
  addEmotionTags,
  type ActorVoiceEngine,
  type ApiCustomActor,
  type ApiImageActor,
  type ApiVideoOperation,
  type AspectRatio,
  type AvatarTier,
  checkActorVideoV2Status,
  checkAiActorVideoStatus,
  checkImageVideoStatus,
  fetchRecentVideos,
  fetchFreeTasterStatus,
  startFreeTaster,
  checkTalkingVideoStatus,
  checkVideoUpscaleStatus,
  combineActorAndAppScreenshot,
  combineActorAndProduct,
  createCustomActor,
  deleteCustomActor,
  fetchActorPreviewVideoUrl,
  fetchActorSituations,
  fetchAdCredits,
  fetchFeatureTrials,
  fetchImageActors,
  fetchMyCustomActors,
  generateImageDirect,
  generateImageVideo,
  unlockTasterVideo,
  generateTalkingVideo,
  generateUnboxingShot,
  type ApiFeatureTrials,
  type ImageGenModel,
  type ImageVideoModel,
  refineActorPhoto,
  renameCustomActor,
  startActorVideoV2,
  startAiActorVideoGeneration,
  startVideoUpscale,
  upscaleImage,
  type VideoAspectRatio,
  type VoiceGender,
} from "@/lib/api";
import { AdCreationForm } from "@/components/ads/AdCreationForm";
import { AdVideoForm } from "@/components/ads/AdVideoForm";
import { BulkCreativeForm } from "@/components/ads/BulkCreativeForm";
import { CalendarView } from "@/components/ads/CalendarView";
import { CompetitorAnalysis } from "@/components/ads/CompetitorAnalysis";
import { HistoryTab } from "@/components/ads/HistoryTab";
import { PerformanceView } from "@/components/ads/PerformanceView";
import { SinglePostForm } from "@/components/ads/SinglePostForm";
import {
  TryOnForm,
  type TryOnImageAdHandoff,
  type TryOnSocialPostHandoff,
  type TryOnVideoAdHandoff,
} from "@/components/ads/TryOnForm";
import { VideoPostForm } from "@/components/ads/VideoPostForm";
import { WeeklyPlanForm } from "@/components/ads/WeeklyPlanForm";
import { ImageChoiceCard } from "@/components/ads/ImageChoiceCard";
import { GeneratingGlow } from "@/components/GeneratingGlow";
import { COMPARE_CHIPS, COMPARE_MODELS, VideoCompare, startCompareJobs } from "@/components/ads/VideoCompare";
import { StarterExamples } from "@/components/ads/StarterExamples";
import type { StarterExample } from "@/components/ads/StarterExamples";
import { RecentVideos } from "@/components/ads/RecentVideos";
import { PostThisVideo } from "@/components/ads/PostThisVideo";
import type { CompareJob } from "@/components/ads/VideoCompare";

type Tab = "home" | "single" | "plan" | "calendar" | "performance" | "history" | "competitor" | "video" | "ad" | "ad-video" | "bulk-creative" | "tryon";

export const Route = createFileRoute("/")({
  component: HomeScreen,
  // "home" is the default tab, so leave it out of the URL. Before (2026-11-10) the router added
  // `?tab=home` to every plain `/` visit, which cost a whole extra round trip (a 307 from
  // Virginia, ~0.35 s from Melbourne) before the page started loading.
  search: { middlewares: [stripSearchParams({ tab: "home" })] },
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => ({
    tab:
      search.tab === "plan"
        ? "plan"
        : search.tab === "calendar"
          ? "calendar"
          : search.tab === "performance"
            ? "performance"
            : search.tab === "history"
              ? "history"
              : search.tab === "competitor"
                ? "competitor"
                : search.tab === "video"
                  ? "video"
                  : search.tab === "ad"
                    ? "ad"
                    : search.tab === "ad-video"
                      ? "ad-video"
                      : search.tab === "bulk-creative"
                        ? "bulk-creative"
                        : search.tab === "tryon"
                          ? "tryon"
                          : search.tab === "single"
                            ? "single"
                            : "home",
  }),
});

// Charcoal glass for the home screen's selected-state surfaces (gender filter,
// every mode's Generate button, the tab chips). 2026-10-06: this used to be an
// orange -> magenta -> violet gradient, which tinted the whole app pink; it is now
// the same charcoal "glass metal" as the primary buttons (`.bg-primary`), so
// black reads as the one selected / primary colour everywhere.
const HOME_GRADIENT = "linear-gradient(180deg, #4B4B52 0%, #1E1E22 100%)";
// Glossy-glass highlight: bright top edge, a soft inner shade along the bottom and
// a tight contact shadow, so the charcoal reads as lit glass.
const HOME_GRADIENT_SHEEN =
  "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -10px 14px -10px rgba(0,0,0,0.5), 0 6px 16px -8px rgba(20,20,30,0.45)";

// Unboxing's surface picker (image cards, 2026-10-05 — founder liked
// AdCreative.ai's "High Performance Scenes" picker). Thumbnails are static
// one-time samples in /public/scene-previews, each generated from exactly
// the phrase it sends, so a card shows what that phrase actually produces.
const UNBOXING_SURFACES = [
  { id: "marble", label: "Marble", phrase: "on a marble kitchen counter, soft morning light" },
  { id: "wood", label: "Wood", phrase: "on a warm wooden table, natural daylight" },
  { id: "linen", label: "Linen", phrase: "on soft wrinkled linen fabric, cozy natural light" },
  { id: "outdoor", label: "Outdoor", phrase: "on a rustic outdoor patio table, golden hour light" },
  { id: "tile", label: "Tile", phrase: "on a clean bathroom tile counter, bright even light" },
] as const;

// Image Post and Video are the two formats inside the ✨ Social Content
// creation category — Punqle's product architecture is 3 categories
// (Social Content / Ad Creation / E-commerce, see Sidebar.tsx), all now
// built. Ad Creation (📣) has its own two-format split below (AD_TYPES);
// E-commerce (🛍) starts with 1 feature (Bulk Creative), so it gets a
// plain header instead of a picker grid — see the render block below.
// Weekly Plan and Competitor Analysis live in the sidebar's own "Tools"
// group rather than here, since they aren't part of that 3-category system.
const CONTENT_TYPES: {
  tab: Tab;
  label: string;
  description: string;
  icon: typeof Megaphone;
}[] = [
  { tab: "single", label: "Image Post", description: "Create a polished post in seconds", icon: Megaphone },
  { tab: "video", label: "Video", description: "Short-form video, made for social", icon: Video },
];

// Ad Creation's own two formats, same card-grid pattern as Social
// Content's CONTENT_TYPES above — Image Ad reuses Image Post's pipeline
// with angle-labeled variations; Video Ad generates exactly one video
// (Veo is 10x an image credit and 1-2 min per generation, so no
// "versions" concept here, unlike Image Ad).
const AD_TYPES: {
  tab: Tab;
  label: string;
  description: string;
  icon: typeof Megaphone;
}[] = [
  { tab: "ad", label: "Image Ad", description: "Angle-labeled ad variations", icon: Megaphone },
  { tab: "ad-video", label: "Video Ad", description: "AI presenter or product-in-hand UGC", icon: Video },
];

// Same small, curated model list as Ad Creation's own "Image Model"
// picker — only the vendors Punqle already has API access to.
const IMAGE_MODEL_OPTIONS: { id: ImageGenModel; label: string }[] = [
  { id: "nano_banana_pro", label: "Nano Banana Pro" },
  { id: "nano_banana_2", label: "Nano Banana 2" },
  { id: "gpt_image", label: "GPT Image" },
];
const IMAGE_MODEL_LABELS: Record<ImageGenModel, string> = {
  nano_banana_pro: "Nano Banana Pro",
  nano_banana_2: "Nano Banana 2",
  gpt_image: "GPT Image",
};

// The "Video" action on a generated image — turn it into a short clip.
// Only 3 models are offered: the ones Punqle can actually call today
// (Veo 3.1, already integrated; Kling 3.0 Pro / Seedance 2.5, both via
// Replicate, live-checked 2026-09-13). Sora 2/Sora 2 Pro, Kling 2.6 Pro,
// Seedance 1.5, and Grok Video all appear in the real competitor's own
// picker but are deliberately left out here — no working API for them
// yet, and the ask was for a simple picker, not an exhaustive one. min/
// max mirror the backend's own per-model duration clamp exactly (Veo's
// real 4-8s hard cap vs. Kling/Seedance's 3-15s).
const IMAGE_VIDEO_MODEL_OPTIONS: { id: ImageVideoModel; label: string; blurb: string }[] = [
  { id: "omni", label: "Gemini Omni", blurb: "Smooth and steady. Best value." },
  { id: "wan_3", label: "Wan 3.0", blurb: "Natural motion, up to 30 s. Great price." },
  { id: "kling_3_pro", label: "Kling 3.0 Pro", blurb: "Crisp motion, up to 15 s." },
  { id: "kling_4", label: "Kling 4.0", blurb: "Clean cuts in one steady setting." },
  { id: "seedance_2_5", label: "Seedance 2.5", blurb: "The most cinematic, lifelike look." },
  { id: "seedance_2_5_hd", label: "Seedance 2.5 · 1080p", blurb: "Seedance in full 1080p. Takes longer, costs more." },
];
const IMAGE_VIDEO_MODEL_LABELS: Record<ImageVideoModel, string> = {
  omni: "Gemini Omni",
  wan_3: "Wan 3.0",
  kling_3_pro: "Kling 3.0 Pro",
  kling_4: "Kling 4.0",
  seedance_2_5: "Seedance 2.5",
  seedance_2_5_hd: "Seedance 2.5 · 1080p",
};
// Display-only estimate, mirrors the backend's own per-second credit rates — the backend always
// computes the real charge itself, this is just so the cards and the Generate button can show a cost upfront.
const IMAGE_VIDEO_CREDIT_PER_SECOND: Record<ImageVideoModel, number> = {
  omni: 3.75,
  wan_3: 5, // Wan 3.0 and Kling 4.0 run at 1080p
  kling_3_pro: 5, // Kling now makes its own sound here; with a studio voice it animates silently at 4/s (see videoCreditsPerSecond)
  kling_4: 6,
  seedance_2_5: 4, // was 6 until 2026-11-09 (rivals sell it for about half; 5 first, then 4); mirrors main.py
  seedance_2_5_hd: 10, // native 1080p through a second provider (measured 2026-11-09); mirrors main.py
};
const videoCreditsPerSecond = (model: ImageVideoModel, withStudioVoice: boolean) =>
  model === "kling_3_pro" && withStudioVoice ? 4 : IMAGE_VIDEO_CREDIT_PER_SECOND[model];
// Three length choices per tool (the lengths the tool does best), so nobody has to pick a number of seconds.
// Omni goes to 30 s as chained 10 s extensions; Kling 4.0 and Seedance 2.5 reach 30 s in one request.
const VIDEO_LENGTH_CHIPS: Record<ImageVideoModel, { label: string; seconds: number }[]> = {
  omni: [{ label: "Short", seconds: 8 }, { label: "Medium", seconds: 20 }, { label: "Long", seconds: 30 }],
  wan_3: [{ label: "Short", seconds: 8 }, { label: "Medium", seconds: 15 }, { label: "Long", seconds: 30 }],
  kling_3_pro: [{ label: "Short", seconds: 5 }, { label: "Medium", seconds: 10 }, { label: "Long", seconds: 15 }],
  kling_4: [{ label: "Short", seconds: 8 }, { label: "Medium", seconds: 15 }, { label: "Long", seconds: 30 }],
  seedance_2_5: [{ label: "Short", seconds: 5 }, { label: "Medium", seconds: 15 }, { label: "Long", seconds: 30 }],
  seedance_2_5_hd: [{ label: "Short", seconds: 5 }, { label: "Medium", seconds: 10 }, { label: "Long", seconds: 15 }], // 10 credits a second, so kept short
};
// "Studio voice" (a separate ElevenLabs voice, lip-synced afterwards) is the old Talking Video path:
// Omni up to 10 s, Kling 3.0 Pro up to 15 s. The normal way to make someone speak is the
// "What should they say?" box — every tool speaks those lines itself.
const STUDIO_VOICE_MAX: Partial<Record<ImageVideoModel, number>> = { omni: 10, kling_3_pro: 15 };
const lengthChipsFor = (model: ImageVideoModel, studioVoice: boolean) =>
  studioVoice ? VIDEO_LENGTH_CHIPS[model].filter((c) => c.seconds <= (STUDIO_VOICE_MAX[model] ?? 0)) : VIDEO_LENGTH_CHIPS[model];
// The full-quality version offered after the free comparison is the same 4 seconds as the comparison, so it is
// the cheapest real video (Wan/Kling 4.0 20-24 credits, Seedance 24) and a new account's ~15 free credits fall just short.
const TASTER_UPGRADE_SECONDS = 4;
// Under every free result: (1) the SAME video (720p) without the watermark for TASTER_UNLOCK_CREDITS (mirrors main.py), or
// (2) a NEW 1080p video. Wan 3.0 and Kling 4.0 already make 1080p; Seedance 2.5's 1080p is its own engine.
const TASTER_UNLOCK_CREDITS = 10;
const TASTER_1080_MODEL: Partial<Record<ImageVideoModel, ImageVideoModel>> = { seedance_2_5: "seedance_2_5_hd" };
const tasterUpgradeModel = (model: ImageVideoModel): ImageVideoModel => TASTER_1080_MODEL[model] ?? model;
// TALKING_VIDEO_REDUB_SURCHARGE is declared right below this block.
const videoCostFor = (model: ImageVideoModel, seconds: number, studioVoice: boolean) =>
  Math.ceil(seconds * videoCreditsPerSecond(model, studioVoice)) + (studioVoice ? 18 : 0);
// Mirrors the backend's own TALKING_VIDEO_REDUB_SURCHARGE — display only.
const TALKING_VIDEO_REDUB_SURCHARGE = 18;
// Mirrors the backend's own ACTOR_VIDEO_V2_CREDIT_COST (main.py) — same
// flat price AdVideoForm.tsx's "Punqle Actors" style already charges,
// since this reuses that exact same endpoint. Display only.
const ACTOR_VIDEO_V2_CREDIT_COST = 30;
// Custom actors (the user's own photo): a narration up to ~9 s is filmed by
// Gemini Omni and lip-synced (Talking Video's chain), a longer one stays on
// OmniHuman at the flat price above. Mirrors the backend's
// _omni_actor_clip_seconds / _omni_actor_cost — display only.
const ACTOR_CHARS_PER_SECOND = 13;
const OMNI_ACTOR_MAX_NARRATION_SECONDS = 9;
// Longer narrations (OmniHuman 1.5): up to 900 characters (~60 s), 3.5 credits
// per second after the flat 30. Over ~35 s it is made in 720p (one continuous
// take). No quality choice is offered: the user only sees seconds and credits. Ready Actors: up to 420 characters (~28 s),
// 30 credits to 15 s then 2 per second. Mirrors main.py's
// CUSTOM_ACTOR_MAX_NARRATION_CHARS / ACTOR_V2_MAX_NARRATION_CHARS and their
// cost functions — display only, the server charges the real amount.
const ACTOR_SPEECH_CHARS_PER_SECOND = 15;
const CUSTOM_ACTOR_MAX_CHARS = 900;
const READY_ACTOR_MAX_CHARS = 420;
const OMNIHUMAN_CREDITS_PER_SECOND = 3.5;
// [emotion] tags are voice direction, never spoken, so they don't count.
const spokenLength = (text: string) => text.replace(/\[[^\]]*\]/g, "").trim().length;
const actorSpeechSeconds = (text: string) => Math.max(3, spokenLength(text) / ACTOR_SPEECH_CHARS_PER_SECOND);
function readyActorVideoCost(narration: string): number {
  return Math.max(ACTOR_VIDEO_V2_CREDIT_COST, Math.ceil(actorSpeechSeconds(narration) * 2));
}
function customActorVideoCost(narration: string): number {
  const text = narration.trim();
  const est = Math.max(3, text.length / ACTOR_CHARS_PER_SECOND);
  if (!text) return ACTOR_VIDEO_V2_CREDIT_COST;
  if (est <= OMNI_ACTOR_MAX_NARRATION_SECONDS) {
    const clip = Math.max(4, Math.min(10, Math.ceil(est) + 1));
    return Math.ceil(clip * IMAGE_VIDEO_CREDIT_PER_SECOND.omni) + TALKING_VIDEO_REDUB_SURCHARGE;
  }
  return Math.max(ACTOR_VIDEO_V2_CREDIT_COST, Math.ceil(actorSpeechSeconds(text) * OMNIHUMAN_CREDITS_PER_SECOND));
}

// Mirrors the backend's own VIDEO_UPSCALE_CREDIT_COST (main.py) — display
// only, the backend computes and charges the real amount server-side.
const UPSCALE_VIDEO_CREDIT_COST: Record<AvatarTier, number> = { standard: 4, premium: 10 };

function HomeScreen() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  // Set by "Create an ad from this" on the Competitor Analysis tab, read
  // once by SinglePostForm on mount, then cleared — see SinglePostForm's
  // own initialIdea prop comment for why a later unrelated visit to the
  // Image Post tab shouldn't silently reuse stale competitor-insight text.
  const [prefilledIdea, setPrefilledIdea] = useState<string | undefined>(undefined);
  // Set by Try-On's "Social Post" / "Image Ad" / "Video Ad" handoffs —
  // Try-On output is deliberately unbranded, so this is how the user
  // sends a result into a flow where Brand Kit already applies. Same
  // "read once on mount, then cleared" contract as prefilledIdea above.
  const [prefilledSocialImage, setPrefilledSocialImage] = useState<TryOnSocialPostHandoff | undefined>(undefined);
  const [prefilledAdImage, setPrefilledAdImage] = useState<TryOnImageAdHandoff | undefined>(undefined);
  const [prefilledAdVideo, setPrefilledAdVideo] = useState<TryOnVideoAdHandoff | undefined>(undefined);
  // Set only by the home screen's "Carousel" pill — copy-only hint for
  // IdeaStep's placeholder, see SinglePostForm's own entryHint comment.
  // Reset at every other real entry into "single" below so it can't leak
  // into an unrelated visit (same "no stale reuse" discipline as
  // prefilledIdea above).
  const [entryHint, setEntryHint] = useState<"carousel" | undefined>(undefined);

  // The unified creation bar (2026-09-17) — one mode is active at a time,
  // which is what makes the old videoPanel/productPanel double-render bug
  // structurally impossible now: only one mode's block ever renders.
  // "See more" (Image Ad/Try-On/Carousel) stays outside this — those are
  // genuinely separate, heavier wizards that navigate away, unchanged.
  type HomeMode = "talking_actors" | "video" | "image" | "product" | "unboxing" | "show_app" | "upscale";
  const [homeMode, setHomeMode] = useState<HomeMode>("talking_actors");
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [homeIdea, setHomeIdea] = useState("");
  // Standalone quick-image tool living right in the home prompt box —
  // matches a real competitor's own "type a prompt, pick a model,
  // generate" simplicity exactly (their "Image" tool, not their fuller
  // ad-creation flow). Deliberately separate from homeIdea's existing
  // "start a Social Content post" behavior below — this one never
  // navigates away, the image just appears in this same card.
  const [homeImageSettingsOpen, setHomeImageSettingsOpen] = useState(false);
  const [homeImageModel, setHomeImageModel] = useState<ImageGenModel>("nano_banana_pro");
  const [homeImageAspectRatio, setHomeImageAspectRatio] = useState<AspectRatio>("square");
  // Up to 3 versions from one prompt, same idea as Ad Creation's own
  // versions picker -- the first becomes homeGeneratedImage (primary),
  // the rest land in homeImageVariants for a small pick-one strip.
  const [homeImageVersions, setHomeImageVersions] = useState<1 | 2 | 3>(1);
  const [homeImageVariants, setHomeImageVariants] = useState<string[]>([]);
  const [homeImageGenerating, setHomeImageGenerating] = useState(false);
  const [homeImageError, setHomeImageError] = useState<string | null>(null);
  const [homeGeneratedImage, setHomeGeneratedImage] = useState<string | null>(null);
  const homePromptRef = useRef<HTMLTextAreaElement>(null);
  const videoResultRef = useRef<HTMLVideoElement>(null);

  // The "Video" action on a generated image — a real competitor's own
  // Actions row (Edit/Remix/Video/Actor), only Video wired for now. One
  // small state machine instead of several booleans: closed (showing the
  // Actions row) -> composer (prompt + model + length) -> generating ->
  // result (the video itself, replacing the image in the same card).
  const [videoPanel, setVideoPanel] = useState<"closed" | "composer" | "generating" | "compare" | "result">("closed");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoModel, setVideoModel] = useState<ImageVideoModel>("omni");
  const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>("1:1");
  const [videoDuration, setVideoDuration] = useState(8);
  // Up to 3 versions from one prompt, same idea as Ad Creation's own
  // versions picker -- the first becomes homeGeneratedVideo (primary),
  // the rest land in videoVariants for a small pick-one strip.
  const [videoVersions, setVideoVersions] = useState<1 | 2 | 3>(1);
  const [videoVariants, setVideoVariants] = useState<string[]>([]);
  // Defaults to the just-generated image, but the user can swap in their
  // own photo instead via the small "Replace" upload control.
  const [videoRefImage, setVideoRefImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [homeGeneratedVideo, setHomeGeneratedVideo] = useState<string | null>(null);
  const videoPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Optional "Add spoken narration" path within the same composer —
  // animates the image, then Sync Labs-redubs real TTS narration onto
  // it (reuses Punqle Actors v2's own proven pre-bake+redub mechanics).
  const [videoNarrationEnabled, setVideoNarrationEnabled] = useState(false);
  // Finished videos are kept for 14 days when the server has saving switched on ("Recent videos"); then leaving the page is safe.
  const [recentSaved, setRecentSaved] = useState(false);
  const [recentCount, setRecentCount] = useState(0);
  const [showRecent, setShowRecent] = useState(false);
  useEffect(() => {
    if (homeMode !== "video") return;
    let cancelled = false;
    fetchRecentVideos()
      .then((r) => { if (!cancelled) { setRecentSaved(r.available); setRecentCount(r.videos.length); } })
      .catch(() => { /* best effort: without it the page simply asks the user to stay */ });
    return () => { cancelled = true; };
  }, [homeMode, videoPanel]);
  // While a video is being made the page must stay open (it is what collects the finished video); ask the browser to warn before a refresh or tab close.
  useEffect(() => {
    if (videoPanel !== "generating" || recentSaved) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [videoPanel, recentSaved]);
  // "Compare all": same photo + words in three tools at once (see components/ads/VideoCompare.tsx)
  const [videoCompare, setVideoCompare] = useState(false);
  const [compareJobs, setCompareJobs] = useState<CompareJob[] | null>(null);
  const [compareStarting, setCompareStarting] = useState(false);
  // Free taster: one free 4-second, 720p, watermarked comparison per new account. The server decides who may use it
  // (and whether it is switched on at all); the card only shows when it says yes.
  const [tasterAvailable, setTasterAvailable] = useState(false);
  // How many tools the free comparison uses (the server's list: Wan 3.0 + Kling 4.0 since 2026-11-11, Seedance is for paying users).
  const [tasterModelCount, setTasterModelCount] = useState(2);
  const [tasterMode, setTasterMode] = useState(false);
  // True while the result on screen is the user's pick from the FREE comparison (short, watermarked): its button then
  // offers the full-quality version and states the price, since this is the first time a cost appears for them.
  const [resultFromTaster, setResultFromTaster] = useState(false);
  const [tasterResultJobId, setTasterResultJobId] = useState<string | null>(null); // the free-comparison job whose video is on screen (needed to unlock it)
  const [tasterActionError, setTasterActionError] = useState<string | null>(null);
  const [exampleLoading, setExampleLoading] = useState<string | null>(null); // which "Try an example" card is loading its photo
  const refreshTasterStatus = () => {
    fetchFreeTasterStatus()
      .then((s) => {
        setTasterAvailable(s.available);
        if (s.models?.length) setTasterModelCount(s.models.length);
      })
      .catch(() => setTasterAvailable(false));
  };
  useEffect(() => {
    if (homeMode !== "video") return;
    refreshTasterStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeMode]);
  // "Punqle Enhancer": opt-in, off by default (the engines keep their own natural motion); the choice is remembered in this browser (best effort)
  const [videoEnhance, setVideoEnhanceState] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem("punqle_video_enhancer") === "on") setVideoEnhanceState(true);
    } catch { /* storage can be blocked; the default (off) is fine */ }
  }, []);
  const setVideoEnhance = (on: boolean) => {
    setVideoEnhanceState(on);
    try { window.localStorage.setItem("punqle_video_enhancer", on ? "on" : "off"); } catch { /* ignore */ }
  };
  const [videoNarration, setVideoNarration] = useState("");
  const [videoLines, setVideoLines] = useState(""); // "What should they say?" — spoken by whichever tool is picked
  const [videoVoiceGender, setVideoVoiceGender] = useState<VoiceGender>("female");
  const [videoStage, setVideoStage] = useState<"animating" | "redubbing">("animating");
  // The "Product" action — attach a separate product photo to the
  // current actor image, describe the interaction, and combine both
  // into one new image (matches a real competitor's own "actor + product
  // photo -> one combined image" tool). Success replaces homeGeneratedImage
  // outright, so the result can immediately go through Video too.
  const [productPanel, setProductPanel] = useState<"closed" | "composer" | "generating">("closed");
  const [productPrompt, setProductPrompt] = useState("");
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [showProductActorPicker, setShowProductActorPicker] = useState(false);

  // The home page's "Unboxing" pill -- restyles only the background/
  // surface behind a real product photo, no curated surface-photo
  // library, just quick-pick text presets that fill unboxingScene.
  const [unboxingPanel, setUnboxingPanel] = useState<"closed" | "generating">("closed");
  const [unboxingFile, setUnboxingFile] = useState<File | null>(null);
  const [unboxingScene, setUnboxingScene] = useState("");
  const [unboxingImage, setUnboxingImage] = useState<string | null>(null);
  const [unboxingError, setUnboxingError] = useState<string | null>(null);

  // The home page's "Show Your App" pill -- attach an app screenshot to
  // an actor (reusing the same videoRefImage actor state Product mode
  // uses) and the actor is shown holding a phone displaying it. Matches
  // Arcads' own real "Show Your App" feature (confirmed via frame-by-
  // frame video review): no free-text prompt field, just an upload + an
  // actor + Generate.
  const [showAppPanel, setShowAppPanel] = useState<"closed" | "generating">("closed");
  const [showAppFile, setShowAppFile] = useState<File | null>(null);
  const [showAppImage, setShowAppImage] = useState<string | null>(null);
  const [showAppError, setShowAppError] = useState<string | null>(null);
  const [showAppActorPicker, setShowAppActorPicker] = useState(false);

  // The home page's "Upscale" pill -- one upload slot, auto-detects
  // image vs video by file type. Image side is fast/synchronous
  // (flat 1 credit); video side is a genuinely slow async job (Topaz
  // Labs, a real run took ~7 minutes) needing a Standard/Premium tier
  // pick + poll, same shape as Cinematic UGC.
  const [upscalePanel, setUpscalePanel] = useState<"closed" | "generating">("closed");
  const [upscaleFile, setUpscaleFile] = useState<File | null>(null);
  const [upscaleTier, setUpscaleTier] = useState<AvatarTier>("standard");
  const [upscaleResultImage, setUpscaleResultImage] = useState<string | null>(null);
  const [upscaleResultVideo, setUpscaleResultVideo] = useState<string | null>(null);
  const [upscaleError, setUpscaleError] = useState<string | null>(null);
  const upscalePollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Talking Actors mode — reuses Punqle Actors v2 wholesale: same catalog,
  // same readiness gating, same generate/poll endpoints AdVideoForm.tsx's
  // own actor picker already calls (main.py:5364/5436, unchanged). This is
  // the real fix for the gap the founder named (no actor catalog existed
  // on the home page at all before this).
  const [actors, setActors] = useState<ApiImageActor[]>([]);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [actorSituations, setActorSituations] = useState<Record<string, string>>({});
  // Talking Actors only lists actors that already have a real base clip; until this is true we
  // don't know which those are, so the grid waits instead of flashing not-ready faces.
  const [situationsLoaded, setSituationsLoaded] = useState(false);
  const [actorGenderFilter, setActorGenderFilter] = useState<"all" | "female" | "male">("all");
  // Collapsed by default (first 4 + a "More" tile) so the compose area
  // (narration/voice/Generate) is visible without scrolling — matches
  // Arcads' own compact bar. Resets whenever the gender filter changes
  // so every filter starts compact.
  const [showAllActors, setShowAllActors] = useState(false);
  // Collapsed by default (2026-10-01, founder's call) — the full
  // actor grid used to be permanently open, pushing the narration box
  // below the fold even after an actor was already picked. Now it's a
  // click-to-expand panel; picking an actor (or canceling) collapses
  // it back to a compact summary row.
  const [actorPickerOpen, setActorPickerOpen] = useState(false);
  const [actorPreviewVideos, setActorPreviewVideos] = useState<Record<string, string>>({});
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [actorNarration, setActorNarration] = useState("");
  const [actorVoiceEngine, setActorVoiceEngine] = useState<ActorVoiceEngine>("elevenlabs");
  const [actorPanel, setActorPanel] = useState<"compose" | "generating" | "result">("compose");
  const [actorError, setActorError] = useState<string | null>(null);
  const [actorVideoBase64, setActorVideoBase64] = useState<string | null>(null);
  const actorPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Create Your Own Actor" — deliberately not HeyGen (see api.ts's
  // createCustomActor comment): just a saved photo + name + gender,
  // animated via OmniHuman at video-generation time. selectedActorId
  // (built-in) and selectedCustomActorId are mutually exclusive.
  const [customActors, setCustomActors] = useState<ApiCustomActor[]>([]);
  const [customActorsLoading, setCustomActorsLoading] = useState(false);
  const [selectedCustomActorId, setSelectedCustomActorId] = useState<string | null>(null);
  const [showCreateActor, setShowCreateActor] = useState(false);
  const [createActorSource, setCreateActorSource] = useState<"choose" | "upload" | "generate">("choose");
  const [createActorName, setCreateActorName] = useState("");
  const [createActorGender, setCreateActorGender] = useState<"female" | "male">("female");
  const [createActorPhoto, setCreateActorPhoto] = useState<{ base64: string; mimeType: string } | null>(null);
  const [createActorConsent, setCreateActorConsent] = useState(false);
  const [createActorPrompt, setCreateActorPrompt] = useState("");
  const [createActorGenerating, setCreateActorGenerating] = useState(false);
  const [createActorSaving, setCreateActorSaving] = useState(false);
  const [createActorError, setCreateActorError] = useState<string | null>(null);
  // Iterative creation (Arcads-style): "Generate with AI" first shows 3
  // candidate photos to pick from, then the picked one can be refined
  // in place via free-text follow-up instructions before saving.
  const [createActorCandidates, setCreateActorCandidates] = useState<{ base64: string; mimeType: string }[]>([]);
  const [createActorRefinePrompt, setCreateActorRefinePrompt] = useState("");
  const [createActorRefining, setCreateActorRefining] = useState(false);
  const [editingCustomActorId, setEditingCustomActorId] = useState<string | null>(null);
  const [editingCustomActorName, setEditingCustomActorName] = useState("");
  // ElevenLabs-only controls (no OpenAI equivalent) — same defaults as
  // AdVideoForm.tsx's own sliders (Arcads-sourced, already validated).
  // "Add emotions" runs a small AI pass on narration right before
  // Generate to insert 2-3 tags automatically, instead of the manual
  // per-word buttons AdVideoForm.tsx offers on its own review step.
  const [elevenlabsStability, setElevenlabsStability] = useState(0.5);
  const [elevenlabsSimilarity, setElevenlabsSimilarity] = useState(0.75);
  const [elevenlabsStyle, setElevenlabsStyle] = useState(0.5);
  const [elevenlabsSpeed, setElevenlabsSpeed] = useState(1.0);
  const [addEmotions, setAddEmotions] = useState(false);
  const [taggingEmotions, setTaggingEmotions] = useState(false);

  useEffect(() => {
    fetchAdCredits()
      .then((c) => setCredits(c.credits))
      .catch((err) => setCreditsError(err instanceof Error ? err.message : "Couldn't load your credits."));
  }, []);

  // This account's guaranteed-once-free tries (main.py's
  // FEATURE_TRIAL_KEYS), for the home bar's "Try free" labels.
  // Silently ignored on failure — buttons just show their normal state.
  const [featureTrials, setFeatureTrials] = useState<ApiFeatureTrials | null>(null);
  useEffect(() => {
    fetchFeatureTrials()
      .then(setFeatureTrials)
      .catch(() => {});
  }, []);
  // Drives the hero's "try every core tool free" banner — null while
  // loading (banner stays hidden), 0 once every trial's been claimed
  // (banner disappears, no point advertising something used up).

  useEffect(() => {
    return () => {
      if (videoPollRef.current) clearTimeout(videoPollRef.current);
      if (actorPollRef.current) clearTimeout(actorPollRef.current);
      if (upscalePollRef.current) clearTimeout(upscalePollRef.current);
    };
  }, []);

  // Same free, already-live GET /ads/image-actors + /ads/actor-situations
  // AdVideoForm.tsx's own picker already calls — loads once, on first
  // visit to Talking Actors mode (this is the default mode, so in
  // practice on page load). Also loads on first visit to Product mode,
  // which reuses this same actor catalog as a "pick an actor" option
  // (matches Arcads' own "Presets" picker on their Product tab).
  useEffect(() => {
    // Only on the Home tab (2026-11-10): opening Ads/Social/etc. straight from a link used to pull the
    // whole actor catalog (~480 KB) that those screens never show.
    if (tab !== "home") return;
    if (homeMode !== "talking_actors" && homeMode !== "product" && homeMode !== "video") return;
    if (actors.length === 0 && !actorsLoading) {
      setActorsLoading(true);
      fetchImageActors()
        .then((r) => setActors(r.actors))
        .catch(() => {})
        .finally(() => setActorsLoading(false));
    }
    if (Object.keys(actorSituations).length === 0) {
      fetchActorSituations()
        .then((r) => {
          const map: Record<string, string> = {};
          for (const s of r.situations) map[s.actor_id] = s.situation_id;
          setActorSituations(map);
        })
        .catch(() => {})
        .finally(() => setSituationsLoaded(true));
    }
    if (customActors.length === 0 && !customActorsLoading) {
      setCustomActorsLoading(true);
      fetchMyCustomActors()
        .then((r) => setCustomActors(r.actors))
        .catch(() => {})
        .finally(() => setCustomActorsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeMode, tab]);

  const goTo = (t: Tab) => navigate({ to: "/", search: { tab: t } });

  const handleCreateActorPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (!match) return;
      setCreateActorPhoto({ mimeType: match[1], base64: match[2] });
    };
    reader.readAsDataURL(file);
  };

  // Generates 3 candidates from the same prompt (matches Arcads' own
  // real "pick one of 3" flow) — sequential, not Promise.all, so a
  // mid-batch failure still leaves whatever already succeeded visible
  // rather than losing everything to one rejected call.
  const handleGenerateActorPhoto = async () => {
    if (!createActorPrompt.trim() || createActorGenerating) return;
    setCreateActorError(null);
    setCreateActorGenerating(true);
    setCreateActorCandidates([]);
    try {
      for (let i = 0; i < 3; i++) {
        const r = await generateImageDirect(createActorPrompt.trim(), "square", "nano_banana_pro", true);
        setCreateActorCandidates((prev) => [...prev, { base64: r.banner_image_base64, mimeType: "image/png" }]);
        setCredits(r.credits_remaining);
      }
    } catch (err) {
      setCreateActorError(err instanceof Error ? err.message : "Couldn't generate those photos.");
    } finally {
      setCreateActorGenerating(false);
    }
  };

  const handlePickActorCandidate = (photo: { base64: string; mimeType: string }) => {
    setCreateActorPhoto(photo);
    setCreateActorCandidates([]);
  };

  const handleRefineActorPhoto = async () => {
    if (!createActorPhoto || !createActorRefinePrompt.trim() || createActorRefining) return;
    setCreateActorError(null);
    setCreateActorRefining(true);
    try {
      const r = await refineActorPhoto(createActorPhoto.base64, createActorPhoto.mimeType, createActorRefinePrompt.trim());
      setCreateActorPhoto({ base64: r.banner_image_base64, mimeType: "image/png" });
      setCredits(r.credits_remaining);
      setCreateActorRefinePrompt("");
    } catch (err) {
      setCreateActorError(err instanceof Error ? err.message : "Couldn't make that change.");
    } finally {
      setCreateActorRefining(false);
    }
  };

  const handleResetCreateActor = () => {
    setShowCreateActor(false);
    setCreateActorSource("choose");
    setCreateActorName("");
    setCreateActorGender("female");
    setCreateActorPhoto(null);
    setCreateActorConsent(false);
    setCreateActorPrompt("");
    setCreateActorError(null);
    setCreateActorCandidates([]);
    setCreateActorRefinePrompt("");
  };

  const handleSaveCustomActor = async () => {
    if (!createActorPhoto || !createActorName.trim() || createActorSaving) return;
    if (createActorSource === "upload" && !createActorConsent) return;
    setCreateActorError(null);
    setCreateActorSaving(true);
    try {
      const saved = await createCustomActor(
        createActorName.trim(),
        createActorGender,
        createActorPhoto.base64,
        createActorPhoto.mimeType,
      );
      setCustomActors((prev) => [saved, ...prev]);
      setSelectedCustomActorId(saved.id);
      setSelectedActorId(null);
      handleResetCreateActor();
    } catch (err) {
      setCreateActorError(err instanceof Error ? err.message : "Couldn't save that actor.");
    } finally {
      setCreateActorSaving(false);
    }
  };

  // One-click "turn this generated image into a reusable actor" — matches
  // Arcads' own result-screen "Actor" button. Skips straight to the
  // name/gender/save step of the existing create-actor flow since the
  // photo's already in hand; deliberately doesn't call handleResetHome
  // (or handleSwitchMode, which calls it) so the Image mode result stays
  // intact if the user cancels and switches back.
  const handleTurnImageIntoActor = () => {
    if (!homeGeneratedImage) return;
    setCreateActorPhoto({ base64: homeGeneratedImage, mimeType: "image/png" });
    setCreateActorSource("generate");
    setShowCreateActor(true);
    setHomeMode("talking_actors");
  };

  // Same idea, but from a finished Video mode result — there's no
  // single photo to hand off, so this grabs whatever frame is currently
  // showing in the <video> element via an offscreen canvas. Unlike the
  // image version, this is marked as "upload" source (requires the
  // consent checkbox) — a video's starting frame could have come from
  // either a synthetic generated photo OR a real photo the user
  // uploaded directly into Video mode, and there's no reliable way to
  // tell which from here, so this defaults to the safer, consent-required path.
  const handleTurnVideoFrameIntoActor = () => {
    const video = videoResultRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    if (!base64) return;
    setCreateActorPhoto({ base64, mimeType: "image/png" });
    setCreateActorSource("upload");
    setShowCreateActor(true);
    setHomeMode("talking_actors");
  };

  const handleStartRenameCustomActor = (a: ApiCustomActor) => {
    setEditingCustomActorId(a.id);
    setEditingCustomActorName(a.name);
  };

  const handleSaveRenameCustomActor = async () => {
    const id = editingCustomActorId;
    const name = editingCustomActorName.trim();
    if (!id || !name) {
      setEditingCustomActorId(null);
      return;
    }
    try {
      const updated = await renameCustomActor(id, name);
      setCustomActors((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      // Silently keeps the old name displayed — not worth a whole error
      // banner for a rename hiccup, the user can just try again.
    } finally {
      setEditingCustomActorId(null);
    }
  };

  const handleDeleteCustomActor = async (id: string) => {
    if (!window.confirm("Delete this actor? This can't be undone.")) return;
    try {
      await deleteCustomActor(id);
      setCustomActors((prev) => prev.filter((a) => a.id !== id));
      if (selectedCustomActorId === id) setSelectedCustomActorId(null);
    } catch {
      // Leaves the actor in place on failure — nothing to reconcile.
    }
  };

  const handleHomeGenerateImage = async () => {
    if (!homeIdea.trim() || homeImageGenerating) return;
    setHomeImageGenerating(true);
    setHomeImageError(null);
    setHomeImageVariants([]);
    try {
      const r = await generateImageDirect(homeIdea.trim(), homeImageAspectRatio, homeImageModel);
      setHomeGeneratedImage(r.banner_image_base64);
      setCredits(r.credits_remaining);
      for (let i = 1; i < homeImageVersions; i++) {
        const v = await generateImageDirect(homeIdea.trim(), homeImageAspectRatio, homeImageModel);
        setHomeImageVariants((prev) => [...prev, v.banner_image_base64]);
        setCredits(v.credits_remaining);
      }
    } catch (err) {
      setHomeImageError(err instanceof Error ? err.message : "Couldn't generate that image.");
    } finally {
      setHomeImageGenerating(false);
    }
  };

  const handleSelectImageVariant = (index: number) => {
    setHomeImageVariants((prev) => {
      const next = [...prev];
      const clicked = next[index];
      next[index] = homeGeneratedImage as string;
      setHomeGeneratedImage(clicked);
      return next;
    });
  };

  const handleResetHome = () => {
    setResultFromTaster(false);
    setHomeGeneratedImage(null);
    setHomeImageVariants([]);
    setHomeIdea("");
    setHomeImageAspectRatio("square");
    setVideoPanel("closed");
    setHomeGeneratedVideo(null);
    setVideoVariants([]);
    setVideoPrompt("");
    setVideoRefImage(null);
    setVideoError(null);
    setVideoNarrationEnabled(false);
    setVideoNarration("");
    setVideoVoiceGender("female");
    setProductPanel("closed");
    setProductPrompt("");
    setProductFile(null);
    setProductError(null);
    setShowProductActorPicker(false);
    setUnboxingPanel("closed");
    setUnboxingFile(null);
    setUnboxingScene("");
    setUnboxingImage(null);
    setUnboxingError(null);
    setShowAppPanel("closed");
    setShowAppFile(null);
    setShowAppImage(null);
    setShowAppError(null);
    setShowAppActorPicker(false);
    if (upscalePollRef.current) clearTimeout(upscalePollRef.current);
    setUpscalePanel("closed");
    setUpscaleFile(null);
    setUpscaleTier("standard");
    setUpscaleResultImage(null);
    setUpscaleResultVideo(null);
    setUpscaleError(null);
    setSelectedActorId(null);
    setSelectedCustomActorId(null);
    handleResetCreateActor();
    setActorNarration("");
    setActorPanel("compose");
    setActorError(null);
    setActorVideoBase64(null);
    setElevenlabsStability(0.5);
    setElevenlabsSimilarity(0.75);
    setElevenlabsStyle(0.5);
    setElevenlabsSpeed(1.0);
    setAddEmotions(false);
  };

  // Switching pills always lands on a clean compose view for that mode —
  // this (plus only ever rendering one mode's block) is what makes the
  // old double-render bug structurally impossible now.
  // True while the home bar is just waiting for input (nothing generating or showing
  // a result), so the example showcase above it is shown only then.
  const homeIdle =
    actorPanel === "compose" &&
    videoPanel === "closed" &&
    productPanel === "closed" &&
    upscalePanel === "closed" &&
    !homeImageGenerating &&
    !homeGeneratedImage &&
    !homeGeneratedVideo &&
    !upscaleResultImage &&
    !upscaleResultVideo;

  const handleSwitchMode = (mode: HomeMode) => {
    setShowMoreMenu(false);
    // Tapping the already-selected Ready Actors pill again toggles the actor picker
    // (open <-> closed) instead of resetting everything.
    if (mode === homeMode && mode === "talking_actors") {
      setActorPickerOpen((v) => !v);
      return;
    }
    handleResetHome();
    setHomeMode(mode);
    // Arriving on Ready Actors shows the actors straight away.
    if (mode === "talking_actors") setActorPickerOpen(true);
  };

  const handleOpenVideoComposer = () => {
    // videoRefImage already holds the right image if the user uploaded
    // their own (handleUploadOwnImageForVideo) or is reopening after a
    // finished video — only fall back to the AI-generated one here.
    if (!videoRefImage && homeGeneratedImage) {
      setVideoRefImage({ base64: homeGeneratedImage, mimeType: "image/png" });
    } else if (!videoRefImage) {
      return;
    }
    setVideoPrompt("");
    setVideoLines("");
    setVideoModel("omni");
    setVideoAspectRatio("1:1");
    setVideoDuration(8);
    setVideoError(null);
    setVideoNarrationEnabled(false);
    setVideoNarration("");
    setVideoVoiceGender("female");
    setVideoPanel("composer");
  };

  // "Try an example": loads one of our own ready-made product photos and its words into the Video composer, exactly as if the
  // person had uploaded that photo and typed those words. Costs nothing; the free comparison (if still available) comes next.
  const handlePickExample = async (ex: StarterExample) => {
    if (exampleLoading) return;
    setExampleLoading(ex.id);
    setVideoError(null);
    try {
      const res = await fetch(ex.photo);
      if (!res.ok) throw new Error("not found");
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(blob);
      });
      const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
      if (!match) throw new Error("bad photo");
      startVideoFromImage(match[2], match[1], "9:16");
      setVideoPrompt(ex.prompt); // after startVideoFromImage, which clears the words
    } catch {
      setVideoError("Couldn't load this example. Please try again.");
    } finally {
      setExampleLoading(null);
    }
  };

  const handleReplaceVideoImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (!match) return;
      setVideoRefImage({ mimeType: match[1], base64: match[2] });
    };
    reader.readAsDataURL(file);
  };

  // Skips AI image generation entirely — pick your own photo from your
  // computer and go straight to the Video composer with it as the
  // reference. No credits spent until an actual video is generated.
  const startVideoFromImage = (base64: string, mimeType: string, aspect: VideoAspectRatio) => {
    setVideoRefImage({ mimeType, base64 });
    setVideoPrompt("");
    setVideoLines("");
    setVideoCompare(false);
    setVideoModel("omni");
    setVideoAspectRatio(aspect);
    setVideoDuration(8);
    setVideoError(null);
    setVideoPanel("composer");
  };

  const handleUploadOwnImageForVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (!match) return;
      startVideoFromImage(match[2], match[1], "1:1");
    };
    reader.readAsDataURL(file);
  };

  // One of Punqle's own AI actors as the first frame — fully synthetic people, free to use in any ad.
  const handlePickActorForVideo = (previewImageBase64: string) => startVideoFromImage(previewImageBase64, "image/jpeg", "9:16");

  const handleVideoModelChange = (m: ImageVideoModel) => {
    // Switching tool keeps the same slot (Short / Medium / Long) rather than a number of seconds.
    const slot = Math.max(0, VIDEO_LENGTH_CHIPS[videoModel].findIndex((c) => c.seconds === videoDuration));
    const chips = lengthChipsFor(m, videoNarrationEnabled);
    setVideoCompare(false);
    setVideoModel(m);
    setVideoDuration((chips[Math.min(slot, chips.length - 1)] ?? chips[0]).seconds);
  };
  const compareCostFor = (seconds: number) => COMPARE_MODELS.reduce((sum, m) => sum + videoCostFor(m, seconds, false), 0);
  const handlePickCompare = () => {
    setVideoCompare(true);
    setVideoNarrationEnabled(false);
    if (!COMPARE_CHIPS.some((c) => c.seconds === videoDuration)) setVideoDuration(COMPARE_CHIPS[0].seconds);
  };
  const handleGenerateCompare = async () => {
    if (!videoRefImage || !videoPrompt.trim()) return;
    const cost = compareCostFor(videoDuration);
    if (credits !== null && credits < cost) {
      setVideoError(`Comparing needs ${cost} credits — you have ${credits}.`);
      return;
    }
    setVideoError(null);
    setCompareJobs(null);
    setCompareStarting(true);
    setVideoPanel("compare");
    const jobs = await startCompareJobs({ image: videoRefImage, prompt: videoFullPrompt, seconds: videoDuration, aspect: videoAspectRatio, enhance: videoEnhance });
    setCompareJobs(jobs);
    setCompareStarting(false);
  };
  const handleStartFreeTaster = async () => {
    if (!videoRefImage || !videoPrompt.trim()) return;
    setVideoError(null);
    setCompareJobs(null);
    setCompareStarting(true);
    setTasterMode(true);
    setVideoPanel("compare");
    try {
      const r = await startFreeTaster(videoRefImage.base64, videoRefImage.mimeType, videoFullPrompt);
      setCompareJobs(r.jobs.map((j) => ({ model: j.model, jobId: j.job_id, error: j.error })));
      setTasterAvailable(false);
    } catch (e) {
      setTasterMode(false);
      setVideoPanel("composer");
      setVideoError(e instanceof Error ? e.message : "Couldn't start the free comparison.");
      refreshTasterStatus();
    } finally {
      setCompareStarting(false);
    }
  };
  const videoChips = videoCompare ? COMPARE_CHIPS : lengthChipsFor(videoModel, videoNarrationEnabled);
  // Over 10 s a video costs real money and takes ~5 minutes, so it is always a single version.
  const effectiveVideoVersions = videoDuration > 10 ? 1 : videoVersions;
  // The spoken lines go into the prompt in quotes, which is how every tool is told what to say.
  const videoLinesClean = videoLines.trim().replace(/"/g, "'");
  const videoFullPrompt = videoPrompt.trim() + (videoLinesClean ? ` The person says: "${videoLinesClean}"` : "");

  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductFile(e.target.files?.[0] || null);
  };

  const handleUploadProductActor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (!match) return;
      setVideoRefImage({ mimeType: match[1], base64: match[2] });
    };
    reader.readAsDataURL(file);
  };

  // Matches Arcads' own "Presets" picker on their Product tab (a stock
  // actor gallery you pick a model photo from, confirmed frame-by-frame
  // from a real recording) -- reuses the exact same actor catalog
  // Talking Actors mode already fetches, built-in actors' photos are
  // always JPEG (see assets/actors/*.jpg).
  const handlePickProductActor = (base64: string, mimeType: string) => {
    setVideoRefImage({ base64, mimeType });
    setShowProductActorPicker(false);
  };

  const handleGenerateProduct = async () => {
    const actorBase64 = videoRefImage?.base64 || homeGeneratedImage;
    if (!actorBase64 || !productFile || !productPrompt.trim()) return;
    const actorMimeType = videoRefImage?.mimeType || "image/png";
    const narration = productPrompt.trim();
    setProductError(null);
    setProductPanel("generating");
    try {
      const combined = await combineActorAndProduct(actorBase64, productFile, narration, homeImageAspectRatio, actorMimeType);
      setHomeGeneratedImage(combined.banner_image_base64);
      setCredits(combined.credits_remaining);
      setProductPanel("closed");

      // Straight into a finished talking video — matches Arcads' own
      // real "Product" tab exactly: photo + description + Generate =
      // one finished talking demo video, no separate review step (the
      // description typed here doubles as the spoken narration, same
      // as their own real example: "Strong, durable bottle that can be
      // used everyday." became the actor's actual spoken line). The
      // video step only has 16:9/9:16/1:1 to pick from (no 4:5 "feed"
      // equivalent) — square stays square, feed/story both map to the
      // closer tall 9:16 shape.
      const productVideoAspectRatio = homeImageAspectRatio === "square" ? "1:1" : "9:16";
      setVideoRefImage({ base64: combined.banner_image_base64, mimeType: "image/png" });
      setVideoNarrationEnabled(true);
      setVideoNarration(narration);
      setVideoVoiceGender("female");
      setVideoModel("omni");
      setVideoAspectRatio(productVideoAspectRatio);
      setVideoDuration(8);
      setVideoError(null);
      setVideoStage("animating");
      setVideoPanel("generating");
      const started = await generateTalkingVideo(
        combined.banner_image_base64,
        "image/png",
        narration,
        "female",
        "omni",
        8,
        productVideoAspectRatio,
      );
      videoPollRef.current = setTimeout(() => pollTalkingVideo(started.job_id, started.operation), 8000);
    } catch (err) {
      // The failure could happen before or after setVideoPanel("generating")
      // was called (combine succeeds, then the talking-video call itself
      // fails) — always clear it too, or the composer and a stuck
      // "Animating your video…" panel would show at the same time.
      setProductError(err instanceof Error ? err.message : "Couldn't create that video.");
      setProductPanel("composer");
      setVideoPanel("closed");
    }
  };

  const handleUploadUnboxingProduct = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnboxingFile(e.target.files?.[0] || null);
  };

  // Surface cards fill the scene text. Picking one replaces a previously
  // picked card (they're alternatives, not stackable), but never wipes
  // text the user typed themselves — that gets the phrase appended.
  // Picking the already-picked card again clears it.
  const handlePickUnboxingSurface = (phrase: string) => {
    setUnboxingScene((prev) => {
      const text = prev.trim();
      if (text === phrase) return "";
      if (!text || UNBOXING_SURFACES.some((s) => s.phrase === text)) return phrase;
      if (text.includes(phrase)) return text;
      return `${text}, ${phrase}`;
    });
  };

  const handleGenerateUnboxing = async () => {
    if (!unboxingFile || !unboxingScene.trim()) return;
    setUnboxingError(null);
    setUnboxingPanel("generating");
    try {
      const r = await generateUnboxingShot(unboxingFile, unboxingScene.trim(), homeImageAspectRatio);
      setUnboxingImage(r.banner_image_base64);
      setCredits(r.credits_remaining);
      setUnboxingPanel("closed");
    } catch (err) {
      setUnboxingError(err instanceof Error ? err.message : "Couldn't create that shot.");
      setUnboxingPanel("closed");
    }
  };

  const handleUploadShowAppScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowAppFile(e.target.files?.[0] || null);
  };

  // Reuses the exact same actor sources Product mode already offers
  // (upload own photo, or pick from the built-in/custom catalog) --
  // stored in the same videoRefImage state, since only one mode is ever
  // mounted at a time.
  const handleUploadShowAppActor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (!match) return;
      setVideoRefImage({ mimeType: match[1], base64: match[2] });
    };
    reader.readAsDataURL(file);
  };

  const handlePickShowAppActor = (base64: string, mimeType: string) => {
    setVideoRefImage({ base64, mimeType });
    setShowAppActorPicker(false);
  };

  const handleGenerateShowApp = async () => {
    const actorBase64 = videoRefImage?.base64 || homeGeneratedImage;
    if (!actorBase64 || !showAppFile) return;
    const actorMimeType = videoRefImage?.mimeType || "image/png";
    setShowAppError(null);
    setShowAppPanel("generating");
    try {
      const r = await combineActorAndAppScreenshot(actorBase64, showAppFile, homeImageAspectRatio, actorMimeType);
      setShowAppImage(r.banner_image_base64);
      setCredits(r.credits_remaining);
      setShowAppPanel("closed");
    } catch (err) {
      setShowAppError(err instanceof Error ? err.message : "Couldn't create that shot.");
      setShowAppPanel("closed");
    }
  };

  const handleUploadUpscaleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpscaleFile(e.target.files?.[0] || null);
    setUpscaleResultImage(null);
    setUpscaleResultVideo(null);
    setUpscaleError(null);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const match = result.match(/^data:(.*?);base64,(.*)$/);
        if (!match) {
          reject(new Error("Couldn't read that file."));
          return;
        }
        resolve(match[2]);
      };
      reader.onerror = () => reject(new Error("Couldn't read that file."));
      reader.readAsDataURL(file);
    });

  const pollVideoUpscale = async (predictionId: string) => {
    try {
      const r = await checkVideoUpscaleStatus(predictionId);
      if (!r.done) {
        upscalePollRef.current = setTimeout(() => pollVideoUpscale(predictionId), 8000);
        return;
      }
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.video_base64) {
        setUpscaleResultVideo(r.video_base64);
        setUpscalePanel("closed");
      } else {
        setUpscaleError("Couldn't upscale that video — please try again.");
        setUpscalePanel("closed");
      }
    } catch (err) {
      setUpscaleError(err instanceof Error ? err.message : "Couldn't check the upscale's status.");
      setUpscalePanel("closed");
    }
  };

  const handleGenerateUpscale = async () => {
    if (!upscaleFile) return;
    setUpscaleError(null);
    setUpscalePanel("generating");
    try {
      if (upscaleFile.type.startsWith("video/")) {
        const base64 = await fileToBase64(upscaleFile);
        const started = await startVideoUpscale(base64, upscaleTier);
        upscalePollRef.current = setTimeout(() => pollVideoUpscale(started.prediction_id), 8000);
      } else {
        const r = await upscaleImage(upscaleFile);
        setUpscaleResultImage(r.banner_image_base64);
        setCredits(r.credits_remaining);
        setUpscalePanel("closed");
      }
    } catch (err) {
      setUpscaleError(err instanceof Error ? err.message : "Couldn't upscale that.");
      setUpscalePanel("closed");
    }
  };

  // versionIndex/totalVersions default to 1/1 so every existing call
  // site (Product mode's own animate step, and Video mode's own default
  // of 1 version) behaves byte-identical to before -- only Video mode's
  // multi-version path ever passes anything else.
  const pollImageVideo = async (
    jobId: string,
    operation: ApiVideoOperation | null,
    versionIndex: number = 1,
    totalVersions: number = 1,
    errorsInARow: number = 0,
  ) => {
    try {
      const r = await checkImageVideoStatus(jobId, operation);
      if (!r.done) {
        videoPollRef.current = setTimeout(() => pollImageVideo(jobId, operation, versionIndex, totalVersions), 8000);
        return;
      }
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.video_base64) {
        if (versionIndex === 1) {
          setHomeGeneratedVideo(r.video_base64);
        } else {
          setVideoVariants((prev) => [...prev, r.video_base64 as string]);
        }
        if (versionIndex < totalVersions) {
          startVideoVersion(versionIndex + 1, totalVersions);
        } else {
          setVideoPanel("result");
        }
      } else {
        setVideoError(r.message || "The video didn't come back — please try again.");
        setVideoPanel("composer");
      }
    } catch (err) {
      if (errorsInARow < 3) {
        videoPollRef.current = setTimeout(() => pollImageVideo(jobId, operation, versionIndex, totalVersions, errorsInARow + 1), 8000);
        return;
      }
      setVideoError(err instanceof Error ? err.message : "Couldn't check the video's status.");
      setVideoPanel("composer");
    }
  };

  const pollTalkingVideo = async (
    jobId: string,
    operation: ApiVideoOperation | null,
    versionIndex: number = 1,
    totalVersions: number = 1,
  ) => {
    try {
      const r = await checkTalkingVideoStatus(jobId, operation);
      setVideoStage(r.stage);
      if (!r.done) {
        videoPollRef.current = setTimeout(() => pollTalkingVideo(jobId, operation, versionIndex, totalVersions), 8000);
        return;
      }
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.video_base64) {
        if (versionIndex === 1) {
          setHomeGeneratedVideo(r.video_base64);
        } else {
          setVideoVariants((prev) => [...prev, r.video_base64 as string]);
        }
        if (versionIndex < totalVersions) {
          startVideoVersion(versionIndex + 1, totalVersions);
        } else {
          setVideoPanel("result");
        }
      } else {
        setVideoError("The video didn't come back — please try again.");
        setVideoPanel("composer");
      }
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Couldn't check the video's status.");
      setVideoPanel("composer");
    }
  };

  // Extracted from handleGenerateVideo so a multi-version request can
  // call this again for version 2/3 once the previous one's poll
  // reports done -- same start-then-poll shape as before, just callable
  // more than once in a row.
  const startVideoVersion = async (versionIndex: number, totalVersions: number, secondsOverride?: number, enhanceOverride?: boolean, modelOverride?: ImageVideoModel) => {
    if (!videoRefImage) return;
    try {
      if (videoNarrationEnabled) {
        setVideoStage("animating");
        const r = await generateTalkingVideo(
          videoRefImage.base64,
          videoRefImage.mimeType,
          videoNarration.trim(),
          videoVoiceGender,
          videoModel,
          videoDuration,
          videoAspectRatio,
        );
        videoPollRef.current = setTimeout(() => pollTalkingVideo(r.job_id, r.operation, versionIndex, totalVersions), 8000);
        return;
      }
      const r = await generateImageVideo(
        videoRefImage.base64,
        videoRefImage.mimeType,
        videoFullPrompt,
        modelOverride ?? videoModel,
        secondsOverride ?? videoDuration,
        videoAspectRatio,
        enhanceOverride ?? videoEnhance,
      );
      videoPollRef.current = setTimeout(() => pollImageVideo(r.job_id, r.operation, versionIndex, totalVersions), 8000);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Couldn't start the video.");
      setVideoPanel("composer");
    }
  };

  const handleGenerateVideo = async (secondsOverride?: number, enhanceOverride?: boolean, modelOverride?: ImageVideoModel) => {
    if (typeof secondsOverride !== "number") secondsOverride = undefined;
    if (!videoRefImage) return;
    if (videoNarrationEnabled ? !videoNarration.trim() : !videoPrompt.trim()) return;
    setVideoError(null);
    setVideoVariants([]);
    setResultFromTaster(false);
    setTasterResultJobId(null);
    setVideoPanel("generating");
    await startVideoVersion(1, secondsOverride ? 1 : effectiveVideoVersions, secondsOverride, enhanceOverride, modelOverride);
  };

  // After the free comparison: make the pick again at 1080p (no watermark), 4 s, for credits. A new account's
  // free credits fall short, so then it opens the credit packs instead of failing with a 402. Seedance's 1080p is its own engine.
  const handleUpgradeTasterVideo = (model: ImageVideoModel) => {
    const upgradeModel = tasterUpgradeModel(model);
    const cost = videoCostFor(upgradeModel, TASTER_UPGRADE_SECONDS, false);
    if (credits !== null && credits < cost) {
      window.dispatchEvent(new Event("punqle:open-billing"));
      return;
    }
    setTasterActionError(null);
    setCompareJobs(null);
    setTasterMode(false);
    setVideoModel(upgradeModel);
    setVideoDuration(TASTER_UPGRADE_SECONDS);
    // The free comparison is always made with the Punqle Enhancer, so the remake uses it too (else it would look
    // different from the video they just picked).
    void handleGenerateVideo(TASTER_UPGRADE_SECONDS, true, upgradeModel);
  };

  // Free result -> the SAME video (720p) without the watermark, for TASTER_UNLOCK_CREDITS. Returns a message when it didn't work.
  const handleUnlockTasterVideo = async (jobId: string | null, model: ImageVideoModel): Promise<string | null> => {
    if (!jobId) return "This video can't be unlocked any more.";
    if (credits !== null && credits < TASTER_UNLOCK_CREDITS) {
      window.dispatchEvent(new Event("punqle:open-billing"));
      return `You need ${TASTER_UNLOCK_CREDITS} credits for this.`;
    }
    try {
      const r = await unlockTasterVideo(jobId);
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      setTasterActionError(null);
      setResultFromTaster(false);
      setTasterResultJobId(null);
      setHomeGeneratedVideo(r.video_base64);
      setVideoModel(model);
      setVideoVariants([]);
      setCompareJobs(null);
      setTasterMode(false);
      setVideoPanel("result");
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Couldn't unlock this video.";
    }
  };

  const handleSelectVideoVariant = (index: number) => {
    setVideoVariants((prev) => {
      const next = [...prev];
      const clicked = next[index];
      next[index] = homeGeneratedVideo as string;
      setHomeGeneratedVideo(clicked);
      return next;
    });
  };

  // Built-in actors go through Punqle Actors v2 (Veo + Sync Labs
  // redub); custom actors go through OmniHuman (photo + audio, no
  // pre-baked base clip) — different vendors, different status
  // endpoints, same response shape, so one poll loop covers both.
  const pollActorVideo = async (predictionId: string, pipeline: "v2" | "omnihuman") => {
    try {
      const r = pipeline === "omnihuman" ? await checkAiActorVideoStatus(predictionId) : await checkActorVideoV2Status(predictionId);
      if (!r.done) {
        actorPollRef.current = setTimeout(() => pollActorVideo(predictionId, pipeline), 8000);
        return;
      }
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.video_base64) {
        setActorVideoBase64(r.video_base64);
        setActorPanel("result");
      } else {
        setActorError("The actor video didn't come back — please try again.");
        setActorPanel("compose");
      }
    } catch (err) {
      setActorError(err instanceof Error ? err.message : "Couldn't check the video's status.");
      setActorPanel("compose");
    }
  };

  // Same endpoint AdVideoForm.tsx's "Punqle Actors" style already calls
  // (main.py:5364) — the user's own textarea text goes straight in as
  // narration, no script-angle pre-step (that's Ad-Creation-specific).
  // Custom actors skip the voice-engine/ElevenLabs controls entirely —
  // they always use the gender-matched ElevenLabs voice, no engine choice.
  const actorVideoCost = selectedCustomActorId ? customActorVideoCost(actorNarration) : readyActorVideoCost(actorNarration);
  const actorNarrationMax = selectedCustomActorId ? CUSTOM_ACTOR_MAX_CHARS : READY_ACTOR_MAX_CHARS;
  const handleGenerateActorVideo = async () => {
    if ((!selectedActorId && !selectedCustomActorId) || !actorNarration.trim()) return;
    if (spokenLength(actorNarration) > actorNarrationMax) return;
    if (credits !== null && credits < actorVideoCost) return;
    setActorError(null);
    let narration = actorNarration.trim();
    if (selectedActorId && actorVoiceEngine === "elevenlabs" && addEmotions) {
      setTaggingEmotions(true);
      try {
        const tagged = await addEmotionTags(narration);
        narration = tagged.narration || narration;
      } catch {
        // Falls back to the plain narration — an emotion-tagging hiccup
        // shouldn't block generation entirely.
      } finally {
        setTaggingEmotions(false);
      }
    }
    setActorPanel("generating");
    try {
      if (selectedCustomActorId) {
        const r = await startAiActorVideoGeneration(narration, { customActorId: selectedCustomActorId, language: "english" });
        actorPollRef.current = setTimeout(() => pollActorVideo(r.prediction_id, "omnihuman"), 8000);
        return;
      }
      const elevenlabsSettings =
        actorVoiceEngine === "elevenlabs"
          ? { stability: elevenlabsStability, similarity_boost: elevenlabsSimilarity, style: elevenlabsStyle, speed: elevenlabsSpeed }
          : undefined;
      const r = await startActorVideoV2(selectedActorId!, narration, actorVoiceEngine, elevenlabsSettings);
      actorPollRef.current = setTimeout(() => pollActorVideo(r.prediction_id, "v2"), 8000);
    } catch (err) {
      setActorError(err instanceof Error ? err.message : "Couldn't start the actor video.");
      setActorPanel("compose");
    }
  };

  return (
    <main className="flex flex-1 flex-col px-6 py-6">
      <div className="mb-5 flex justify-end">
        <div
          className="flex items-center gap-2 rounded-full border border-white/70 py-1.5 pl-3 pr-4 backdrop-blur-md"
          style={{ background: "oklch(1 0 0 / 55%)", boxShadow: "var(--shadow-card)" }}
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="font-display text-sm text-foreground">{credits === null ? "..." : credits}</span>
          <span className="text-xs text-muted-foreground">credits</span>
        </div>
      </div>
      {creditsError && <p className="mb-4 text-sm text-destructive">{creditsError}</p>}

      {/* New Arcads-inspired front door (2026-09-10) — every pill and the
          prompt box itself route to an existing, already-built flow below;
          nothing here is a new generation path. Carousel specifically has
          no pre-generation flow of its own (CarouselBuilder only ever runs
          post-generation inside PostKit's result screen) — it lands on
          the exact same Social Content flow the prompt box goes to, just
          with a carousel-flavored placeholder via entryHint. */}
      {/* Desktop only, per the approved plan — the mockups were never
          designed for mobile, and mobile's own pill-nav header (a
          separate, already-shipped redesign) already gives quick access
          to every destination. Mobile lands on the fallback block just
          below instead (same Social Content grid it's always shown). */}
      {tab === "home" && (
        <div className="hidden flex-1 lg:flex lg:flex-col">
          <div className="flex flex-col items-center pt-6 text-center">
            <h1 className="font-display mb-4 text-4xl leading-[1.05] tracking-[-0.02em] text-foreground xl:text-5xl">
              What are we creating today?
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">Pick a tool below, describe what you need, and Punqle makes it.</p>
          </div>

          <div className="flex flex-1 items-center justify-center py-9">
            {homeIdle && (
              <HomeShowcase
                cards={[
                  { key: "actors", title: "Ready Actors", blurb: "A real filmed actor says your words", meta: "from 30 credits", image: "/home/actors.jpg", icon: UserRound, onClick: () => handleSwitchMode("talking_actors") },
                  { key: "video", title: "Video", blurb: "Turn any photo into a short clip", meta: "from 15 credits", image: "/home/video.jpg", icon: Video, onClick: () => handleSwitchMode("video") },
                  { key: "image", title: "Image", blurb: "Studio ad images from a prompt", meta: "from 2 credits", image: "/home/image.jpg", icon: Sparkles, onClick: () => handleSwitchMode("image") },
                  { key: "product", title: "Product", blurb: "A person showing off your product", meta: "from 3 credits", image: "/home/product.jpg", icon: Package, onClick: () => handleSwitchMode("product") },
                ]}
              />
            )}
          </div>

          {/* Ad Creation moved into the left sidebar (2026-10-01, just
              above Plan & Publish) — see Sidebar.tsx. Was a banner here;
              removed rather than duplicated so there's one entry point,
              not two. */}

          {/* Unified creation bar (2026-09-17, Arcads parity) — one
              persistent bar, mode pills switch its content in place. Only
              one homeMode block ever renders below, which is what makes
              the old videoPanel/productPanel double-render bug
              structurally impossible now. Try-On/Carousel keep their
              exact original goTo() handlers, unchanged, tucked under "See
              more" instead of being permanent top-level pills. */}
          <div
            // No backdrop-blur here: a backdrop-filter on this track would make it the
            // containing block of the See-more menu's full-screen tap-outside backdrop
            // (`fixed inset-0`), so tapping outside stopped closing the menu.
            className="mx-auto mb-5 flex w-fit flex-wrap items-center justify-center gap-1 rounded-full border border-white/70 p-1.5"
            style={{ background: "oklch(1 0 0 / 72%)", boxShadow: "var(--shadow-card)" }}
          >
            <button
              onClick={() => handleSwitchMode("talking_actors")}
              className={[
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                homeMode === "talking_actors" ? "text-white" : "text-foreground hover:bg-white/60",
              ].join(" ")}
              style={homeMode === "talking_actors" ? { background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN } : undefined}
            >
              <UserRound className="h-4 w-4" />
              Ready Actors
            </button>
            <button
              onClick={() => handleSwitchMode("video")}
              className={[
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                homeMode === "video" ? "text-white" : "text-foreground hover:bg-white/60",
              ].join(" ")}
              style={homeMode === "video" ? { background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN } : undefined}
            >
              <Video className="h-4 w-4" />
              Video
            </button>
            <button
              onClick={() => handleSwitchMode("image")}
              className={[
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                homeMode === "image" ? "text-white" : "text-foreground hover:bg-white/60",
              ].join(" ")}
              style={homeMode === "image" ? { background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN } : undefined}
            >
              <Sparkles className="h-4 w-4" />
              Image
            </button>
            <button
              onClick={() => handleSwitchMode("product")}
              className={[
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                homeMode === "product" ? "text-white" : "text-foreground hover:bg-white/60",
              ].join(" ")}
              style={homeMode === "product" ? { background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN } : undefined}
            >
              <Package className="h-4 w-4" />
              Product
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-white/60"
              >
                <MoreHorizontal className="h-4 w-4" />
                See more
                <ChevronDown className={["h-3.5 w-3.5 transition-transform", showMoreMenu ? "rotate-180" : ""].join(" ")} />
              </button>
              {/* Opens upward (2026-10-01, founder's call) — this row sits
                  near the bottom of the bar, so a downward menu used to
                  overlap the actor/image/video panel right below it.
                  Icon chips use the same home-gradient as Ad Creation/Plan
                  & Publish (2026-10-01, founder's call) — safe to do here
                  specifically because this menu is tucked behind a click,
                  not a persistent pill competing with those two for
                  attention, unlike Insights (sidebar), which deliberately
                  stays off the gradient to keep it a two-item "hero" set. */}
              {showMoreMenu && (
                <>
                  {/* Full-screen tap-to-close backdrop — same pattern as
                      the mobile nav's own "More" menu (Sidebar.tsx) — a
                      real gap found live 2026-10-02: clicking outside
                      this dropdown previously did nothing at all. */}
                  <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                  <div
                    className="glass-strong absolute right-0 bottom-full z-40 mb-2 w-52 overflow-hidden rounded-2xl bg-card p-1.5"
                    style={{ background: "rgb(255 255 255 / 94%)", boxShadow: "0 16px 40px -12px rgba(0,0,0,0.22), var(--shadow-card)" }}
                  >
                  {[
                    { icon: PackageOpen, label: "Unboxing", onClick: () => handleSwitchMode("unboxing") },
                    { icon: Smartphone, label: "Show Your App", onClick: () => handleSwitchMode("show_app") },
                    { icon: ZoomIn, label: "Upscale", onClick: () => handleSwitchMode("upscale") },
                    { icon: Shirt, label: "Try-On", onClick: () => goTo("tryon") },
                    {
                      icon: Images,
                      label: "Carousel",
                      onClick: () => {
                        setEntryHint("carousel");
                        goTo("single");
                      },
                    },
                  ].map(({ icon: Icon, label, onClick }) => (
                    <button
                      key={label}
                      onClick={() => {
                        setShowMoreMenu(false);
                        onClick();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {label}
                    </button>
                  ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {homeMode === "image" && homeImageError && (
            <p className="mb-2 self-center text-xs font-medium text-destructive">{homeImageError}</p>
          )}

          <div
            className="mb-6 w-full self-center overflow-hidden rounded-3xl border border-border bg-card"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {/* ---------- Talking Actors mode ---------- */}
            {homeMode === "talking_actors" && (
              <>
                {actorPanel === "result" && actorVideoBase64 ? (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      controls
                      autoPlay
                      loop
                      className="max-h-[420px] w-full bg-[#1E1F24]"
                      src={`data:video/mp4;base64,${actorVideoBase64}`}
                    />
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {selectedCustomActorId
                          ? customActors.find((a) => a.id === selectedCustomActorId)?.name ?? "Your actor"
                          : actors.find((a) => a.id === selectedActorId)?.name ?? "Actor"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleGenerateActorVideo}
                          title="Generate again with the same actor and script"
                          className="flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Remix
                        </button>
                        <button
                          onClick={handleResetHome}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Create another
                        </button>
                      </div>
                    </div>
                  </>
                ) : showCreateActor ? (
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Create your own actor
                      </p>
                      <button onClick={handleResetCreateActor} className="text-xs font-semibold text-muted-foreground">
                        Cancel
                      </button>
                    </div>
                    {createActorError && <p className="mb-2 text-xs font-medium text-destructive">{createActorError}</p>}

                    {createActorSource === "choose" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setCreateActorSource("upload")}
                          className="flex flex-col items-center gap-2 rounded-xl border border-border px-4 py-6 text-center"
                        >
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">Upload a photo</span>
                        </button>
                        <button
                          onClick={() => setCreateActorSource("generate")}
                          className="flex flex-col items-center gap-2 rounded-xl border border-border px-4 py-6 text-center"
                        >
                          <Sparkles className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">Generate with AI</span>
                        </button>
                      </div>
                    )}

                    {createActorSource === "upload" && !createActorPhoto && (
                      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        <Upload className="h-5 w-5" />
                        Choose a photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleCreateActorPhotoUpload} />
                      </label>
                    )}

                    {createActorSource === "generate" && !createActorPhoto && createActorCandidates.length === 0 && (
                      <div className="space-y-3">
                        <textarea
                          value={createActorPrompt}
                          onChange={(e) => setCreateActorPrompt(e.target.value)}
                          placeholder="Describe your actor… (e.g. 30-year-old woman, friendly, casual, natural look)"
                          rows={2}
                          className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        {/* 2026-10-01 — a real generated photo once came back
                            with a second person in frame (a rickshaw driver,
                            from a "riding a rickshaw" description), and both
                            faces ended up speaking the narration in the final
                            video. The backend now constrains every generation
                            here to one person regardless of scene, but this
                            sets the right expectation upfront too. */}
                        <p className="text-[12px] text-muted-foreground">
                          One person only — if your description implies a setting with other people
                          (a driver, a crowd), we'll keep just your actor in frame.
                        </p>
                        <button
                          onClick={handleGenerateActorPhoto}
                          disabled={!createActorPrompt.trim() || createActorGenerating}
                          className="w-full rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                          style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                        >
                          {createActorGenerating ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Generate (9 credits)"}
                        </button>
                      </div>
                    )}

                    {/* Iterative creation, step 1: pick one of up to 3 candidates.
                        Shown mid-generation too (fills in as each of the 3 calls
                        resolves) rather than waiting for all 3 before showing any. */}
                    {createActorSource === "generate" && !createActorPhoto && createActorCandidates.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Choose your actor</p>
                        <div className="grid grid-cols-3 gap-2">
                          {createActorCandidates.map((c, i) => (
                            <button
                              key={i}
                              onClick={() => handlePickActorCandidate(c)}
                              className="aspect-square overflow-hidden rounded-xl ring-1 ring-border"
                            >
                              <img
                                src={`data:${c.mimeType};base64,${c.base64}`}
                                alt={`Candidate ${i + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                          {createActorGenerating &&
                            Array.from({ length: 3 - createActorCandidates.length }).map((_, i) => (
                              <div key={`loading-${i}`} className="flex aspect-square items-center justify-center rounded-xl bg-secondary">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {createActorPhoto && (
                      <div className="space-y-3">
                        <img
                          src={`data:${createActorPhoto.mimeType};base64,${createActorPhoto.base64}`}
                          alt="New actor"
                          className="mx-auto h-32 w-32 rounded-xl object-cover"
                        />
                        {/* Iterative creation, step 2: refine the picked photo in
                            place via free-text follow-ups -- generated photos
                            only, never an uploaded real photo of a real person. */}
                        {createActorSource === "generate" && (
                          <div className="flex gap-1.5">
                            <input
                              value={createActorRefinePrompt}
                              onChange={(e) => setCreateActorRefinePrompt(e.target.value)}
                              placeholder="Make changes… (e.g. put a mug in her hand)"
                              className="min-w-0 flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                            />
                            <button
                              onClick={handleRefineActorPhoto}
                              disabled={!createActorRefinePrompt.trim() || createActorRefining}
                              className="shrink-0 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground disabled:opacity-40"
                            >
                              {createActorRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refine"}
                            </button>
                          </div>
                        )}
                        <input
                          value={createActorName}
                          onChange={(e) => setCreateActorName(e.target.value)}
                          placeholder="Actor's name"
                          className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <div className="flex gap-1.5">
                          {(["female", "male"] as const).map((g) => (
                            <button
                              key={g}
                              onClick={() => setCreateActorGender(g)}
                              className={[
                                "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
                                createActorGender === g ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                              ].join(" ")}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                        {createActorSource === "upload" && (
                          <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                            <input
                              type="checkbox"
                              checked={createActorConsent}
                              onChange={(e) => setCreateActorConsent(e.target.checked)}
                              className="h-4 w-4"
                            />
                            This is my own photo, or I have permission to use it
                          </label>
                        )}
                        <button
                          onClick={handleSaveCustomActor}
                          disabled={
                            !createActorName.trim() ||
                            createActorSaving ||
                            (createActorSource === "upload" && !createActorConsent)
                          }
                          className="w-full rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                          style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                        >
                          {createActorSaving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save actor"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : actorPanel === "generating" ? (
                  <GeneratingGlow label="Creating your actor's video… usually a few minutes." />
                ) : (
                  <div className="p-4">
                    {actorError && <p className="mb-2 text-xs font-medium text-destructive">{actorError}</p>}
                    {/* Collapsed by default (2026-10-01, founder's call) —
                        this used to be a permanently-open grid pushing the
                        script box below the fold. Now a compact row that
                        expands on click, and auto-collapses back once an
                        actor is picked (see the two onClick handlers
                        below that call setActorPickerOpen(false)). */}
                    {(() => {
                      const selectedBuiltIn = selectedActorId ? actors.find((a) => a.id === selectedActorId) : null;
                      const selectedCustom = selectedCustomActorId
                        ? customActors.find((a) => a.id === selectedCustomActorId)
                        : null;
                      const thumbSrc = selectedBuiltIn
                        ? `data:image/jpeg;base64,${selectedBuiltIn.situation_preview_base64 ?? selectedBuiltIn.preview_image_base64}`
                        : selectedCustom
                          ? `data:${selectedCustom.photo_mime_type};base64,${selectedCustom.photo_base64}`
                          : null;
                      const selectedName = selectedBuiltIn?.name ?? selectedCustom?.name ?? null;
                      return (
                        <button
                          onClick={() => setActorPickerOpen((v) => !v)}
                          className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl px-1 py-1 text-left"
                        >
                          <span className="flex items-center gap-2">
                            {thumbSrc ? (
                              <img src={thumbSrc} alt={selectedName ?? "Selected actor"} className="h-7 w-7 rounded-lg object-cover" />
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
                                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                              </span>
                            )}
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {selectedName ? `Actor: ${selectedName}` : "Choose your actor"}
                            </span>
                          </span>
                          <ChevronDown
                            className={["h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", actorPickerOpen ? "rotate-180" : ""].join(" ")}
                          />
                        </button>
                      );
                    })()}
                    {actorPickerOpen && (
                    <div className="mb-3 flex gap-2">
                      {(["all", "female", "male"] as const).map((g) => (
                        <button
                          key={g}
                          onClick={() => {
                            setActorGenderFilter(g);
                            setShowAllActors(false);
                          }}
                          className={[
                            "flex-1 rounded-full px-3 py-2 text-xs font-semibold capitalize",
                            actorGenderFilter === g ? "text-white" : "bg-secondary text-secondary-foreground",
                          ].join(" ")}
                          style={actorGenderFilter === g ? { background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN } : undefined}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    )}
                    {actorPickerOpen && (actorsLoading || !situationsLoaded ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (() => {
                      // Collapsed to one row (first 4 + "More") by default
                      // — 16+ faces all at once read as overwhelming and
                      // pushed the compose box below the fold. "More"
                      // reveals the rest in place; switching the gender
                      // filter re-collapses (see setActorGenderFilter above).
                      const filteredActors = actors.filter((a) => Boolean(actorSituations[a.id]) && (actorGenderFilter === "all" || a.gender === actorGenderFilter));
                      const filteredCustomActors = customActors.filter((a) => actorGenderFilter === "all" || a.gender === actorGenderFilter);
                      const totalCount = filteredActors.length + filteredCustomActors.length;
                      const visibleActors = showAllActors ? filteredActors : filteredActors.slice(0, 4);
                      const visibleCustomActors = showAllActors
                        ? filteredCustomActors
                        : filteredCustomActors.slice(0, Math.max(0, 4 - filteredActors.length));
                      const hasMore = totalCount > 4;
                      return (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {totalCount === 0 && (
                          <p className="col-span-full py-3 text-center text-xs text-muted-foreground">
                            No actors are ready yet — check back soon.
                          </p>
                        )}
                        {visibleActors
                          .map((a) => {
                            const selected = selectedActorId === a.id;
                            const situationId = actorSituations[a.id];
                            const ready = Boolean(situationId);
                            const situationLabel = situationId
                              ? situationId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                              : "Coming soon";
                            const previewUrl = actorPreviewVideos[a.id];
                            return (
                              <button
                                key={a.id}
                                onClick={() => {
                                  if (!ready) return;
                                  setSelectedActorId(a.id);
                                  setSelectedCustomActorId(null);
                                  setActorPickerOpen(false);
                                }}
                                disabled={!ready}
                                onMouseEnter={(e) => {
                                  if (!ready) return;
                                  if (!actorPreviewVideos[a.id]) {
                                    fetchActorPreviewVideoUrl(a.id)
                                      .then((url) => setActorPreviewVideos((prev) => ({ ...prev, [a.id]: url })))
                                      .catch(() => {});
                                    return;
                                  }
                                  const video = e.currentTarget.querySelector("video");
                                  video?.play().catch(() => {});
                                }}
                                onMouseLeave={(e) => {
                                  const video = e.currentTarget.querySelector("video");
                                  if (video) {
                                    video.pause();
                                    video.currentTime = 0;
                                  }
                                }}
                                className={["flex flex-col items-center gap-1", ready ? "" : "cursor-not-allowed opacity-40"].join(" ")}
                              >
                                <span
                                  className={[
                                    "relative aspect-square w-full overflow-hidden rounded-xl",
                                    selected ? "ring-2 ring-primary" : "",
                                  ].join(" ")}
                                >
                                  <img
                                    src={`data:image/jpeg;base64,${a.situation_preview_base64 ?? a.preview_image_base64}`}
                                    alt={a.name}
                                    className="h-full w-full object-cover"
                                  />
                                  {previewUrl && (
                                    // eslint-disable-next-line jsx-a11y/media-has-caption
                                    <video
                                      src={previewUrl}
                                      muted
                                      loop
                                      playsInline
                                      autoPlay
                                      className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 hover:opacity-100"
                                    />
                                  )}
                                  {selected && (
                                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                      <Check className="h-2.5 w-2.5" />
                                    </span>
                                  )}
                                  <span className="glass-caption absolute inset-x-0 bottom-0 px-1.5 py-1 text-left">
                                    <span className="block truncate text-[11px] font-semibold text-white">{a.name}</span>
                                    <span className="block truncate text-[10px] text-white/75">{situationLabel}</span>
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        {visibleCustomActors
                          .map((a) => {
                            const selected = selectedCustomActorId === a.id;
                            const editing = editingCustomActorId === a.id;
                            return (
                              <div key={a.id} className="flex flex-col items-center gap-1">
                                <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                                  <button
                                    onClick={() => {
                                      setSelectedCustomActorId(a.id);
                                      setSelectedActorId(null);
                                      setActorPickerOpen(false);
                                    }}
                                    className={[
                                      "absolute inset-0",
                                      selected ? "ring-2 ring-primary" : "",
                                    ].join(" ")}
                                  >
                                    <img
                                      src={`data:${a.photo_mime_type};base64,${a.photo_base64}`}
                                      alt={a.name}
                                      className="h-full w-full object-cover"
                                    />
                                    {selected && (
                                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <Check className="h-2.5 w-2.5" />
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCustomActor(a.id)}
                                    title="Delete actor"
                                    className="glass-chip absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                                {editing ? (
                                  <input
                                    autoFocus
                                    value={editingCustomActorName}
                                    onChange={(e) => setEditingCustomActorName(e.target.value)}
                                    onBlur={handleSaveRenameCustomActor}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveRenameCustomActor();
                                      if (e.key === "Escape") setEditingCustomActorId(null);
                                    }}
                                    className="w-full rounded border border-border bg-card px-1 text-center text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                                  />
                                ) : (
                                  <button
                                    onClick={() => handleStartRenameCustomActor(a)}
                                    className="flex items-center gap-0.5 text-[11px] font-medium text-foreground"
                                  >
                                    {a.name}
                                    <Pencil className="h-2 w-2 text-muted-foreground" />
                                  </button>
                                )}
                                <span className="text-[10px] text-muted-foreground">Your actor</span>
                              </div>
                            );
                          })}
                        {hasMore && (
                          <button
                            onClick={() => setShowAllActors((v) => !v)}
                            className="flex flex-col items-center gap-1"
                          >
                            <span className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border">
                              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                            </span>
                            <span className="text-[11px] font-medium text-foreground">
                              {showAllActors ? "Show less" : "More"}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => setShowCreateActor(true)}
                          className="flex flex-col items-center gap-1"
                        >
                          <span className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border">
                            <Plus className="h-5 w-5 text-muted-foreground" />
                          </span>
                          <span className="text-[11px] font-medium text-foreground">Create your own</span>
                        </button>
                      </div>
                      );
                    })())}

                    {actorPickerOpen && !selectedActorId && !selectedCustomActorId && (
                      <p className="mt-4 text-xs text-muted-foreground">Pick an actor above to set voice options.</p>
                    )}

                    {selectedActorId && actorVoiceEngine === "elevenlabs" && (
                      <div className="mt-3 space-y-4 rounded-xl bg-secondary/40 p-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={addEmotions}
                            onChange={(e) => setAddEmotions(e.target.checked)}
                            className="h-4 w-4"
                          />
                          Add emotions — AI adds natural delivery cues before generating
                        </label>
                        <details className="group">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Audio settings <span className="font-normal normal-case tracking-normal">(optional: speed, stability…)</span>
                        </summary>
                        <div className="mt-3 space-y-4">
                        {[
                          { label: "Speed", value: elevenlabsSpeed, set: setElevenlabsSpeed, min: 0.5, max: 1.5 },
                          { label: "Stability", value: elevenlabsStability, set: setElevenlabsStability, min: 0, max: 1 },
                          { label: "Similarity", value: elevenlabsSimilarity, set: setElevenlabsSimilarity, min: 0, max: 1 },
                          { label: "Style exaggeration", value: elevenlabsStyle, set: setElevenlabsStyle, min: 0, max: 1 },
                        ].map(({ label, value, set, min, max }) => (
                          <div key={label}>
                            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{label}</span>
                              <span className="font-mono">{value.toFixed(2)}X</span>
                            </div>
                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={0.05}
                              value={value}
                              onChange={(e) => set(parseFloat(e.target.value))}
                              className="w-full accent-primary"
                            />
                          </div>
                        ))}
                        </div>
                        </details>
                      </div>
                    )}

                    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
                      <textarea
                        value={actorNarration}
                        onChange={(e) => setActorNarration(e.target.value)}
                        placeholder="What should your actor say?…"
                        rows={2}
                        maxLength={actorNarrationMax}
                        className="w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      {actorNarration.trim() && (
                        <p className="px-3 pb-1 text-[12px] text-muted-foreground">
                          About {Math.round(actorSpeechSeconds(actorNarration))} seconds · {actorVideoCost} credits
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
                      <button
                        onClick={handleGenerateActorVideo}
                        disabled={
                          (!selectedActorId && !selectedCustomActorId) ||
                          !actorNarration.trim() ||
                          taggingEmotions ||
                          spokenLength(actorNarration) > actorNarrationMax ||
                          (credits !== null && credits < actorVideoCost)
                        }
                        className="rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                      >
                        {taggingEmotions ? "Adding emotions…" : `Generate (${actorVideoCost} credits)`}
                      </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ---------- Video mode ---------- */}
            {homeMode === "video" && (
              <>
                {videoPanel === "result" && homeGeneratedVideo ? (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <div className="relative">
                      <video
                        ref={videoResultRef}
                        controls
                        autoPlay
                        loop
                        className="max-h-[420px] w-full bg-[#1E1F24]"
                        src={`data:video/mp4;base64,${homeGeneratedVideo}`}
                      />
                      {/* Glass chips on the picture; the player's own controls stay at the bottom. */}
                      <span className="glass-chip pointer-events-none absolute left-3 top-3 rounded-full px-3 py-1.5 text-[12px] font-semibold">
                        {IMAGE_VIDEO_MODEL_LABELS[videoModel]}
                      </span>
                      <a
                        href={`data:video/mp4;base64,${homeGeneratedVideo}`}
                        download="punqle-video.mp4"
                        className="glass-chip absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                    {videoVariants.length > 0 && (
                      <div className="flex gap-2 border-t border-border px-4 py-3">
                        {videoVariants.map((v, i) => (
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          <video
                            key={i}
                            src={`data:video/mp4;base64,${v}`}
                            muted
                            playsInline
                            onClick={() => handleSelectVideoVariant(i)}
                            title="Use this version"
                            className="h-16 w-16 cursor-pointer rounded-lg object-cover ring-1 ring-border"
                          />
                        ))}
                      </div>
                    )}
                    {resultFromTaster && tasterActionError && <p className="px-4 pt-2 text-xs text-destructive">{tasterActionError}</p>}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <span className="text-xs text-muted-foreground">{IMAGE_VIDEO_MODEL_LABELS[videoModel]}</span>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={handleTurnVideoFrameIntoActor}
                          title="Save the current frame as a reusable actor"
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Actor
                        </button>
                        {resultFromTaster ? (
                          <>
                            {tasterResultJobId && (
                              <button
                                onClick={async () => setTasterActionError(await handleUnlockTasterVideo(tasterResultJobId, videoModel))}
                                title="This exact video, 720p, without the watermark"
                                className="rounded-full px-4 py-2 text-xs font-bold text-white"
                                style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                              >
                                No watermark, 720p ({TASTER_UNLOCK_CREDITS} credits)
                              </button>
                            )}
                            <button
                              onClick={() => handleUpgradeTasterVideo(videoModel)}
                              title="Make a new video in 1080p, without the watermark"
                              className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                            >
                              1080p, new video ({videoCostFor(tasterUpgradeModel(videoModel), TASTER_UPGRADE_SECONDS, false)} credits)
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenerateVideo()}
                            title="Generate again with the same photo and settings"
                            className="flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Remix
                          </button>
                        )}
                        <button
                          onClick={handleResetHome}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Create another
                        </button>
                      </div>
                    </div>
                    <PostThisVideo
                      videoUrl={`data:video/mp4;base64,${homeGeneratedVideo}`}
                      headline={(homeIdea.trim() || videoPrompt.trim() || "My ad video").slice(0, 100)}
                      aspectRatio={videoAspectRatio}
                      videoKept={recentSaved}
                    />
                  </>
                ) : !videoRefImage && showRecent ? (
                  <RecentVideos onClose={() => setShowRecent(false)} />
                ) : !videoRefImage ? (
                  <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload a photo to turn into a short video.</p>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
                      <Upload className="h-4 w-4" />
                      Upload a photo
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadOwnImageForVideo} />
                    </label>
                    {/* Shown only when the server says this account still has its free comparison, so a new visitor
                        learns about it BEFORE choosing a photo (the card with the button only appears afterwards). */}
                    {tasterAvailable && (
                      <p className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold text-foreground">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        Your first comparison is free: see {tasterModelCount} video tools side by side
                      </p>
                    )}
                    {recentSaved && recentCount > 0 && (
                      <button onClick={() => setShowRecent(true)} className="text-xs font-semibold text-muted-foreground underline underline-offset-2">
                        Recent videos ({recentCount})
                      </button>
                    )}
                    <StarterExamples onPick={handlePickExample} loadingId={exampleLoading} />
                    {videoError && <p className="text-xs text-destructive">{videoError}</p>}
                    {actors.length > 0 && (
                      <div className="mt-2 w-full border-t border-border pt-4 text-left">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Or start from a Punqle actor</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {actors.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => handlePickActorForVideo(a.preview_image_base64)}
                              title={a.name}
                              className="shrink-0 text-center"
                            >
                              <img
                                src={`data:image/jpeg;base64,${a.preview_image_base64}`}
                                alt={a.name}
                                className="h-24 w-[72px] rounded-xl object-cover"
                              />
                              <span className="mt-1 block max-w-[72px] truncate text-[11px] font-semibold text-foreground">{a.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : videoPanel === "compare" ? (
                  <VideoCompare
                    jobs={compareJobs}
                    starting={compareStarting}
                    saved={recentSaved}
                    aspect={videoAspectRatio}
                    seconds={tasterMode ? 4 : videoDuration}
                    taster={tasterMode}
                    onCredits={setCredits}
                    unlockCost={TASTER_UNLOCK_CREDITS}
                    upgradeCost={(m) => videoCostFor(tasterUpgradeModel(m), TASTER_UPGRADE_SECONDS, false)}
                    onUnlock={(m) => handleUnlockTasterVideo(compareJobs?.find((j) => j.model === m)?.jobId ?? null, m)}
                    onUpgrade={(m) => handleUpgradeTasterVideo(m)}
                    onUse={(video, model) => {
                      setTasterActionError(null);
                      setTasterResultJobId(tasterMode ? (compareJobs?.find((j) => j.model === model)?.jobId ?? null) : null);
                      setResultFromTaster(tasterMode);
                      setHomeGeneratedVideo(video);
                      setVideoModel(model);
                      setVideoVariants([]);
                      setCompareJobs(null);
                      setTasterMode(false);
                      setVideoPanel("result");
                    }}
                    onBack={() => {
                      setCompareJobs(null);
                      setTasterMode(false);
                      setVideoPanel("composer");
                    }}
                  />
                ) : videoPanel === "generating" ? (
                  <GeneratingGlow
                    label={
                      videoNarrationEnabled
                        ? videoStage === "animating"
                          ? "Animating your video…"
                          : "Adding the voice…"
                        : videoDuration > 10
                          ? `Making your ${videoDuration}-second video… ${recentSaved ? "if you leave, it will be waiting in Recent videos." : "keep this page open until it is ready."}`
                          : `Generating your video… ${recentSaved ? "if you leave, it will be waiting in Recent videos." : "keep this page open until it is ready."}`
                    }
                  />
                ) : (
                  <div className="space-y-3 px-4 py-3">
                    {videoError && <p className="text-xs font-medium text-destructive">{videoError}</p>}

                    <div className="flex items-center gap-2">
                      <img
                        src={`data:${videoRefImage.mimeType};base64,${videoRefImage.base64}`}
                        alt="Reference"
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                      <span className="flex-1 text-xs text-muted-foreground">Reference image</span>
                      <label className="flex cursor-pointer items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[12px] font-semibold text-secondary-foreground">
                        <Upload className="h-3 w-3" />
                        Replace
                        <input type="file" accept="image/*" className="hidden" onChange={handleReplaceVideoImage} />
                      </label>
                    </div>

                    {!videoNarrationEnabled && (
                      <>
                        <textarea
                          value={videoPrompt}
                          onChange={(e) => setVideoPrompt(e.target.value)}
                          placeholder="Describe your ad: who is in it and what happens… (e.g. a woman with dry hair tries a new shampoo, rinses, and her hair looks smooth and shiny)"
                          rows={3}
                          className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <div>
                          <textarea
                            value={videoLines}
                            onChange={(e) => setVideoLines(e.target.value)}
                            placeholder='What should they say? (optional) e.g. "My hair has been so dry lately. Two weeks in, and look at it."'
                            rows={2}
                            className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                          />
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            Leave empty for no speech. Keep it short — about 2–3 words per second. English works best.
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Tool</p>
                      <div className="grid grid-cols-2 gap-2">
                        {IMAGE_VIDEO_MODEL_OPTIONS.filter((m) => !videoNarrationEnabled || STUDIO_VOICE_MAX[m.id] !== undefined).map((m) => {
                          const selected = !videoCompare && videoModel === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => handleVideoModelChange(m.id)}
                              className={[
                                "rounded-2xl px-3 py-2.5 text-left transition-colors",
                                selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                              ].join(" ")}
                            >
                              <span className="flex items-center gap-1 text-sm font-semibold">
                                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                {m.label}
                              </span>
                              <span className={["mt-0.5 block text-[11px]", selected ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                                {m.blurb}
                              </span>
                              <span className="mt-1 block text-[11px] font-semibold">
                                from {videoCostFor(m.id, lengthChipsFor(m.id, videoNarrationEnabled)[0].seconds, videoNarrationEnabled)} credits
                              </span>
                            </button>
                          );
                        })}
                        {!videoNarrationEnabled && (
                          <button
                            onClick={handlePickCompare}
                            className={[
                              "rounded-2xl px-3 py-2.5 text-left transition-colors",
                              videoCompare ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                            ].join(" ")}
                          >
                            <span className="flex items-center gap-1 text-sm font-semibold">
                              {videoCompare && <Check className="h-3.5 w-3.5 shrink-0" />}
                              Compare all 3
                            </span>
                            <span className={["mt-0.5 block text-[11px]", videoCompare ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                              Wan, Kling 4.0 and Seedance side by side. Pick your favourite.
                            </span>
                            <span className="mt-1 block text-[11px] font-semibold">from {compareCostFor(COMPARE_CHIPS[0].seconds)} credits</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Aspect ratio</p>
                      <div className="flex gap-1.5">
                        {(["16:9", "9:16", "1:1"] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setVideoAspectRatio(r)}
                            className={[
                              "rounded-full px-3 py-1.5 text-xs font-semibold",
                              videoAspectRatio === r ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                            ].join(" ")}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Length</p>
                      <div className={["grid gap-2", videoChips.length === 3 ? "grid-cols-3" : videoChips.length === 2 ? "grid-cols-2" : "grid-cols-1"].join(" ")}>
                        {videoChips.map((c) => {
                          const selected = videoDuration === c.seconds;
                          return (
                            <button
                              key={c.seconds}
                              onClick={() => setVideoDuration(c.seconds)}
                              className={[
                                "rounded-2xl px-3 py-2 text-center transition-colors",
                                selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                              ].join(" ")}
                            >
                              <span className="block text-xs font-semibold">
                                {c.label} · {c.seconds} s
                              </span>
                              <span className={["block text-[11px]", selected ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                                {videoCompare ? compareCostFor(c.seconds) : videoCostFor(videoModel, c.seconds, videoNarrationEnabled)} credits
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {!videoCompare && (videoModel === "seedance_2_5" || (videoModel === "omni" && videoDuration > 10)) && (
                        <p className="mt-1.5 text-xs text-muted-foreground">This tool makes 720p videos.</p>
                      )}
                    </div>

                    <div className={["flex items-center justify-between", videoCompare ? "hidden" : ""].join(" ")}>
                      <p className="text-xs font-semibold text-muted-foreground">Versions</p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={videoDuration > 10}
                          onClick={() => setVideoVersions((v) => (v > 1 ? ((v - 1) as 1 | 2 | 3) : v))}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-foreground">{effectiveVideoVersions}</span>
                        <button
                          disabled={videoDuration > 10}
                          onClick={() => setVideoVersions((v) => (v < 3 ? ((v + 1) as 1 | 2 | 3) : v))}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {!videoNarrationEnabled && (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Punqle Enhancer</p>
                          <p className="text-[11px] text-muted-foreground">A more natural, human look, and it fills in what your description leaves out</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={videoEnhance}
                          aria-label="Punqle Enhancer"
                          onClick={() => setVideoEnhance(!videoEnhance)}
                          className={["relative h-6 w-10 shrink-0 rounded-full transition-colors", videoEnhance ? "bg-primary" : "bg-secondary"].join(" ")}
                        >
                          <span
                            className={["absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", videoEnhance ? "left-[18px]" : "left-0.5"].join(" ")}
                          />
                        </button>
                      </div>
                    )}

                    <details className={["border-t border-border pt-3", videoCompare ? "hidden" : ""].join(" ")}>
                      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                        Advanced: studio voice (a separate recorded voice, lip-synced)
                      </summary>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={videoNarrationEnabled}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setVideoNarrationEnabled(on);
                              if (on) {
                                const m = STUDIO_VOICE_MAX[videoModel] !== undefined ? videoModel : "omni";
                                setVideoModel(m);
                                const chips = lengthChipsFor(m, true);
                                setVideoDuration((d) => (chips.some((c) => c.seconds === d) ? d : chips[0].seconds));
                              }
                            }}
                            className="h-4 w-4"
                          />
                          Use a studio voice instead (Omni and Kling 3.0 Pro, up to {STUDIO_VOICE_MAX.omni}–{STUDIO_VOICE_MAX.kling_3_pro} s, +18 credits)
                        </label>
                        {videoNarrationEnabled && (
                          <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
                            <textarea
                              value={videoNarration}
                              onChange={(e) => setVideoNarration(e.target.value)}
                              placeholder="What should they say?… (e.g. This bottle is very durable and keeps your drink cold all day.)"
                              rows={2}
                              className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                            />
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-muted-foreground">Voice</p>
                              <div className="flex gap-1.5">
                                {(["female", "male"] as const).map((g) => (
                                  <button
                                    key={g}
                                    onClick={() => setVideoVoiceGender(g)}
                                    className={[
                                      "rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
                                      videoVoiceGender === g ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                                    ].join(" ")}
                                  >
                                    {g}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </details>

                    {tasterAvailable && !videoNarrationEnabled && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">Free: compare {tasterModelCount} tools</p>
                          <p className="text-[11px] text-muted-foreground">One free try. 4 seconds, 720p, with a Punqle watermark.</p>
                        </div>
                        <button
                          onClick={handleStartFreeTaster}
                          disabled={!videoRefImage || !videoPrompt.trim()}
                          className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                        >
                          Try free
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => setVideoRefImage(null)}
                        className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={videoCompare ? handleGenerateCompare : () => handleGenerateVideo()}
                        disabled={
                          !videoRefImage ||
                          (videoNarrationEnabled ? !videoNarration.trim() : !videoPrompt.trim())
                        }
                        className="rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                      >
                        {videoCompare
                          ? `Compare all 3 (${compareCostFor(videoDuration)} credits)`
                          : `Generate (${videoCostFor(videoModel, videoDuration, videoNarrationEnabled) * effectiveVideoVersions} credits)`}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ---------- Image mode ---------- */}
            {homeMode === "image" && (
              <>
                {homeGeneratedImage ? (
                  <>
                    <div className="relative">
                      <img
                        src={`data:image/png;base64,${homeGeneratedImage}`}
                        alt="Generated"
                        className="max-h-[420px] w-full object-contain bg-[#1E1F24]"
                      />
                      {/* Glass controls sit ON the picture (founder, 2026-10-12): which
                          model made it (top left), Download (top right), and the next
                          steps in a frosted bar along the bottom. Black and white only. */}
                      <span className="glass-chip absolute left-3 top-3 rounded-full px-3 py-1.5 text-[12px] font-semibold">
                        {IMAGE_MODEL_LABELS[homeImageModel]}
                      </span>
                      <a
                        href={`data:image/png;base64,${homeGeneratedImage}`}
                        download="punqle-image.png"
                        className="glass-chip absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                      <div className="glass-strong absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-center gap-2 rounded-3xl p-2.5">
                        <button
                          onClick={handleTurnImageIntoActor}
                          className="glass-chip-light rounded-full px-4 py-2 text-xs font-semibold text-foreground"
                        >
                          Actor
                        </button>
                        <button
                          onClick={() => {
                            handleOpenVideoComposer();
                            setHomeMode("video");
                          }}
                          className="glass-chip-light rounded-full px-4 py-2 text-xs font-semibold text-foreground"
                        >
                          Make a video
                        </button>
                        <button
                          onClick={handleHomeGenerateImage}
                          title="Generate again with the same prompt and settings"
                          className="glass-chip-light flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold text-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Remix
                        </button>
                        <button
                          onClick={handleResetHome}
                          className="bg-primary rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground"
                        >
                          Create another
                        </button>
                      </div>
                    </div>
                    {homeImageVariants.length > 0 && (
                      <div className="flex gap-2 border-t border-border px-4 py-3">
                        {homeImageVariants.map((v, i) => (
                          <img
                            key={i}
                            src={`data:image/png;base64,${v}`}
                            alt={`Version ${i + 2}`}
                            onClick={() => handleSelectImageVariant(i)}
                            title="Use this version"
                            className="h-16 w-16 cursor-pointer rounded-lg object-cover ring-1 ring-border"
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <textarea
                      ref={homePromptRef}
                      value={homeIdea}
                      onChange={(e) => setHomeIdea(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" || e.shiftKey || !homeIdea.trim()) return;
                        e.preventDefault();
                        handleHomeGenerateImage();
                      }}
                      placeholder="Describe what you want to create… (e.g. a Gen Z girl holding our product)"
                      rows={2}
                      className="w-full resize-none rounded-t-3xl bg-transparent px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    {homeImageSettingsOpen && (
                      <div className="border-t border-border px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Model</p>
                            <div className="flex flex-wrap gap-1.5">
                              {IMAGE_MODEL_OPTIONS.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => setHomeImageModel(m.id)}
                                  className={[
                                    "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                                    homeImageModel === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                                  ].join(" ")}
                                >
                                  {homeImageModel === m.id && <Check className="h-3 w-3" />}
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Aspect ratio</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(
                                [
                                  { id: "square" as const, label: "Square" },
                                  { id: "feed" as const, label: "Feed" },
                                  { id: "story" as const, label: "Story" },
                                ]
                              ).map((r) => (
                                <button
                                  key={r.id}
                                  onClick={() => setHomeImageAspectRatio(r.id)}
                                  className={[
                                    "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                                    homeImageAspectRatio === r.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                                  ].join(" ")}
                                >
                                  {homeImageAspectRatio === r.id && <Check className="h-3 w-3" />}
                                  {r.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Versions</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setHomeImageVersions((v) => (v > 1 ? ((v - 1) as 1 | 2 | 3) : v))}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-sm font-semibold text-foreground">{homeImageVersions}</span>
                              <button
                                onClick={() => setHomeImageVersions((v) => (v < 3 ? ((v + 1) as 1 | 2 | 3) : v))}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setHomeImageSettingsOpen((v) => !v)}
                          aria-label="Image settings"
                          title="Model & aspect ratio"
                          className={[
                            "flex h-9 w-9 items-center justify-center rounded-full",
                            homeImageSettingsOpen ? "bg-secondary text-foreground" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                        {featureTrials?.image && homeImageVersions === 1 && (
                          <span className="text-xs font-semibold text-primary">✨ Try free — no credits</span>
                        )}
                      </div>
                      <button
                        onClick={handleHomeGenerateImage}
                        disabled={!homeIdea.trim() || homeImageGenerating}
                        aria-label="Create"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                      >
                        {homeImageGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ---------- Product mode ---------- */}
            {homeMode === "product" && (
              <>
                {videoPanel === "result" && homeGeneratedVideo ? (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <div className="relative">
                      <video
                        ref={videoResultRef}
                        controls
                        autoPlay
                        loop
                        className="max-h-[420px] w-full bg-[#1E1F24]"
                        src={`data:video/mp4;base64,${homeGeneratedVideo}`}
                      />
                      {/* Glass chips on the picture; the player's own controls stay at the bottom. */}
                      <span className="glass-chip pointer-events-none absolute left-3 top-3 rounded-full px-3 py-1.5 text-[12px] font-semibold">
                        {IMAGE_VIDEO_MODEL_LABELS[videoModel]}
                      </span>
                      <a
                        href={`data:video/mp4;base64,${homeGeneratedVideo}`}
                        download="punqle-video.mp4"
                        className="glass-chip absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-xs text-muted-foreground">{IMAGE_VIDEO_MODEL_LABELS[videoModel]}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleTurnVideoFrameIntoActor}
                          title="Save the current frame as a reusable actor"
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Actor
                        </button>
                        <button
                          onClick={handleGenerateProduct}
                          title="Generate again with the same photos and description"
                          className="flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Remix
                        </button>
                        <button
                          onClick={handleResetHome}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Create another
                        </button>
                      </div>
                    </div>
                    <PostThisVideo
                      videoUrl={`data:video/mp4;base64,${homeGeneratedVideo}`}
                      headline={(homeIdea.trim() || videoPrompt.trim() || "My ad video").slice(0, 100)}
                      aspectRatio={videoAspectRatio}
                      videoKept={recentSaved}
                    />
                  </>
                ) : productPanel === "generating" ? (
                  <GeneratingGlow label="Creating your image…" />
                ) : videoPanel === "generating" ? (
                  <GeneratingGlow label={videoStage === "animating" ? "Animating your video…" : "Adding the voice…"} />
                ) : (
                  <div className="space-y-3 px-4 py-3">
                    {productError && <p className="text-xs font-medium text-destructive">{productError}</p>}

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                        {videoRefImage ? (
                          <img
                            src={`data:${videoRefImage.mimeType};base64,${videoRefImage.base64}`}
                            alt="Actor"
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {videoRefImage ? "Replace actor photo" : "Upload actor / model photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadProductActor} />
                      </label>
                      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                        {productFile ? (
                          <Package className="h-5 w-5" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {productFile ? productFile.name : "Upload a product photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleProductFileChange} />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowProductActorPicker((v) => !v)}
                      className="text-xs font-semibold text-accent"
                    >
                      {showProductActorPicker ? "Hide actors" : "Or choose an actor"}
                    </button>

                    {showProductActorPicker && (
                      <div className="flex flex-wrap gap-2 rounded-xl border border-border p-2">
                        {(actorsLoading || customActorsLoading) && actors.length === 0 && customActors.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Loading actors…</p>
                        ) : (
                          <>
                            {customActors.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                title={a.name}
                                onClick={() => handlePickProductActor(a.photo_base64, a.photo_mime_type)}
                                className="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-border"
                              >
                                <img
                                  src={`data:${a.photo_mime_type};base64,${a.photo_base64}`}
                                  alt={a.name}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ))}
                            {actors.map((a) => {
                              const previewUrl = actorPreviewVideos[a.id];
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  title={a.name}
                                  onClick={() => handlePickProductActor(a.preview_image_base64, "image/jpeg")}
                                  onMouseEnter={(e) => {
                                    if (!actorPreviewVideos[a.id]) {
                                      fetchActorPreviewVideoUrl(a.id)
                                        .then((url) => setActorPreviewVideos((prev) => ({ ...prev, [a.id]: url })))
                                        .catch(() => {});
                                      return;
                                    }
                                    const video = e.currentTarget.querySelector("video");
                                    video?.play().catch(() => {});
                                  }}
                                  onMouseLeave={(e) => {
                                    const video = e.currentTarget.querySelector("video");
                                    if (video) {
                                      video.pause();
                                      video.currentTime = 0;
                                    }
                                  }}
                                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-border"
                                >
                                  <img
                                    src={`data:image/jpeg;base64,${a.preview_image_base64}`}
                                    alt={a.name}
                                    className="h-full w-full object-cover"
                                  />
                                  {previewUrl && (
                                    // eslint-disable-next-line jsx-a11y/media-has-caption
                                    <video
                                      src={previewUrl}
                                      muted
                                      loop
                                      playsInline
                                      autoPlay
                                      className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 hover:opacity-100"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}

                    <textarea
                      value={productPrompt}
                      onChange={(e) => setProductPrompt(e.target.value)}
                      placeholder="Describe the product and how it's used… (e.g. Strong, durable bottle that can be used every day.)"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={handleGenerateProduct}
                        disabled={!videoRefImage || !productFile || !productPrompt.trim()}
                        className="rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                      >
                        {featureTrials?.product ? "✨ Try free" : "Generate"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ---------- Unboxing mode ---------- */}
            {homeMode === "unboxing" && (
              <>
                {unboxingImage ? (
                  <>
                    <img
                      src={`data:image/png;base64,${unboxingImage}`}
                      alt="Generated"
                      className="max-h-[420px] w-full object-contain bg-[#1E1F24]"
                    />
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-xs text-muted-foreground">Unboxing shot</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setVideoRefImage({ base64: unboxingImage, mimeType: "image/png" });
                            handleOpenVideoComposer();
                            setHomeMode("video");
                          }}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Make a video
                        </button>
                        <button
                          onClick={handleGenerateUnboxing}
                          title="Generate again with the same photo and scene"
                          className="flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Remix
                        </button>
                        <button
                          onClick={handleResetHome}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Create another
                        </button>
                      </div>
                    </div>
                  </>
                ) : unboxingPanel === "generating" ? (
                  <GeneratingGlow label="Creating your shot…" />
                ) : (
                  <div className="space-y-3 px-4 py-3">
                    {/* Heading added (2026-09-23) — competitor research
                        (Arcads' own format picker labels each preset by
                        name + a one-line description) showed a bare upload
                        box with no heading doesn't communicate what the
                        pill actually does. Copy is deliberately honest:
                        this restyles the background around the real
                        product photo, it doesn't animate an actual box
                        being opened. */}
                    <div>
                      <p className="text-sm font-bold text-foreground font-display">Unboxing shot</p>
                      <p className="text-xs text-muted-foreground">
                        A fresh, styled background for your product photo — like it's just been unboxed.
                      </p>
                    </div>
                    {unboxingError && <p className="text-xs font-medium text-destructive">{unboxingError}</p>}

                    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border px-2 py-4 text-center text-xs text-muted-foreground">
                      {unboxingFile ? (
                        <PackageOpen className="h-5 w-5" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {unboxingFile ? unboxingFile.name : "Upload a product photo"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadUnboxingProduct} />
                    </label>

                    <div className="grid grid-cols-5 gap-2">
                      {UNBOXING_SURFACES.map((s) => (
                        <ImageChoiceCard
                          key={s.id}
                          image={`/scene-previews/${s.id}.jpg`}
                          label={s.label}
                          selected={unboxingScene.includes(s.phrase)}
                          onClick={() => handlePickUnboxingSurface(s.phrase)}
                        />
                      ))}
                    </div>

                    <textarea
                      value={unboxingScene}
                      onChange={(e) => setUnboxingScene(e.target.value)}
                      placeholder="Describe the surface or setting… (e.g. on a marble kitchen counter, soft morning light)"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={handleGenerateUnboxing}
                        disabled={!unboxingFile || !unboxingScene.trim()}
                        className="rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                      >
                        {featureTrials?.unboxing ? "✨ Try free" : "Generate"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ---------- Show Your App mode ---------- */}
            {homeMode === "show_app" && (
              <>
                {showAppImage ? (
                  <>
                    <img
                      src={`data:image/png;base64,${showAppImage}`}
                      alt="Generated"
                      className="max-h-[420px] w-full object-contain bg-[#1E1F24]"
                    />
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-xs text-muted-foreground">Show Your App shot</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setVideoRefImage({ base64: showAppImage, mimeType: "image/png" });
                            handleOpenVideoComposer();
                            setHomeMode("video");
                          }}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Make a video
                        </button>
                        <button
                          onClick={handleGenerateShowApp}
                          title="Generate again with the same actor and screenshot"
                          className="flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Remix
                        </button>
                        <button
                          onClick={handleResetHome}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Create another
                        </button>
                      </div>
                    </div>
                  </>
                ) : showAppPanel === "generating" ? (
                  <GeneratingGlow label="Creating your shot…" />
                ) : (
                  <div className="space-y-3 px-4 py-3">
                    {/* Heading added (2026-09-23), same fix as Unboxing/
                        Upscale above — a bare 2-upload grid with no
                        heading didn't say what the pill makes. */}
                    <div>
                      <p className="text-sm font-bold text-foreground font-display">Show Your App</p>
                      <p className="text-xs text-muted-foreground">
                        Puts your app on an actor's phone screen — a real person showing it off.
                      </p>
                    </div>
                    {showAppError && <p className="text-xs font-medium text-destructive">{showAppError}</p>}

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                        {videoRefImage ? (
                          <img
                            src={`data:${videoRefImage.mimeType};base64,${videoRefImage.base64}`}
                            alt="Actor"
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {videoRefImage ? "Replace actor photo" : "Upload actor / model photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadShowAppActor} />
                      </label>
                      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                        {showAppFile ? (
                          <Smartphone className="h-5 w-5" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {showAppFile ? showAppFile.name : "Upload a screenshot of your app"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadShowAppScreenshot} />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAppActorPicker((v) => !v)}
                      className="text-xs font-semibold text-accent"
                    >
                      {showAppActorPicker ? "Hide actors" : "Or choose an actor"}
                    </button>

                    {showAppActorPicker && (
                      <div className="flex flex-wrap gap-2 rounded-xl border border-border p-2">
                        {(actorsLoading || customActorsLoading) && actors.length === 0 && customActors.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Loading actors…</p>
                        ) : (
                          <>
                            {customActors.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                title={a.name}
                                onClick={() => handlePickShowAppActor(a.photo_base64, a.photo_mime_type)}
                                className="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-border"
                              >
                                <img
                                  src={`data:${a.photo_mime_type};base64,${a.photo_base64}`}
                                  alt={a.name}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ))}
                            {actors.map((a) => {
                              const previewUrl = actorPreviewVideos[a.id];
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  title={a.name}
                                  onClick={() => handlePickShowAppActor(a.preview_image_base64, "image/jpeg")}
                                  onMouseEnter={(e) => {
                                    if (!actorPreviewVideos[a.id]) {
                                      fetchActorPreviewVideoUrl(a.id)
                                        .then((url) => setActorPreviewVideos((prev) => ({ ...prev, [a.id]: url })))
                                        .catch(() => {});
                                      return;
                                    }
                                    const video = e.currentTarget.querySelector("video");
                                    video?.play().catch(() => {});
                                  }}
                                  onMouseLeave={(e) => {
                                    const video = e.currentTarget.querySelector("video");
                                    if (video) {
                                      video.pause();
                                      video.currentTime = 0;
                                    }
                                  }}
                                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-border"
                                >
                                  <img
                                    src={`data:image/jpeg;base64,${a.preview_image_base64}`}
                                    alt={a.name}
                                    className="h-full w-full object-cover"
                                  />
                                  {previewUrl && (
                                    // eslint-disable-next-line jsx-a11y/media-has-caption
                                    <video
                                      src={previewUrl}
                                      muted
                                      loop
                                      playsInline
                                      autoPlay
                                      className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 hover:opacity-100"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={handleGenerateShowApp}
                        disabled={(!videoRefImage && !homeGeneratedImage) || !showAppFile}
                        className="rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                      >
                        {featureTrials?.show_app ? "✨ Try free" : "Generate"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ---------- Upscale mode ---------- */}
            {homeMode === "upscale" && (
              <>
                {upscaleResultImage || upscaleResultVideo ? (
                  <>
                    {upscaleResultImage ? (
                      <img
                        src={`data:image/png;base64,${upscaleResultImage}`}
                        alt="Upscaled"
                        className="max-h-[420px] w-full object-contain bg-[#1E1F24]"
                      />
                    ) : (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        controls
                        autoPlay
                        loop
                        className="max-h-[420px] w-full bg-[#1E1F24]"
                        src={`data:video/mp4;base64,${upscaleResultVideo}`}
                      />
                    )}
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-xs text-muted-foreground">Upscaled</span>
                      <div className="flex items-center gap-2">
                        {upscaleResultImage && (
                          <button
                            onClick={() => {
                              setVideoRefImage({ base64: upscaleResultImage, mimeType: "image/png" });
                              handleOpenVideoComposer();
                              setHomeMode("video");
                            }}
                            className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                          >
                            Make a video
                          </button>
                        )}
                        <button
                          onClick={handleGenerateUpscale}
                          title="Upscale again with the same file"
                          className="flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Remix
                        </button>
                        <button
                          onClick={handleResetHome}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Create another
                        </button>
                      </div>
                    </div>
                  </>
                ) : upscalePanel === "generating" ? (
                  <GeneratingGlow
                    label={
                      upscaleFile?.type.startsWith("video/")
                        ? "Upscaling your video… this can take several minutes. You can browse other tabs while you wait — just don't switch away from Upscale here."
                        : "Upscaling your image…"
                    }
                  />
                ) : (
                  <div className="space-y-3 px-4 py-3">
                    {/* Heading added (2026-09-23) — competitor research
                        (Topaz Labs' own upscale page leads with a plain-
                        language heading before the upload box, not just a
                        bare drop zone) — same fix as Unboxing above. */}
                    <div>
                      <p className="text-sm font-bold text-foreground font-display">Upscale</p>
                      <p className="text-xs text-muted-foreground">
                        Sharpen and enlarge a blurry photo (4x) or video (up to 4K).
                      </p>
                    </div>
                    {upscaleError && <p className="text-xs font-medium text-destructive">{upscaleError}</p>}

                    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border px-2 py-4 text-center text-xs text-muted-foreground">
                      {upscaleFile ? (
                        <ZoomIn className="h-5 w-5" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {upscaleFile ? upscaleFile.name : "Upload a video or image to upscale"}
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUploadUpscaleFile} />
                    </label>

                    {upscaleFile?.type.startsWith("video/") && (
                      <div className="grid grid-cols-2 gap-2">
                        {(["standard", "premium"] as AvatarTier[]).map((t) => {
                          const selected = upscaleTier === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setUpscaleTier(t)}
                              className={[
                                "rounded-xl px-3 py-2.5 text-left capitalize transition-colors",
                                selected ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                              ].join(" ")}
                            >
                              <span className="flex items-center gap-1.5 text-sm font-semibold">
                                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                {t}
                              </span>
                              <span className={["block text-xs normal-case", selected ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                                {UPSCALE_VIDEO_CREDIT_COST[t]} credits · {t === "premium" ? "4K" : "1080p"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={handleGenerateUpscale}
                        disabled={!upscaleFile}
                        className="rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: HOME_GRADIENT, boxShadow: HOME_GRADIENT_SHEEN }}
                      >
                        {/* Trial only covers image upscale, not video —
                            see FEATURE_TRIAL_KEYS' "upscale_image" key. */}
                        {featureTrials?.upscale_image && !upscaleFile?.type.startsWith("video/") ? "✨ Try free" : "Generate"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile's own landing for "home" reuses this exact block (unchanged
          from before this redesign) via lg:hidden — desktop shows the new
          hero+pill screen above instead. See the comment above that block. */}
      {(tab === "single" || tab === "video" || tab === "home") && (
        <div className={tab === "home" ? "lg:hidden" : undefined}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <h1 className="font-display flex items-center gap-2 text-xl font-extrabold text-foreground">
              {tab === "single" && entryHint === "carousel" ? (
                <>
                  <Images className="h-4 w-4 text-accent" />
                  Carousel
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-accent" />
                  Social Content
                </>
              )}
            </h1>
            {/* Compact format switcher, same treatment as Ad Creation's
                Image Ad / Video Ad toggle — quiet enough to read as
                "switch format", not a repeated forced choice. Hidden for
                Carousel specifically: CarouselBuilder only ever combines
                already-generated IMAGES (no video equivalent exists), so
                "Video" isn't a real option here — showing it would let a
                tap silently abandon the carousel and land in an unrelated
                single-video flow with no warning. Carousel is implicitly
                Image Post format; nothing to switch between. */}
            {!(tab === "single" && entryHint === "carousel") && (
              <div className="inline-flex shrink-0 gap-1 rounded-full bg-secondary p-1">
                {CONTENT_TYPES.map(({ tab: t, label, icon: Icon }, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(t)}
                    className={[
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      tab === t ? "bg-primary text-primary-foreground" : "text-secondary-foreground",
                    ].join(" ")}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            {tab === "single" && entryHint === "carousel"
              ? "Pick a few images and we'll turn them into one swipeable post."
              : "Create scroll-stopping posts for your social media."}
          </p>
        </div>
      )}

      {(tab === "ad" || tab === "ad-video") && (
        <>
          <div className="mb-1 flex items-center justify-between gap-3">
            <h1 className="font-display flex items-center gap-2 text-xl font-extrabold text-foreground">
              <Megaphone className="h-4 w-4 text-accent" />
              Ad Creation
            </h1>
            {/* Compact format switcher, not a decision gate — arriving here
                via a specific Home pill (Image Ad / AI UGC) already IS the
                choice, so this must read as "you're on X, tap to switch"
                rather than presenting two equal-weight options to pick
                from again. Deliberately smaller/quieter than the create
                screen's own primary controls (no description text, pill
                shape, inline width) — see the two large cards this
                replaced, flagged by the founder as re-asking a choice
                that was already made. */}
            <div className="inline-flex shrink-0 gap-1 rounded-full bg-secondary p-1">
              {AD_TYPES.map(({ tab: t, label, icon: Icon }, i) => (
                <button
                  key={i}
                  onClick={() => goTo(t)}
                  className={[
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    tab === t ? "text-white" : "text-secondary-foreground",
                  ].join(" ")}
                  style={
                    tab === t
                      ? {
                          background: HOME_GRADIENT,
                          boxShadow: HOME_GRADIENT_SHEEN,
                        }
                      : undefined
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">Tell Punqle what you're advertising — it does the rest.</p>
        </>
      )}

      {/* No page-level heading here (2026-09-23) — this used to read
          "E-commerce — Try-On" / "E-commerce — Bulk Creative", a category
          prefix that doesn't mean much to the user and duplicated each
          form's own first-step heading ("Your photo" / "Choose your
          products") right below it. Removed rather than reworded, same
          "only one heading, let the specific one carry it" principle
          already applied to Video Ad's Style step. */}

      {(tab === "single" || tab === "home") && (
        <div className={tab === "home" ? "lg:hidden" : undefined}>
          {/* key={tab} forces a real remount when transitioning between
              "home" (mobile fallback) and "single" — without it, both
              share this same render condition, so React would keep the
              same instance mounted across that transition and silently
              never pick up a freshly-set initialIdea (its useState
              initializer only runs once, at the ORIGINAL mount). Found
              live: prefilledIdea from the home prompt box/Carousel pill
              wasn't reaching IdeaStep until this was added. */}
          <SinglePostForm
            key={tab}
            credits={credits}
            setCredits={setCredits}
            initialIdea={prefilledIdea}
            onInitialIdeaConsumed={() => setPrefilledIdea(undefined)}
            initialGeneratedImage={prefilledSocialImage}
            onInitialGeneratedImageConsumed={() => setPrefilledSocialImage(undefined)}
            entryHint={entryHint}
          />
        </div>
      )}
      {tab === "plan" && <WeeklyPlanForm credits={credits} setCredits={setCredits} />}
      {tab === "calendar" && <CalendarView onGoToWeeklyPlan={() => goTo("plan")} />}
      {tab === "performance" && <PerformanceView />}
      {tab === "video" && <VideoPostForm credits={credits} setCredits={setCredits} />}
      {tab === "history" && <HistoryTab />}
      {tab === "competitor" && (
        <CompetitorAnalysis
          onCreateAd={(idea) => {
            setPrefilledIdea(idea);
            setEntryHint(undefined);
            goTo("single");
          }}
        />
      )}
      {tab === "ad" && (
        <AdCreationForm
          credits={credits}
          setCredits={setCredits}
          initialGeneratedImage={prefilledAdImage}
          onInitialGeneratedImageConsumed={() => setPrefilledAdImage(undefined)}
        />
      )}
      {tab === "ad-video" && (
        <AdVideoForm
          credits={credits}
          setCredits={setCredits}
          initialVideo={prefilledAdVideo}
          onInitialVideoConsumed={() => setPrefilledAdVideo(undefined)}
        />
      )}
      {tab === "bulk-creative" && <BulkCreativeForm credits={credits} setCredits={setCredits} />}
      {tab === "tryon" && (
        <TryOnForm
          credits={credits}
          setCredits={setCredits}
          onSendToSocialPost={(payload) => {
            setPrefilledSocialImage(payload);
            setEntryHint(undefined);
            goTo("single");
          }}
          onSendToImageAd={(payload) => {
            setPrefilledAdImage(payload);
            goTo("ad");
          }}
          onSendToVideoAd={(payload) => {
            setPrefilledAdVideo(payload);
            goTo("ad-video");
          }}
        />
      )}
    </main>
  );
}
