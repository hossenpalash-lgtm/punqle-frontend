import { AlertCircle, Check, Download, Lock, Pencil, Rocket } from "lucide-react";
import { useState } from "react";
import type { ApiAdCaptionVariant, CaptionLength, CaptionTone } from "@/lib/api";
import { deriveOnImageHeadline, type Box, type BrandKit, type EditOptions } from "@/lib/canvas-text";
import { CaptionPicker } from "./CaptionPicker";
import { CaptionStyleControls } from "./CaptionStyleControls";
import { CarouselBuilder } from "./CarouselBuilder";
import { DragDropEditor } from "./DragDropEditor";
import { HashtagPicker } from "./HashtagPicker";
import { ImageVariantPicker } from "./ImageVariantPicker";
import { PublishToMeta } from "./PublishToMeta";
import { QuickEditPanel } from "./QuickEditPanel";
import { TranslateCaptions } from "./TranslateCaptions";

// The result screen — everything SinglePostForm's old flat result view
// already had (image variants, caption picker, quick edit, drag-drop
// editor, hashtags, translate, carousel, download), reframed as a "Post
// Kit" with a real (not fabricated) readiness checklist and tone/length
// caption controls on top. No creative score or "best time" section —
// nothing in the backend calculates either, and the brief is explicit
// about not fabricating metrics.
export function PostKit({
  compositedUrl,
  textBox,
  onTextBoxChange,
  logoBox,
  onLogoBoxChange,
  hasLogo,
  showLogo,
  onShowLogoChange,
  images,
  selectedImageIndex,
  onSelectImage,
  onGenerateMoreImages,
  onRemoveBackground,
  onEnhance,
  generatingImage,
  removingBackground,
  enhancing,
  outOfCredits,
  captions,
  selectedCaptionIndex,
  onSelectCaption,
  captionTone,
  onCaptionToneChange,
  captionLength,
  onCaptionLengthChange,
  onGenerateAnotherCaption,
  regeneratingCaptions,
  onTranslate,
  translating,
  editedCaption,
  onCaptionChange,
  fontScale,
  onFontScaleChange,
  barColorOverride,
  onBarColorOverrideChange,
  itemDescription,
  onAppendHashtag,
  brandKit,
  editOptions,
  whatsappMessage,
  cta,
  visualDirection,
  goal,
  angle,
  error,
  onReset,
  // Both default to Image Post's existing behavior — Ad Creation is the
  // only caller that overrides them (its captions vary by persuasion
  // angle, not tone/length, so those controls would do nothing useful
  // there; and it wants a placeholder signaling where real campaign
  // launch will live once that's built).
  showCaptionStyleControls = true,
  showLaunchCampaignPlaceholder = false,
}: {
  compositedUrl: string | null;
  textBox: Box | undefined;
  onTextBoxChange: (b: Box | undefined) => void;
  logoBox: Box | undefined;
  onLogoBoxChange: (b: Box | undefined) => void;
  hasLogo: boolean;
  showLogo: boolean;
  onShowLogoChange: (v: boolean) => void;
  images: string[];
  selectedImageIndex: number;
  onSelectImage: (i: number) => void;
  onGenerateMoreImages: () => void;
  onRemoveBackground: () => void;
  onEnhance: () => void;
  generatingImage: boolean;
  removingBackground: boolean;
  enhancing: boolean;
  outOfCredits: boolean;
  captions: ApiAdCaptionVariant[];
  selectedCaptionIndex: number;
  onSelectCaption: (i: number) => void;
  captionTone: CaptionTone;
  onCaptionToneChange: (t: CaptionTone) => void;
  captionLength: CaptionLength;
  onCaptionLengthChange: (l: CaptionLength) => void;
  onGenerateAnotherCaption: () => void;
  regeneratingCaptions: boolean;
  onTranslate: (language: string) => void;
  translating: boolean;
  editedCaption: string;
  onCaptionChange: (text: string) => void;
  fontScale: number;
  onFontScaleChange: (n: number) => void;
  barColorOverride: string | null | undefined;
  onBarColorOverrideChange: (c: string | null | undefined) => void;
  itemDescription: string;
  onAppendHashtag: (tag: string) => void;
  brandKit: BrandKit;
  editOptions: EditOptions;
  whatsappMessage: string;
  cta?: string;
  visualDirection?: string;
  goal?: string | null;
  angle?: string | null;
  error: string | null;
  onReset: () => void;
  showCaptionStyleControls?: boolean;
  showLaunchCampaignPlaceholder?: boolean;
}) {
  const hashtagsAdded = editedCaption.includes("#");
  // Carousel slides mirror what's actually baked onto the main preview
  // — the short on-image headline, never the full editable caption —
  // so a downloaded carousel matches the hero image the user is looking
  // at, not a differently-sized render of the raw caption text.
  const carouselText = {
    headline: deriveOnImageHeadline(whatsappMessage, captions[selectedCaptionIndex]?.facebook_caption ?? editedCaption),
    cta,
  };
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <>
      {/* The static hero is the default view — dominant, uncluttered, no
          drag handles — matching "keep the primary result visually
          dominant." The interactive DragDropEditor (dashed outlines,
          resize handles) only appears once the user actually asks to
          edit, via "Edit in Editor" below. */}
      {compositedUrl && !editorOpen && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <img src={compositedUrl} alt="Your generated post" className="block w-full" />
        </div>
      )}
      {compositedUrl && editorOpen && (
        <DragDropEditor
          imageUrl={compositedUrl}
          textBox={textBox}
          onTextBoxChange={onTextBoxChange}
          logoBox={logoBox}
          onLogoBoxChange={onLogoBoxChange}
          hasLogo={hasLogo}
          showLogo={showLogo}
        />
      )}
      <button
        onClick={() => setEditorOpen((v) => !v)}
        className="mb-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-secondary px-4 py-2.5 text-xs font-semibold text-secondary-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
        {editorOpen ? "Done editing" : "Edit in Editor"}
      </button>

      {/* Real-only readiness checklist — every row is a true/false fact
          about generated state, never an invented quality score. */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        {[
          { label: "Image", ready: images.length > 0 },
          { label: "Caption", ready: captions.length > 0 },
          { label: "Hashtags", ready: hashtagsAdded },
        ].map(({ label, ready }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl bg-card py-2.5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span
              className={[
                "flex h-5 w-5 items-center justify-center rounded-full",
                ready ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground",
              ].join(" ")}
            >
              <Check className="h-3 w-3" />
            </span>
            <span className="text-[11px] font-semibold text-foreground">{label}</span>
          </div>
        ))}
      </div>

      <ImageVariantPicker
        images={images}
        selectedIndex={selectedImageIndex}
        onSelect={onSelectImage}
        onGenerateMore={onGenerateMoreImages}
        onRemoveBackground={onRemoveBackground}
        onEnhance={onEnhance}
        generating={generatingImage}
        removingBackground={removingBackground}
        enhancing={enhancing}
        disabled={outOfCredits}
      />

      <CaptionPicker captions={captions} selectedIndex={selectedCaptionIndex} onSelect={onSelectCaption} />

      {showCaptionStyleControls && (
        <CaptionStyleControls
          tone={captionTone}
          onToneChange={onCaptionToneChange}
          length={captionLength}
          onLengthChange={onCaptionLengthChange}
          onGenerateAnother={onGenerateAnotherCaption}
          generating={regeneratingCaptions}
        />
      )}

      <TranslateCaptions onTranslate={onTranslate} translating={translating} />

      <QuickEditPanel
        captionText={editedCaption}
        onCaptionChange={onCaptionChange}
        fontScale={fontScale}
        onFontScaleChange={onFontScaleChange}
        barColorOverride={barColorOverride}
        onBarColorOverrideChange={onBarColorOverrideChange}
        hasLogo={hasLogo}
        showLogo={showLogo}
        onShowLogoChange={onShowLogoChange}
      />

      <HashtagPicker itemDescription={itemDescription} onAppend={onAppendHashtag} />

      <CarouselBuilder
        images={images}
        text={carouselText}
        brandKit={brandKit}
        editOptions={editOptions}
        visualDirection={visualDirection}
      />

      <div className="mb-6 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp message</p>
        <p className="text-sm text-foreground">{whatsappMessage}</p>
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <a
        href={compositedUrl ?? undefined}
        download="post.jpg"
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Download className="h-5 w-5" />
        Download image
      </a>

      <PublishToMeta compositedUrl={compositedUrl} caption={editedCaption} goal={goal} angle={angle} style={visualDirection} />

      {showLaunchCampaignPlaceholder && (
        <button
          disabled
          className="mb-3 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-muted-foreground"
        >
          <Rocket className="h-4 w-4" />
          Launch Campaign
          <span className="ml-1 flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold">
            <Lock className="h-2.5 w-2.5" />
            Coming soon
          </span>
        </button>
      )}

      <button
        onClick={onReset}
        className="w-full rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
      >
        Create another
      </button>
    </>
  );
}
