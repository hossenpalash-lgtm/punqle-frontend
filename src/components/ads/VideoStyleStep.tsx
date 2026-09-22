import { Check, Sparkles } from "lucide-react";
import { VIDEO_STYLES, type VideoStyle, type VideoStyleOption } from "@/lib/video-style";

// Step 2 of Video Ad — deliberately just chips, no rich preview cards
// (unlike Image Ad's reused VisualDirectionStep). Nothing like that
// exists for video today, and building it is real new scope beyond
// what this feature needs; the description text under each chip does
// the same "help them picture it" job at a fraction of the cost.
//
// Regrouped 2026-09-08 per the approved nav wireframe, then again
// 2026-09-23 after real market research (see video-style.ts's own
// comment): "ai_ugc" now holds only Punqle's two real, owned pipelines
// (Ready Actors, Cinematic UGC) — the actual differentiators — badged
// Recommended; "product" is the plain Veo-prompt styles; "presenter"
// (HeyGen's stock avatar) is its own small, deliberately un-badged
// group at the end, so it stays available without reading as the
// flagship choice. No change to routes, pricing, or generation logic.
const STYLE_GROUPS: { key: VideoStyleOption["group"]; title: string; subtitle: string }[] = [
  { key: "ai_ugc", title: "AI UGC — Recommended", subtitle: "Punqle's own actors — real footage, real motion" },
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
            {VIDEO_STYLES.filter((s) => s.group === group.key).map((style) => {
              const isSelected = selected === style.id;
              const Icon = style.icon;
              return (
                <button
                  key={style.id}
                  onClick={() => onSelect(style.id)}
                  className={[
                    "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon
                      className={[
                        "h-5 w-5 shrink-0",
                        isSelected ? "text-primary-foreground/90" : "text-muted-foreground",
                      ].join(" ")}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                        {style.label}
                      </span>
                      <span
                        className={[
                          "block text-xs",
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {style.description}
                      </span>
                    </span>
                  </span>
                  <span
                    className={[
                      "shrink-0 text-[11px] font-semibold",
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {style.creditHint}
                  </span>
                </button>
              );
            })}
          </div>
          );
        })}
      </div>
    </div>
  );
}
