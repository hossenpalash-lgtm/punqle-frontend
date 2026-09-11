import {
  AlertCircle,
  Camera,
  Captions,
  Check,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  Music,
  Settings2,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  addCaptionsToAvatarVideo,
  addMusicToAvatarVideo,
  concatVideos,
  base64ToFile,
  checkActorVideoV2Status,
  checkAvatarVideoStatus,
  checkCinematicUgcStatus,
  checkVideoStatus,
  fetchActorSituations,
  fetchAvatarOptions,
  fetchAvatarVoices,
  fetchBusinessProfile,
  fetchImageActors,
  generateAdCaptions,
  generateVideoScriptAngles,
  startActorVideoV2,
  startAvatarVideoGeneration,
  startCinematicUgcGeneration,
  startVideoGeneration,
  understandProductLink,
  type ActorVoiceEngine,
  type AdGoal,
  type ApiAvatarOption,
  type ApiAvatarVoicesResponse,
  type ApiImageActor,
  type ApiVideoOperation,
  type ApiVideoScriptAngle,
  type AvatarLanguage,
  type AvatarMusicMood,
  type AvatarTier,
  type CaptionStyle,
  type VideoAspectRatio,
} from "@/lib/api";
import { findVideoStyle, headlineFontStyleFor, type VideoStyle } from "@/lib/video-style";
import { ANGLES, GOALS } from "./AdBriefStep";
import { AvatarPickerStep } from "./AvatarPickerStep";
import { EditVideoPanel } from "./EditVideoPanel";
import { ProductPicker } from "./ProductPicker";
import { PublishToTikTok } from "./PublishToTikTok";
import { PublishToYouTube } from "./PublishToYouTube";
import { VideoStyleStep } from "./VideoStyleStep";

const VIDEO_CREDIT_COST = 10;
const POLL_INTERVAL_MS = 8000;
// Avatar "premium" tier costs the same real amount as a Veo video, so it
// reuses VIDEO_CREDIT_COST directly (see main.py's AVATAR_PREMIUM_CREDIT_COST);
// "standard" gets its own, cheaper constant matching main.py's real one.
const AVATAR_STANDARD_CREDIT_COST = 4;
// Cinematic UGC (Seedance 2.5) — real per-second cost confirmed live
// against a real billed Replicate invoice 2026-09-06 (~$0.103/s at
// 480p, ~$0.231/s at 720p for an 8s clip) — matches main.py's
// CINEMATIC_UGC_CREDIT_COST exactly.
const CINEMATIC_UGC_CREDIT_COST: Record<AvatarTier, number> = { standard: 25, premium: 46 };
// AI Actor talking video (OmniHuman) — 8s x $0.14/s = $1.12 real cost,
// matches main.py's AI_ACTOR_VIDEO_CREDIT_COST exactly. One fixed price,
// no tier (OmniHuman has no cheap/expensive engine split like HeyGen).
const AI_ACTOR_VIDEO_CREDIT_COST = 30;

type WizardStep = "create" | "review-script" | "generating" | "result" | "receiving";

// A pasted product link vs. a typed description share one input — see
// AdCreationForm.tsx's identical helper for why this specific regex.
const looksLikeUrl = (s: string) => /^https?:\/\//i.test(s) || /^[\w-]+(\.[a-z]{2,})+(\/\S*)?$/i.test(s);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

// Video Ad — one Arcads-style screen (2026-09-10 redesign, same rationale
// as AdCreationForm.tsx's sibling rewrite): a single smart input (link or
// free text) + Goal, with Style/script-language/angle/aspect-ratio/photo
// (and, when relevant, the avatar picker or Cinematic UGC scene prompt)
// tucked behind an optional collapsed Settings panel. Replaces the old
// choose/quick/brief/angles/style/avatar-picker/setup chain — a real
// Arcads video review found every one of their flows is "describe it,
// optional settings, generate," never a sequence of separate mandatory
// screens, and Video Ad's old "Pick a script" step in particular had no
// skip at all.
//
// Also fixes a real bug found while reading this file for the rewrite:
// the old Quick Create hardcoded videoStyle: "product_showcase" in its
// generation call regardless of what videoStyle actually was — so a user
// picking AI Presenter/Cinematic UGC via the (then-separate) Style step
// and using Quick Create would silently get a generic product video
// instead. The new single submit path always reads videoStyle live, so
// whatever's selected in Settings is what actually generates.
export function AdVideoForm({
  credits,
  setCredits,
  initialVideo,
  onInitialVideoConsumed,
}: {
  credits: number | null;
  setCredits: (n: number) => void;
  // Set when arriving here from Try-On's "Video Ad" handoff — an
  // already-animated video, not a text brief, so it skips generation
  // entirely and lands straight on the result screen. videoOperation is
  // the same Veo operation shape /ads/generate-video itself produces
  // (Veo doesn't care which endpoint created it), so EditVideoPanel's
  // logo/brand-color/voiceover/caption controls work on it unmodified —
  // that's how Brand Kit gets applied to a Try-On video, with no new
  // video-compositing code. Only a free caption call runs on mount.
  initialVideo?: { videoBase64: string; operation: ApiVideoOperation; itemDescription: string; goal: AdGoal };
  onInitialVideoConsumed?: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(initialVideo ? "receiving" : "create");

  // The one main input — a pasted link or a typed description.
  const [mainInput, setMainInput] = useState("");
  const [inputFetching, setInputFetching] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [offerDescription, setOfferDescription] = useState("");
  const [goal, setGoal] = useState<AdGoal>(initialVideo?.goal ?? "sales");
  const [angle, setAngle] = useState<string | null>(null);
  const [videoStyle, setVideoStyle] = useState<VideoStyle>("product_showcase");
  // Only matters if AI Presenter ends up picked — HeyGen has real Bangla
  // voices, so a Bangla script is what makes them actually usable, not
  // just a cosmetic toggle.
  const [scriptLanguage, setScriptLanguage] = useState<AvatarLanguage>("english");

  // Script — resolved automatically right before generating (Veo/Avatar
  // paths only), respecting whichever angle chip the user picked in
  // Settings, or the AI's own recommendation if left on "Let Punqle
  // choose". No separate mandatory review screen any more.
  const [anglesLoading, setAnglesLoading] = useState(false);
  const [pickedScript, setPickedScript] = useState<{ headline: string; narration: string } | null>(null);

  // "AI Presenter" style — a talking avatar (HeyGen) reads the picked
  // script's narration, instead of Veo's b-roll-style video. Tier is
  // picked first (any avatar works at either tier — confirmed live
  // against HeyGen's real API), then an avatar from the live catalog.
  const [avatarTier, setAvatarTier] = useState<AvatarTier>("standard");
  const [avatarOptions, setAvatarOptions] = useState<ApiAvatarOption[]>([]);
  const [avatarOptionsLoading, setAvatarOptionsLoading] = useState(false);
  const [avatarOptionsError, setAvatarOptionsError] = useState<string | null>(null);
  const [avatarGenderFilter, setAvatarGenderFilter] = useState<"all" | "female" | "male">("all");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedAvatarGender, setSelectedAvatarGender] = useState<string | null>(null);
  const [avatarVoices, setAvatarVoices] = useState<ApiAvatarVoicesResponse | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("bold");
  // Set when the backend automatically fell back from Premium to
  // Standard because this specific avatar didn't support Premium —
  // shown so the user knows why they were charged less than expected,
  // rather than a silent discrepancy.
  const [avatarFellBack, setAvatarFellBack] = useState(false);
  // Raw base64 of the current avatar result — needed to send back to
  // /ads/avatar-video-add-music (videoUrl is a data: URL, not the bare
  // base64 the backend expects).
  const [avatarVideoBase64, setAvatarVideoBase64] = useState<string | null>(null);
  const [addingMusic, setAddingMusic] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [musicMood, setMusicMood] = useState<AvatarMusicMood | null>(null);
  const [addingScene, setAddingScene] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [hasAddedScene, setHasAddedScene] = useState(false);
  const [addingCaptions, setAddingCaptions] = useState(false);
  const [captionsError, setCaptionsError] = useState<string | null>(null);
  const [hasAddedCaptions, setHasAddedCaptions] = useState(false);
  // True for a result produced via the avatar OR Cinematic UGC path —
  // both return raw base64 bytes, not a Veo operation handle
  // EditVideoPanel can re-download from, so the result screen skips it
  // for both and shows the music/scene/captions block instead (also
  // shared, since both paths write the same avatarVideoBase64 state).
  const [isAvatarResult, setIsAvatarResult] = useState(false);

  // Cinematic UGC (Seedance 2.5) — a third video path alongside Veo and
  // HeyGen, for real human-product interaction. Tier mirrors Avatar's
  // Standard/Premium naming, split by resolution (480p/720p) instead of
  // engine version. No avatar-grid picker for this path — Seedance has
  // no stock-character catalog (confirmed live against its real API).
  const [cinematicUgcTier, setCinematicUgcTier] = useState<AvatarTier>("standard");
  const [cinematicUgcScenePrompt, setCinematicUgcScenePrompt] = useState("");

  // "Punqle Actors" style (v2) — a pre-baked Veo base clip per one of
  // Punqle's own _IMAGE_AD_ACTORS personas (same library Image Ad's
  // Actor picker uses), redubbed with a fresh per-user narration track
  // via Sync Labs. voiceEngine is a real dropdown, not a hidden default
  // — a live, founder-judged A/B/C listening test found the real cost
  // difference between the three negligible, and a real competitor's own
  // simple model-picker precedent settled on keeping all three rather
  // than hardcoding one winner. "openai_natural" wins that listening
  // test and is also the cheapest, hence the default.
  const [actors, setActors] = useState<ApiImageActor[]>([]);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [actorGenderFilter, setActorGenderFilter] = useState<"all" | "female" | "male">("all");
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [actorVoiceEngine, setActorVoiceEngine] = useState<ActorVoiceEngine>("openai_natural");
  // actor_id -> situation_id (e.g. "coffee_shop") for whichever actors
  // actually have a pre-baked clip ready right now — an actor missing
  // from this map isn't broken, just not yet populated (real library
  // still growing, see scripts/populate_actor_video_clips.py).
  const [actorSituations, setActorSituations] = useState<Record<string, string>>({});

  // Real "Audio Settings" review step (added 2026-09-11, matching a real
  // competitor's own script/emotion-tag editor the founder pointed to) —
  // shown after the AI writes a script and before generating, so the
  // narration can be edited and (ElevenLabs only) emotion tags/voice
  // sliders applied. Defaults match this session's own validated,
  // Arcads-sourced values — leaving them untouched reproduces the exact
  // behavior that already shipped.
  const [actorNarrationDraft, setActorNarrationDraft] = useState("");
  const [elevenlabsStability, setElevenlabsStability] = useState(0.5);
  const [elevenlabsSimilarity, setElevenlabsSimilarity] = useState(0.75);
  const [elevenlabsStyle, setElevenlabsStyle] = useState(0.5);
  const [elevenlabsSpeed, setElevenlabsSpeed] = useState(1.0);
  const actorNarrationTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Try-On's animate step always renders 9:16 (a portrait photo of a
  // standing person) — the handed-off video really is that shape,
  // regardless of this form's own 16:9 default.
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>(initialVideo ? "9:16" : "16:9");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [videoOperation, setVideoOperation] = useState<ApiVideoOperation | null>(null);
  const [narration, setNarration] = useState("");
  const [hasLogo, setHasLogo] = useState(false);
  const [hasBrandColor, setHasBrandColor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const headlineRef = useRef("");

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchBusinessProfile()
      .then((profile) => {
        setHasLogo(!!profile.logo_base64);
        setHasBrandColor(!!profile.brand_color);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!initialVideo) return;
    onInitialVideoConsumed?.();
    generateAdCaptions(initialVideo.itemDescription, initialVideo.goal, null, 1)
      .then((r) => {
        setCaption(r.captions[0]?.facebook_caption ?? "");
        setVideoUrl(`data:video/mp4;base64,${initialVideo.videoBase64}`);
        setVideoOperation(initialVideo.operation);
        setStep("result");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Couldn't prepare your ad.");
        setStep("create");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avatar catalog + voices load as soon as AI Presenter is picked in
  // Settings, so the grid is ready the moment the user scrolls to it —
  // replaces the old "on Continue from Style" trigger.
  useEffect(() => {
    if (videoStyle !== "avatar") return;
    if (avatarOptions.length === 0 && !avatarOptionsLoading) {
      setAvatarOptionsLoading(true);
      setAvatarOptionsError(null);
      fetchAvatarOptions()
        .then((r) => {
          setAvatarOptions(r.avatars);
          setAvatarOptionsLoading(false);
        })
        .catch((err) => {
          setAvatarOptionsError(err instanceof Error ? err.message : "Couldn't load avatars — please try again.");
          setAvatarOptionsLoading(false);
        });
    }
    if (!avatarVoices) {
      fetchAvatarVoices()
        .then((r) => {
          setAvatarVoices(r);
          setSelectedVoiceId(r[scriptLanguage].female[0]?.voice_id ?? r[scriptLanguage].male[0]?.voice_id ?? null);
        })
        .catch(() => {
          // Silently falls back to the backend's own English default —
          // the voice picker just won't show, not worth a loud error
          // over a free, secondary customization.
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoStyle]);

  // Punqle Actors' catalog is the same free, already-live GET
  // /ads/image-actors Image Ad's own Actor picker uses — loads as soon
  // as this style is picked, same lazy-on-select pattern as Avatar above.
  useEffect(() => {
    if (videoStyle !== "ai_actor") return;
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
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoStyle]);

  const handleFileChange = (f: File | null) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
    setFile(f);
  };

  const fetchAvatarOptionsForStep = () => {
    setAvatarOptionsLoading(true);
    setAvatarOptionsError(null);
    fetchAvatarOptions()
      .then((r) => {
        setAvatarOptions(r.avatars);
        setAvatarOptionsLoading(false);
      })
      .catch((err) => {
        setAvatarOptionsError(err instanceof Error ? err.message : "Couldn't load avatars — please try again.");
        setAvatarOptionsLoading(false);
      });
  };

  const handleSelectAvatar = (avatarId: string, gender: string | null) => {
    setSelectedAvatarId(avatarId);
    setSelectedAvatarGender(gender);
  };

  // Switching tier can hide the currently-picked avatar (Premium filters
  // out "expressive"-named avatars, confirmed to reject it) — clear the
  // stale selection rather than leaving an invisible, soon-to-fail pick
  // sitting in state.
  const handleAvatarTierChange = (t: AvatarTier) => {
    setAvatarTier(t);
    setSelectedAvatarId(null);
    setSelectedAvatarGender(null);
  };

  const poll = async (operation: ApiVideoOperation) => {
    try {
      const r = await checkVideoStatus(operation, headlineRef.current, aspectRatio, headlineFontStyleFor(videoStyle));
      if (!r.done) {
        pollTimeoutRef.current = setTimeout(() => poll(operation), POLL_INTERVAL_MS);
        return;
      }
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.video_base64) {
        setVideoUrl(`data:video/mp4;base64,${r.video_base64}`);
        setStep("result");
      } else {
        setError("The video didn't come back — please try again.");
        setStep("create");
      }
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't check the video's status.");
    }
  };

  // `override` exists because finishCreate below sets offerDescription/
  // angle/pickedScript/file and wants to generate off those values
  // immediately — React state setters don't apply until the next render,
  // so reading them from closure state here would still see the
  // pre-update values in that same tick. goal/videoStyle/aspectRatio
  // don't need this: they're only ever changed by their own Settings-
  // panel controls, well before Generate is clicked.
  const handleGenerate = async (override: {
    description: string;
    angle: string | null;
    script: { headline: string; narration: string } | null;
    file: File | null;
  }) => {
    const finalDescription = override.description.trim();
    if (!finalDescription || generating || (credits !== null && credits < VIDEO_CREDIT_COST)) return;
    setGenerating(true);
    setError(null);
    setVideoUrl(null);
    setElapsedSeconds(0);
    setStep("generating");
    elapsedIntervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    try {
      // Free — the accompanying social caption, with the correct
      // auto-CTA already baked in by the goal-aware prompt. Not used for
      // the on-screen burned headline (wrong shape — this is 2-4 lines,
      // the headline needs to be a single <40-char hook).
      const capResult = await generateAdCaptions(finalDescription, goal, override.angle, 1);
      setCaption(capResult.captions[0]?.facebook_caption ?? "");

      const style = findVideoStyle(videoStyle);
      const styledDescription = `${finalDescription}, ${style.promptModifier}`;
      const imageBase64 = override.file ? await fileToBase64(override.file) : undefined;
      const r = await startVideoGeneration(
        styledDescription,
        imageBase64,
        override.file?.type,
        aspectRatio,
        goal,
        override.angle ?? undefined,
        override.script ?? undefined,
      );
      setHeadline(r.headline);
      headlineRef.current = r.headline;
      setNarration(r.narration);
      setVideoOperation(r.operation);
      pollTimeoutRef.current = setTimeout(() => poll(r.operation), POLL_INTERVAL_MS);
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't start the video.");
      setStep("create");
    }
  };

  const pollAvatarVideo = async (videoId: string) => {
    try {
      const r = await checkAvatarVideoStatus(videoId);
      if (!r.done) {
        pollTimeoutRef.current = setTimeout(() => pollAvatarVideo(videoId), POLL_INTERVAL_MS);
        return;
      }
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.video_base64) {
        setVideoUrl(`data:video/mp4;base64,${r.video_base64}`);
        setAvatarVideoBase64(r.video_base64);
        setIsAvatarResult(true);
        setStep("result");
      } else {
        setError("The avatar video didn't come back — please try again.");
        setStep("create");
      }
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't check the avatar video's status.");
    }
  };

  const pollAiActorVideo = async (predictionId: string) => {
    try {
      const r = await checkActorVideoV2Status(predictionId);
      if (!r.done) {
        pollTimeoutRef.current = setTimeout(() => pollAiActorVideo(predictionId), POLL_INTERVAL_MS);
        return;
      }
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.video_base64) {
        setVideoUrl(`data:video/mp4;base64,${r.video_base64}`);
        setAvatarVideoBase64(r.video_base64);
        setIsAvatarResult(true);
        setStep("result");
      } else {
        setError("The actor video didn't come back — please try again.");
        setStep("create");
      }
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't check the actor video's status.");
    }
  };

  // Free — mixes a real licensed track under the avatar's existing
  // dialogue (not a replacement), so re-picking a mood always starts
  // from the same original avatarVideoBase64, never re-mixing an
  // already-mixed result (which would just make the music quieter each
  // time rather than swapping tracks).
  const handleAddMusic = async (mood: AvatarMusicMood) => {
    if (addingMusic || !avatarVideoBase64) return;
    setAddingMusic(true);
    setMusicError(null);
    try {
      const r = await addMusicToAvatarVideo(avatarVideoBase64, mood);
      setVideoUrl(`data:video/mp4;base64,${r.video_base64}`);
      setMusicMood(mood);
    } catch (err) {
      setMusicError(err instanceof Error ? err.message : "Couldn't add music.");
    } finally {
      setAddingMusic(false);
    }
  };

  // Polls a separately-generated Veo B-roll clip, then concatenates it
  // onto whatever's currently showing (avatar clip, or avatar+music if a
  // mood was already picked) via the free /ads/concat-videos endpoint.
  // baseVideoBase64 is captured once at the start of handleAddProductScene
  // so a slow Veo generation can't race a later videoUrl change.
  const pollProductScene = async (operation: ApiVideoOperation, baseVideoBase64: string): Promise<void> => {
    const r = await checkVideoStatus(operation, "", aspectRatio);
    if (!r.done) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      return pollProductScene(operation, baseVideoBase64);
    }
    if (r.credits_remaining !== null) setCredits(r.credits_remaining);
    if (!r.video_base64) {
      setSceneError("The product scene didn't come back — please try again.");
      return;
    }
    const combined = await concatVideos(baseVideoBase64, r.video_base64, aspectRatio);
    setVideoUrl(`data:video/mp4;base64,${combined.video_base64}`);
    setAvatarVideoBase64(combined.video_base64);
    setHasAddedScene(true);
  };

  // Costs VIDEO_CREDIT_COST — generates a brand-new Veo product B-roll
  // clip (the concat step itself is free, but it needs a fresh clip to
  // attach). One scene only for V1, not a full timeline — the button
  // hides once hasAddedScene is true.
  const handleAddProductScene = async () => {
    if (addingScene || !videoUrl || generating) return;
    if (credits !== null && credits < VIDEO_CREDIT_COST) {
      setSceneError(`You need ${VIDEO_CREDIT_COST} credits for a product scene.`);
      return;
    }
    setAddingScene(true);
    setSceneError(null);
    try {
      const baseVideoBase64 = videoUrl.split(",")[1] ?? videoUrl;
      const style = findVideoStyle("product_showcase");
      const styledDescription = `${offerDescription.trim()}, ${style.promptModifier}`;
      const r = await startVideoGeneration(styledDescription, undefined, undefined, aspectRatio, goal, angle);
      await pollProductScene(r.operation, baseVideoBase64);
    } catch (err) {
      setSceneError(err instanceof Error ? err.message : "Couldn't add a product scene.");
    } finally {
      setAddingScene(false);
    }
  };

  // Free — transcribes whatever's currently playing (works whether music
  // and/or a product scene were already added) and burns synced captions
  // on top. Unlike handleAddMusic, updates avatarVideoBase64 too — so a
  // later music pick re-mixes under the captioned video instead of
  // silently discarding the captions, matching handleAddProductScene's
  // "advance the base forward" behavior rather than music's "always
  // reset to original" one.
  const handleAddCaptions = async () => {
    if (addingCaptions || !videoUrl) return;
    setAddingCaptions(true);
    setCaptionsError(null);
    try {
      const currentBase64 = videoUrl.split(",")[1] ?? videoUrl;
      const r = await addCaptionsToAvatarVideo(currentBase64, aspectRatio, captionStyle, scriptLanguage, pickedScript?.narration);
      setVideoUrl(`data:video/mp4;base64,${r.video_base64}`);
      setAvatarVideoBase64(r.video_base64);
      setHasAddedCaptions(true);
    } catch (err) {
      setCaptionsError(err instanceof Error ? err.message : "Couldn't add captions.");
    } finally {
      setAddingCaptions(false);
    }
  };

  // Separate from handleGenerate — HeyGen's response shape (a bare
  // video_id, then a signed video_url) is structurally different from
  // Veo's operation-handle shape, so this doesn't share the Veo polling
  // path. Overrides mirror handleGenerate's — see its comment.
  const handleGenerateAvatarVideo = async (
    descriptionOverride: string,
    scriptOverride: { headline: string; narration: string },
  ) => {
    const avatarCreditCost = avatarTier === "premium" ? VIDEO_CREDIT_COST : AVATAR_STANDARD_CREDIT_COST;
    if (!selectedAvatarId || generating || (credits !== null && credits < avatarCreditCost)) return;
    setGenerating(true);
    setError(null);
    setVideoUrl(null);
    setElapsedSeconds(0);
    setStep("generating");
    elapsedIntervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    try {
      const capResult = await generateAdCaptions(descriptionOverride.trim(), goal, angle, 1);
      setCaption(capResult.captions[0]?.facebook_caption ?? "");
      setHeadline(scriptOverride.headline);

      const r = await startAvatarVideoGeneration(
        scriptOverride.narration,
        selectedAvatarId,
        selectedAvatarGender,
        avatarTier,
        aspectRatio,
        selectedVoiceId,
      );
      setAvatarFellBack(r.fell_back);
      pollTimeoutRef.current = setTimeout(() => pollAvatarVideo(r.video_id), POLL_INTERVAL_MS);
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't start the avatar video.");
      setStep("create");
    }
  };

  // Punqle Actors v2 — same script-then-generate shape as
  // handleGenerateAvatarVideo, but redubs a pre-baked Veo clip of one of
  // Punqle's own personas instead of calling HeyGen. Writes into the same
  // avatarVideoBase64/isAvatarResult state avatar/Cinematic UGC already
  // share, so the whole existing result screen (music/scene/captions/
  // publish) works unmodified.
  const handleGenerateAiActorVideo = async (
    descriptionOverride: string,
    scriptOverride: { headline: string; narration: string },
  ) => {
    if (!selectedActorId || generating || (credits !== null && credits < AI_ACTOR_VIDEO_CREDIT_COST)) return;
    setGenerating(true);
    setError(null);
    setVideoUrl(null);
    setElapsedSeconds(0);
    setStep("generating");
    elapsedIntervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    try {
      const capResult = await generateAdCaptions(descriptionOverride.trim(), goal, angle, 1);
      setCaption(capResult.captions[0]?.facebook_caption ?? "");
      setHeadline(scriptOverride.headline);

      const elevenlabsSettings =
        actorVoiceEngine === "elevenlabs"
          ? { stability: elevenlabsStability, similarity_boost: elevenlabsSimilarity, style: elevenlabsStyle, speed: elevenlabsSpeed }
          : undefined;
      const r = await startActorVideoV2(selectedActorId, scriptOverride.narration, actorVoiceEngine, elevenlabsSettings);
      pollTimeoutRef.current = setTimeout(() => pollAiActorVideo(r.prediction_id), POLL_INTERVAL_MS);
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't start the actor video.");
      setStep("create");
    }
  };

  // Confirms the review-script screen and actually kicks off generation
  // — the (possibly edited) narration and (ElevenLabs only) voice
  // settings state are read here, not passed as params, since the user
  // may have changed them after finishCreate first wrote the AI's draft.
  const handleConfirmActorScript = async () => {
    if (!pickedScript) return;
    await handleGenerateAiActorVideo(offerDescription, { headline: pickedScript.headline, narration: actorNarrationDraft });
  };

  // Inserts `[tag] ` at the narration textarea's current cursor position
  // — the same real ElevenLabs bracket syntax already validated working
  // this session (interpreted as delivery direction, never spoken).
  const insertEmotionTag = (tag: string) => {
    const el = actorNarrationTextareaRef.current;
    const insertion = `[${tag}] `;
    if (!el) {
      setActorNarrationDraft((prev) => prev + insertion);
      return;
    }
    const start = el.selectionStart ?? actorNarrationDraft.length;
    const end = el.selectionEnd ?? actorNarrationDraft.length;
    const next = actorNarrationDraft.slice(0, start) + insertion + actorNarrationDraft.slice(end);
    setActorNarrationDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + insertion.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const pollCinematicUgcVideo = async (predictionId: string) => {
    try {
      const r = await checkCinematicUgcStatus(predictionId);
      if (!r.done) {
        pollTimeoutRef.current = setTimeout(() => pollCinematicUgcVideo(predictionId), POLL_INTERVAL_MS);
        return;
      }
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.video_base64) {
        setVideoUrl(`data:video/mp4;base64,${r.video_base64}`);
        setAvatarVideoBase64(r.video_base64);
        setIsAvatarResult(true);
        setStep("result");
      } else {
        setError("The video didn't come back — please try again.");
        setStep("create");
      }
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't check the video's status.");
    }
  };

  // Cinematic UGC (Seedance 2.5) — a third video path alongside Veo and
  // HeyGen. Reuses the exact same result-screen state (avatarVideoBase64/
  // isAvatarResult) the avatar path writes, since both return raw base64
  // bytes rather than a Veo operation handle. No script/narration needed
  // (no dialogue, no avatar) — just the product description plus a real
  // scene direction (what the person does with the product), so this
  // path never goes through the script-fetch finishCreate does for the
  // other two.
  const handleGenerateCinematicUgc = async (descriptionOverride: string) => {
    const cost = CINEMATIC_UGC_CREDIT_COST[cinematicUgcTier];
    const finalDescription = descriptionOverride.trim();
    if (!finalDescription || !cinematicUgcScenePrompt.trim() || generating || (credits !== null && credits < cost)) return;
    setGenerating(true);
    setError(null);
    setVideoUrl(null);
    setElapsedSeconds(0);
    setStep("generating");
    elapsedIntervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    try {
      const capResult = await generateAdCaptions(finalDescription, goal, angle, 1);
      setCaption(capResult.captions[0]?.facebook_caption ?? "");
      setHeadline(capResult.captions[0]?.whatsapp_message ?? finalDescription);

      const r = await startCinematicUgcGeneration(finalDescription, cinematicUgcScenePrompt.trim(), cinematicUgcTier, aspectRatio);
      pollTimeoutRef.current = setTimeout(() => pollCinematicUgcVideo(r.prediction_id), POLL_INTERVAL_MS);
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't start the cinematic video.");
      setStep("create");
    }
  };

  // Shared by every real entry into generation (pasted link, typed text,
  // catalog pick). Resolves a real script first (Veo/Avatar paths) —
  // matching whichever angle chip the user picked in Settings, or the
  // AI's own recommendation on "Let Punqle choose" — then dispatches to
  // the right generator for the currently-selected videoStyle. Cinematic
  // UGC skips scripting entirely (no dialogue). An explicitly-uploaded
  // photo (via Settings) always wins over one that came from a link
  // scrape or catalog item.
  const finishCreate = async (description: string, incomingFile: File | null) => {
    const effectiveFile = file ?? incomingFile;
    setOfferDescription(description);
    if (effectiveFile && effectiveFile !== file) handleFileChange(effectiveFile);

    if (videoStyle === "cinematic_ugc") {
      await handleGenerateCinematicUgc(description);
      return;
    }

    setAnglesLoading(true);
    setInputError(null);
    try {
      const anglesResult = await generateVideoScriptAngles(description, goal, scriptLanguage);
      const chosenIdx = angle ? anglesResult.angles.findIndex((a) => a.angle === angle) : -1;
      const picked = chosenIdx >= 0 ? anglesResult.angles[chosenIdx] : (anglesResult.angles[anglesResult.recommended_index] ?? anglesResult.angles[0]);
      const script = { headline: picked.headline, narration: picked.narration };
      setAngle(picked.angle);
      setPickedScript(script);
      setAnglesLoading(false);

      if (videoStyle === "avatar") {
        await handleGenerateAvatarVideo(description, script);
      } else if (videoStyle === "ai_actor") {
        // Pauses here instead of generating immediately — the review
        // screen (narration edit + ElevenLabs emotion tags/sliders) is
        // where handleGenerateAiActorVideo actually gets called, once
        // the user confirms.
        setActorNarrationDraft(script.narration);
        setStep("review-script");
      } else {
        await handleGenerate({ description, angle: picked.angle, script, file: effectiveFile });
      }
    } catch (err) {
      setAnglesLoading(false);
      setInputError(err instanceof Error ? err.message : "Couldn't write a script — please try again.");
    }
  };

  const handleMainSubmit = async () => {
    const text = mainInput.trim();
    if (!text || inputFetching || anglesLoading || generating) return;
    setInputError(null);
    if (looksLikeUrl(text)) {
      setInputFetching(true);
      try {
        const r = await understandProductLink(text);
        const description = r.enriched_description || [r.title, r.description].filter(Boolean).join(" — ");
        const scrapedFile = r.image_base64
          ? base64ToFile(r.image_base64, r.mime_type || "image/jpeg", "product.jpg")
          : null;
        await finishCreate(description, scrapedFile);
      } catch (err) {
        setInputError(err instanceof Error ? err.message : "Couldn't fetch that link.");
      } finally {
        setInputFetching(false);
      }
    } else {
      await finishCreate(text, null);
    }
  };

  // Skips fetch-product-link/understand-product-link entirely — a
  // Shopify-synced (or CSV-imported) catalog item already has a real
  // name/description/photo saved, so there's nothing to scrape.
  const handleQuickCreateFromCatalog = async (description: string, catalogFile: File | null) => {
    if (inputFetching) return;
    setInputFetching(true);
    setInputError(null);
    try {
      await finishCreate(description, catalogFile);
    } catch (err) {
      setInputError(err instanceof Error ? err.message : "Couldn't use that product.");
    } finally {
      setInputFetching(false);
    }
  };

  const handleReset = () => {
    setStep("create");
    setMainInput("");
    setInputError(null);
    setSettingsOpen(false);
    setOfferDescription("");
    setGoal("sales");
    setAngle(null);
    setAnglesLoading(false);
    setPickedScript(null);
    setScriptLanguage("english");
    setVideoStyle("product_showcase");
    setAspectRatio("16:9");
    handleFileChange(null);
    setVideoUrl(null);
    setError(null);
    setElapsedSeconds(0);
    setHeadline("");
    setCaption("");
    headlineRef.current = "";
    setVideoOperation(null);
    setNarration("");
    setAvatarTier("standard");
    setAvatarOptions([]);
    setAvatarOptionsLoading(false);
    setAvatarOptionsError(null);
    setAvatarGenderFilter("all");
    setSelectedAvatarId(null);
    setSelectedAvatarGender(null);
    setAvatarVoices(null);
    setIsAvatarResult(false);
    setAvatarFellBack(false);
    setAvatarVideoBase64(null);
    setAddingMusic(false);
    setMusicError(null);
    setMusicMood(null);
    setAddingScene(false);
    setSceneError(null);
    setHasAddedScene(false);
    setAddingCaptions(false);
    setCaptionsError(null);
    setHasAddedCaptions(false);
    setSelectedVoiceId(null);
    setCaptionStyle("bold");
    setCinematicUgcTier("standard");
    setCinematicUgcScenePrompt("");
    setActorGenderFilter("all");
    setSelectedActorId(null);
    setActorVoiceEngine("openai_natural");
    setActorNarrationDraft("");
    setElevenlabsStability(0.5);
    setElevenlabsSimilarity(0.75);
    setElevenlabsStyle(0.5);
    setElevenlabsSpeed(1.0);
  };

  const handleHeadlineChange = (value: string) => {
    setHeadline(value);
    headlineRef.current = value;
  };

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const insufficientCredits = credits !== null && credits < VIDEO_CREDIT_COST;
  const avatarInsufficientCredits =
    credits !== null && credits < (avatarTier === "premium" ? VIDEO_CREDIT_COST : AVATAR_STANDARD_CREDIT_COST);
  const cinematicUgcInsufficientCredits = credits !== null && credits < CINEMATIC_UGC_CREDIT_COST[cinematicUgcTier];
  const aiActorInsufficientCredits = credits !== null && credits < AI_ACTOR_VIDEO_CREDIT_COST;

  if (step === "result" && videoUrl) {
    return (
      <>
        <div className="mb-3 overflow-hidden rounded-2xl bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <video src={videoUrl} controls className="w-full" />
        </div>

        {/* Avatar results skip this — HeyGen's response shape isn't a Veo
            operation handle EditVideoPanel can re-download from, and
            burning a headline bar over a speaking presenter's face would
            look wrong anyway (the avatar already says the brand's name
            through the script itself). */}
        {!isAvatarResult && (
          <EditVideoPanel
            videoOperation={videoOperation}
            headline={headline}
            narration={narration}
            aspectRatio={aspectRatio}
            hasLogo={hasLogo}
            hasBrandColor={hasBrandColor}
            credits={credits}
            setCredits={setCredits}
            onSaved={(videoBase64) => setVideoUrl(`data:video/mp4;base64,${videoBase64}`)}
          />
        )}

        {isAvatarResult && avatarFellBack && (
          <p className="mb-3 rounded-2xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
            This avatar didn't support Premium quality, so Standard was used instead — you were charged{" "}
            {AVATAR_STANDARD_CREDIT_COST} credits, not the Premium price.
          </p>
        )}

        {isAvatarResult && (
          <div className="mb-3 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Music className="h-3.5 w-3.5" />
              Background music
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {(["upbeat", "calm", "energetic", "corporate"] as AvatarMusicMood[]).map((mood) => (
                <button
                  key={mood}
                  onClick={() => handleAddMusic(mood)}
                  disabled={addingMusic}
                  className={[
                    "rounded-full px-2 py-2 text-xs font-semibold capitalize disabled:opacity-60",
                    musicMood === mood ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  ].join(" ")}
                >
                  {addingMusic && musicMood !== mood ? "" : mood}
                  {addingMusic && musicMood === mood && <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />}
                </button>
              ))}
            </div>
            {musicError && <p className="mt-2 text-xs font-medium text-destructive">{musicError}</p>}
            {musicMood && !addingMusic && (
              <p className="mt-2 text-xs text-muted-foreground">Free — pick a different mood any time to replace it.</p>
            )}
          </div>
        )}

        {isAvatarResult && !hasAddedScene && (
          <div className="mb-3 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Video className="h-3.5 w-3.5" />
              Add a product scene
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              Generate a separate product shot and attach it after your presenter — {VIDEO_CREDIT_COST} credits.
            </p>
            <button
              onClick={handleAddProductScene}
              disabled={addingScene || (credits !== null && credits < VIDEO_CREDIT_COST)}
              className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              {addingScene ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating product scene…
                </>
              ) : (
                `Add product scene (${VIDEO_CREDIT_COST} credits)`
              )}
            </button>
            {sceneError && <p className="mt-2 text-xs font-medium text-destructive">{sceneError}</p>}
          </div>
        )}

        {isAvatarResult && hasAddedScene && (
          <p className="mb-3 rounded-2xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
            Product scene added.
          </p>
        )}

        {isAvatarResult && !hasAddedCaptions && (
          <div className="mb-3 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Captions className="h-3.5 w-3.5" />
              Captions
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              Add synced on-screen captions — helps on social, where most people watch muted. Free.
            </p>
            <div className="mb-2 grid grid-cols-3 gap-1.5">
              {(["bold", "clean", "highlight", "box", "glow", "minimal"] as CaptionStyle[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setCaptionStyle(s)}
                  disabled={addingCaptions}
                  className={[
                    "rounded-full px-2 py-1.5 text-xs font-semibold capitalize disabled:opacity-60",
                    captionStyle === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={handleAddCaptions}
              disabled={addingCaptions}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
            >
              {addingCaptions ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding captions…
                </>
              ) : (
                "Add captions"
              )}
            </button>
            {captionsError && <p className="mt-2 text-xs font-medium text-destructive">{captionsError}</p>}
          </div>
        )}

        {isAvatarResult && hasAddedCaptions && (
          <p className="mb-3 rounded-2xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
            Captions added.
          </p>
        )}

        {caption && (
          <div className="mb-3 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caption</p>
            <p className="text-sm text-foreground">{caption}</p>
          </div>
        )}
        <PublishToYouTube videoUrl={videoUrl} headline={headline} aspectRatio={aspectRatio} goal={goal} angle={angle} style={videoStyle} />
        <PublishToTikTok videoUrl={videoUrl} headline={headline} goal={goal} angle={angle} style={videoStyle} />
        <a
          href={videoUrl}
          download="ad-video.mp4"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Download className="h-5 w-5" />
          Download video
        </a>
        <button
          onClick={handleReset}
          className="w-full rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
        >
          Create another
        </button>
      </>
    );
  }

  if (step === "receiving") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing your ad...
      </div>
    );
  }

  if (step === "generating" && (videoStyle === "avatar" || videoStyle === "cinematic_ugc" || videoStyle === "ai_actor")) {
    return (
      <div className="rounded-2xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">
            {videoStyle === "avatar"
              ? "Generating your AI presenter video..."
              : videoStyle === "ai_actor"
                ? "Generating your actor video..."
                : "Generating your cinematic UGC video..."}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {minutes}:{seconds.toString().padStart(2, "0")} elapsed — usually a few minutes
          </p>
          {videoStyle === "avatar" && avatarFellBack && (
            <p className="mt-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              This avatar doesn't support Premium — using Standard instead, so you'll only be charged{" "}
              {AVATAR_STANDARD_CREDIT_COST} credits.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (step === "review-script") {
    const showElevenLabsControls = actorVoiceEngine === "elevenlabs";
    return (
      <div className="rounded-2xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Review your script
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          Edit what your actor says before generating.
        </p>
        <textarea
          ref={actorNarrationTextareaRef}
          value={actorNarrationDraft}
          onChange={(e) => setActorNarrationDraft(e.target.value)}
          rows={5}
          className="mb-4 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {showElevenLabsControls && (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add emotion
            </p>
            <div className="mb-5 flex flex-wrap gap-1.5">
              {["warmly", "excited", "curious", "thoughtful", "mischievously", "whispering"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertEmotionTag(tag)}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium capitalize text-secondary-foreground hover:bg-secondary/70"
                >
                  {tag}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Audio settings
            </p>
            <div className="mb-5 space-y-4 rounded-xl bg-secondary/40 p-4">
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
          </>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep("create")}
            className="rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirmActorScript}
            disabled={!actorNarrationDraft.trim() || generating}
            className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Generate video
          </button>
        </div>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="rounded-2xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-6 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Generating your video ad...</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {minutes}:{seconds.toString().padStart(2, "0")} elapsed — usually takes 1-2 minutes
          </p>
        </div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          On-screen headline
        </label>
        <input
          type="text"
          value={headline}
          onChange={(e) => handleHeadlineChange(e.target.value)}
          placeholder="No headline — video will have no text"
          maxLength={60}
          className="w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          This gets burned onto the video as a caption once it's ready — edit it any time while you wait.
        </p>
      </div>
    );
  }

  const busy = inputFetching || anglesLoading || generating;
  const styleNeedsMoreInput =
    (videoStyle === "avatar" && !selectedAvatarId) ||
    (videoStyle === "cinematic_ugc" && !cinematicUgcScenePrompt.trim()) ||
    (videoStyle === "ai_actor" && !selectedActorId);
  const currentCost =
    videoStyle === "avatar"
      ? avatarTier === "premium"
        ? VIDEO_CREDIT_COST
        : AVATAR_STANDARD_CREDIT_COST
      : videoStyle === "cinematic_ugc"
        ? CINEMATIC_UGC_CREDIT_COST[cinematicUgcTier]
        : videoStyle === "ai_actor"
          ? AI_ACTOR_VIDEO_CREDIT_COST
          : VIDEO_CREDIT_COST;
  const currentInsufficientCredits =
    videoStyle === "avatar"
      ? avatarInsufficientCredits
      : videoStyle === "cinematic_ugc"
        ? cinematicUgcInsufficientCredits
        : videoStyle === "ai_actor"
          ? aiActorInsufficientCredits
          : insufficientCredits;

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-xl font-extrabold text-foreground">Create a video ad</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Paste a product link, or just describe what you're advertising.
      </p>

      <textarea
        value={mainInput}
        onChange={(e) => setMainInput(e.target.value)}
        placeholder="https://yourstore.com/products/... or Handmade leather wallets, 20% off this week"
        rows={3}
        disabled={busy}
        className="mb-3 w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="mb-4 w-full text-left">
        <ProductPicker onSelect={handleQuickCreateFromCatalog} />
      </div>

      <label className="mb-2 block w-full text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Goal
      </label>
      <div className="mb-4 grid w-full grid-cols-2 gap-2">
        {GOALS.map((g) => (
          <button
            key={g.value}
            onClick={() => setGoal(g.value)}
            className={[
              "rounded-full px-3 py-2.5 text-sm font-semibold",
              goal === g.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
            ].join(" ")}
          >
            {g.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setSettingsOpen((v) => !v)}
        className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Settings
        <ChevronDown className={["h-3.5 w-3.5 transition-transform", settingsOpen ? "rotate-180" : ""].join(" ")} />
      </button>

      {settingsOpen && (
        <div className="mb-4 w-full rounded-2xl bg-secondary/60 p-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Script language</p>
          <div className="mb-4 flex gap-2">
            {(["english", "bangla"] as AvatarLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setScriptLanguage(lang)}
                className={[
                  "flex-1 rounded-full px-4 py-2 text-sm font-semibold capitalize",
                  scriptLanguage === lang ? "bg-primary text-primary-foreground" : "bg-card text-secondary-foreground",
                ].join(" ")}
              >
                {lang === "bangla" ? "বাংলা" : "English"}
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style</p>
          <div className="mb-4 rounded-2xl bg-card p-3">
            <VideoStyleStep
              selected={videoStyle}
              onSelect={setVideoStyle}
              onContinue={() => {}}
              onBack={() => {}}
            />
          </div>

          {videoStyle === "avatar" && (
            <div className="mb-4 rounded-2xl bg-card p-3">
              <AvatarPickerStep
                tier={avatarTier}
                onTierChange={handleAvatarTierChange}
                avatars={avatarOptions}
                loading={avatarOptionsLoading}
                error={avatarOptionsError}
                genderFilter={avatarGenderFilter}
                onGenderFilterChange={setAvatarGenderFilter}
                selectedAvatarId={selectedAvatarId}
                onSelectAvatar={handleSelectAvatar}
                language={scriptLanguage}
                voices={avatarVoices}
                selectedVoiceId={selectedVoiceId}
                onSelectVoice={setSelectedVoiceId}
                onContinue={() => {}}
                onBack={() => {}}
                onRetry={fetchAvatarOptionsForStep}
              />
            </div>
          )}

          {videoStyle === "cinematic_ugc" && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quality</p>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {(["standard", "premium"] as AvatarTier[]).map((t) => {
                  const selected = cinematicUgcTier === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setCinematicUgcTier(t)}
                      className={[
                        "rounded-xl px-3 py-2.5 text-left transition-colors capitalize",
                        selected ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                        {t}
                      </span>
                      <span className={["block text-xs normal-case", selected ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                        {CINEMATIC_UGC_CREDIT_COST[t]} credits · {t === "premium" ? "720p" : "480p"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What happens in the shot?
              </p>
              <textarea
                value={cinematicUgcScenePrompt}
                onChange={(e) => setCinematicUgcScenePrompt(e.target.value)}
                rows={2}
                placeholder="e.g. she laces up the sneakers and starts jogging down a sunny park path"
                className="mb-4 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </>
          )}

          {videoStyle === "ai_actor" && (
            <div className="mb-4 rounded-2xl bg-card p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Choose your actor
              </p>
              <div className="mb-3 flex gap-2">
                {(["all", "female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setActorGenderFilter(g)}
                    className={[
                      "flex-1 rounded-full px-3 py-2 text-xs font-semibold capitalize",
                      actorGenderFilter === g ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                    ].join(" ")}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {actorsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {actors
                    .filter((a) => actorGenderFilter === "all" || a.gender === actorGenderFilter)
                    .map((a) => {
                      const selected = selectedActorId === a.id;
                      const situationId = actorSituations[a.id];
                      const ready = Boolean(situationId);
                      const situationLabel = situationId
                        ? situationId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        : "Coming soon";
                      return (
                        <button
                          key={a.id}
                          onClick={() => ready && setSelectedActorId(a.id)}
                          disabled={!ready}
                          className={["flex flex-col items-center gap-1", ready ? "" : "cursor-not-allowed opacity-40"].join(" ")}
                        >
                          <span
                            className={[
                              "relative aspect-square w-full overflow-hidden rounded-xl",
                              selected ? "ring-2 ring-primary" : "",
                            ].join(" ")}
                          >
                            <img
                              src={`data:image/jpeg;base64,${a.preview_image_base64}`}
                              alt={a.name}
                              className="h-full w-full object-cover"
                            />
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
                </div>
              )}
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Voice
              </p>
              <select
                value={actorVoiceEngine}
                onChange={(e) => setActorVoiceEngine(e.target.value as ActorVoiceEngine)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="openai_natural">OpenAI (Natural) — Recommended</option>
                <option value="openai_standard">OpenAI (Standard)</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </div>
          )}

          {videoStyle !== "avatar" && videoStyle !== "cinematic_ugc" && videoStyle !== "ai_actor" && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What should the ad say?
              </p>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {ANGLES.map((a) => {
                  const selected = angle === a.value;
                  return (
                    <button
                      key={a.label}
                      onClick={() => setAngle(a.value)}
                      className={[
                        "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium",
                        selected ? "bg-primary text-primary-foreground" : "bg-card text-secondary-foreground",
                      ].join(" ")}
                    >
                      {selected && a.value !== null && <Check className="h-3 w-3" />}
                      {a.value === null && <Sparkles className="h-3 w-3" />}
                      {a.label}
                    </button>
                  );
                })}
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Photo (optional)
              </p>
              {!file ? (
                <label className="mb-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-card px-3 py-2.5 text-xs font-semibold text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  Upload a product photo, or skip for text-only
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              ) : (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-card px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    {previewUrl && <img src={previewUrl} alt="" className="h-6 w-6 rounded-md object-cover" />}
                    <Camera className="h-3.5 w-3.5" />
                    {file.name}
                  </span>
                  <button onClick={() => handleFileChange(null)} aria-label="Remove photo" className="text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </>
          )}

          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Format</p>
          <div className="flex gap-2">
            <button
              onClick={() => setAspectRatio("16:9")}
              className={[
                "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold",
                aspectRatio === "16:9" ? "bg-primary text-primary-foreground" : "bg-card text-secondary-foreground",
              ].join(" ")}
            >
              Landscape (16:9)
            </button>
            <button
              onClick={() => setAspectRatio("9:16")}
              className={[
                "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold",
                aspectRatio === "9:16" ? "bg-primary text-primary-foreground" : "bg-card text-secondary-foreground",
              ].join(" ")}
            >
              Vertical (9:16)
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 w-full rounded-2xl border border-dashed border-border bg-secondary/60 p-3 text-center text-xs font-semibold text-foreground">
        1 video · {currentCost} credits ·{" "}
        {videoStyle !== "avatar" && videoStyle !== "cinematic_ugc" && videoStyle !== "ai_actor" ? "about 1-2 min" : "usually a few minutes"}
      </div>

      {currentInsufficientCredits && (
        <p className="mb-4 text-sm text-muted-foreground">
          You have {credits} credits — not enough for this video. Upgrade to keep generating.
        </p>
      )}
      {styleNeedsMoreInput && videoStyle === "avatar" && (
        <p className="mb-4 text-xs text-muted-foreground">Open Settings and pick an AI presenter first.</p>
      )}
      {styleNeedsMoreInput && videoStyle === "cinematic_ugc" && (
        <p className="mb-4 text-xs text-muted-foreground">Open Settings and describe what happens in the shot first.</p>
      )}
      {styleNeedsMoreInput && videoStyle === "ai_actor" && (
        <p className="mb-4 text-xs text-muted-foreground">Open Settings and pick an actor first.</p>
      )}
      {hasLogo && videoStyle !== "avatar" && videoStyle !== "cinematic_ugc" && videoStyle !== "ai_actor" && (
        <p className="mb-4 text-xs text-muted-foreground">Your Brand Kit logo will be added to this video automatically.</p>
      )}

      {(inputError || error) && (
        <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {inputError || error}
        </p>
      )}

      <button
        onClick={handleMainSubmit}
        disabled={!mainInput.trim() || busy || currentInsufficientCredits || styleNeedsMoreInput}
        className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
        style={{ background: "var(--gradient-primary)" }}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
        Generate video
      </button>
    </div>
  );
}
