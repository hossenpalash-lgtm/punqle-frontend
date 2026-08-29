import { AlertCircle, ArrowLeft, ArrowRight, Camera, Check, Clock, Download, Loader2, Package, Shirt, Sparkles, Upload, User, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  checkTryOnAnimationStatus,
  checkTryOnStatus,
  fetchProducts,
  startTryOn,
  startTryOnAnimation,
  type ApiImportedProduct,
  type ApiVideoOperation,
} from "@/lib/api";

const TRYON_CREDIT_COST = 2;
const VIDEO_CREDIT_COST = 10;
const POLL_INTERVAL_MS = 4000;
const VIDEO_POLL_INTERVAL_MS = 8000;

type WizardStep = "photo" | "garment" | "confirm" | "generating" | "result" | "animating" | "video-result";
type GarmentSource = "catalog" | "upload";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

// Try-On — E-commerce's 2nd feature. Own photo → a product (from the
// catalog, or uploaded) → generate. This is the first Punqle flow that
// sends a person's own photo anywhere, so the photo step carries explicit
// upfront trust copy rather than leaving that to the privacy policy alone.
// Async job/poll mirrors AdVideoForm's exactly (same FASHN job-id-through-
// the-client pattern as Veo's operation object) — no persistence, no
// history entry, deliberately: see startTryOn/checkTryOnStatus.
export function TryOnForm({
  credits,
  setCredits,
}: {
  credits: number | null;
  setCredits: (n: number) => void;
}) {
  const [step, setStep] = useState<WizardStep>("photo");

  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelPreviewUrl, setModelPreviewUrl] = useState<string | null>(null);

  const [garmentSource, setGarmentSource] = useState<GarmentSource>("catalog");
  const [products, setProducts] = useState<ApiImportedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ApiImportedProduct | null>(null);
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreviewUrl, setGarmentPreviewUrl] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultImageBase64, setResultImageBase64] = useState<string | null>(null);

  const [animating, setAnimating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const modelInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (modelPreviewUrl) URL.revokeObjectURL(modelPreviewUrl);
      if (garmentPreviewUrl) URL.revokeObjectURL(garmentPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "garment" || garmentSource !== "catalog" || productsLoaded) return;
    setLoadingProducts(true);
    setProductsError(null);
    fetchProducts()
      .then((r) => {
        setProducts(r.products);
        setProductsLoaded(true);
      })
      .catch((err) => setProductsError(err instanceof Error ? err.message : "Couldn't load your catalog."))
      .finally(() => setLoadingProducts(false));
  }, [step, garmentSource, productsLoaded]);

  const handleModelFileChange = (f: File | null) => {
    setModelPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
    setModelFile(f);
  };

  const handleGarmentFileChange = (f: File | null) => {
    setGarmentPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
    setGarmentFile(f);
    if (f) setSelectedProduct(null);
  };

  const hasGarment = garmentSource === "catalog" ? !!selectedProduct : !!garmentFile;
  const insufficientCredits = credits !== null && credits < TRYON_CREDIT_COST;
  const insufficientVideoCredits = credits !== null && credits < VIDEO_CREDIT_COST;

  const poll = async (id: string) => {
    try {
      const r = await checkTryOnStatus(id);
      if (!r.done) {
        pollTimeoutRef.current = setTimeout(() => poll(id), POLL_INTERVAL_MS);
        return;
      }
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.image_base64) {
        setResultUrl(`data:image/png;base64,${r.image_base64}`);
        setResultImageBase64(r.image_base64);
        setStep("result");
      } else {
        setError("The result didn't come back — please try again.");
        setStep("confirm");
      }
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't check the try-on's status.");
      setStep("confirm");
    }
  };

  const handleGenerate = async () => {
    if (!modelFile || !hasGarment || generating || insufficientCredits) return;
    setGenerating(true);
    setError(null);
    setResultUrl(null);
    setElapsedSeconds(0);
    setStep("generating");
    elapsedIntervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    try {
      const modelImageBase64 = await fileToBase64(modelFile);
      let productImageUrl: string | null = null;
      let productImageBase64: string | null = null;
      let productImageMimeType: string | null = null;
      if (garmentSource === "catalog" && selectedProduct?.image_url) {
        productImageUrl = selectedProduct.image_url;
      } else if (garmentFile) {
        productImageBase64 = await fileToBase64(garmentFile);
        productImageMimeType = garmentFile.type;
      }
      const r = await startTryOn(modelImageBase64, modelFile.type, productImageUrl, productImageBase64, productImageMimeType);
      pollTimeoutRef.current = setTimeout(() => poll(r.id), POLL_INTERVAL_MS);
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Couldn't start the try-on.");
      setStep("confirm");
    }
  };

  const pollAnimation = async (operation: ApiVideoOperation) => {
    try {
      const r = await checkTryOnAnimationStatus(operation);
      if (!r.done) {
        pollTimeoutRef.current = setTimeout(() => pollAnimation(operation), VIDEO_POLL_INTERVAL_MS);
        return;
      }
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setAnimating(false);
      if (r.credits_remaining !== null) setCredits(r.credits_remaining);
      if (r.video_base64) {
        setVideoUrl(`data:video/mp4;base64,${r.video_base64}`);
        setStep("video-result");
      } else {
        setError("The video didn't come back — please try again.");
        setStep("result");
      }
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setAnimating(false);
      setError(err instanceof Error ? err.message : "Couldn't check the video's status.");
      setStep("result");
    }
  };

  const handleAnimate = async () => {
    if (!resultImageBase64 || animating || insufficientVideoCredits) return;
    setAnimating(true);
    setError(null);
    setVideoUrl(null);
    setElapsedSeconds(0);
    setStep("animating");
    elapsedIntervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    try {
      const r = await startTryOnAnimation(resultImageBase64);
      pollTimeoutRef.current = setTimeout(() => pollAnimation(r.operation), VIDEO_POLL_INTERVAL_MS);
    } catch (err) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      setAnimating(false);
      setError(err instanceof Error ? err.message : "Couldn't start animating.");
      setStep("result");
    }
  };

  const handleReset = () => {
    setStep("photo");
    handleModelFileChange(null);
    setGarmentSource("catalog");
    setSelectedProduct(null);
    handleGarmentFileChange(null);
    setResultUrl(null);
    setResultImageBase64(null);
    setVideoUrl(null);
    setError(null);
    setElapsedSeconds(0);
    // Re-fetch on the next "garment" visit — otherwise a product added to
    // the catalog mid-session (e.g. via Product Catalog in another tab)
    // wouldn't show up until a full page reload.
    setProductsLoaded(false);
  };

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  if (step === "result" && resultUrl) {
    return (
      <div className="flex flex-col items-center text-center">
        <h1 className="font-display mb-1 flex items-center gap-2 text-xl font-extrabold text-foreground">
          Here's your look
          <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
        </h1>
        <p className="mb-5 text-sm text-muted-foreground">Generated just for you — yours to keep.</p>

        <div
          className="animate-fade-rise relative mb-5 w-full overflow-hidden rounded-3xl bg-card"
          style={{ boxShadow: "0 12px 40px -12px rgba(0,0,0,0.28), var(--shadow-card)" }}
        >
          <img src={resultUrl} alt="Try-on result" className="w-full object-contain" />
          {modelPreviewUrl && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 py-1 pl-1 pr-2.5 backdrop-blur-sm">
              <img src={modelPreviewUrl} alt="Your original photo" className="h-6 w-6 rounded-full object-cover" />
              <span className="text-[10px] font-semibold text-white">Before</span>
            </div>
          )}
        </div>

        <a
          href={resultUrl}
          download="try-on.png"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Download className="h-5 w-5" />
          Download
        </a>
        <button
          onClick={handleAnimate}
          disabled={insufficientVideoCredits}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 py-4 text-base font-semibold text-secondary-foreground disabled:opacity-60"
        >
          <Video className="h-5 w-5" />
          Animate this look · {VIDEO_CREDIT_COST} credits
        </button>
        <p className="mb-3 mt-1.5 text-xs text-muted-foreground">
          Turn your try-on image into a short fashion video.
        </p>
        {error && (
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <button
          onClick={handleReset}
          className="w-full rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
        >
          Try another
        </button>
      </div>
    );
  }

  if (step === "video-result" && videoUrl) {
    return (
      <div className="flex flex-col items-center text-center">
        <h1 className="font-display mb-1 flex items-center gap-2 text-xl font-extrabold text-foreground">
          Your look, animated
          <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
        </h1>
        <p className="mb-5 text-sm text-muted-foreground">Generated just for you — yours to keep.</p>

        <div
          className="animate-fade-rise mb-5 w-full overflow-hidden rounded-3xl bg-card"
          style={{ boxShadow: "0 12px 40px -12px rgba(0,0,0,0.28), var(--shadow-card)" }}
        >
          <video src={videoUrl} controls autoPlay loop muted className="w-full object-contain" />
        </div>

        <a
          href={videoUrl}
          download="try-on-video.mp4"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Download className="h-5 w-5" />
          Download
        </a>
        <button
          onClick={() => setStep("result")}
          className="mb-3 w-full rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
        >
          Back to photo
        </button>
        <button
          onClick={handleReset}
          className="w-full rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
        >
          Try another
        </button>
      </div>
    );
  }

  if (step === "animating") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        {resultUrl && (
          <div className="relative h-40 w-40 overflow-hidden rounded-2xl">
            <img src={resultUrl} alt="" className="h-full w-full animate-pulse object-cover opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">Animating your look...</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {minutes}:{seconds.toString().padStart(2, "0")} elapsed — usually takes 30-60 sec
          </p>
        </div>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        {modelPreviewUrl && (
          <div className="relative h-40 w-40 overflow-hidden rounded-2xl">
            <img src={modelPreviewUrl} alt="" className="h-full w-full animate-pulse object-cover opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">Generating your try-on...</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {minutes}:{seconds.toString().padStart(2, "0")} elapsed — usually takes 15-30 sec
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {step === "photo" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">Your photo</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload a clear, full-body photo of yourself — or someone else, only with their permission.
          </p>
          <div className="mb-4 w-full rounded-2xl border border-dashed border-border bg-secondary/60 p-3 text-left text-xs text-muted-foreground">
            This photo is sent only to generate your preview. Punqle doesn't save it — it's never added to your
            post history and no one else can see it. See our{" "}
            <a href="/privacy-policy" className="font-semibold text-primary underline-offset-2 hover:underline">
              Privacy Policy
            </a>{" "}
            for details.
          </div>

          <input
            ref={modelInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleModelFileChange(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => modelInputRef.current?.click()}
            className="mb-6 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors active:bg-secondary/40"
            style={{ minHeight: modelPreviewUrl ? undefined : "10rem" }}
          >
            {modelPreviewUrl ? (
              <img src={modelPreviewUrl} alt="Your photo" className="max-h-56 rounded-xl object-contain" />
            ) : (
              <>
                <User className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">Tap to upload a photo</span>
              </>
            )}
          </button>

          <button
            onClick={() => setStep("garment")}
            disabled={!modelFile}
            className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === "garment" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">Choose a product</h1>
          <p className="mb-4 text-sm text-muted-foreground">Pick what you want to try on.</p>

          <div className="mb-4 grid w-full grid-cols-2 gap-2">
            <button
              onClick={() => setGarmentSource("catalog")}
              className={[
                "flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold",
                garmentSource === "catalog" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              ].join(" ")}
            >
              <Package className="h-3.5 w-3.5" />
              From catalog
            </button>
            <button
              onClick={() => setGarmentSource("upload")}
              className={[
                "flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold",
                garmentSource === "upload" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              ].join(" ")}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload photo
            </button>
          </div>

          {garmentSource === "catalog" ? (
            loadingProducts ? (
              <div className="mb-6 flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your catalog...
              </div>
            ) : productsError ? (
              <p className="mb-6 text-sm font-medium text-destructive">{productsError}</p>
            ) : products.length === 0 ? (
              <p className="mb-6 text-sm text-muted-foreground">
                No products imported yet — add some from Product Catalog in the menu, or switch to "Upload photo."
              </p>
            ) : (
              <div className="mb-6 max-h-80 w-full space-y-1.5 overflow-y-auto">
                {products.map((p) => {
                  const selected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className="flex w-full items-center gap-2.5 rounded-xl bg-secondary/60 p-2 text-left"
                    >
                      <span
                        className={[
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                        ].join(" ")}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                          <Shirt className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <>
              <input
                ref={garmentInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleGarmentFileChange(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => garmentInputRef.current?.click()}
                className="mb-6 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors active:bg-secondary/40"
                style={{ minHeight: garmentPreviewUrl ? undefined : "8rem" }}
              >
                {garmentPreviewUrl ? (
                  <img src={garmentPreviewUrl} alt="Garment" className="max-h-44 rounded-xl object-contain" />
                ) : (
                  <>
                    <Camera className="h-7 w-7 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">Tap to upload a product photo</span>
                  </>
                )}
              </button>
            </>
          )}

          <div className="flex w-full gap-2">
            <button
              onClick={() => setStep("photo")}
              className="flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-4 text-base font-semibold text-secondary-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={!hasGarment}
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">Ready to generate</h1>
          <p className="mb-4 text-sm text-muted-foreground">Nothing is created until you confirm.</p>

          <div className="mb-6 grid w-full grid-cols-2 gap-3">
            <div className="overflow-hidden rounded-2xl bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
              {modelPreviewUrl && <img src={modelPreviewUrl} alt="Your photo" className="aspect-square w-full object-cover" />}
            </div>
            <div className="overflow-hidden rounded-2xl bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
              {garmentSource === "catalog" && selectedProduct?.image_url ? (
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="aspect-square w-full object-cover" />
              ) : garmentPreviewUrl ? (
                <img src={garmentPreviewUrl} alt="Garment" className="aspect-square w-full object-cover" />
              ) : null}
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-dashed border-border bg-secondary/60 p-4 text-center text-sm font-semibold text-foreground">
            1 try-on · {TRYON_CREDIT_COST} credits · about 15-30 sec
          </div>

          {insufficientCredits && (
            <p className="mb-4 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              You have {credits} credits — not enough for a try-on.
            </p>
          )}

          {error && (
            <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex w-full gap-2">
            <button
              onClick={() => setStep("garment")}
              className="flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-4 text-base font-semibold text-secondary-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleGenerate}
              disabled={!modelFile || !hasGarment || generating || insufficientCredits}
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              Generate try-on
            </button>
          </div>
        </div>
      )}
    </>
  );
}
