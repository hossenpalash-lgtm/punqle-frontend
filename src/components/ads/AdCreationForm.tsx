import { Loader2, Rocket, Settings2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  base64ToFile,
  enhanceImage,
  fetchBusinessProfile,
  fetchProductLink,
  generateAd,
  generateAdCaptions,
  generateAdImageVariant,
  removeBackground,
  translateCaptions,
  type ApiAdCaptionVariantWithAngle,
  type AdGoal,
  type AspectRatio,
  type CaptionLength,
  type CaptionTone,
  type VisualDirection,
} from "@/lib/api";
import {
  compositeImage,
  deriveOnImageHeadline,
  type Box,
  type BrandKit,
  type CreativeText,
  type EditOptions,
} from "@/lib/canvas-text";
import { findVisualDirection, PLATFORM_OPTIONS, type Platform } from "@/lib/social-wizard";
import { AdBriefStep, GOALS } from "./AdBriefStep";
import { GenerationProgress } from "./GenerationProgress";
import { PostKit } from "./PostKit";
import { ResultsGrid } from "./ResultsGrid";
import { SetupStep } from "./SetupStep";
import { VisualDirectionStep } from "./VisualDirectionStep";
import { WizardProgress } from "./WizardProgress";

type WizardStep = "choose" | "quick" | "brief" | "direction" | "setup" | "generating" | "results" | "result" | "receiving";

const PROGRESS_STAGE: Partial<Record<WizardStep, 1 | 2 | 3 | 4>> = {
  brief: 1,
  direction: 2,
  setup: 3,
};

const STAGE_STEP: Record<1 | 2 | 3, WizardStep> = {
  1: "brief",
  2: "direction",
  3: "setup",
};

const AD_GOAL_CTA: Record<AdGoal, string> = {
  sales: "Shop Now",
  leads: "Get Quote",
  traffic: "Learn More",
  bookings: "Book Now",
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Ad Creation — Offer+Goal+Angle → Look → Setup → Generate. Maximally
// reuses the Image Post pipeline (VisualDirectionStep, SetupStep,
// ResultsGrid, PostKit, and the /ads/generate + /ads/generate-image-variant
// endpoints are all used completely unchanged) — the only genuinely new
// pieces are AdBriefStep (replaces IdeaStep's free-text idea + AI-
// understanding round trip with structured goal/angle inputs) and
// generateAdCaptions (angle-labeled captions instead of tone/length ones).
// See SinglePostForm.tsx for the sibling flow this mirrors closely.
export function AdCreationForm({
  credits,
  setCredits,
  initialGeneratedImage,
  onInitialGeneratedImageConsumed,
}: {
  credits: number | null;
  setCredits: (n: number) => void;
  // Set when arriving here from Try-On's "Image Ad" handoff — an
  // already-finished image, not a text idea, so it skips straight to the
  // result step instead of going through image generation again. Only a
  // free caption call runs. Same "read once on mount" contract as
  // SinglePostForm.tsx's sibling prop.
  initialGeneratedImage?: { imageBase64: string; itemDescription: string; goal: AdGoal };
  onInitialGeneratedImageConsumed?: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(initialGeneratedImage ? "receiving" : "choose");

  // Quick Create — paste a product URL, pick a Goal, skip straight to
  // handleGenerate() with versions=1. Reuses fetchProductLink (the same
  // free call SetupStep.tsx's own "More options -> Product link" uses)
  // and the existing static "clean_premium" default style — no new AI
  // call for either the fetch or the style choice.
  const [quickUrl, setQuickUrl] = useState("");
  const [quickFetching, setQuickFetching] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [generationStage, setGenerationStage] = useState(0);

  // Brief
  const [offerDescription, setOfferDescription] = useState("");
  const [goal, setGoal] = useState<AdGoal>(initialGeneratedImage?.goal ?? "sales");
  const [angle, setAngle] = useState<string | null>(null);
  const [visualDirection, setVisualDirection] = useState<VisualDirection>("clean_premium");

  useEffect(() => {
    if (!initialGeneratedImage) return;
    onInitialGeneratedImageConsumed?.();
    generateAdCaptions(initialGeneratedImage.itemDescription, initialGeneratedImage.goal, null, 1)
      .then((r) => {
        setAdCaptions(r.captions);
        setImages([initialGeneratedImage.imageBase64]);
        setSelectedCaptionIndex(0);
        setSelectedImageIndex(0);
        setStep("result");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Couldn't prepare your ad.");
        setStep("brief");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visual source
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useAiImage, setUseAiImage] = useState(false);

  // Platform + versions
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [versions, setVersions] = useState(3);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [removingBackground, setRemovingBackground] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [regeneratingCaptions, setRegeneratingCaptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result
  const [adCaptions, setAdCaptions] = useState<ApiAdCaptionVariantWithAngle[]>([]);
  const [recommendedIndex, setRecommendedIndex] = useState(0);
  const [recommendedReason, setRecommendedReason] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [compositedUrl, setCompositedUrl] = useState<string | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit>({});
  const [editedCaption, setEditedCaption] = useState("");
  const [fontScale, setFontScale] = useState(1);
  const [barColorOverride, setBarColorOverride] = useState<string | null | undefined>(undefined);
  const [showLogo, setShowLogo] = useState(true);
  const [textBox, setTextBox] = useState<Box | undefined>(undefined);
  const [logoBox, setLogoBox] = useState<Box | undefined>(undefined);
  const [captionTone] = useState<CaptionTone>("friendly");
  const [captionLength] = useState<CaptionLength>("medium");
  const [styledDescription, setStyledDescription] = useState("");
  const compositeRequestRef = useRef(0);

  const editOptions: EditOptions = { fontScale, barColorOverride, showLogo, textBox, logoBox };
  const outOfCredits = credits !== null && credits <= 0;

  useEffect(() => {
    fetchBusinessProfile()
      .then((profile) =>
        setBrandKit({
          color: profile.brand_color,
          logoDataUrl: profile.logo_base64
            ? `data:${profile.logo_mime_type || "image/png"};base64,${profile.logo_base64}`
            : null,
          name: profile.brand_name,
        }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (adCaptions.length > 0) setEditedCaption(adCaptions[selectedCaptionIndex].facebook_caption);
  }, [selectedCaptionIndex, adCaptions]);

  useEffect(() => {
    if (step !== "result" || images.length === 0) return;
    const variant = adCaptions[selectedCaptionIndex];
    if (!variant) return;
    const headline = deriveOnImageHeadline(variant.whatsapp_message, variant.facebook_caption);
    const creativeText: CreativeText = { headline, cta: AD_GOAL_CTA[goal] };
    const requestId = ++compositeRequestRef.current;
    compositeImage(images[selectedImageIndex], creativeText, brandKit, editOptions, visualDirection)
      .then((url) => {
        if (compositeRequestRef.current === requestId) setCompositedUrl(url);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    images,
    selectedImageIndex,
    adCaptions,
    selectedCaptionIndex,
    goal,
    visualDirection,
    brandKit,
    fontScale,
    barColorOverride,
    showLogo,
    textBox,
    logoBox,
  ]);

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

  const handleProgressNavigate = (stage: 1 | 2 | 3) => {
    setStep(STAGE_STEP[stage]);
  };

  const handleGenerate = async () => {
    if (generating) return;
    const cameFrom = step; // captured before setStep("generating") below, so a
    // failure can return to wherever generation was actually triggered from
    // (the full wizard's "setup" step, or Quick Create's own "quick" step)
    // instead of always assuming the full wizard.
    setGenerating(true);
    setError(null);
    setGenerationStage(0);
    setStep("generating");

    const direction = findVisualDirection(visualDirection);
    const finalDescription = offerDescription.trim();
    const finalStyledDescription = `${finalDescription}, ${direction.promptModifier}`;
    setStyledDescription(finalStyledDescription);
    const aspectRatio: AspectRatio = PLATFORM_OPTIONS.find((p) => p.id === platform)?.aspectRatio ?? "square";
    const sourceFile = useAiImage ? null : file;
    const requestedVersions = versions as 1 | 3 | 5;

    try {
      await pause(300);
      setGenerationStage(1);
      await pause(300);
      setGenerationStage(2);
      await pause(250);
      setGenerationStage(3);

      const capResult = await generateAdCaptions(finalDescription, goal, angle, requestedVersions);
      setAdCaptions(capResult.captions);
      setRecommendedIndex(capResult.recommended_index);
      setRecommendedReason(capResult.recommended_reason);
      setGenerationStage(4);

      // Reuses /ads/generate and /ads/generate-image-variant completely
      // unchanged — same 1-credit-per-image pricing as Image Post. Their
      // own bundled tone-based captions are discarded here, same as
      // SinglePostForm already discards them today.
      const firstImage = await generateAd(finalStyledDescription, sourceFile, aspectRatio);
      setImages([firstImage.banner_image_base64]);
      setCredits(firstImage.credits_remaining);
      setGenerationStage(5);

      for (let i = 1; i < versions; i++) {
        const r = await generateAdImageVariant(finalStyledDescription, sourceFile, aspectRatio);
        setImages((prev) => [...prev, r.banner_image_base64]);
        setCredits(r.credits_remaining);
      }

      setSelectedCaptionIndex(0);
      setSelectedImageIndex(0);
      setStep(versions > 1 ? "results" : "result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate your ads.");
      setStep(cameFrom === "quick" ? "quick" : "setup");
    } finally {
      setGenerating(false);
    }
  };

  const handleQuickCreate = async () => {
    if (quickFetching || !quickUrl.trim()) return;
    setQuickFetching(true);
    setQuickError(null);
    try {
      const r = await fetchProductLink(quickUrl.trim());
      setOfferDescription([r.title, r.description].filter(Boolean).join(" — "));
      if (r.image_base64) {
        handleFileChange(base64ToFile(r.image_base64, r.mime_type || "image/jpeg", "product.jpg"));
      } else {
        handleUseAiImage();
      }
      setAngle(null);
      setVersions(1);
      // visualDirection/platform stay at their existing defaults
      // ("clean_premium"/"instagram") — neither is user-facing here.
      await handleGenerate();
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Couldn't fetch that link.");
    } finally {
      setQuickFetching(false);
    }
  };

  const handleSelectResult = (index: number) => {
    setSelectedImageIndex(index);
    setSelectedCaptionIndex(index);
    setStep("result");
  };

  const handleGenerateMoreImages = async () => {
    if (generatingImage || outOfCredits) return;
    setGeneratingImage(true);
    setError(null);
    try {
      const sourceFile = useAiImage ? null : file;
      const aspectRatio: AspectRatio = PLATFORM_OPTIONS.find((p) => p.id === platform)?.aspectRatio ?? "square";
      const r = await generateAdImageVariant(styledDescription, sourceFile, aspectRatio);
      setImages((prev) => [...prev, r.banner_image_base64]);
      setSelectedImageIndex(images.length);
      setCredits(r.credits_remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate a new image.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (removingBackground || outOfCredits) return;
    setRemovingBackground(true);
    setError(null);
    try {
      const r = await removeBackground(images[selectedImageIndex]);
      setImages((prev) => [...prev, r.banner_image_base64]);
      setSelectedImageIndex(images.length);
      setCredits(r.credits_remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove the background.");
    } finally {
      setRemovingBackground(false);
    }
  };

  const handleEnhance = async () => {
    if (enhancing || outOfCredits) return;
    setEnhancing(true);
    setError(null);
    try {
      const r = await enhanceImage(images[selectedImageIndex]);
      setImages((prev) => [...prev, r.banner_image_base64]);
      setSelectedImageIndex(images.length);
      setCredits(r.credits_remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't enhance the image.");
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerateAnotherCaption = async () => {
    if (regeneratingCaptions) return;
    setRegeneratingCaptions(true);
    setError(null);
    try {
      const r = await generateAdCaptions(offerDescription.trim(), goal, angle, (versions as 1 | 3 | 5) || 3);
      setAdCaptions(r.captions);
      setRecommendedIndex(r.recommended_index);
      setRecommendedReason(r.recommended_reason);
      setSelectedCaptionIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate new captions.");
    } finally {
      setRegeneratingCaptions(false);
    }
  };

  const handleTranslate = async (language: string) => {
    if (translating) return;
    setTranslating(true);
    setError(null);
    try {
      const r = await translateCaptions(adCaptions, language);
      setAdCaptions((prev) => [
        ...prev,
        ...r.captions.map((c) => ({ ...c, angle: "Translated" })),
      ]);
      setSelectedCaptionIndex(adCaptions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't translate the captions.");
    } finally {
      setTranslating(false);
    }
  };

  const handleReset = () => {
    setStep("choose");
    setQuickUrl("");
    setQuickError(null);
    setGenerationStage(0);
    setOfferDescription("");
    setGoal("sales");
    setAngle(null);
    setVisualDirection("clean_premium");
    handleFileChange(null);
    setUseAiImage(false);
    setPlatform("instagram");
    setVersions(3);
    setAdCaptions([]);
    setRecommendedIndex(0);
    setRecommendedReason("");
    setImages([]);
    setSelectedCaptionIndex(0);
    setSelectedImageIndex(0);
    setCompositedUrl(null);
    setEditedCaption("");
    setFontScale(1);
    setBarColorOverride(undefined);
    setShowLogo(true);
    setTextBox(undefined);
    setLogoBox(undefined);
    setStyledDescription("");
    setError(null);
  };

  return (
    <>
      {PROGRESS_STAGE[step] && (
        <WizardProgress currentStage={PROGRESS_STAGE[step]!} onNavigate={handleProgressNavigate} />
      )}

      {step === "choose" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-xl font-extrabold text-foreground">Create an ad</h1>
          <p className="mb-6 text-sm text-muted-foreground">Two ways to get there.</p>
          <button
            onClick={() => setStep("quick")}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Rocket className="h-5 w-5 shrink-0" style={{ color: "var(--color-accent)" }} />
            <span>
              <span className="block text-sm font-semibold text-foreground">Quick Create</span>
              <span className="block text-xs text-muted-foreground">Paste a product link, pick a goal, get an ad.</span>
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
              <span className="block text-xs text-muted-foreground">Full control — offer, angle, style, platform, versions.</span>
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
            className="mb-4 w-full rounded-full border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

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

          {quickError && (
            <p className="mb-4 text-sm font-medium text-destructive">{quickError}</p>
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
              disabled={!quickUrl.trim() || quickFetching || outOfCredits}
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              {quickFetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              Create My Ad
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
          onContinue={() => setStep("direction")}
        />
      )}

      {step === "direction" && (
        <VisualDirectionStep
          visualSubject={offerDescription}
          offer=""
          contentType=""
          recommended="clean_premium"
          selected={visualDirection}
          onSelect={setVisualDirection}
          onContinue={() => setStep("setup")}
          onBack={() => setStep("brief")}
        />
      )}

      {step === "setup" && (
        <SetupStep
          file={file}
          previewUrl={previewUrl}
          useAiImage={useAiImage}
          onFileChange={handleFileChange}
          onUseAiImage={handleUseAiImage}
          onDescriptionOverride={setOfferDescription}
          platform={platform}
          onPlatformChange={setPlatform}
          versions={versions}
          onVersionsChange={setVersions}
          credits={credits}
          onGenerate={handleGenerate}
          onBack={() => setStep("direction")}
          error={error}
        />
      )}

      {step === "receiving" && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing your ad...
        </div>
      )}

      {step === "generating" && <GenerationProgress currentStage={generationStage} />}

      {step === "results" && images.length > 0 && (
        <ResultsGrid
          images={images}
          onSelect={handleSelectResult}
          angleLabels={adCaptions.map((c) => c.angle)}
          recommendedIndex={recommendedIndex}
          recommendedReason={recommendedReason}
        />
      )}

      {step === "result" && adCaptions.length > 0 && images.length > 0 && (
        <PostKit
          compositedUrl={compositedUrl}
          textBox={textBox}
          onTextBoxChange={setTextBox}
          logoBox={logoBox}
          onLogoBoxChange={setLogoBox}
          hasLogo={!!brandKit.logoDataUrl}
          showLogo={showLogo}
          onShowLogoChange={setShowLogo}
          images={images}
          selectedImageIndex={selectedImageIndex}
          onSelectImage={setSelectedImageIndex}
          onGenerateMoreImages={handleGenerateMoreImages}
          onRemoveBackground={handleRemoveBackground}
          onEnhance={handleEnhance}
          generatingImage={generatingImage}
          removingBackground={removingBackground}
          enhancing={enhancing}
          outOfCredits={outOfCredits}
          captions={adCaptions}
          selectedCaptionIndex={selectedCaptionIndex}
          onSelectCaption={setSelectedCaptionIndex}
          captionTone={captionTone}
          onCaptionToneChange={() => {}}
          captionLength={captionLength}
          onCaptionLengthChange={() => {}}
          onGenerateAnotherCaption={handleGenerateAnotherCaption}
          regeneratingCaptions={regeneratingCaptions}
          onTranslate={handleTranslate}
          translating={translating}
          editedCaption={editedCaption}
          onCaptionChange={setEditedCaption}
          fontScale={fontScale}
          onFontScaleChange={setFontScale}
          barColorOverride={barColorOverride}
          onBarColorOverrideChange={setBarColorOverride}
          itemDescription={offerDescription}
          onAppendHashtag={(tag) =>
            setEditedCaption((prev) => (prev.includes(`#${tag}`) ? prev : `${prev} #${tag}`.trim()))
          }
          brandKit={brandKit}
          editOptions={editOptions}
          whatsappMessage={adCaptions[selectedCaptionIndex]?.whatsapp_message ?? ""}
          cta={AD_GOAL_CTA[goal]}
          visualDirection={visualDirection}
          error={error}
          onReset={handleReset}
          showCaptionStyleControls={false}
          showLaunchCampaignPlaceholder
        />
      )}
    </>
  );
}
