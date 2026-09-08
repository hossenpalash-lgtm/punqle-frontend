import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { VIDEO_STYLES, type VideoStyle, type VideoStyleOption } from "@/lib/video-style";

// Step 2 of Video Ad — deliberately just chips, no rich preview cards
// (unlike Image Ad's reused VisualDirectionStep). Nothing like that
// exists for video today, and building it is real new scope beyond
// what this feature needs; the description text under each chip does
// the same "help them picture it" job at a fraction of the cost.
//
// Regrouped 2026-09-08 per the approved nav wireframe: the 7 styles used
// to render as one flat list, giving the 5 generic Veo-prompt styles the
// same visual weight as the 2 AI UGC options even though they're a
// completely different underlying capability (and the more differentiated
// one, per the founder's own read of the market). Two labelled groups now
// — AI UGC first — no change to routes, pricing, or the actual generation
// logic, purely how this one screen presents the same 7 choices. Wording
// is the founder's own refinement, not the original "Product-only
// styles (no person)" draft.
const STYLE_GROUPS: { key: VideoStyleOption["group"]; title: string; subtitle: string }[] = [
  { key: "ai_ugc", title: "AI UGC — Recommended", subtitle: "Human-led ads with a creator or presenter" },
  { key: "product", title: "Product Videos", subtitle: "Product-focused styles without an AI presenter" },
];

export function VideoStyleStep({
  selected,
  onSelect,
  onContinue,
  onBack,
}: {
  selected: VideoStyle;
  onSelect: (v: VideoStyle) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">How should it look?</h1>
      <p className="mb-6 text-sm text-muted-foreground">Pick the style that fits your video best.</p>

      <div className="mb-6 flex w-full flex-col gap-4">
        {STYLE_GROUPS.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-1 text-left">
              {group.key === "ai_ugc" && <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />}
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
        ))}
      </div>

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
          className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
