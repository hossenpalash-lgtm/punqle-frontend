import { AlertCircle, Camera, ChevronDown, Clock, Download, Link2, Loader2, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  base64ToFile,
  checkVideoStatus,
  fetchProductLink,
  generateAdCaptions,
  startVideoGeneration,
  type AdGoal,
  type ApiVideoOperation,
  type VideoAspectRatio,
} from "@/lib/api";
import { findVideoStyle, type VideoStyle } from "@/lib/video-style";
import { AdBriefStep } from "./AdBriefStep";
import { ProductPicker } from "./ProductPicker";
import { PublishToYouTube } from "./PublishToYouTube";
import { VideoStyleStep } from "./VideoStyleStep";
import { WizardProgress } from "./WizardProgress";

const VIDEO_CREDIT_COST = 10;
const POLL_INTERVAL_MS = 8000;

type WizardStep = "brief" | "style" | "setup" | "generating" | "result";

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
}: {
  credits: number | null;
  setCredits: (n: number) => void;
}) {
  const [step, setStep] = useState<WizardStep>("brief");

  // Brief
  const [offerDescription, setOfferDescription] = useState("");
  const [goal, setGoal] = useState<AdGoal>("sales");
  const [angle, setAngle] = useState<string | null>(null);
  const [videoStyle, setVideoStyle] = useState<VideoStyle>("product_showcase");

  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("16:9");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  const [fetchingLink, setFetchingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
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
      const r = await checkVideoStatus(operation, headlineRef.current);
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

  const handleGenerate = async () => {
    if (!offerDescription.trim() || generating || (credits !== null && credits < VIDEO_CREDIT_COST)) return;
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
      const capResult = await generateAdCaptions(offerDescription.trim(), goal, angle, 1);
      setCaption(capResult.captions[0]?.facebook_caption ?? "");

      const style = findVideoStyle(videoStyle);
      const styledDescription = `${offerDescription.trim()}, ${style.promptModifier}`;
      const imageBase64 = file ? await fileToBase64(file) : undefined;
      const r = await startVideoGeneration(styledDescription, imageBase64, file?.type, aspectRatio, goal, angle ?? undefined);
      setHeadline(r.headline);
      headlineRef.current = r.headline;
      pollTimeoutRef.current = setTimeout(() => poll(r.operation), POLL_INTERVAL_MS);
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't start the video.");
      setStep("setup");
    }
  };

  const handleReset = () => {
    setStep("brief");
    setOfferDescription("");
    setGoal("sales");
    setAngle(null);
    setVideoStyle("product_showcase");
    setAspectRatio("16:9");
    handleFileChange(null);
    setVideoUrl(null);
    setError(null);
    setElapsedSeconds(0);
    setHeadline("");
    setCaption("");
    headlineRef.current = "";
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

      {step === "brief" && (
        <AdBriefStep
          offerDescription={offerDescription}
          onOfferDescriptionChange={setOfferDescription}
          goal={goal}
          onGoalChange={setGoal}
          angle={angle}
          onAngleChange={setAngle}
          onContinue={() => setStep("style")}
        />
      )}

      {step === "style" && (
        <VideoStyleStep
          selected={videoStyle}
          onSelect={setVideoStyle}
          onContinue={() => setStep("setup")}
          onBack={() => setStep("brief")}
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

          {error && (
            <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
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
