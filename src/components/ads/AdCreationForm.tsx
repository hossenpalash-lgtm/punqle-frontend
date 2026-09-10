import { Check, ChevronDown, Loader2, Settings2, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  base64ToFile,
  enhanceImage,
  fetchBusinessProfile,
  fetchImageActors,
  generateAd,
  generateAdCaptions,
  generateAdImageVariant,
  removeBackground,
  translateCaptions,
  understandProductLink,
  type ApiAdCaptionVariantWithAngle,
  type ApiImageActor,
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
import {
  findVisualDirection,
  MORE_VISUAL_DIRECTIONS,
  PLATFORM_OPTIONS,
  VERSION_COUNTS,
  VISUAL_DIRECTIONS,
  type Platform,
} from "@/lib/social-wizard";
import { ANGLES, GOALS } from "./AdBriefStep";
import { GenerationProgress } from "./GenerationProgress";
import { PostKit } from "./PostKit";
import { ProductPicker } from "./ProductPicker";
import { ResultsGrid } from "./ResultsGrid";

type WizardStep = "create" | "generating" | "results" | "result" | "receiving";

const AD_GOAL_CTA: Record<AdGoal, string> = {
  sales: "Shop Now",
  leads: "Get Quote",
  traffic: "Learn More",
  bookings: "Book Now",
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A pasted product link vs. a typed description share one input — this is
// deliberately conservative (only real https:// / bare-domain-looking
// strings match) so an ordinary offer sentence ("Handmade wallets, 20%
// off") is never mistaken for a URL and sent to the scraper.
const looksLikeUrl = (s: string) => /^https?:\/\//i.test(s) || /^[\w-]+(\.[a-z]{2,})+(\/\S*)?$/i.test(s);

// Ad Creation — one Arcads-style screen (2026-09-10 redesign): a single
// smart input (link or free text) + Goal, with everything else (style,
// platform, versions, angle, your own photo) tucked behind an optional
// "Settings" panel that's collapsed by default and pre-filled with the
// same defaults Quick Create already silently used. Replaces the old
// choose/quick/brief/direction/setup step chain — see adcreate_ai_project
// memory for why (a real Arcads video review found every one of their
// flows is "describe it, optional settings, generate," never a sequence
// of separate mandatory screens).
//
// Maximally reuses the Image Post pipeline underneath — VISUAL_DIRECTIONS/
// PLATFORM_OPTIONS/GOALS/ANGLES are the same data the old step screens
// used, and /ads/generate + /ads/generate-image-variant are called
// completely unchanged. Only the hosting UI changed, not the generation
// logic.
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
  const [step, setStep] = useState<WizardStep>(initialGeneratedImage ? "receiving" : "create");

  // The one main input — a pasted link or a typed description, disambiguated
  // at submit time by looksLikeUrl().
  const [mainInput, setMainInput] = useState("");
  const [inputFetching, setInputFetching] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);

  const [offerDescription, setOfferDescription] = useState("");
  const [goal, setGoal] = useState<AdGoal>(initialGeneratedImage?.goal ?? "sales");
  const [angle, setAngle] = useState<string | null>(null);
  const [visualDirection, setVisualDirection] = useState<VisualDirection>("clean_premium");
  const [showMoreStyles, setShowMoreStyles] = useState(false);

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
        setStep("create");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visual source — null/false by default (no explicit choice yet). An
  // explicitly-uploaded photo always wins over a scraped/AI one; see
  // finishQuickCreate.
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Actor library — only usable when no product photo is uploaded (see
  // fetchImageActors' own comment: compositing a persona onto a real
  // uploaded photo isn't validated yet). Fetched once on mount — a fixed,
  // small (8-item) catalog, not per-generation.
  const [actors, setActors] = useState<ApiImageActor[]>([]);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [actorGenderFilter, setActorGenderFilter] = useState<"all" | "female" | "male">("all");
  const [actorId, setActorId] = useState<string | undefined>(undefined);

  // Platform + versions — versions defaults to 1 (fast, single result),
  // matching what Quick Create already silently used; the old full wizard's
  // default of 3 is now something you opt into via Settings, not the
  // default for everyone.
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [versions, setVersions] = useState(1);

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
    setActorsLoading(true);
    fetchImageActors()
      .then((r) => setActors(r.actors))
      .catch(() => {})
      .finally(() => setActorsLoading(false));
  }, []);

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
    // Actor + your-own-photo compositing isn't built yet (see api.ts's
    // fetchImageActors comment) — clear any picked actor the moment a
    // real photo is uploaded, rather than silently ignoring it later.
    if (f) setActorId(undefined);
  };

  // `override` exists because finishQuickCreate below sets offerDescription/
  // file and wants to generate off those values immediately — React state
  // setters don't apply until the next render, so reading them from closure
  // state here would still see the pre-update values in that same tick.
  // angle/versions/goal/visualDirection/platform don't need this: they're
  // only ever changed by their own Settings-panel controls, well before
  // Generate is clicked, so by the time handleGenerate runs those updates
  // have already committed across earlier renders — reading them live is
  // correct and simpler than threading them through override too.
  const handleGenerate = async (override?: { description: string; file: File | null }) => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    setGenerationStage(0);
    setStep("generating");

    const direction = findVisualDirection(visualDirection);
    const finalDescription = (override?.description ?? offerDescription).trim();
    const finalStyledDescription = `${finalDescription}, ${direction.promptModifier}`;
    setStyledDescription(finalStyledDescription);
    const aspectRatio: AspectRatio = PLATFORM_OPTIONS.find((p) => p.id === platform)?.aspectRatio ?? "square";
    const effectiveFile = override ? override.file : file;
    const sourceFile = effectiveFile ?? null;
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
      // actorId only makes sense (and is only sent) when there's no
      // uploaded product photo — compositing a persona onto a real photo
      // isn't validated yet, see fetchImageActors' comment in api.ts.
      const effectiveActorId = sourceFile ? undefined : actorId;
      const firstImage = await generateAd(finalStyledDescription, sourceFile, aspectRatio, effectiveActorId);
      setImages([firstImage.banner_image_base64]);
      setCredits(firstImage.credits_remaining);
      setGenerationStage(5);

      for (let i = 1; i < versions; i++) {
        const r = await generateAdImageVariant(finalStyledDescription, sourceFile, aspectRatio, effectiveActorId);
        setImages((prev) => [...prev, r.banner_image_base64]);
        setCredits(r.credits_remaining);
      }

      setSelectedCaptionIndex(0);
      setSelectedImageIndex(0);
      setStep(versions > 1 ? "results" : "result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate your ads.");
      setStep("create");
    } finally {
      setGenerating(false);
    }
  };

  // Shared by every real entry into generation (pasted link, typed text,
  // catalog pick) — an explicitly-uploaded photo (via Settings) always
  // wins over one that came from a link scrape or catalog item, since the
  // user told Punqle directly what photo to use.
  const finishQuickCreate = async (description: string, incomingFile: File | null) => {
    const effectiveFile = file ?? incomingFile;
    setOfferDescription(description);
    if (effectiveFile && effectiveFile !== file) handleFileChange(effectiveFile);
    await handleGenerate({ description, file: effectiveFile });
  };

  const handleMainSubmit = async () => {
    const text = mainInput.trim();
    if (!text || inputFetching || outOfCredits) return;
    setInputError(null);
    if (looksLikeUrl(text)) {
      setInputFetching(true);
      try {
        const r = await understandProductLink(text);
        const description = r.enriched_description || [r.title, r.description].filter(Boolean).join(" — ");
        const scrapedFile = r.image_base64
          ? base64ToFile(r.image_base64, r.mime_type || "image/jpeg", "product.jpg")
          : null;
        await finishQuickCreate(description, scrapedFile);
      } catch (err) {
        setInputError(err instanceof Error ? err.message : "Couldn't fetch that link.");
      } finally {
        setInputFetching(false);
      }
    } else {
      await finishQuickCreate(text, null);
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
      await finishQuickCreate(description, catalogFile);
    } catch (err) {
      setInputError(err instanceof Error ? err.message : "Couldn't use that product.");
    } finally {
      setInputFetching(false);
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
      const aspectRatio: AspectRatio = PLATFORM_OPTIONS.find((p) => p.id === platform)?.aspectRatio ?? "square";
      const r = await generateAdImageVariant(styledDescription, file, aspectRatio);
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
    setStep("create");
    setMainInput("");
    setInputError(null);
    setSettingsOpen(false);
    setGenerationStage(0);
    setOfferDescription("");
    setGoal("sales");
    setAngle(null);
    setVisualDirection("clean_premium");
    setShowMoreStyles(false);
    handleFileChange(null);
    setActorId(undefined);
    setActorGenderFilter("all");
    setPlatform("instagram");
    setVersions(1);
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

  const allDirections = [...VISUAL_DIRECTIONS, ...(showMoreStyles ? MORE_VISUAL_DIRECTIONS : [])];

  return (
    <>
      {step === "create" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-xl font-extrabold text-foreground">Create an ad</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Paste a product link, or just describe what you're advertising.
          </p>

          <textarea
            value={mainInput}
            onChange={(e) => setMainInput(e.target.value)}
            placeholder="https://yourstore.com/products/... or Handmade leather wallets, 20% off this week"
            rows={3}
            disabled={inputFetching}
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style</p>
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                {allDirections.map((d) => {
                  const selected = visualDirection === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setVisualDirection(d.id)}
                      className={[
                        "rounded-xl px-2 py-2 text-left text-[11px] font-semibold leading-tight",
                        selected ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                      ].join(" ")}
                    >
                      {selected && <Check className="mb-0.5 h-3 w-3" />}
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {!showMoreStyles && (
                <button
                  onClick={() => setShowMoreStyles(true)}
                  className="mb-3 text-[11px] font-semibold text-muted-foreground underline"
                >
                  Show more styles
                </button>
              )}

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What should the ad say?
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
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

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</p>
              <div className="mb-3 grid grid-cols-4 gap-1.5">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={[
                      "rounded-xl px-2 py-2 text-[11px] font-semibold",
                      platform === p.id ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                    ].join(" ")}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Versions</p>
              <div className="mb-3 flex gap-1.5">
                {VERSION_COUNTS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVersions(v)}
                    className={[
                      "flex-1 rounded-xl px-2 py-2 text-sm font-semibold",
                      versions === v ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                    ].join(" ")}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo</p>
              {!file ? (
                <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-card px-3 py-2.5 text-xs font-semibold text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  Upload your own (optional — AI creates one otherwise)
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    {previewUrl && <img src={previewUrl} alt="" className="h-6 w-6 rounded-md object-cover" />}
                    {file.name}
                  </span>
                  <button onClick={() => handleFileChange(null)} aria-label="Remove photo" className="text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Actor library — only when Punqle is generating the whole
                  scene from scratch (no uploaded photo). Compositing a
                  persona onto a real uploaded product photo isn't built
                  yet, so this section simply doesn't appear once a photo
                  is chosen above, rather than offering something that
                  would silently be ignored. */}
              {!file && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actor <span className="normal-case text-muted-foreground/70">(optional — have someone use the product)</span>
                  </p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setActorId(undefined)}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        !actorId ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                      ].join(" ")}
                    >
                      None
                    </button>
                    {(["all", "female", "male"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setActorGenderFilter(g)}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                          actorGenderFilter === g ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                        ].join(" ")}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {actorsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {actors
                        .filter((a) => actorGenderFilter === "all" || a.gender === actorGenderFilter)
                        .map((a) => {
                          const selected = actorId === a.id;
                          return (
                            <button
                              key={a.id}
                              onClick={() => setActorId(selected ? undefined : a.id)}
                              className="flex flex-col items-center gap-1"
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
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(inputError || error) && <p className="mb-4 text-sm font-medium text-destructive">{inputError || error}</p>}

          <button
            onClick={handleMainSubmit}
            disabled={!mainInput.trim() || inputFetching || outOfCredits}
            className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {inputFetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Create My Ad
          </button>
        </div>
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
          goal={goal}
          angle={angle}
          error={error}
          onReset={handleReset}
          showCaptionStyleControls={false}
          showLaunchCampaignPlaceholder
        />
      )}
    </>
  );
}
