import { Check } from "lucide-react";
import { AI_PRESENTER_AVAILABLE, VIDEO_STYLES, type VideoStyle } from "@/lib/video-style";
import { previewAsset } from "@/lib/preview-assets";
import { ImageChoiceCard } from "./ImageChoiceCard";
import { StyleCarousel } from "./StyleCarousel";

const STYLE_PREVIEW: Record<VideoStyle, string> = {
  product_showcase: previewAsset("/video-style-previews/product_showcase.jpg"),
  lifestyle: previewAsset("/video-style-previews/lifestyle.jpg"),
  cinematic: previewAsset("/video-style-previews/cinematic.jpg"),
  cinematic_ugc: previewAsset("/video-style-previews/cinematic_ugc.jpg"),
  avatar: previewAsset("/video-style-previews/avatar.jpg"),
  ai_actor: previewAsset("/video-style-previews/ai_actor.jpg"), // Victor (park bench), a real filmed actor
};

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
const PRESENTER_SUBTITLE = "A stock avatar reads your script";

// Most cards cost the same, so a "30 credits" line on each of them was five copies of one
// fact (the button at the bottom already shows the price of the picked style, 2026-11-10).
// Show the price only on a card that differs from the usual one.
const COMMON_CREDIT_HINT = (() => {
  const counts = new Map<string, number>();
  for (const s of VIDEO_STYLES) counts.set(s.creditHint, (counts.get(s.creditHint) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
})();

// Short silent clips that play on a card while it is hovered or picked (see ImageChoiceCard). Made from clips we
// already had, plus one 2-second Wan 3.0 clip for Cinematic UGC; each is a few hundred KB.
const STYLE_CLIP: Partial<Record<VideoStyle, string>> = {
  cinematic_ugc: previewAsset("/video-style-previews/cinematic_ugc.mp4"),
  ai_actor: previewAsset("/video-style-previews/ai_actor.mp4"),
  product_showcase: previewAsset("/video-style-previews/product_showcase.mp4"),
  lifestyle: previewAsset("/video-style-previews/lifestyle.mp4"),
  cinematic: previewAsset("/video-style-previews/cinematic.mp4"),
};

export function VideoStyleStep({
  selected,
  onSelect,
}: {
  selected: VideoStyle;
  onSelect: (v: VideoStyle) => void;
}) {
  // One sideways row (2026-11-11): Punqle's own AI UGC styles first, tagged "Recommended", then the product-focused ones.
  const rowStyles = [
    ...VIDEO_STYLES.filter((s) => s.group === "ai_ugc"),
    ...VIDEO_STYLES.filter((s) => s.group === "product"),
  ];
  const presenter = AI_PRESENTER_AVAILABLE ? VIDEO_STYLES.find((s) => s.group === "presenter") : undefined;
  return (
    <div className="flex flex-col items-center text-center">
      {/* No own heading here (2026-09-23) - this only ever renders inline under AdVideoForm's own "Style" label. */}
      <div className="flex w-full flex-col gap-3">
        <StyleCarousel label="Video styles">
          {rowStyles.map((style) => (
            <ImageChoiceCard
              key={style.id}
              image={STYLE_PREVIEW[style.id]}
              videoSrc={STYLE_CLIP[style.id]}
              label={style.label}
              badge={style.group === "ai_ugc" ? "Recommended" : undefined}
              sublabel={style.creditHint === COMMON_CREDIT_HINT ? undefined : style.creditHint}
              video
              selected={selected === style.id}
              onClick={() => onSelect(style.id)}
            />
          ))}
        </StyleCarousel>
        {presenter && (
          <button
            type="button"
            onClick={() => onSelect(presenter.id)}
            aria-pressed={selected === presenter.id}
            className={[
              "flex items-center gap-3 rounded-2xl border bg-card p-1.5 text-left transition-colors",
              selected === presenter.id ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40",
            ].join(" ")}
          >
            <img src={STYLE_PREVIEW[presenter.id]} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[13px] leading-tight text-foreground">{presenter.label}</span>
              <span className="block text-xs text-muted-foreground">{PRESENTER_SUBTITLE}</span>
            </span>
            {presenter.creditHint !== COMMON_CREDIT_HINT && (
              <span className="shrink-0 text-[11.5px] font-semibold text-muted-foreground">{presenter.creditHint}</span>
            )}
            {selected === presenter.id && (
              <span className="mr-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
