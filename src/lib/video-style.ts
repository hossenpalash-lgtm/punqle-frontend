import {
  ArrowLeftRight,
  Clapperboard,
  Hand,
  Heart,
  Lightbulb,
  Package,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

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
  | "cinematic_ugc"
  | "ai_actor";

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
  icon: LucideIcon;
  // A real credit figure, not a placeholder — mirrors the backend's own
  // constants (main.py: VIDEO_CREDIT_COST=10, AVATAR_STANDARD/PREMIUM=4/10,
  // CINEMATIC_UGC_CREDIT_COST standard/premium=25/46). There's no shared
  // source of truth across the Python/TS boundary, so this has to be kept
  // in sync by hand if those constants ever change — same as every other
  // credit figure already hardcoded in the frontend (e.g. Setup step's own
  // "10 credits" line). The 5 Veo styles are a flat number since style
  // never changes Veo's resolution/duration; Avatar and Cinematic UGC show
  // a range since their real cost depends on the tier picked one step
  // later, not on anything decided here.
  creditHint: string;
}

export const VIDEO_STYLES: VideoStyleOption[] = [
  {
    id: "product_showcase",
    label: "Product Showcase",
    description: "The product as the clear hero",
    promptModifier: "clean product showcase, the item as the clear hero, simple uncluttered background",
    group: "product",
    icon: Package,
    creditHint: "10 credits",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    description: "In genuine everyday use",
    promptModifier: "warm lifestyle setting, the product in genuine everyday use",
    group: "product",
    icon: Heart,
    creditHint: "10 credits",
  },
  {
    id: "problem_solution",
    label: "Problem → Solution",
    description: "The problem, then the fix",
    promptModifier: "shows the everyday problem first, then the product as the clear solution",
    group: "product",
    icon: Lightbulb,
    creditHint: "10 credits",
  },
  {
    id: "before_after",
    label: "Before & After",
    description: "A clear before/after contrast",
    promptModifier: "clear before-and-after contrast showing the product's real effect",
    group: "product",
    icon: ArrowLeftRight,
    creditHint: "10 credits",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Dramatic, film-like look",
    promptModifier: "cinematic lighting, dramatic composition, film-like color grading",
    group: "product",
    icon: Clapperboard,
    creditHint: "10 credits",
  },
  {
    id: "avatar",
    label: "AI Presenter",
    description: "A talking avatar reads your script",
    // Unused — Avatar bypasses Veo/promptModifier entirely; handleGenerate
    // special-cases videoStyle === "avatar" and calls HeyGen instead.
    promptModifier: "",
    group: "ai_ugc",
    icon: UserRound,
    creditHint: "4–10 credits",
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
    icon: Hand,
    creditHint: "25–46 credits",
  },
  {
    id: "ai_actor",
    label: "Punqle Actors",
    description: "Your own AI actor reads your script",
    // Unused — like Avatar, this bypasses Veo/promptModifier entirely;
    // finishCreate special-cases videoStyle === "ai_actor" and calls
    // OmniHuman (via Replicate) with one of Punqle's own _IMAGE_AD_ACTORS
    // personas instead of a HeyGen stock avatar. Same "reads a script"
    // job as Avatar, but a fully AI-synthesized, Punqle-owned actor —
    // real-spike-tested 2026-09-10, more natural results than HeyGen's
    // flatter stock-photo avatars.
    promptModifier: "",
    group: "ai_ugc",
    icon: Sparkles,
    creditHint: "30 credits",
  },
];

export function findVideoStyle(id: VideoStyle | string): VideoStyleOption {
  return VIDEO_STYLES.find((s) => s.id === id) ?? VIDEO_STYLES[0];
}

// Maps a Video Ad style to Image Ad's separate 5-value visualDirection
// vocabulary, for checkVideoStatus's optional `style` param (main.py's
// _headline_font_path_for_style) — the one place the two otherwise-
// unrelated taxonomies share real thematic intent: this file's own
// "lifestyle" ("warm lifestyle setting... genuine everyday use") means
// the same thing Image Ad's "warm_lifestyle" direction does (natural
// imagery, human feel, no AI presenter), so it gets the same restrained
// editorial Lora headline instead of the default Bold treatment. None of
// the other 6 styles (including avatar/cinematic_ugc, which don't burn a
// headline bar over the presenter at all) has an equivalent real match,
// so this deliberately doesn't try to force one.
export function headlineFontStyleFor(style: VideoStyle): string | undefined {
  return style === "lifestyle" ? "warm_lifestyle" : undefined;
}
