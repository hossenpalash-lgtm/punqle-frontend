import {
  AlertCircle,
  Camera,
  ChevronDown,
  Clock,
  Download,
  Link2,
  Loader2,
  Rocket,
  Settings2,
  Sparkles,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  base64ToFile,
  checkVideoStatus,
  fetchBusinessProfile,
  fetchProductLink,
  generateAdCaptions,
  generateVideoScriptAngles,
  startVideoGeneration,
  understandProductLink,
  type AdGoal,
  type ApiVideoOperation,
  type ApiVideoScriptAngle,
  type VideoAspectRatio,
} from "@/lib/api";
import { findVideoStyle, type VideoStyle } from "@/lib/video-style";
import { AdBriefStep, GOALS } from "./AdBriefStep";
import { EditVideoPanel } from "./EditVideoPanel";
import { ProductPicker } from "./ProductPicker";
import { PublishToYouTube } from "./PublishToYouTube";
import { VideoAnglesStep } from "./VideoAnglesStep";
import { VideoStyleStep } from "./VideoStyleStep";
import { WizardProgress } from "./WizardProgress";

const VIDEO_CREDIT_COST = 10;
const POLL_INTERVAL_MS = 8000;

type WizardStep = "choose" | "quick" | "brief" | "angles" | "style" | "setup" | "generating" | "result" | "receiving";

const PROGRESS_STAGE: Partial<Record<WizardStep, 1 | 2 | 3>> = {
  brief: 1,
  style: 2,
  setup: 3,
};

const STAGE_STEP: Record<1 | 2 | 3, WizardStep> = {
  1: "brief",
  2: "style",
  3: "setup",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

// Video Ad — Offer+Goal+Angle (reused AdBriefStep) → Video Style (new,
// lightweight chips) → Setup → Generate ONE video. Deliberately no
// "versions" concept, unlike Image Ad — video costs 10x an image credit
// and 1-2 minutes per generation (Veo), so offering 3-5 at once would be
// a real cost/time hazard. Mirrors VideoPostForm.tsx's generation/polling
// mechanics almost exactly; the only new orchestration is the free
// caption call up front and passing goal/angle through to the (now
// goal/angle-aware) backend headline generator.
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
  const [step, setStep] = useState<WizardStep>(initialVideo ? "receiving" : "choose");

  // Brief
  const [offerDescription, setOfferDescription] = useState("");
  const [goal, setGoal] = useState<AdGoal>(initialVideo?.goal ?? "sales");
  const [angle, setAngle] = useState<string | null>(null);
  const [videoStyle, setVideoStyle] = useState<VideoStyle>("product_showcase");

  // Multi-angle script picker (between Brief and Style) — replaces the old
  // blind angle-label chip in AdBriefStep with real, AI-written scripts to
  // choose between. pickedScript is passed verbatim into generation.
  const [scriptAngles, setScriptAngles] = useState<ApiVideoScriptAngle[]>([]);
  const [anglesLoading, setAnglesLoading] = useState(false);
  const [anglesError, setAnglesError] = useState<string | null>(null);
  const [selectedAngleIndex, setSelectedAngleIndex] = useState<number | null>(null);
  const [recommendedAngleIndex, setRecommendedAngleIndex] = useState(0);
  const [pickedScript, setPickedScript] = useState<{ headline: string; narration: string } | null>(null);

  // Quick Create — Video option: paste a link, pick a Goal, get a
  // finished video ad in one tap. Mirrors AdCreationForm.tsx's Image Ad
  // Quick Create exactly (same state shape, same fetchProductLink +
  // override pattern) — the only real difference is that instead of
  // skipping the angle silently (Image Ad's angle=null), it fetches the
  // same 4-script picker Video Ad's Customize path uses and auto-applies
  // the AI's own recommended_index, so the result is still angle-aware
  // without adding an extra required tap to a "quick" flow.
  const [quickUrl, setQuickUrl] = useState("");
  const [quickFetching, setQuickFetching] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

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
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  const [fetchingLink, setFetchingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
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
        setStep("brief");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (f: File | null) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
    setFile(f);
  };

  const handleProgressNavigate = (stage: 1 | 2 | 3) => {
    setStep(STAGE_STEP[stage]);
  };

  const handleFetchProductLink = async () => {
    if (!productUrl.trim() || fetchingLink) return;
    setFetchingLink(true);
    setLinkError(null);
    try {
      const r = await fetchProductLink(productUrl.trim());
      setOfferDescription([r.title, r.description].filter(Boolean).join(" — "));
      if (r.image_base64) {
        handleFileChange(base64ToFile(r.image_base64, r.mime_type || "image/jpeg", "product.jpg"));
      }
      setShowLinkInput(false);
      setProductUrl("");
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Couldn't fetch that link.");
    } finally {
      setFetchingLink(false);
    }
  };

  const poll = async (operation: ApiVideoOperation) => {
    try {
      const r = await checkVideoStatus(operation, headlineRef.current, aspectRatio);
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
        setStep("setup");
      }
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't check the video's status.");
    }
  };

  const fetchAngles = () => {
    setAnglesLoading(true);
    setAnglesError(null);
    generateVideoScriptAngles(offerDescription.trim(), goal)
      .then((r) => {
        setScriptAngles(r.angles);
        setRecommendedAngleIndex(r.recommended_index);
        setAnglesLoading(false);
      })
      .catch((err) => {
        setAnglesError(err instanceof Error ? err.message : "Couldn't write scripts — please try again.");
        setAnglesLoading(false);
      });
  };

  const handleBriefContinue = () => {
    setSelectedAngleIndex(null);
    setPickedScript(null);
    setScriptAngles([]);
    setStep("angles");
    fetchAngles();
  };

  const handleContinueFromAngles = () => {
    if (selectedAngleIndex === null) return;
    const picked = scriptAngles[selectedAngleIndex];
    setAngle(picked.angle);
    setPickedScript({ headline: picked.headline, narration: picked.narration });
    setStep("style");
  };

  // `override` exists for Quick Create's Video option: it calls
  // setOfferDescription/setAngle/setPickedScript/etc. and wants to
  // generate off those values immediately, but React state setters don't
  // apply until the next render, so reading them from closure state here
  // would still see the pre-update values in that same tick (same
  // stale-closure issue AdCreationForm.tsx's Image Ad Quick Create hit
  // and fixed the same way). The normal Customize path (Setup step's
  // Generate button) doesn't hit this — every relevant setter has already
  // committed across earlier renders by the time it's clickable — so it
  // keeps calling this with no override and reads current state.
  const handleGenerate = async (override?: {
    description: string;
    goal: AdGoal;
    angle: string | null;
    script: { headline: string; narration: string } | null;
    file: File | null;
    videoStyle: VideoStyle;
    aspectRatio: VideoAspectRatio;
  }) => {
    const finalDescription = (override?.description ?? offerDescription).trim();
    const effectiveGoal = override?.goal ?? goal;
    const effectiveAngle = override ? override.angle : angle;
    const effectiveScript = override ? override.script : pickedScript;
    const effectiveFile = override ? override.file : file;
    const effectiveVideoStyle = override?.videoStyle ?? videoStyle;
    const effectiveAspectRatio = override?.aspectRatio ?? aspectRatio;

    if (!finalDescription || generating || (credits !== null && credits < VIDEO_CREDIT_COST)) return;
    const cameFrom = step; // captured before setStep("generating") below, so a
    // failure returns to wherever generation was actually triggered from
    // (Customize's "setup" step, or Quick Create's own "quick" step).
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
      const capResult = await generateAdCaptions(finalDescription, effectiveGoal, effectiveAngle, 1);
      setCaption(capResult.captions[0]?.facebook_caption ?? "");

      const style = findVideoStyle(effectiveVideoStyle);
      const styledDescription = `${finalDescription}, ${style.promptModifier}`;
      const imageBase64 = effectiveFile ? await fileToBase64(effectiveFile) : undefined;
      const r = await startVideoGeneration(
        styledDescription,
        imageBase64,
        effectiveFile?.type,
        effectiveAspectRatio,
        effectiveGoal,
        effectiveAngle ?? undefined,
        effectiveScript ?? undefined,
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
      setStep(cameFrom === "quick" ? "quick" : "setup");
    }
  };

  // Shared by both Quick Create paths below — the URL path (real
  // scraping + AI enrichment) and the catalog path (already-known data,
  // no fetch needed at all) only differ in how description/file are
  // obtained; everything after that, including the angle auto-pick, is
  // identical.
  const finishQuickCreate = async (description: string, file: File | null) => {
    setOfferDescription(description);
    if (file) handleFileChange(file);

    // Still fetches the same 4-script picker Customize uses — just
    // auto-applies the AI's own recommended_index instead of showing
    // it, so Quick Create stays a single tap while the result is still
    // built from a real, angle-aware script rather than a silent
    // default.
    const anglesResult = await generateVideoScriptAngles(description, goal);
    const picked = anglesResult.angles[anglesResult.recommended_index] ?? anglesResult.angles[0];
    const script = { headline: picked.headline, narration: picked.narration };
    setAngle(picked.angle);
    setPickedScript(script);
    // videoStyle/aspectRatio stay at their existing defaults
    // ("product_showcase"/"16:9") — neither is user-facing here.
    await handleGenerate({
      description,
      goal,
      angle: picked.angle,
      script,
      file,
      videoStyle: "product_showcase",
      aspectRatio: "16:9",
    });
  };

  const handleQuickCreate = async () => {
    if (quickFetching || !quickUrl.trim()) return;
    setQuickFetching(true);
    setQuickError(null);
    try {
      const r = await understandProductLink(quickUrl.trim());
      const description = r.enriched_description || [r.title, r.description].filter(Boolean).join(" — ");
      const quickFile = r.image_base64
        ? base64ToFile(r.image_base64, r.mime_type || "image/jpeg", "product.jpg")
        : null;
      await finishQuickCreate(description, quickFile);
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Couldn't fetch that link.");
    } finally {
      setQuickFetching(false);
    }
  };

  // Skips fetch-product-link/understand-product-link entirely — a
  // Shopify-synced (or CSV-imported) catalog item already has a real
  // name/description/photo saved, so there's nothing to scrape.
  const handleQuickCreateFromCatalog = async (description: string, file: File | null) => {
    if (quickFetching) return;
    setQuickFetching(true);
    setQuickError(null);
    try {
      await finishQuickCreate(description, file);
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Couldn't use that product.");
    } finally {
      setQuickFetching(false);
    }
  };

  const handleReset = () => {
    setStep("choose");
    setQuickUrl("");
    setQuickError(null);
    setOfferDescription("");
    setGoal("sales");
    setAngle(null);
    setScriptAngles([]);
    setAnglesLoading(false);
    setAnglesError(null);
    setSelectedAngleIndex(null);
    setRecommendedAngleIndex(0);
    setPickedScript(null);
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
    setMoreOptionsOpen(false);
    setShowLinkInput(false);
    setProductUrl("");
    setLinkError(null);
  };

  const handleHeadlineChange = (value: string) => {
    setHeadline(value);
    headlineRef.current = value;
  };

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const insufficientCredits = credits !== null && credits < VIDEO_CREDIT_COST;

  if (step === "result" && videoUrl) {
    return (
      <>
        <div className="mb-3 overflow-hidden rounded-2xl bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <video src={videoUrl} controls className="w-full" />
        </div>

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

        {caption && (
          <div className="mb-3 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caption</p>
            <p className="text-sm text-foreground">{caption}</p>
          </div>
        )}
        <PublishToYouTube videoUrl={videoUrl} headline={headline} aspectRatio={aspectRatio} />
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

  return (
    <>
      {PROGRESS_STAGE[step] && (
        <WizardProgress currentStage={PROGRESS_STAGE[step]!} onNavigate={handleProgressNavigate} />
      )}

      {step === "choose" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-xl font-extrabold text-foreground">Create a video ad</h1>
          <p className="mb-6 text-sm text-muted-foreground">Two ways to get there.</p>
          <button
            onClick={() => setStep("quick")}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Rocket className="h-5 w-5 shrink-0" style={{ color: "var(--color-accent)" }} />
            <span>
              <span className="block text-sm font-semibold text-foreground">Quick Create</span>
              <span className="block text-xs text-muted-foreground">Paste a product link, pick a goal, get a video.</span>
            </span>
          </button>
          <button
            onClick={() => setStep("brief")}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Settings2 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-sm font-semibold text-foreground">Customize</span>
              <span className="block text-xs text-muted-foreground">Full control — offer, script, style, format.</span>
            </span>
          </button>
        </div>
      )}

      {step === "quick" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-xl font-extrabold text-foreground">Quick Create</h1>
          <p className="mb-6 text-sm text-muted-foreground">Paste your product link — Punqle handles the rest.</p>

          <input
            type="url"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            placeholder="https://yourstore.com/products/..."
            disabled={quickFetching}
            className="mb-3 w-full rounded-full border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mb-4 w-full text-left">
            <ProductPicker onSelect={handleQuickCreateFromCatalog} />
          </div>

          <label className="mb-2 block w-full text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Goal
          </label>
          <div className="mb-6 grid w-full grid-cols-2 gap-2">
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

          <div className="mb-5 w-full rounded-2xl border border-dashed border-border bg-secondary/60 p-3 text-center text-xs font-semibold text-foreground">
            1 video · {VIDEO_CREDIT_COST} credits · about 1-2 min
          </div>

          {(quickError || error) && (
            <p className="mb-4 text-sm font-medium text-destructive">{quickError || error}</p>
          )}

          <div className="flex w-full gap-2">
            <button
              onClick={() => setStep("choose")}
              disabled={quickFetching}
              className="rounded-full bg-secondary px-5 py-4 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
            >
              Back
            </button>
            <button
              onClick={handleQuickCreate}
              disabled={!quickUrl.trim() || quickFetching || insufficientCredits}
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              {quickFetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              Create My Video
            </button>
          </div>
        </div>
      )}

      {step === "brief" && (
        <AdBriefStep
          offerDescription={offerDescription}
          onOfferDescriptionChange={setOfferDescription}
          goal={goal}
          onGoalChange={setGoal}
          angle={angle}
          onAngleChange={setAngle}
          onContinue={handleBriefContinue}
          showAngle={false}
        />
      )}

      {step === "angles" && (
        <VideoAnglesStep
          angles={scriptAngles}
          loading={anglesLoading}
          error={anglesError}
          selectedIndex={selectedAngleIndex}
          onSelect={setSelectedAngleIndex}
          onContinue={handleContinueFromAngles}
          onBack={() => setStep("brief")}
          onRetry={fetchAngles}
          recommendedIndex={recommendedAngleIndex}
        />
      )}

      {step === "style" && (
        <VideoStyleStep
          selected={videoStyle}
          onSelect={setVideoStyle}
          onContinue={() => setStep("setup")}
          onBack={() => setStep("angles")}
        />
      )}

      {step === "setup" && (
        <>
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product photo (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors active:bg-secondary/40"
              style={{ minHeight: previewUrl ? undefined : "8rem" }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Product photo" className="max-h-44 rounded-xl object-contain" />
              ) : (
                <>
                  <Camera className="h-7 w-7 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    Add a photo to guide the video, or skip for text-only
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Same "paste a product link / pick from catalog" pattern
              SetupStep.tsx already proves out for Image Ad — reused as-is
              (fetchProductLink is free, no new backend work), just not
              previously wired into Video Ad. Overwrites offerDescription
              from the "brief" step, same as Image Ad's SetupStep already
              does via onDescriptionOverride={setOfferDescription}. */}
          <button
            onClick={() => setMoreOptionsOpen((v) => !v)}
            className="mb-3 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            More options
            <ChevronDown className={["h-3.5 w-3.5 transition-transform", moreOptionsOpen ? "rotate-180" : ""].join(" ")} />
          </button>
          {moreOptionsOpen && (
            <div className="mb-6 flex w-full flex-col items-center gap-2">
              {!showLinkInput ? (
                <button
                  onClick={() => setShowLinkInput(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  <Link2 className="h-3 w-3" />
                  Product link
                </button>
              ) : (
                <div className="flex w-full gap-2">
                  <input
                    type="url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://yourstore.com/products/..."
                    disabled={fetchingLink}
                    className="flex-1 rounded-full border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={handleFetchProductLink}
                    disabled={!productUrl.trim() || fetchingLink}
                    className="flex shrink-0 items-center justify-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
                  >
                    {fetchingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Fetch"}
                  </button>
                </div>
              )}
              <ProductPicker
                onSelect={(desc, photoFile) => {
                  setOfferDescription(desc);
                  if (photoFile) handleFileChange(photoFile);
                }}
              />
              {linkError && <p className="text-xs font-medium text-destructive">{linkError}</p>}
            </div>
          )}

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setAspectRatio("16:9")}
                className={[
                  "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold",
                  aspectRatio === "16:9" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                ].join(" ")}
              >
                Landscape (16:9)
              </button>
              <button
                onClick={() => setAspectRatio("9:16")}
                className={[
                  "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold",
                  aspectRatio === "9:16" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                ].join(" ")}
              >
                Vertical (9:16)
              </button>
            </div>
          </div>

          {/* Explicit, unconditional cost line — shown every time, not
              only when credits are short (unlike Social Content's
              Video tab today) — a single click here is 10x the cost of
              an Image Ad click, so nothing about it should be a surprise. */}
          <div className="mb-5 rounded-2xl border border-dashed border-border bg-secondary/60 p-4 text-center text-sm font-semibold text-foreground">
            1 video · {VIDEO_CREDIT_COST} credits · about 1-2 min
          </div>

          {insufficientCredits && (
            <div className="mb-5 rounded-2xl border border-dashed border-border bg-secondary/60 p-4 text-sm text-foreground">
              You have {credits} credits — not enough for a video. Upgrade to keep generating.
            </div>
          )}

          {hasLogo && (
            <p className="mb-4 text-xs text-muted-foreground">Your Brand Kit logo will be added to this video automatically.</p>
          )}

          {error && (
            <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            onClick={() => handleGenerate()}
            disabled={!offerDescription.trim() || generating || insufficientCredits}
            className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Video className="h-5 w-5" />
            Generate video
          </button>
        </>
      )}
    </>
  );
}
