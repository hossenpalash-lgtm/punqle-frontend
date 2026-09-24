import { useEffect, useRef, useState } from "react";
import { Camera, Check, CheckCircle2, ChevronDown, Download, Loader2, Megaphone, Pencil, Sparkles } from "lucide-react";
import {
  generateAdImageVariant,
  generateContentPlanPost,
  imageGenerateCreditCost,
  selectContentPlanPost,
  type ApiAdCaptionVariant,
  type ApiAdGenerateResponse,
  type ApiContentPlanPost,
} from "@/lib/api";
import { compositeImage, deriveOnImageHeadline, type BrandKit } from "@/lib/canvas-text";
import { CaptionPicker } from "./CaptionPicker";
import { ImageVariantPicker } from "./ImageVariantPicker";

export const DAY_LABELS: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
};

export const THEME_LABELS: Record<string, string> = {
  restock: "New arrival",
  popular: "Popular",
  offer: "Offer",
  general: "General",
};

export function PlanDayCard({
  planId,
  post,
  credits,
  setCredits,
  brandKit,
  onGenerated,
}: {
  planId: string;
  post: ApiContentPlanPost;
  credits: number | null;
  setCredits: (n: number) => void;
  brandKit?: BrandKit;
  onGenerated: (day: string, result: ApiAdGenerateResponse) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useAiImage, setUseAiImage] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compositedUrl, setCompositedUrl] = useState<string | null>(null);
  const [ideaText, setIdeaText] = useState(post.idea_text);
  const [editingIdea, setEditingIdea] = useState(false);
  // Collapsed by default for every day, generated or not — with 5 of these
  // stacked per plan, showing the full photo/generate controls for all of
  // them at once turns this into a long wall of near-identical UI. A tap
  // reveals whichever controls are relevant to that day's current state.
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [captions, setCaptions] = useState<ApiAdCaptionVariant[]>(
    post.status === "generated" && post.caption
      ? [{ facebook_caption: post.caption, whatsapp_message: post.whatsapp_message ?? "" }]
      : [],
  );
  const [images, setImages] = useState<string[]>(
    post.status === "generated" && post.image_base64 ? [post.image_base64] : [],
  );
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const hasResult = captions.length > 0 && images.length > 0;

  useEffect(() => {
    if (!hasResult) return;
    const variant = captions[selectedCaptionIndex];
    compositeImage(
      images[selectedImageIndex],
      { headline: deriveOnImageHeadline(variant.whatsapp_message, variant.facebook_caption) },
      brandKit,
    )
      .then(setCompositedUrl)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, captions, selectedImageIndex, selectedCaptionIndex, brandKit]);

  const handleFileChange = (f: File | null) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
    setFile(f);
    if (f) setUseAiImage(false);
  };

  const handleUseAiImage = () => {
    handleFileChange(null);
    setUseAiImage(true);
  };

  const hasImageSource = !!file || useAiImage;

  const handleGenerate = async () => {
    if (!hasImageSource || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await generateContentPlanPost(planId, post.day, useAiImage ? null : file, ideaText);
      setCaptions(r.captions);
      setImages([r.banner_image_base64]);
      setSelectedCaptionIndex(0);
      setSelectedImageIndex(0);
      setCredits(r.credits_remaining);
      onGenerated(post.day, r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the post.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMoreImages = async () => {
    if (!hasImageSource || generatingImage || (credits !== null && credits <= 0)) return;
    setGeneratingImage(true);
    setError(null);
    try {
      const r = await generateAdImageVariant(ideaText, useAiImage ? null : file);
      const newIndex = images.length;
      setImages((prev) => [...prev, r.banner_image_base64]);
      setSelectedImageIndex(newIndex);
      setCredits(r.credits_remaining);
      selectContentPlanPost(
        planId,
        post.day,
        captions[selectedCaptionIndex].facebook_caption,
        captions[selectedCaptionIndex].whatsapp_message,
        r.banner_image_base64,
      ).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate a new image.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSelectCaption = (i: number) => {
    setSelectedCaptionIndex(i);
    selectContentPlanPost(
      planId,
      post.day,
      captions[i].facebook_caption,
      captions[i].whatsapp_message,
      images[selectedImageIndex],
    ).catch(() => {});
  };

  const handleSelectImage = (i: number) => {
    setSelectedImageIndex(i);
    selectContentPlanPost(
      planId,
      post.day,
      captions[selectedCaptionIndex].facebook_caption,
      captions[selectedCaptionIndex].whatsapp_message,
      images[i],
    ).catch(() => {});
  };

  return (
    <div className="mb-4 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {DAY_LABELS[post.day] ?? post.day}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
              {THEME_LABELS[post.theme] ?? post.theme}
            </span>
            {hasResult && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
          </div>
          {!expanded && <p className="truncate text-sm text-muted-foreground">{ideaText}</p>}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <>
          {compositedUrl || !editingIdea ? (
            <div className="mb-3 mt-3 flex items-start gap-2">
              <p className="flex-1 text-sm text-foreground">{ideaText}</p>
              {!compositedUrl && (
                <button
                  onClick={() => setEditingIdea(true)}
                  aria-label="Edit idea"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="mb-3 mt-3 flex items-start gap-2">
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                rows={2}
                autoFocus
                className="flex-1 rounded-xl border border-border bg-background p-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={() => setEditingIdea(false)}
                disabled={!ideaText.trim()}
                aria-label="Done editing"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {hasResult ? (
            <>
              {compositedUrl && (
                <img
                  src={compositedUrl}
                  alt={post.idea_text}
                  className="mb-3 w-full rounded-xl"
                />
              )}

              <ImageVariantPicker
                images={images}
                selectedIndex={selectedImageIndex}
                onSelect={handleSelectImage}
                onGenerateMore={handleGenerateMoreImages}
                generateMoreCreditCost={imageGenerateCreditCost(!useAiImage && !!file, "nano_banana_pro")}
                generating={generatingImage}
                disabled={credits !== null && credits <= 0}
              />

              <CaptionPicker
                captions={captions}
                selectedIndex={selectedCaptionIndex}
                onSelect={handleSelectCaption}
              />

              {error && <p className="mb-2 text-xs font-medium text-destructive">{error}</p>}

              <a
                href={compositedUrl ?? undefined}
                download="ad.jpg"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {useAiImage ? (
                <div className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-3 text-center text-xs font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI will generate the image
                  <button
                    onClick={() => setUseAiImage(false)}
                    className="ml-1 text-primary underline-offset-2 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background p-3 text-center text-xs font-semibold text-muted-foreground"
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Product photo"
                        className="max-h-24 rounded-lg object-contain"
                      />
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        Take or choose a photo
                      </>
                    )}
                  </button>
                  {!previewUrl && (
                    <button
                      onClick={handleUseAiImage}
                      className="mb-2 block w-full text-center text-xs font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      No photo? Generate one with AI
                    </button>
                  )}
                </>
              )}
              {error && <p className="mb-2 text-xs font-medium text-destructive">{error}</p>}
              <button
                onClick={handleGenerate}
                disabled={!hasImageSource || generating || (credits !== null && credits <= 0)}
                className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                style={{ background: "var(--gradient-primary)" }}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4" />
                    Generate ({imageGenerateCreditCost(!useAiImage && !!file, "nano_banana_pro")} credit{imageGenerateCreditCost(!useAiImage && !!file, "nano_banana_pro") === 1 ? "" : "s"})
                  </>
                )}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
