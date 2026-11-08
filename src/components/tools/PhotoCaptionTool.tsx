import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, ImagePlus, Loader2 } from "lucide-react";
import { generatePublicPhotoCaptions, type ApiPhotoCaptions } from "@/lib/api";
import type { BusinessType } from "@/lib/tool-pages";

const BUSINESS_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: "cafe", label: "Cafe or coffee shop" },
  { value: "hair_salon", label: "Hair salon or barber" },
  { value: "boutique", label: "Boutique or gift shop" },
  { value: "restaurant", label: "Restaurant, takeaway or bakery" },
  { value: "gym", label: "Gym or fitness studio" },
  { value: "other", label: "Other small business" },
];

// Phone photos are 3-8 MB; the tool only needs to see the picture, so shrink it in the browser first.
async function shrinkPhoto(file: File, maxSide = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/jpeg", 0.85),
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <button
      type="button"
      onClick={async () => setState((await copyText(text)) ? "copied" : "failed")}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      {state === "copied" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : label}</span>
    </button>
  );
}

export function PhotoCaptionTool({ defaultType }: { defaultType: BusinessType }) {
  const [businessType, setBusinessType] = useState<BusinessType>(defaultType);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiPhotoCaptions | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const small = await shrinkPhoto(file);
      setPhoto(small);
      setPreviewUrl(URL.createObjectURL(small));
    } catch {
      setPhoto(null);
      setPreviewUrl(null);
      setError("We couldn't open that photo. Please try a JPG, PNG or WebP picture.");
    }
  }

  async function onGenerate() {
    if (!photo || loading) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await generatePublicPhotoCaptions(photo, businessType, note.trim()));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhoto(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section
      id="tool"
      aria-labelledby="tool-heading"
      className="rounded-3xl border border-border bg-card p-5 sm:p-7"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2 id="tool-heading" className="font-display text-xl font-extrabold text-foreground sm:text-2xl">
        Try it with your own photo
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Free. No login. We don't keep your photo.</p>

      {!result && (
        <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,240px)_1fr]">
          <div>
            <input
              ref={fileRef}
              id="photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              className="sr-only"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            <label
              htmlFor="photo-input"
              className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-border bg-background text-center text-sm text-muted-foreground transition-colors hover:bg-muted focus-within:outline focus-within:outline-2 focus-within:outline-foreground"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Your photo" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-7 w-7" aria-hidden="true" />
                  <span className="px-4 font-semibold text-foreground">Choose a photo</span>
                  <span className="px-4 text-xs">JPG, PNG or WebP</span>
                </>
              )}
            </label>
            {previewUrl && (
              <button type="button" onClick={reset} className="mt-2 text-xs font-semibold text-muted-foreground underline hover:text-foreground">
                Use a different photo
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="biz-type" className="text-sm font-semibold text-foreground">
                What kind of business is it?
              </label>
              <select
                id="biz-type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground"
              >
                {BUSINESS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note" className="text-sm font-semibold text-foreground">
                Anything we should mention? <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="note"
                type="text"
                value={note}
                maxLength={140}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. new oat milk latte, open Sundays"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground"
              />
            </div>
            <button
              type="button"
              onClick={onGenerate}
              disabled={!photo || loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Looking at your photo...
                </>
              ) : (
                "Write my captions"
              )}
            </button>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="mt-5" aria-live="polite">
          <div className="flex items-start gap-4">
            {previewUrl && <img src={previewUrl} alt="Your photo" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">We saw</p>
              <p className="text-sm text-foreground">{result.photo || "Your photo"}</p>
              <button type="button" onClick={reset} className="mt-1 text-xs font-semibold text-muted-foreground underline hover:text-foreground">
                Try another photo
              </button>
            </div>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-foreground">Captions</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {result.captions.map((c) => (
              <li key={c} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-background p-3.5">
                <p className="text-[15px] leading-relaxed text-foreground">{c}</p>
                <CopyButton text={c} />
              </li>
            ))}
          </ul>

          {result.hashtags.length > 0 && (
            <>
              <div className="mt-6 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">Hashtags</h3>
                <CopyButton text={result.hashtags.join(" ")} label="Copy all" />
              </div>
              <p className="mt-2 rounded-2xl border border-border bg-background p-3.5 text-sm leading-relaxed text-muted-foreground">
                {result.hashtags.join(" ")}
              </p>
            </>
          )}

          {result.headlines.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold text-foreground">Ad headlines</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {result.headlines.map((h) => (
                  <li key={h} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3.5">
                    <p className="text-[15px] font-semibold text-foreground">{h}</p>
                    <CopyButton text={h} />
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-7 rounded-2xl border border-border bg-muted p-5">
            <p className="font-display text-lg font-extrabold text-foreground">Turn this photo into a finished ad</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Punqle makes the ad image and a short video from the same photo, then plans your week of posts. Your first
              try is free.
            </p>
            <Link
              to="/"
              search={{ tab: "home" }}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Try Punqle free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
