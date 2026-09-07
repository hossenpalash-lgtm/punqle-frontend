// Mirrors social-wizard.ts's VISUAL_DIRECTIONS shape, deliberately
// minimal — no rich Pexels-backed preview components exist for video
// (nothing like VisualDirectionStep's per-card stock-photo search), and
// building that is real new scope beyond what Ad Creation's Video Ad
// needs for v1. Each style is just a short phrase appended client-side
// to the offer description before it reaches Veo — the same
// `${description}, ${modifier}` pattern used for image style.
export type VideoStyle =
  | "product_showcase"
  | "lifestyle"
  | "problem_solution"
  | "before_after"
  | "cinematic"
  | "avatar"
  | "cinematic_ugc";

// `group` drives VideoStyleStep's visual grouping (added 2026-09-08 per
// the approved nav wireframe) — "ai_ugc" (avatar/Cinematic UGC, a person
// leads the shot) is shown first and labelled Recommended, "product" (the
// 5 Veo-prompt styles below, no AI presenter) shown second. This is
// display-only: VIDEO_STYLES' own array order, findVideoStyle's fallback,
// and the default selected style in AdVideoForm are all unchanged — same
// routes, same pricing, just reordered on screen.
export interface VideoStyleOption {
  id: VideoStyle;
  label: string;
  description: string;
  promptModifier: string;
  group: "ai_ugc" | "product";
}

export const VIDEO_STYLES: VideoStyleOption[] = [
  {
    id: "product_showcase",
    label: "Product Showcase",
    description: "The product as the clear hero",
    promptModifier: "clean product showcase, the item as the clear hero, simple uncluttered background",
    group: "product",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    description: "In genuine everyday use",
    promptModifier: "warm lifestyle setting, the product in genuine everyday use",
    group: "product",
  },
  {
    id: "problem_solution",
    label: "Problem → Solution",
    description: "The problem, then the fix",
    promptModifier: "shows the everyday problem first, then the product as the clear solution",
    group: "product",
  },
  {
    id: "before_after",
    label: "Before & After",
    description: "A clear before/after contrast",
    promptModifier: "clear before-and-after contrast showing the product's real effect",
    group: "product",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Dramatic, film-like look",
    promptModifier: "cinematic lighting, dramatic composition, film-like color grading",
    group: "product",
  },
  {
    id: "avatar",
    label: "AI Presenter",
    description: "A talking avatar reads your script",
    // Unused — Avatar bypasses Veo/promptModifier entirely; handleGenerate
    // special-cases videoStyle === "avatar" and calls HeyGen instead.
    promptModifier: "",
    group: "ai_ugc",
  },
  {
    id: "cinematic_ugc",
    label: "Cinematic UGC",
    description: "Real product-in-hand, real human motion",
    // Unused — like Avatar, Cinematic UGC bypasses Veo/promptModifier
    // entirely; handleGenerate special-cases videoStyle === "cinematic_ugc"
    // and calls Seedance 2.5 (via Replicate) instead. Exists for a real
    // gap neither Veo nor HeyGen covers: HeyGen's avatar motion prompts
    // don't reach props/held objects (confirmed via HeyGen's own docs),
    // and Veo has no reliably consistent character across a shot.
    promptModifier: "",
    group: "ai_ugc",
  },
];

export function findVideoStyle(id: VideoStyle | string): VideoStyleOption {
  return VIDEO_STYLES.find((s) => s.id === id) ?? VIDEO_STYLES[0];
}
