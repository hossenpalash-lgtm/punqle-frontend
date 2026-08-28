import { AlertCircle, Camera, ChevronDown, Clock, Download, Link2, Loader2, Mic, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  addVoiceover,
  base64ToFile,
  checkVideoStatus,
  fetchBusinessProfile,
  fetchProductLink,
  startVideoGeneration,
  type ApiVideoOperation,
  type VideoAspectRatio,
} from "@/lib/api";
import { ProductPicker } from "./ProductPicker";
import { PublishToYouTube } from "./PublishToYouTube";

const VIDEO_CREDIT_COST = 10;
const VOICEOVER_CREDIT_COST = 2;
const POLL_INTERVAL_MS = 8000;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

// Text-to-video for v1, with an optional photo to guide it (Veo supports
// image-to-video natively at no extra cost) — deliberately not full
// feature parity with SinglePostForm (no captions, no aspect-ratio
// picker, no carousel) since video is a new, much costlier capability
// and this keeps the first version scoped to "does this work at all."
export function VideoPostForm({
  credits,
  setCredits,
}: {
  credits: number | null;
  setCredits: (n: number) => void;
}) {
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("16:9");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [videoOperation, setVideoOperation] = useState<ApiVideoOperation | null>(null);
  const [narration, setNarration] = useState("");
  const [addingVoiceover, setAddingVoiceover] = useState(false);
  const [voiceoverError, setVoiceoverError] = useState<string | null>(null);
  const [hasVoiceover, setHasVoiceover] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  const [fetchingLink, setFetchingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [hasLogo, setHasLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // poll() is a self-scheduling setTimeout chain — it needs the *current*
  // headline at whatever moment the video finishes, not whatever it was
  // when the chain started, since the user can keep editing it during the
  // 1-2 minute wait. State alone would give poll() a stale closure value.
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
      .then((profile) => setHasLogo(!!profile.logo_base64))
      .catch(() => {});
  }, []);

  const handleFileChange = (f: File | null) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
    setFile(f);
  };

  const handleFetchProductLink = async () => {
    if (!productUrl.trim() || fetchingLink) return;
    setFetchingLink(true);
    setLinkError(null);
    try {
      const r = await fetchProductLink(productUrl.trim());
      setDescription([r.title, r.description].filter(Boolean).join(" — "));
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
      if (r.video_base64) {
        setVideoUrl(`data:video/mp4;base64,${r.video_base64}`);
      }
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't check the video's status.");
    }
  };

  const handleGenerate = async () => {
    if (!description.trim() || generating || (credits !== null && credits < VIDEO_CREDIT_COST)) return;
    setGenerating(true);
    setError(null);
    setVideoUrl(null);
    setElapsedSeconds(0);
    elapsedIntervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    try {
      const imageBase64 = file ? await fileToBase64(file) : undefined;
      const r = await startVideoGeneration(description.trim(), imageBase64, file?.type, aspectRatio);
      setHeadline(r.headline);
      headlineRef.current = r.headline;
      setNarration(r.narration);
      setVideoOperation(r.operation);
      pollTimeoutRef.current = setTimeout(() => poll(r.operation), POLL_INTERVAL_MS);
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't start the video.");
    }
  };

  const handleAddVoiceover = async () => {
    if (!videoOperation || addingVoiceover || (credits !== null && credits < VOICEOVER_CREDIT_COST)) return;
    setAddingVoiceover(true);
    setVoiceoverError(null);
    try {
      const r = await addVoiceover(videoOperation, headlineRef.current, narration, aspectRatio);
      setVideoUrl(`data:video/mp4;base64,${r.video_base64}`);
      setHasVoiceover(true);
      setCredits(r.credits_remaining);
    } catch (err) {
      setVoiceoverError(err instanceof Error ? err.message : "Couldn't add voiceover.");
    } finally {
      setAddingVoiceover(false);
    }
  };

  const handleReset = () => {
    setDescription("");
    setAspectRatio("16:9");
    handleFileChange(null);
    setVideoUrl(null);
    setError(null);
    setElapsedSeconds(0);
    setHeadline("");
    headlineRef.current = "";
    setVideoOperation(null);
    setNarration("");
    setAddingVoiceover(false);
    setVoiceoverError(null);
    setHasVoiceover(false);
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

  if (videoUrl) {
    return (
      <>
        <div className="mb-3 overflow-hidden rounded-2xl bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <video src={videoUrl} controls className="w-full" />
        </div>

        {!hasVoiceover && (
          <div className="mb-3 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="mb-1 text-sm font-semibold text-foreground">Add AI voiceover + captions</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Real spoken narration with animated captions synced to the voice.
            </p>
            {credits !== null && credits < VOICEOVER_CREDIT_COST && (
              <p className="mb-3 text-xs text-muted-foreground">
                Needs {VOICEOVER_CREDIT_COST} credits — you have {credits}.
              </p>
            )}
            {voiceoverError && (
              <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {voiceoverError}
              </p>
            )}
            <button
              onClick={handleAddVoiceover}
              disabled={addingVoiceover || !videoOperation || (credits !== null && credits < VOICEOVER_CREDIT_COST)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
            >
              {addingVoiceover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              Add voiceover + captions ({VOICEOVER_CREDIT_COST} credits)
            </button>
          </div>
        )}
        {hasVoiceover && <p className="mb-3 text-xs font-medium text-primary">Voiceover + captions added.</p>}

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

  if (generating) {
    return (
      <div className="rounded-2xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-6 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Generating your video...</p>
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
          This gets burned onto the video as a caption once it's ready — edit it any time while you wait, or clear it for no text.
        </p>
      </div>
    );
  }

  return (
    <>
      {credits !== null && credits < VIDEO_CREDIT_COST && (
        <div className="mb-5 rounded-2xl border border-dashed border-border bg-secondary/60 p-4 text-sm text-foreground">
          Video needs {VIDEO_CREDIT_COST} credits — you have {credits}. Upgrade to keep generating.
        </div>
      )}

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
          SetupStep.tsx already proves out for Image Post — reused as-is
          here (fetchProductLink is free, no new backend work), just not
          previously wired into either video flow. Collapsed by default,
          same progressive-disclosure reasoning as SetupStep's version. */}
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
              setDescription(desc);
              if (photoFile) handleFileChange(photoFile);
            }}
          />
          {linkError && <p className="text-xs font-medium text-destructive">{linkError}</p>}
        </div>
      )}

      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What's the video about?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Fresh roasted coffee beans, steam rising from a cup"
          rows={3}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

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
        onClick={handleGenerate}
        disabled={!description.trim() || generating || (credits !== null && credits < VIDEO_CREDIT_COST)}
        className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Video className="h-5 w-5" />
        Generate video ({VIDEO_CREDIT_COST} credits)
      </button>
    </>
  );
}
