import { AlertCircle, Download, Pencil } from "lucide-react";
import { useState } from "react";
import type { ApiAdCaptionVariant, CaptionLength, CaptionTone } from "@/lib/api";
import { deriveOnImageHeadline, type Box, type BrandKit, type EditOptions } from "@/lib/canvas-text";
import { CaptionPicker } from "./CaptionPicker";
import { CaptionStyleControls } from "./CaptionStyleControls";
import { CarouselBuilder } from "./CarouselBuilder";
import { DragDropEditor } from "./DragDropEditor";
import { HashtagPicker } from "./HashtagPicker";
import { ImageToolsPill, ImageVariantPicker } from "./ImageVariantPicker";
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
  generateMoreCreditCost,
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
  carouselSlideHeadlines,
  carouselAutoExpand = false,
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
  generateMoreCreditCost: number;
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
  // Set only by SinglePostForm's auto-design carousel flow — see
  // CarouselBuilder's own props for what each does. Both default to
  // "off", byte-identical to every other caller (Ad Creation, a normal
  // Image Post) that doesn't pass them.
  carouselSlideHeadlines?: (string | undefined)[];
  carouselAutoExpand?: boolean;
}) {
  // Carousel slides mirror what's actually baked onto the main preview
  // — the short on-image headline, never the full editable caption —
  // so a downloaded carousel matches the hero image the user is looking
  // at, not a differently-sized render of the raw caption text.
  const carouselText = {
    headline: deriveOnImageHeadline(whatsappMessage, captions[selectedCaptionIndex]?.facebook_caption ?? editedCaption),
    cta,
  };
  const [editorOpen, setEditorOpen] = useState(false);
  const scrollToPublish = () =>
    document.getElementById("publish-block")?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Section label — same small caps treatment used for all 3 blocks below.
  // Refined-hybrid polish pass (2026-09): the result screen used to be ~15
  // stacked elements at one uniform visual weight with no grouping — this
  // and the block wrappers below are the fix, applied within Punqle's
  // existing light identity (no theme/color-token changes, no new
  // features — pure grouping + spacing + one localized dark "stage"
  // behind the image, per the agreed design direction).
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-accent">{children}</p>
  );

  return (
    <>
      {/* ===== Block 1: Creative — the image, its editor, readiness
          checklist, variant tools, and carousel export. Everything about
          the visual asset itself lives here, larger and first. ===== */}
      <div className="mb-8">
        <SectionLabel>Your creative</SectionLabel>

        {/* Dark "stage" behind the preview only — real photo/ad colors
            read truer against a neutral dark ground than a bright white
            one (the same reason photo/video tools use a neutral canvas,
            not a decoration). Nothing else on the page changes color. */}
        {compositedUrl && !editorOpen && (
          <div className="mb-5">
            <div className="@container relative overflow-hidden rounded-2xl bg-[#1E1F24]" style={{ boxShadow: "var(--shadow-card)" }}>
              <img src={compositedUrl} alt="Your generated post" className="block w-full" />
              {/* Glass Download / Edit stay ON the picture (founder, 2026-10-12), top right. top-[9cqw]
                  puts them just below the "Made with Punqle" badge printed in that corner, which they
                  used to cover. */}
              <div className="absolute right-3 top-[9cqw] flex gap-2">
                <a
                  href={compositedUrl}
                  download="post.jpg"
                  className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <button
                  onClick={() => setEditorOpen(true)}
                  className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>
            </div>
            {/* The caption and Publish now sit UNDER the picture. They used to be a frosted card laid over
                its lower part, which hid the headline and button printed there (2026-11-10: "the text
                looks cut off"). The whole creative stays visible, exactly as it will be posted. */}
            <div className="mt-3 rounded-2xl bg-card p-3.5" style={{ boxShadow: "var(--shadow-card)" }}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Caption</p>
              <p className="line-clamp-3 text-[13px] leading-snug text-foreground">{editedCaption}</p>
              <button
                onClick={scrollToPublish}
                className="bg-primary mt-3 w-full rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Publish
              </button>
            </div>
          </div>
        )}
        {compositedUrl && editorOpen && (
          <div className="mb-3 overflow-hidden rounded-2xl bg-[#1E1F24] p-3" style={{ boxShadow: "var(--shadow-card)" }}>
            <DragDropEditor
              imageUrl={compositedUrl}
              textBox={textBox}
              onTextBoxChange={onTextBoxChange}
              logoBox={logoBox}
              onLogoBoxChange={onLogoBoxChange}
              hasLogo={hasLogo}
              showLogo={showLogo}
            />
          </div>
        )}
        {editorOpen && (
          <button
            onClick={() => setEditorOpen(false)}
            className="mb-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-secondary px-4 py-2.5 text-xs font-semibold text-secondary-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Done editing
          </button>
        )}

        <ImageVariantPicker
          images={images}
          selectedIndex={selectedImageIndex}
          onSelect={onSelectImage}
          onGenerateMore={onGenerateMoreImages}
          generateMoreCreditCost={generateMoreCreditCost}
          onRemoveBackground={onRemoveBackground}
          onEnhance={onEnhance}
          generating={generatingImage}
          removingBackground={removingBackground}
          enhancing={enhancing}
          disabled={outOfCredits}
          hideTools
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

        {/* Five optional tools as one row of small pills (2026-11-10) — they used to be five centered
            text links stacked under each other, plus a "Caption" heading and a row of three tick
            cards that only said "done". A tool's panel opens full width right where its pill is. */}
        <div className="flex flex-wrap items-start gap-2">
          <ImageToolsPill
            onRemoveBackground={onRemoveBackground}
            onEnhance={onEnhance}
            busy={generatingImage || removingBackground || enhancing}
            removingBackground={removingBackground}
            enhancing={enhancing}
            disabled={outOfCredits}
          />
          <CarouselBuilder
            images={images}
            text={carouselText}
            brandKit={brandKit}
            editOptions={editOptions}
            visualDirection={visualDirection}
            slideHeadlines={carouselSlideHeadlines}
            autoExpand={carouselAutoExpand}
          />
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
        </div>
      </div>

      {/* ===== Block 3: Publish — the WhatsApp handoff, download, and
          every real publish action. The one clear "what happens next"
          zone, at the bottom, after the creative and caption are settled. ===== */}
      <div id="publish-block" className="scroll-mt-20 border-t border-border pt-6">
        <SectionLabel>Publish</SectionLabel>

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

        {/* No second "Download image" button here (2026-11-11): the Download on the picture does the same. */}
        <PublishToMeta compositedUrl={compositedUrl} caption={editedCaption} goal={goal} angle={angle} style={visualDirection} />

        <button
          onClick={onReset}
          className="w-full rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
        >
          Create another
        </button>
      </div>
    </>
  );
}
