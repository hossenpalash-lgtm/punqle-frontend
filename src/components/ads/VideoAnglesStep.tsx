import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, Star } from "lucide-react";
import type { ApiVideoScriptAngle } from "@/lib/api";

// New step 2 of Video Ad (between Brief and Style) — shows several real,
// AI-written video scripts (on-screen hook + voiceover narration), each
// built around a different persuasion angle, instead of AdBriefStep's old
// blind angle-label chips. Whatever gets picked here is passed verbatim
// into generation (see AdVideoForm's handleGenerate/scriptOverride) — it's
// never regenerated, so the finished video matches exactly what's shown.
export function VideoAnglesStep({
  angles,
  loading,
  error,
  selectedIndex,
  onSelect,
  onContinue,
  onBack,
  onRetry,
  recommendedIndex,
  recommendedReason,
}: {
  angles: ApiVideoScriptAngle[];
  loading: boolean;
  error: string | null;
  selectedIndex: number | null;
  onSelect: (i: number) => void;
  onContinue: () => void;
  onBack: () => void;
  onRetry: () => void;
  // Same AI-picked-best-option data Quick Create's Video option auto-uses
  // without showing this screen at all — surfaced here too (a small
  // badge) so a user who does see the picker knows which one Punqle
  // itself would have picked.
  recommendedIndex?: number;
  recommendedReason?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">Pick a script</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Punqle wrote a few different ways to sell this — pick the one that fits best.
      </p>

      {loading && (
        <div className="mb-6 flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Writing a few scripts...
        </div>
      )}

      {!loading && error && (
        <div className="mb-6 flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/60 p-5 text-center">
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
          <button
            onClick={onRetry}
            className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && angles.length > 0 && (
        <div className="mb-6 flex w-full flex-col gap-2">
          {angles.map((a, i) => {
            const isSelected = selectedIndex === i;
            return (
              <button
                key={`${a.angle}-${i}`}
                onClick={() => onSelect(i)}
                className={[
                  "flex flex-col gap-1.5 rounded-2xl px-4 py-3.5 text-left transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                ].join(" ")}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {a.angle}
                  {i === recommendedIndex && (
                    <span
                      className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: isSelected ? "rgba(255,255,255,0.2)" : "var(--color-accent)",
                        color: isSelected ? "inherit" : "var(--color-accent-foreground)",
                      }}
                    >
                      <Star className="h-2.5 w-2.5 fill-current" />
                      Recommended
                    </span>
                  )}
                </span>
                <span className={["text-xs", isSelected ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                  {a.explanation}
                </span>
                <span
                  className={[
                    "mt-1 rounded-xl px-2.5 py-2 text-xs",
                    isSelected ? "bg-white/15" : "bg-background",
                  ].join(" ")}
                >
                  <span className="block font-semibold">"{a.headline}"</span>
                  <span className={isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}>
                    {a.narration}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex w-full gap-2">
        <button
          onClick={onBack}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-secondary px-5 py-4 text-sm font-semibold text-secondary-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={loading || !!error || selectedIndex === null}
          className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
