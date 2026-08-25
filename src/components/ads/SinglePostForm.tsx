import { useEffect, useRef, useState } from "react";
import {
  enhanceImage,
  fetchBusinessProfile,
  generateAd,
  generateAdImageVariant,
  generateCaptions,
  removeBackground,
  translateCaptions,
  type ApiAdCaptionVariant,
  type ApiUnderstandIdeaResponse,
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
import { GenerationProgress } from "./GenerationProgress";
import { IdeaStep } from "./IdeaStep";
import { PostKit } from "./PostKit";
import { ResultsGrid } from "./ResultsGrid";
import { SetupStep } from "./SetupStep";
import { VisualDirectionStep } from "./VisualDirectionStep";
import { WizardProgress } from "./WizardProgress";

type WizardStep = "idea" | "direction" | "setup" | "generating" | "results" | "result";

// Maps the real step machine onto the 4 display stages (① What do you
// want? → ② Choose a look → ③ Set it up → ④ Generate) — purely a UI
// label/nav target, doesn't change the step machine itself. Only stages
// 1-3 are ever jump targets (see handleProgressNavigate below) — there's
// no sensible "jump to Generate" without having completed Set it up.
const PROGRESS_STAGE: Partial<Record<WizardStep, 1 | 2 | 3 | 4>> = {
  idea: 1,
  direction: 2,
  setup: 3,
};

const STAGE_STEP: Record<1 | 2 | 3, WizardStep> = {
  1: "idea",
  2: "direction",
  3: "setup",
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Social Content → Image Post, staged: Idea → Understanding → Visual
// Direction → Visual Source → Platform → Generate → Post Kit. Every real
// capability here (image generation, brand-kit application, captions,
// hashtags, the editor, credits) is the same underlying system the old
// flat form used — see lib/api.ts and the step components' own comments
// for exactly which existing piece each step reuses.
export function SinglePostForm({
  credits,
  setCredits,
  initialIdea,
  onInitialIdeaConsumed,
}: {
  credits: number | null;
  setCredits: (n: number) => void;
  // Set when arriving here from "Create an ad from this" on the
  // Competitor Analysis tab — SinglePostForm fully unmounts/remounts on
  // every tab switch (see index.tsx), so this only needs to be read once
  // at mount, not kept in sync afterward.
  initialIdea?: string;
  onInitialIdeaConsumed?: () => void;
}) {
  const [step, setStep] = useState<WizardStep>("idea");
  const [generationStage, setGenerationStage] = useState(0);

  // Idea + understanding
  const [description, setDescription] = useState(initialIdea ?? "");

  // Runs once on mount only — tells the parent to clear initialIdea so a
  // later, unrelated visit to this tab doesn't silently reuse stale text
  // from a previous competitor-insight click.
  useEffect(() => {
    if (initialIdea) onInitialIdeaConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [understanding, setUnderstanding] = useState<ApiUnderstandIdeaResponse | null>(null);
  const [visualDirection, setVisualDirection] = useState<VisualDirection>("clean_premium");

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
  const [captions, setCaptions] = useState<ApiAdCaptionVariant[]>([]);
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
  const [captionTone, setCaptionTone] = useState<CaptionTone>("friendly");
  const [captionLength, setCaptionLength] = useState<CaptionLength>("medium");
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
    if (captions.length > 0) setEditedCaption(captions[selectedCaptionIndex].facebook_caption);
  }, [selectedCaptionIndex, captions]);

  useEffect(() => {
    if (step !== "result" || images.length === 0) return;
    const variant = captions[selectedCaptionIndex];
    if (!variant) return;
    // The text baked onto the image is deliberately NOT editedCaption
    // (the full, user-editable social caption) — it's the already
    // -generated WhatsApp message, a genuinely short standalone line, so
    // a long caption can never end up rendered oversized on the photo.
    // Editing the caption below only ever changes the caption; it no
    // longer touches the image.
    const headline = deriveOnImageHeadline(variant.whatsapp_message, variant.facebook_caption);
    const creativeText: CreativeText = {
      headline,
      cta: understanding?.offer?.trim() || undefined,
    };
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
    captions,
    selectedCaptionIndex,
    understanding,
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

  const handleUnderstood = (result: ApiUnderstandIdeaResponse) => {
    setUnderstanding(result);
    setVisualDirection(result.visual_direction);
    setStep("direction");
  };

  // Progress-dot navigation — only completed stages (1-3) are clickable,
  // and only stages strictly before the current one (no jumping forward
  // past what's actually been completed). Selections already made on
  // that step are preserved since this only changes `step`, never resets
  // any other state.
  const handleProgressNavigate = (stage: 1 | 2 | 3) => {
    setStep(STAGE_STEP[stage]);
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    setGenerationStage(0);
    setStep("generating");

    const direction = findVisualDirection(visualDirection);
    const finalDescription = description.trim();
    const finalStyledDescription = `${finalDescription}, ${direction.promptModifier}`;
    setStyledDescription(finalStyledDescription);
    const aspectRatio: AspectRatio = PLATFORM_OPTIONS.find((p) => p.id === platform)?.aspectRatio ?? "square";
    const sourceFile = useAiImage ? null : file;

    try {
      // Stages 0-2 reflect decisions already made in earlier steps
      // (idea understood, direction chosen, brand kit already fetched on
      // mount) — brief real UI pacing, not a re-fetch of already-known data.
      await pause(300);
      setGenerationStage(1);
      await pause(300);
      setGenerationStage(2);
      await pause(250);
      setGenerationStage(3);

      const captionResult = await generateCaptions(finalDescription, captionTone, captionLength);
      setCaptions(captionResult.captions);
      setGenerationStage(4);

      // The first image deliberately goes through /ads/generate (not
      // generate-image-variant) — it's the only endpoint that saves to
      // History (_save_generated_post server-side). Its own bundled
      // captions are discarded in favor of the tone/length-controlled set
      // above; every image after this one is generate-image-variant, same
      // as the old flow.
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
      setError(err instanceof Error ? err.message : "Couldn't generate your post.");
      setStep("setup");
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectResult = (index: number) => {
    setSelectedImageIndex(index);
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
      const r = await generateCaptions(description.trim(), captionTone, captionLength);
      setCaptions(r.captions);
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
      const r = await translateCaptions(captions, language);
      setCaptions((prev) => [...prev, ...r.captions]);
      setSelectedCaptionIndex(captions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't translate the captions.");
    } finally {
      setTranslating(false);
    }
  };

  const handleReset = () => {
    setStep("idea");
    setGenerationStage(0);
    setDescription("");
    setUnderstanding(null);
    setVisualDirection("clean_premium");
    handleFileChange(null);
    setUseAiImage(false);
    setPlatform("instagram");
    setVersions(3);
    setCaptions([]);
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
    setCaptionTone("friendly");
    setCaptionLength("medium");
    setStyledDescription("");
    setError(null);
  };

  return (
    <>
      {PROGRESS_STAGE[step] && (
        <WizardProgress currentStage={PROGRESS_STAGE[step]!} onNavigate={handleProgressNavigate} />
      )}

      {step === "idea" && (
        <IdeaStep value={description} onChange={setDescription} onContinue={handleUnderstood} />
      )}

      {step === "direction" && understanding && (
        <VisualDirectionStep
          visualSubject={understanding.visual_subject}
          offer={understanding.offer}
          contentType={understanding.content_type}
          recommended={understanding.visual_direction}
          selected={visualDirection}
          onSelect={setVisualDirection}
          onContinue={() => setStep("setup")}
          onBack={() => setStep("idea")}
        />
      )}

      {step === "setup" && (
        <SetupStep
          file={file}
          previewUrl={previewUrl}
          useAiImage={useAiImage}
          onFileChange={handleFileChange}
          onUseAiImage={handleUseAiImage}
          onDescriptionOverride={setDescription}
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

      {step === "generating" && <GenerationProgress currentStage={generationStage} />}

      {step === "results" && images.length > 0 && (
        <ResultsGrid images={images} onSelect={handleSelectResult} />
      )}

      {step === "result" && captions.length > 0 && images.length > 0 && (
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
          captions={captions}
          selectedCaptionIndex={selectedCaptionIndex}
          onSelectCaption={setSelectedCaptionIndex}
          captionTone={captionTone}
          onCaptionToneChange={setCaptionTone}
          captionLength={captionLength}
          onCaptionLengthChange={setCaptionLength}
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
          itemDescription={description}
          onAppendHashtag={(tag) =>
            setEditedCaption((prev) => (prev.includes(`#${tag}`) ? prev : `${prev} #${tag}`.trim()))
          }
          brandKit={brandKit}
          editOptions={editOptions}
          whatsappMessage={captions[selectedCaptionIndex]?.whatsapp_message ?? ""}
          cta={understanding?.offer?.trim() || undefined}
          visualDirection={visualDirection}
          error={error}
          onReset={handleReset}
        />
      )}
    </>
  );
}
