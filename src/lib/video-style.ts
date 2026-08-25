// Mirrors social-wizard.ts's VISUAL_DIRECTIONS shape, deliberately
// minimal — no rich Pexels-backed preview components exist for video
// (nothing like VisualDirectionStep's per-card stock-photo search), and
// building that is real new scope beyond what Ad Creation's Video Ad
// needs for v1. Each style is just a short phrase appended client-side
// to the offer description before it reaches Veo — the same
// `${description}, ${modifier}` pattern used for image style.
export type VideoStyle = "product_showcase" | "lifestyle" | "problem_solution" | "before_after" | "cinematic";

export interface VideoStyleOption {
  id: VideoStyle;
  label: string;
  description: string;
  promptModifier: string;
}

export const VIDEO_STYLES: VideoStyleOption[] = [
  {
    id: "product_showcase",
    label: "Product Showcase",
    description: "The product as the clear hero",
    promptModifier: "clean product showcase, the item as the clear hero, simple uncluttered background",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    description: "In genuine everyday use",
    promptModifier: "warm lifestyle setting, the product in genuine everyday use",
  },
  {
    id: "problem_solution",
    label: "Problem → Solution",
    description: "The problem, then the fix",
    promptModifier: "shows the everyday problem first, then the product as the clear solution",
  },
  {
    id: "before_after",
    label: "Before & After",
    description: "A clear before/after contrast",
    promptModifier: "clear before-and-after contrast showing the product's real effect",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Dramatic, film-like look",
    promptModifier: "cinematic lighting, dramatic composition, film-like color grading",
  },
];

export function findVideoStyle(id: VideoStyle | string): VideoStyleOption {
  return VIDEO_STYLES.find((s) => s.id === id) ?? VIDEO_STYLES[0];
}
