import {
  AlertCircle,
  ArrowLeft,
  Camera,
  ChevronDown,
  Facebook,
  Globe,
  Instagram,
  Link2,
  Linkedin,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { base64ToFile, fetchProductLink } from "@/lib/api";
import type { Platform } from "@/lib/social-wizard";
import { CAROUSEL_SLIDE_COUNTS, PLATFORM_OPTIONS, VERSION_COUNTS } from "@/lib/social-wizard";
import { ProductPicker } from "./ProductPicker";
import { StockPhotoSearch } from "./StockPhotoSearch";

const PLATFORM_ICONS: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  other: Globe,
};

// Step 3, "Set it up" — merges what were 2 separate screens (visual
// source, then platform+versions) into one, since the spec treats them
// as a single "set it up" moment rather than 2 discrete steps. Every
// underlying control is unchanged from those 2 screens — just stacked
// on one screen with one Generate action at the bottom, cutting a click
// out of the flow.
export function SetupStep({
  file,
  previewUrl,
  useAiImage,
  onFileChange,
  onUseAiImage,
  onDescriptionOverride,
  platform,
  onPlatformChange,
  versions,
  onVersionsChange,
  credits,
  onGenerate,
  onBack,
  error,
  entryHint,
  imageTrialAvailable,
}: {
  file: File | null;
  previewUrl: string | null;
  useAiImage: boolean;
  onFileChange: (f: File | null) => void;
  onUseAiImage: () => void;
  onDescriptionOverride: (text: string) => void;
  platform: Platform;
  onPlatformChange: (p: Platform) => void;
  versions: number;
  onVersionsChange: (n: number) => void;
  credits: number | null;
  onGenerate: () => void;
  onBack: () => void;
  error: string | null;
  // Carousel entry reuses "versions" as slide count — see
  // CAROUSEL_SLIDE_COUNTS. Undefined/absent for every other caller,
  // byte-identical to before this existed.
  entryHint?: "carousel";
  // This account's guaranteed-once-free "image" try (main.py's
  // FEATURE_TRIAL_KEYS) — only covers the FIRST version/slide; the
  // rest of a multi-version batch still costs credits normally.
  // Undefined for callers that don't generate images (e.g. Social
  // Video's reuse of this step for photo upload only) — behaves
  // exactly as before this existed.
  imageTrialAvailable?: boolean;
}) {
  const isCarousel = entryHint === "carousel";
  const countOptions = isCarousel ? CAROUSEL_SLIDE_COUNTS : VERSION_COUNTS;
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  const [fetchingLink, setFetchingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const hasSource = !!file || useAiImage;
  // The trial only waives the first version's credit, so a multi-version
  // request still needs credits for versions-1 — only skip the gate
  // entirely when requesting just 1 (the common case: Quick-Create-style
  // single generation).
  const insufficientCredits =
    !(imageTrialAvailable && versions === 1) && credits !== null && credits < versions;

  const handleFetchProductLink = async () => {
    if (!productUrl.trim() || fetchingLink) return;
    setFetchingLink(true);
    setLinkError(null);
    try {
      const r = await fetchProductLink(productUrl.trim());
      onDescriptionOverride([r.title, r.description].filter(Boolean).join(" — "));
      if (r.image_base64) {
        onFileChange(base64ToFile(r.image_base64, r.mime_type || "image/jpeg", "product.jpg"));
      } else {
        onUseAiImage();
      }
      setShowLinkInput(false);
      setProductUrl("");
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Couldn't fetch that link.");
    } finally {
      setFetchingLink(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-xl font-extrabold text-foreground">Set it up</h1>
      <p className="mb-6 text-sm text-muted-foreground">Punqle handles the technical decisions.</p>

      {/* Visual source */}
      <label className="mb-2 block w-full text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Visual source
      </label>
      <div className="mb-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={onUseAiImage}
          className={[
            "flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-center",
            useAiImage ? "border-primary bg-primary/5" : "border-border bg-card",
          ].join(" ")}
          style={!useAiImage ? { boxShadow: "var(--shadow-card)" } : undefined}
        >
          <Sparkles className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
          <span className="text-xs font-semibold text-foreground">Let Punqle choose</span>
        </button>
        <label
          className={[
            "flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-center",
            file ? "border-primary bg-primary/5" : "border-border bg-card",
          ].join(" ")}
          style={!file ? { boxShadow: "var(--shadow-card)" } : undefined}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          <Camera className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Upload my image</span>
        </label>
        <div
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <StockPhotoSearch onSelect={onFileChange} />
        </div>
      </div>

      {previewUrl && (
        <img src={previewUrl} alt="Selected" className="mb-3 max-h-32 rounded-xl object-contain" />
      )}

      {/* Secondary visual-source options — collapsed by default
          (progressive disclosure) so the primary 3 choices above aren't
          crowded by less-common paths. */}
      <button
        onClick={() => setMoreOptionsOpen((v) => !v)}
        className="mb-6 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
      >
        More options
        <ChevronDown className={["h-3.5 w-3.5 transition-transform", moreOptionsOpen ? "rotate-180" : ""].join(" ")} />
      </button>
      {moreOptionsOpen && (
        <div className="-mt-4 mb-6 flex w-full flex-col items-center gap-2">
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
            onSelect={(description, photoFile) => {
              onDescriptionOverride(description);
              if (photoFile) {
                onFileChange(photoFile);
              } else {
                onUseAiImage();
              }
            }}
          />
          {linkError && <p className="text-xs font-medium text-destructive">{linkError}</p>}
        </div>
      )}

      {/* Platform */}
      <label className="mb-2 block w-full text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Where will you post?
      </label>
      <p className="mb-2 w-full text-left text-xs text-muted-foreground">
        Punqle automatically adapts the design to each platform.
      </p>
      <div className="mb-6 grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {PLATFORM_OPTIONS.map((opt) => {
          const Icon = PLATFORM_ICONS[opt.id];
          const isSelected = platform === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onPlatformChange(opt.id)}
              className={[
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center",
                isSelected ? "border-primary bg-primary/5" : "border-border bg-card",
              ].join(" ")}
              style={!isSelected ? { boxShadow: "var(--shadow-card)" } : undefined}
            >
              <Icon className="h-5 w-5 text-foreground" />
              <span className="text-xs font-semibold text-foreground">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Versions / carousel slide count */}
      <label className="mb-2 block w-full text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {isCarousel ? "How many slides?" : "How many versions?"}
      </label>
      <div className="mb-2 flex w-full gap-2">
        {countOptions.map((n) => (
          <button
            key={n}
            onClick={() => onVersionsChange(n)}
            className={[
              "flex-1 rounded-full px-3 py-2.5 text-sm font-semibold",
              versions === n ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
            ].join(" ")}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mb-6 text-xs text-muted-foreground">
        {imageTrialAvailable && versions === 1 ? (
          <span className="font-semibold text-primary">✨ Your first one's free — no credits</span>
        ) : imageTrialAvailable ? (
          isCarousel
            ? `First slide free, then ${versions - 1} more slide${versions - 1 > 1 ? "s" : ""} = ${versions - 1} credit${versions - 1 > 1 ? "s" : ""}.`
            : `First version free, then ${versions - 1} more = ${versions - 1} credit${versions - 1 > 1 ? "s" : ""}.`
        ) : isCarousel ? (
          `${versions} slides = ${versions} credits.`
        ) : (
          `${versions} version${versions > 1 ? "s" : ""} = ${versions} credit${versions > 1 ? "s" : ""}.`
        )}
      </p>

      {insufficientCredits && (
        <div className="mb-4 w-full rounded-2xl border border-border bg-secondary/60 p-4 text-sm text-foreground">
          You have {credits} credit{credits === 1 ? "" : "s"} left — not enough for {versions}{" "}
          {isCarousel ? "slides" : "versions"}. Pick fewer or upgrade to keep generating.
        </div>
      )}

      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex w-full gap-2">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 rounded-full bg-secondary px-5 py-4 text-sm font-semibold text-secondary-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onGenerate}
          disabled={!hasSource || insufficientCredits}
          className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {imageTrialAvailable && versions === 1
            ? "Try free"
            : isCarousel
              ? `Generate ${versions}-slide carousel`
              : `Generate ${versions} variation${versions > 1 ? "s" : ""}`}
          <Sparkles className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
