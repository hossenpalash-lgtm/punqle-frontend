import {
  Clapperboard,
  Hand,
  Heart,
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
//
// "before_after" removed 2026-09-23, folded into ANGLES (AdBriefStep.tsx)
// instead, same call already made for "problem_solution" a day earlier.
// Real trade-off, not a pure cleanup: its promptModifier ("clear
// before-and-after contrast...") was a real instruction telling Veo to
// visually render a before/after sequence — Angle never reaches Veo's
// prompt at all (see AdVideoForm.tsx's finishCreate: Angle only feeds
// generateAdCaptions/generateVideoScriptAngles, caption/narration text).
// So a before/after ad now works through narration alone, not a
// dedicated visual instruction — the same shape Problem → Solution
// already settled into. Founder's explicit, twice-considered call.
export type VideoStyle =
  | "product_showcase"
  | "lifestyle"
  | "cinematic"
  | "avatar"
  | "cinematic_ugc"
  | "ai_actor";

// `group` drives VideoStyleStep's visual grouping. "ai_ugc" — Punqle's own
// two pipelines, Ready Actors (real filmed footage, an AI-swapped face)
// and Cinematic UGC (a fully AI-imagined actor and motion via Seedance,
// no filming at all — NOT the same claim as Ready Actors, keep the
// wording honest per style, not blanketed across the group) — is shown
// first and labelled Recommended; "product" (plain Veo-prompt
// styles, no person) shown second; "presenter" (HeyGen's stock avatar)
// shown last and deliberately NOT badged Recommended (2026-09-23,
// founder's call after real market research: HeyGen is still a
// legitimate tool — good for multilingual/many-language scripts — but
// reads as more "polished/corporate" than native UGC, the opposite of
// what small-business paid-social ads want, and Punqle's own filmed
// Ready Actors already beat it on realism per this project's own
// side-by-side tests. Kept, not removed, but not pushed as the
// flagship). This is display-only: VIDEO_STYLES' own array order,
// findVideoStyle's fallback, and the default selected style in
// AdVideoForm are all unchanged — same routes, same pricing.
export interface VideoStyleOption {
  id: VideoStyle;
  label: string;
  description: string;
  promptModifier: string;
  group: "ai_ugc" | "product" | "presenter";
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
    id: "cinematic",
    label: "Cinematic",
    description: "Dramatic, film-like look",
    promptModifier: "cinematic lighting, dramatic composition, film-like color grading",
    group: "product",
    icon: Clapperboard,
    creditHint: "10 credits",
  },
  {
    id: "cinematic_ugc",
    label: "Cinematic UGC",
    // Deliberately doesn't say "real" — Seedance 2.5 is text-to-video, a
    // fully AI-imagined actor and motion, not filmed footage. Confirmed
    // 2026-09-23 (a founder-relayed review flagged the exact wording
    // risk): only Ready Actors' base clips are genuinely real filmed
    // footage; Cinematic UGC's realism is in how natural the AI motion
    // looks, not in what it's made from. Wording must track which is
    // actually true, not blur the two.
    description: "An AI-imagined actor shows the product in hand",
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
    label: "Ready Actors",
    description: "Pick a ready-made actor — just add your script",
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
  {
    id: "avatar",
    label: "AI Presenter",
    description: "A stock AI avatar — good for multilingual scripts",
    // Unused — Avatar bypasses Veo/promptModifier entirely; handleGenerate
    // special-cases videoStyle === "avatar" and calls HeyGen instead. Kept
    // (2026-09-23) but demoted out of "Recommended" — see the group-field
    // comment above for why.
    promptModifier: "",
    group: "presenter",
    icon: UserRound,
    creditHint: "4–10 credits",
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
// the other styles (including avatar/cinematic_ugc/ai_actor, which don't
// burn a headline bar over the presenter at all) has an equivalent real
// match, so this deliberately doesn't try to force one.
export function headlineFontStyleFor(style: VideoStyle): string | undefined {
  return style === "lifestyle" ? "warm_lifestyle" : undefined;
}
