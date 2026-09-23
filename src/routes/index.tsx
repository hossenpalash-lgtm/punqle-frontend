import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Images,
  Layers,
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
  checkTalkingVideoStatus,
  checkVideoUpscaleStatus,
  combineActorAndAppScreenshot,
  combineActorAndProduct,
  createCustomActor,
  deleteCustomActor,
  fetchActorPreviewVideoUrl,
  fetchActorSituations,
  fetchAdCredits,
  fetchImageActors,
  fetchMyCustomActors,
  generateImageDirect,
  generateImageVideo,
  generateTalkingVideo,
  generateUnboxingShot,
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

type Tab = "home" | "single" | "plan" | "calendar" | "performance" | "history" | "competitor" | "video" | "ad" | "ad-video" | "bulk-creative" | "tryon";

export const Route = createFileRoute("/")({
  component: HomeScreen,
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
const IMAGE_VIDEO_MODEL_OPTIONS: { id: ImageVideoModel; label: string; min: number; max: number }[] = [
  { id: "kling_3_pro", label: "Kling 3.0 Pro", min: 3, max: 15 },
  { id: "seedance_2_5", label: "Seedance 2.5", min: 3, max: 15 },
  { id: "veo_3_1", label: "Veo 3.1", min: 4, max: 8 },
];
const IMAGE_VIDEO_MODEL_LABELS: Record<ImageVideoModel, string> = {
  kling_3_pro: "Kling 3.0 Pro",
  seedance_2_5: "Seedance 2.5",
  veo_3_1: "Veo 3.1",
};
// Display-only estimate, mirrors the backend's own provisional per-
// second credit rates — the backend always computes the real charge
// itself, this is just so the Generate button can show a cost upfront.
const IMAGE_VIDEO_CREDIT_PER_SECOND: Record<ImageVideoModel, number> = {
  veo_3_1: 1.25,
  seedance_2_5: 6,
  kling_3_pro: 8,
};
// Mirrors the backend's own TALKING_VIDEO_REDUB_SURCHARGE — display only.
const TALKING_VIDEO_REDUB_SURCHARGE = 10;
// Mirrors the backend's own ACTOR_VIDEO_V2_CREDIT_COST (main.py) — same
// flat price AdVideoForm.tsx's "Punqle Actors" style already charges,
// since this reuses that exact same endpoint. Display only.
const ACTOR_VIDEO_V2_CREDIT_COST = 30;

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
  const [videoPanel, setVideoPanel] = useState<"closed" | "composer" | "generating" | "result">("closed");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoModel, setVideoModel] = useState<ImageVideoModel>("kling_3_pro");
  const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>("1:1");
  const [videoDuration, setVideoDuration] = useState(5);
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
  const [videoNarration, setVideoNarration] = useState("");
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
  const [actorPreviewVideos, setActorPreviewVideos] = useState<Record<string, string>>({});
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [actorNarration, setActorNarration] = useState("");
  const [actorVoiceEngine, setActorVoiceEngine] = useState<ActorVoiceEngine>("openai_standard");
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
    if (homeMode !== "talking_actors" && homeMode !== "product") return;
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
  }, [homeMode]);

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
        const r = await generateImageDirect(createActorPrompt.trim(), "square", "nano_banana_pro");
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
  const handleSwitchMode = (mode: HomeMode) => {
    handleResetHome();
    setHomeMode(mode);
    setShowMoreMenu(false);
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
    setVideoModel("kling_3_pro");
    setVideoAspectRatio("1:1");
    setVideoDuration(5);
    setVideoError(null);
    setVideoNarrationEnabled(false);
    setVideoNarration("");
    setVideoVoiceGender("female");
    setVideoPanel("composer");
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
  const handleUploadOwnImageForVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (!match) return;
      setVideoRefImage({ mimeType: match[1], base64: match[2] });
      setVideoPrompt("");
      setVideoModel("kling_3_pro");
      setVideoAspectRatio("1:1");
      setVideoDuration(5);
      setVideoError(null);
      setVideoPanel("composer");
    };
    reader.readAsDataURL(file);
  };

  const handleVideoModelChange = (m: ImageVideoModel) => {
    setVideoModel(m);
    const opt = IMAGE_VIDEO_MODEL_OPTIONS.find((o) => o.id === m);
    if (opt) setVideoDuration((d) => Math.min(opt.max, Math.max(opt.min, d)));
  };

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
      setVideoModel("kling_3_pro");
      setVideoAspectRatio(productVideoAspectRatio);
      setVideoDuration(5);
      setVideoError(null);
      setVideoStage("animating");
      setVideoPanel("generating");
      const started = await generateTalkingVideo(
        combined.banner_image_base64,
        "image/png",
        narration,
        "female",
        "kling_3_pro",
        5,
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

  // Quick-pick surface presets insert a short scene phrase rather than
  // replacing whatever the user already typed, so picking one is a
  // starting point, not a reset.
  const handlePickUnboxingSurface = (phrase: string) => {
    setUnboxingScene((prev) => (prev.trim() ? `${prev.trim()}, ${phrase}` : phrase));
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
        setVideoError("The video didn't come back — please try again.");
        setVideoPanel("composer");
      }
    } catch (err) {
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
  const startVideoVersion = async (versionIndex: number, totalVersions: number) => {
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
        videoPrompt.trim(),
        videoModel,
        videoDuration,
        videoAspectRatio,
      );
      videoPollRef.current = setTimeout(() => pollImageVideo(r.job_id, r.operation, versionIndex, totalVersions), 8000);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Couldn't start the video.");
      setVideoPanel("composer");
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoRefImage) return;
    if (videoNarrationEnabled ? !videoNarration.trim() : !videoPrompt.trim()) return;
    setVideoError(null);
    setVideoVariants([]);
    setVideoPanel("generating");
    await startVideoVersion(1, videoVersions);
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
  // OmniHuman always speaks with a fixed gender-matched OpenAI voice,
  // no engine choice.
  const handleGenerateActorVideo = async () => {
    if ((!selectedActorId && !selectedCustomActorId) || !actorNarration.trim()) return;
    if (credits !== null && credits < ACTOR_VIDEO_V2_CREDIT_COST) return;
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
      <div
        className="mb-5 flex items-center justify-between rounded-2xl bg-card p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Your credits</span>
        </div>
        <span className="text-lg font-extrabold text-primary">
          {credits === null ? "..." : credits}
        </span>
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
          <div className="flex flex-col items-center pt-4 text-center">
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground">
              What are we creating today?
            </h1>
            <p className="text-sm text-muted-foreground">
              Turn your ideas into scroll-stopping content, in minutes.
            </p>
          </div>

          <div className="flex-1" />

          {/* Ad Creation, promoted out of "See more" (2026-09-22) — real
              competitor research (AdCreative.ai, Creatify) found the
              strongest ad-focused tools keep their goal/platform-driven ad
              flow visibly separate from casual content generators, never
              folded into an overflow menu. Distinct accent styling (not
              just another pill in the row below) signals it's a different,
              higher-intent action than Ready Actors/Video/Image/etc —
              those are quick one-shot generators with no Goal/CTA/Platform/
              batch-variant concept; Ad Creation (tab=ad) is the campaign-
              grade tool, and its own Image Ad/Video Ad toggle (AD_TYPES)
              already covers both formats from this one entry point. */}
          <button
            onClick={() => goTo("ad")}
            className="mb-3 flex w-full items-center justify-between gap-3 self-center rounded-2xl border border-accent bg-accent/10 px-5 py-3.5 text-left transition-colors hover:bg-accent/15"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)" }}
              >
                <Megaphone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Ad Creation</p>
                <p className="text-xs text-muted-foreground">
                  Goal-driven ads, ready for Facebook &amp; Instagram — Image or Video
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-accent" />
          </button>

          {/* Unified creation bar (2026-09-17, Arcads parity) — one
              persistent bar, mode pills switch its content in place. Only
              one homeMode block ever renders below, which is what makes
              the old videoPanel/productPanel double-render bug
              structurally impossible now. Try-On/Carousel keep their
              exact original goTo() handlers, unchanged, tucked under "See
              more" instead of being permanent top-level pills. */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => handleSwitchMode("talking_actors")}
              className={[
                "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold",
                homeMode === "talking_actors" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
              ].join(" ")}
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <UserRound className="h-4 w-4" />
              Ready Actors
            </button>
            <button
              onClick={() => handleSwitchMode("video")}
              className={[
                "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold",
                homeMode === "video" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
              ].join(" ")}
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <Video className="h-4 w-4" />
              Video
            </button>
            <button
              onClick={() => handleSwitchMode("image")}
              className={[
                "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold",
                homeMode === "image" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
              ].join(" ")}
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <Sparkles className="h-4 w-4" />
              Image
            </button>
            <button
              onClick={() => handleSwitchMode("product")}
              className={[
                "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold",
                homeMode === "product" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
              ].join(" ")}
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <Package className="h-4 w-4" />
              Product
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <MoreHorizontal className="h-4 w-4" />
                See more
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showMoreMenu && (
                <div
                  className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-card py-1"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      handleSwitchMode("unboxing");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    <PackageOpen className="h-4 w-4" />
                    Unboxing
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      handleSwitchMode("show_app");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    <Smartphone className="h-4 w-4" />
                    Show Your App
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      handleSwitchMode("upscale");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    <ZoomIn className="h-4 w-4" />
                    Upscale
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      goTo("tryon");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    <Shirt className="h-4 w-4" />
                    Try-On
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setEntryHint("carousel");
                      goTo("single");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    <Images className="h-4 w-4" />
                    Carousel
                  </button>
                </div>
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
                          className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none"
                        />
                        <button
                          onClick={handleGenerateActorPhoto}
                          disabled={!createActorPrompt.trim() || createActorGenerating}
                          className="w-full rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                        >
                          {createActorGenerating ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Generate (3 credits)"}
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
                              className="min-w-0 flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none"
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
                          className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none"
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
                          className="w-full rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                        >
                          {createActorSaving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save actor"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4">
                    {actorError && <p className="mb-2 text-xs font-medium text-destructive">{actorError}</p>}
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Choose your actor
                    </p>
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
                            actorGenderFilter === g ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                          ].join(" ")}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    {actorsLoading || !situationsLoaded ? (
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
                                </span>
                                <span className="text-[10px] font-medium text-foreground">{a.name}</span>
                                <span className="text-[9px] text-muted-foreground">{situationLabel}</span>
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
                                    className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-white"
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
                                    className="w-full rounded border border-border bg-card px-1 text-center text-[10px] text-foreground focus:outline-none"
                                  />
                                ) : (
                                  <button
                                    onClick={() => handleStartRenameCustomActor(a)}
                                    className="flex items-center gap-0.5 text-[10px] font-medium text-foreground"
                                  >
                                    {a.name}
                                    <Pencil className="h-2 w-2 text-muted-foreground" />
                                  </button>
                                )}
                                <span className="text-[9px] text-muted-foreground">Your actor</span>
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
                            <span className="text-[10px] font-medium text-foreground">
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
                          <span className="text-[10px] font-medium text-foreground">Create your own</span>
                        </button>
                      </div>
                      );
                    })()}

                    {!selectedActorId && !selectedCustomActorId && (
                      <p className="mt-4 text-xs text-muted-foreground">Pick an actor above to set voice options.</p>
                    )}

                    {selectedActorId && (
                      <>
                        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Voice
                        </p>
                        <select
                          value={actorVoiceEngine}
                          onChange={(e) => setActorVoiceEngine(e.target.value as ActorVoiceEngine)}
                          className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="openai_natural">OpenAI (Natural)</option>
                          <option value="openai_standard">OpenAI (Standard) — Recommended</option>
                          <option value="elevenlabs">ElevenLabs</option>
                        </select>
                      </>
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
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Audio settings
                        </p>
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
                    )}

                    <textarea
                      value={actorNarration}
                      onChange={(e) => setActorNarration(e.target.value)}
                      placeholder="What should your actor say?…"
                      rows={2}
                      className="mt-3 w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none"
                    />

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={handleGenerateActorVideo}
                        disabled={
                          (!selectedActorId && !selectedCustomActorId) ||
                          !actorNarration.trim() ||
                          actorPanel === "generating" ||
                          taggingEmotions ||
                          (credits !== null && credits < ACTOR_VIDEO_V2_CREDIT_COST)
                        }
                        className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                      >
                        {actorPanel === "generating" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : taggingEmotions ? (
                          "Adding emotions…"
                        ) : (
                          `Generate (${ACTOR_VIDEO_V2_CREDIT_COST} credits)`
                        )}
                      </button>
                    </div>

                    {actorPanel === "generating" && (
                      <div className="mt-3 flex flex-col items-center gap-2 border-t border-border pt-3">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                        <p className="text-xs text-muted-foreground">Creating your actor's video… usually a few minutes.</p>
                      </div>
                    )}
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
                    <video
                      ref={videoResultRef}
                      controls
                      autoPlay
                      loop
                      className="max-h-[420px] w-full bg-[#1E1F24]"
                      src={`data:video/mp4;base64,${homeGeneratedVideo}`}
                    />
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
                          onClick={handleGenerateVideo}
                          title="Generate again with the same photo and settings"
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
                ) : !videoRefImage ? (
                  <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload a photo to turn into a short video.</p>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
                      <Upload className="h-4 w-4" />
                      Upload a photo
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadOwnImageForVideo} />
                    </label>
                  </div>
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
                      <label className="flex cursor-pointer items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground">
                        <Upload className="h-3 w-3" />
                        Replace
                        <input type="file" accept="image/*" className="hidden" onChange={handleReplaceVideoImage} />
                      </label>
                    </div>

                    {!videoNarrationEnabled && (
                      <textarea
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder="Describe the motion… (e.g. she walks towards the camera, notices near the end, and does a pose)"
                        rows={2}
                        className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none"
                      />
                    )}

                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Model</p>
                      <div className="flex flex-wrap gap-1.5">
                        {IMAGE_VIDEO_MODEL_OPTIONS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleVideoModelChange(m.id)}
                            className={[
                              "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                              videoModel === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                            ].join(" ")}
                          >
                            {videoModel === m.id && <Check className="h-3 w-3" />}
                            {m.label}
                          </button>
                        ))}
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

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Length</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const opt = IMAGE_VIDEO_MODEL_OPTIONS.find((o) => o.id === videoModel)!;
                            setVideoDuration((d) => Math.max(opt.min, d - 1));
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-foreground">{videoDuration}s</span>
                        <button
                          onClick={() => {
                            const opt = IMAGE_VIDEO_MODEL_OPTIONS.find((o) => o.id === videoModel)!;
                            setVideoDuration((d) => Math.min(opt.max, d + 1));
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Versions</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setVideoVersions((v) => (v > 1 ? ((v - 1) as 1 | 2 | 3) : v))}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-foreground">{videoVersions}</span>
                        <button
                          onClick={() => setVideoVersions((v) => (v < 3 ? ((v + 1) as 1 | 2 | 3) : v))}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={videoNarrationEnabled}
                          onChange={(e) => setVideoNarrationEnabled(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Add spoken narration
                      </label>
                    </div>

                    {videoNarrationEnabled && (
                      <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
                        <textarea
                          value={videoNarration}
                          onChange={(e) => setVideoNarration(e.target.value)}
                          placeholder="What should they say?… (e.g. This bottle is very durable and keeps your drink cold all day.)"
                          rows={2}
                          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
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

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => setVideoRefImage(null)}
                        className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleGenerateVideo}
                        disabled={
                          !videoRefImage ||
                          (videoNarrationEnabled ? !videoNarration.trim() : !videoPrompt.trim())
                        }
                        className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                      >
                        Generate ({(Math.ceil(videoDuration * IMAGE_VIDEO_CREDIT_PER_SECOND[videoModel]) + (videoNarrationEnabled ? TALKING_VIDEO_REDUB_SURCHARGE : 0)) * videoVersions} credits)
                      </button>
                    </div>

                    {videoPanel === "generating" && (
                      <div className="flex flex-col items-center gap-2 border-t border-border pt-3">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                        <p className="text-xs text-muted-foreground">
                          {videoNarrationEnabled
                            ? videoStage === "animating"
                              ? "Animating your video…"
                              : "Adding the voice…"
                            : "Generating your video… this can take a minute or two."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ---------- Image mode ---------- */}
            {homeMode === "image" && (
              <>
                {homeGeneratedImage ? (
                  <>
                    <img
                      src={`data:image/png;base64,${homeGeneratedImage}`}
                      alt="Generated"
                      className="max-h-[420px] w-full object-contain bg-[#1E1F24]"
                    />
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
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-xs text-muted-foreground">{IMAGE_MODEL_LABELS[homeImageModel]}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleTurnImageIntoActor}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Actor
                        </button>
                        <button
                          onClick={() => {
                            handleOpenVideoComposer();
                            setHomeMode("video");
                          }}
                          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          Make a video
                        </button>
                        <button
                          onClick={handleHomeGenerateImage}
                          title="Generate again with the same prompt and settings"
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
                      className="w-full resize-none rounded-t-3xl bg-transparent px-5 py-4 text-sm text-foreground focus:outline-none"
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
                      <div className="flex items-center gap-1">
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
                    <video
                      ref={videoResultRef}
                      controls
                      autoPlay
                      loop
                      className="max-h-[420px] w-full bg-[#1E1F24]"
                      src={`data:video/mp4;base64,${homeGeneratedVideo}`}
                    />
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
                  </>
                ) : productPanel === "generating" ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <p className="text-xs text-muted-foreground">Creating your image…</p>
                  </div>
                ) : videoPanel === "generating" ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <p className="text-xs text-muted-foreground">
                      {videoStage === "animating" ? "Animating your video…" : "Adding the voice…"}
                    </p>
                  </div>
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
                      className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={handleGenerateProduct}
                        disabled={!videoRefImage || !productFile || !productPrompt.trim()}
                        className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                      >
                        Generate
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
                  <div className="flex flex-col items-center gap-2 px-4 py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <p className="text-xs text-muted-foreground">Creating your shot…</p>
                  </div>
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
                      <p className="text-sm font-bold text-foreground">Unboxing shot</p>
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

                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { label: "Marble", phrase: "on a marble kitchen counter, soft morning light" },
                          { label: "Wood", phrase: "on a warm wooden table, natural daylight" },
                          { label: "Linen", phrase: "on soft wrinkled linen fabric, cozy natural light" },
                          { label: "Outdoor", phrase: "on a rustic outdoor patio table, golden hour light" },
                          { label: "Tile", phrase: "on a clean bathroom tile counter, bright even light" },
                        ] as const
                      ).map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handlePickUnboxingSurface(preset.phrase)}
                          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={unboxingScene}
                      onChange={(e) => setUnboxingScene(e.target.value)}
                      placeholder="Describe the surface or setting… (e.g. on a marble kitchen counter, soft morning light)"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={handleGenerateUnboxing}
                        disabled={!unboxingFile || !unboxingScene.trim()}
                        className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                      >
                        Generate
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
                  <div className="flex flex-col items-center gap-2 px-4 py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <p className="text-xs text-muted-foreground">Creating your shot…</p>
                  </div>
                ) : (
                  <div className="space-y-3 px-4 py-3">
                    {/* Heading added (2026-09-23), same fix as Unboxing/
                        Upscale above — a bare 2-upload grid with no
                        heading didn't say what the pill makes. */}
                    <div>
                      <p className="text-sm font-bold text-foreground">Show Your App</p>
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
                        className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                      >
                        Generate
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
                  <div className="flex flex-col items-center gap-2 px-4 py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <p className="text-xs text-muted-foreground">
                      {upscaleFile?.type.startsWith("video/")
                        ? "Upscaling your video… this can take several minutes. You can browse other tabs while you wait — just don't switch away from Upscale here."
                        : "Upscaling your image…"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 px-4 py-3">
                    {/* Heading added (2026-09-23) — competitor research
                        (Topaz Labs' own upscale page leads with a plain-
                        language heading before the upload box, not just a
                        bare drop zone) — same fix as Unboxing above. */}
                    <div>
                      <p className="text-sm font-bold text-foreground">Upscale</p>
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
                        className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                      >
                        Generate
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
                    tab === t ? "bg-primary text-primary-foreground" : "text-secondary-foreground",
                  ].join(" ")}
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

      {(tab === "bulk-creative" || tab === "tryon") && (
        <h1 className="font-display mb-4 flex items-center gap-2 text-xl font-extrabold text-foreground">
          <Layers className="h-4 w-4 text-accent" />
          E-commerce — {tab === "bulk-creative" ? "Bulk Creative" : "Try-On"}
        </h1>
      )}

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
