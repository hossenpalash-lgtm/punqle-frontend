import { Sparkles } from "lucide-react";
import { VIDEO_STYLES, type VideoStyle, type VideoStyleOption } from "@/lib/video-style";
import { ImageChoiceCard } from "./ImageChoiceCard";

const STYLE_PREVIEW: Record<VideoStyle, string> = {
  product_showcase: "/video-style-previews/product_showcase.jpg",
  lifestyle: "/video-style-previews/lifestyle.jpg",
  cinematic: "/video-style-previews/cinematic.jpg",
  cinematic_ugc: "/video-style-previews/cinematic_ugc.jpg",
  avatar: "/video-style-previews/avatar.jpg",
  ai_actor: "/actors/maya.jpg",
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
      {/* No own heading here (2026-09-23) — this only ever renders inline
          under AdVideoForm's own "Style" label now, so a second "How
          should it look?" title was pure duplication. */}
      <div className="flex w-full flex-col gap-3">
        {STYLE_GROUPS.map((group) => {
          const isAiUgc = group.key === "ai_ugc";
          return (
          <div
            key={group.key}
            className={["flex flex-col gap-1.5", isAiUgc ? "rounded-3xl border border-[#F0CBE3] p-2.5" : ""].join(" ")}
            style={isAiUgc ? { background: "linear-gradient(135deg, #FDF0F5 0%, #FBEAF4 50%, #F3EAFB 100%)" } : undefined}
          >
            <div className="flex items-center gap-1.5 px-1 text-left">
              {isAiUgc && <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#C13584]" />}
              <span className={["text-xs font-semibold uppercase tracking-wide", isAiUgc ? "text-[#C13584]" : "text-foreground"].join(" ")}>
                {group.title}
              </span>
            </div>
            <p className="px-1 text-left text-xs text-muted-foreground">{group.subtitle}</p>
            {(() => {
              const groupStyles = VIDEO_STYLES.filter((s) => s.group === group.key);
              // Image cards (2026-10-05, founder liked AdCreative.ai's pickers
              // and asked for this step too — reversing the earlier
              // "compact chips only" call). The recommended AI UGC group
              // gets 2 larger columns so it still reads as the hero
              // choice; the other groups use 3. Ready Actors shows a real
              // Punqle actor; the rest are one-time illustrative stills
              // under /public/video-style-previews.
              const colsClass = isAiUgc ? "grid-cols-2" : "grid-cols-3";
              return (
                <div className={["grid gap-2", colsClass].join(" ")}>
                  {groupStyles.map((style) => (
                    <ImageChoiceCard
                      key={style.id}
                      image={STYLE_PREVIEW[style.id]}
                      label={style.label}
                      sublabel={style.creditHint}
                      video
                      selected={selected === style.id}
                      onClick={() => onSelect(style.id)}
                    />
                  ))}
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
