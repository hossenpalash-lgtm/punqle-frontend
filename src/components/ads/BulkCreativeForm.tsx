import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Package,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  base64ToFile,
  fetchProductImage,
  fetchProducts,
  generateAd,
  generateAdCaptions,
  generateCaptions,
  type AdGoal,
  type ApiImportedProduct,
} from "@/lib/api";
import { GOALS } from "./AdBriefStep";

type WizardStep = "select" | "type" | "confirm" | "running";
type ContentType = "social" | "ad";

type BulkResultItem =
  | { productId: string; productName: string; status: "success"; thumbnail: string; caption: string }
  | { productId: string; productName: string; status: "error"; error: string };

// How long a single item realistically takes end-to-end — measured live
// against the deployed backend (not guessed): captions ~2-3s, the image
// call itself ~40-50s (Gemini image generation, the real bottleneck, not
// the 10/min throttle below), plus the 6.5s gap. ~55s/item, used only to
// show an honest "about X min" estimate before the user commits, same
// discipline as AdVideoForm's unconditional cost line.
const SECONDS_PER_ITEM = 55;

// /ads/generate and /ads/generate-image-variant are rate-limited to
// 10/minute per-IP (main.py, slowapi), with no retry/backoff anywhere in
// the frontend. This loop stays strictly sequential — one item's full
// round trip completes before the next starts — which both respects that
// limit (6.5s spacing keeps it under 10/min with margin) and sidesteps
// the backend's non-atomic credit-deduction race (_spend_ad_credit is a
// read-then-write with no locking; concurrent calls could double-spend,
// but a sequential loop never has two in flight for the same user).
const THROTTLE_MS = 6500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildDescription(product: ApiImportedProduct): string {
  return [product.name, product.description].filter(Boolean).join(" — ");
}

async function generateForProduct(
  product: ApiImportedProduct,
  contentType: ContentType,
  goal: AdGoal,
): Promise<{ thumbnail: string; caption: string; creditsRemaining: number }> {
  const description = buildDescription(product);
  let file: File | null = null;
  if (product.image_url) {
    const img = await fetchProductImage(product.image_url);
    file = base64ToFile(img.image_base64, img.mime_type, "product.jpg");
  }

  if (contentType === "social") {
    const captionResult = await generateCaptions(description, "friendly", "medium");
    const image = await generateAd(description, file, "square");
    return {
      thumbnail: image.banner_image_base64,
      caption: captionResult.captions[0]?.facebook_caption ?? "",
      creditsRemaining: image.credits_remaining,
    };
  }

  const captionResult = await generateAdCaptions(description, goal, null, 1);
  const image = await generateAd(description, file, "square");
  return {
    thumbnail: image.banner_image_base64,
    caption: captionResult.captions[0]?.facebook_caption ?? "",
    creditsRemaining: image.credits_remaining,
  };
}

// E-commerce's 1st feature — scale the same single-product engines
// (Image Post's /ads/generate + /ads/generate-captions, Image Ad's
// /ads/generate-ad-captions) across many products at once, instead of
// building a new creative engine. No backend changes at all: this file
// is the entire build. See ProductPicker.tsx for the catalog-fetch and
// URL-to-File pattern this reuses per item.
export function BulkCreativeForm({
  credits,
  setCredits,
}: {
  credits: number | null;
  setCredits: (n: number) => void;
}) {
  const [step, setStep] = useState<WizardStep>("select");

  const [products, setProducts] = useState<ApiImportedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [goal, setGoal] = useState<AdGoal>("sales");

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<BulkResultItem[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingProducts(true);
    setProductsError(null);
    fetchProducts()
      .then((r) => setProducts(r.products))
      .catch((err) => setProductsError(err instanceof Error ? err.message : "Couldn't load your catalog."))
      .finally(() => setLoadingProducts(false));
  }, []);

  const selectedCount = selectedIds.size;
  const allSelected = products.length > 0 && selectedCount === products.length;
  const insufficientCredits = credits !== null && credits < selectedCount;
  const estimatedMinutes = Math.max(1, Math.round((selectedCount * SECONDS_PER_ITEM) / 60));

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  };

  const handleGenerate = async () => {
    if (!contentType) return;
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    setResults([]);
    setProgress({ current: 0, total: selectedProducts.length });
    setStep("running");
    setIsGenerating(true);

    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];
      setProgress({ current: i + 1, total: selectedProducts.length });
      try {
        const r = await generateForProduct(product, contentType, goal);
        setResults((prev) => [
          ...prev,
          { productId: product.id, productName: product.name, status: "success", thumbnail: r.thumbnail, caption: r.caption },
        ]);
        setCredits(r.creditsRemaining);
      } catch (err) {
        setResults((prev) => [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            status: "error",
            error: err instanceof Error ? err.message : "Couldn't generate this one.",
          },
        ]);
      }
      if (i < selectedProducts.length - 1) await sleep(THROTTLE_MS);
    }
    setIsGenerating(false);
  };

  const handleRetry = async (item: Extract<BulkResultItem, { status: "error" }>) => {
    if (retryingId || !contentType) return;
    const product = products.find((p) => p.id === item.productId);
    if (!product) return;
    setRetryingId(item.productId);
    try {
      const r = await generateForProduct(product, contentType, goal);
      setResults((prev) =>
        prev.map((existing) =>
          existing.productId === item.productId
            ? { productId: product.id, productName: product.name, status: "success", thumbnail: r.thumbnail, caption: r.caption }
            : existing,
        ),
      );
      setCredits(r.creditsRemaining);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Still couldn't generate this one.";
      setResults((prev) =>
        prev.map((existing) =>
          existing.productId === item.productId
            ? { productId: product.id, productName: product.name, status: "error" as const, error: message }
            : existing,
        ),
      );
    } finally {
      setRetryingId(null);
    }
  };

  const handleStartOver = () => {
    setStep("select");
    setSelectedIds(new Set());
    setContentType(null);
    setGoal("sales");
    setResults([]);
    setProgress({ current: 0, total: 0 });
  };

  const successCount = results.filter((r) => r.status === "success").length;

  return (
    <>
      {step === "select" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">Choose your products</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Pick which products to create content for — one piece per product.
          </p>

          {loadingProducts ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your catalog...
            </div>
          ) : productsError ? (
            <p className="text-sm font-medium text-destructive">{productsError}</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products imported yet — add some from Product Catalog in the menu, then come back here.
            </p>
          ) : (
            <>
              <button
                onClick={toggleSelectAll}
                className="mb-3 flex w-full items-center gap-2.5 rounded-xl bg-secondary p-3 text-left text-sm font-semibold text-secondary-foreground"
              >
                <span
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    allSelected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                  ].join(" ")}
                >
                  {allSelected && <Check className="h-3.5 w-3.5" />}
                </span>
                Select all ({products.length})
              </button>

              <div className="mb-6 max-h-80 w-full space-y-1.5 overflow-y-auto">
                {products.map((p) => {
                  const selected = selectedIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
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
                          <Package className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{p.name}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep("type")}
                disabled={selectedCount === 0}
                className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
                style={{ background: "var(--gradient-primary)" }}
              >
                {selectedCount === 0 ? "Select at least 1 product" : `Continue with ${selectedCount} selected`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}

      {step === "type" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">What do you want to create?</h1>
          <p className="mb-6 text-sm text-muted-foreground">One piece of content per product, in your chosen format.</p>

          <div className="mb-6 grid w-full grid-cols-2 gap-3">
            <button
              onClick={() => setContentType("social")}
              className={[
                "flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-colors",
                contentType === "social" ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
              ].join(" ")}
              style={contentType !== "social" ? { boxShadow: "var(--shadow-card)" } : undefined}
            >
              <ImageIcon className="h-6 w-6" />
              <span className="text-sm font-semibold">Social Post</span>
            </button>
            <button
              onClick={() => setContentType("ad")}
              className={[
                "flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-colors",
                contentType === "ad" ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
              ].join(" ")}
              style={contentType !== "ad" ? { boxShadow: "var(--shadow-card)" } : undefined}
            >
              <Megaphone className="h-6 w-6" />
              <span className="text-sm font-semibold">Image Ad</span>
            </button>
          </div>

          {contentType === "ad" && (
            <div className="mb-6 w-full text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What's the goal?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => {
                  const selected = goal === g.value;
                  return (
                    <button
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      className={[
                        "rounded-2xl px-3 py-2.5 text-left transition-colors",
                        selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                        {g.label}
                      </span>
                      <span
                        className={["block text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground"].join(
                          " ",
                        )}
                      >
                        {g.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex w-full gap-2">
            <button
              onClick={() => setStep("select")}
              className="flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-4 text-base font-semibold text-secondary-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={!contentType}
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
          <p className="mb-6 text-sm text-muted-foreground">Nothing is created until you confirm.</p>

          <div className="mb-6 w-full space-y-2 rounded-2xl bg-secondary p-4 text-left text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Products selected</span>
              <span className="font-semibold text-foreground">{selectedCount}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Creatives to generate</span>
              <span className="font-semibold text-foreground">{selectedCount}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Credits</span>
              <span className="font-semibold text-foreground">{selectedCount}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Estimated time</span>
              <span className="font-semibold text-foreground">about {estimatedMinutes} min</span>
            </p>
          </div>

          {insufficientCredits && (
            <p className="mb-4 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              You only have {credits} credits — select fewer products or top up first.
            </p>
          )}

          <div className="flex w-full gap-2">
            <button
              onClick={() => setStep("type")}
              className="flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-4 text-base font-semibold text-secondary-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleGenerate}
              disabled={insufficientCredits}
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              Generate {selectedCount} creatives
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === "running" && (
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">
            {isGenerating ? `Processing ${progress.current} / ${progress.total}` : `${successCount} of ${progress.total} succeeded`}
          </h1>
          {isGenerating ? (
            <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(progress.current / Math.max(1, progress.total)) * 100}%`,
                  background: "var(--gradient-primary)",
                }}
              />
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-1.5 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Batch complete
            </div>
          )}

          <div className="mb-6 w-full space-y-2">
            {results.map((r) => (
              <div key={r.productId} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-2.5 text-left">
                {r.status === "success" ? (
                  <img
                    src={`data:image/png;base64,${r.thumbnail}`}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{r.productName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.status === "success" ? r.caption : r.error}
                  </p>
                </div>
                {r.status === "success" ? (
                  <a
                    href={`data:image/png;base64,${r.thumbnail}`}
                    download="ad.png"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <button
                    onClick={() => handleRetry(r)}
                    disabled={!!retryingId}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-60"
                  >
                    {retryingId === r.productId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}
            {isGenerating && results.length < progress.total && (
              <div className="flex items-center gap-3 rounded-xl bg-secondary/30 p-2.5 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Generating...</p>
              </div>
            )}
          </div>

          {!isGenerating && (
            <button
              onClick={handleStartOver}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              Start another batch
            </button>
          )}
        </div>
      )}
    </>
  );
}
