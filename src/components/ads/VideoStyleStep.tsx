import { Check, Sparkles } from "lucide-react";
import { VIDEO_STYLES, type VideoStyle, type VideoStyleOption } from "@/lib/video-style";

// Step 2 of Video Ad — deliberately just chips, no rich preview cards
// (unlike Image Ad's reused VisualDirectionStep). Compacted to a 2-col
// grid (2026-09-23, founder's call) — icon + label + credit cost only,
// no description line — matching how dense Image Ad's own Style grid
// already is (VisualDirectionStep). Credit cost stays visible (unlike
// Image Ad, where every style costs the same) since it varies 4-46
// credits here and materially affects the choice.
//
// Regrouped 2026-09-08 per the approved nav wireframe, then again
// 2026-09-23 after real market research (see video-style.ts's own
// comment): "ai_ugc" now holds only Punqle's own two pipelines (Ready
// Actors, Cinematic UGC) — the actual differentiators — badged
// Recommended; "product" is the plain Veo-prompt styles; "presenter"
// (HeyGen's stock avatar) is its own small, deliberately un-badged
// group at the end, so it stays available without reading as the
// flagship choice. No change to routes, pricing, or generation logic.
// Group subtitle deliberately doesn't claim "real footage" for both
// members — Ready Actors is genuinely filmed, Cinematic UGC is fully
// AI-generated (see video-style.ts). "Own" is the accurate shared claim:
// both are Punqle's own pipelines, not a shared realism claim.
const STYLE_GROUPS: { key: VideoStyleOption["group"]; title: string; subtitle: string }[] = [
  { key: "ai_ugc", title: "AI UGC — Recommended", subtitle: "Punqle's own actors and product-in-hand video" },
  { key: "product", title: "Product Videos", subtitle: "Product-focused styles without a presenter" },
  { key: "presenter", title: "Also available", subtitle: "A stock AI avatar reads your script" },
];

export function VideoStyleStep({
  selected,
  onSelect,
}: {
  selected: VideoStyle;
  onSelect: (v: VideoStyle) => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">How should it look?</h1>
      <p className="mb-6 text-sm text-muted-foreground">Pick the style that fits your video best.</p>

      <div className="mb-6 flex w-full flex-col gap-4">
        {STYLE_GROUPS.map((group) => {
          const isAiUgc = group.key === "ai_ugc";
          return (
          <div
            key={group.key}
            className={[
              "flex flex-col gap-2",
              isAiUgc ? "rounded-3xl border border-accent/25 bg-accent/5 p-3" : "",
            ].join(" ")}
          >
            <div className="flex items-center gap-1.5 px-1 text-left">
              {isAiUgc && <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />}
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{group.title}</span>
            </div>
            <p className="px-1 text-left text-xs text-muted-foreground">{group.subtitle}</p>
            {(() => {
              const groupStyles = VIDEO_STYLES.filter((s) => s.group === group.key);
              // One row per group instead of a fixed 2-col grid — a 3-card
              // group (Product Videos) used to wrap to 2+1, which read as
              // unbalanced next to the other groups' clean single rows.
              const colsClass =
                groupStyles.length >= 3 ? "grid-cols-3" : groupStyles.length === 2 ? "grid-cols-2" : "grid-cols-1";
              return (
                <div className={["grid gap-1.5", colsClass].join(" ")}>
                  {groupStyles.map((style) => {
                    const isSelected = selected === style.id;
                    const Icon = style.icon;
                    return (
                      <button
                        key={style.id}
                        onClick={() => onSelect(style.id)}
                        className={[
                          "flex flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-left transition-colors",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                        ].join(" ")}
                      >
                        <Icon
                          className={["h-4 w-4 shrink-0", isSelected ? "text-primary-foreground/90" : "text-muted-foreground"].join(" ")}
                        />
                        <span className="flex items-center gap-1 text-xs font-semibold leading-tight">
                          {isSelected && <Check className="h-3 w-3 shrink-0" />}
                          {style.label}
                        </span>
                        <span
                          className={["text-[10px] font-semibold", isSelected ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}
                        >
                          {style.creditHint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          );
        })}
      </div>
    </div>
  );
}
