import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { VIDEO_STYLES, type VideoStyle } from "@/lib/video-style";

// Step 2 of Video Ad — deliberately just chips, no rich preview cards
// (unlike Image Ad's reused VisualDirectionStep). Nothing like that
// exists for video today, and building it is real new scope beyond
// what this feature needs; the description text under each chip does
// the same "help them picture it" job at a fraction of the cost.
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

      <div className="mb-6 flex w-full flex-col gap-2">
        {VIDEO_STYLES.map((style) => {
          const isSelected = selected === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onSelect(style.id)}
              className={[
                "flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              ].join(" ")}
            >
              <span>
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
            </button>
          );
        })}
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
