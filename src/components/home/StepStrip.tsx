import { ArrowUpRight, Clapperboard, Facebook, Gauge, Instagram, RefreshCw, Send, Target, Youtube } from "lucide-react";
import { TikTokIcon } from "@/components/TikTokIcon";
import type { LucideIcon } from "lucide-react";

// The four steps of the product, as one calm strip under the home heading (founder + Claude, 2026-11-23): Create -> Post ->
// See performance -> Beat rivals. Names are plain verbs a shop owner understands (market scan: tools say "create, publish, analyze";
// owners say "Post"; "See performance" matches the sidebar page called Performance, "Track" was unclear to the founder;
// "Beat rivals" is the founder's own wording, made concrete by its line; the way back says "Learn, improve, and create again.").
// Each step is a button that opens the matching screen. Look (founder: "make it more beautiful"): frosted glass like the rest of the
// app, a bold coloured icon chip, a soft coloured shadow, a small lift and arrow on hover.
const LOOP_COLOR = "oklch(0.5 0.15 300"; // step 1's purple, without the closing paren so an alpha can be added
export type HomeStep = "create" | "post" | "results" | "rivals";
type Extra = "engines" | "platforms" | "metrics" | "ideas";

const STEPS: { key: HomeStep; n: number; name: string; line: string; icon: LucideIcon; color: string; from: string; tint: string; extra: Extra }[] = [
  { key: "create", n: 1, name: "Create", line: "One photo, 3 AI engines, you pick", icon: Clapperboard, color: "oklch(0.5 0.15 300", from: "oklch(0.66 0.18 310", tint: "oklch(0.95 0.035 300", extra: "engines" },
  { key: "post", n: 2, name: "Post", line: "Four platforms, one tap", icon: Send, color: "oklch(0.45 0.14 150", from: "oklch(0.64 0.16 160", tint: "oklch(0.95 0.045 150", extra: "platforms" },
  { key: "results", n: 3, name: "See performance", line: "See what worked, make more of it", icon: Gauge, color: "oklch(0.5 0.14 60", from: "oklch(0.74 0.16 70", tint: "oklch(0.96 0.045 75", extra: "metrics" },
  { key: "rivals", n: 4, name: "Beat rivals", line: "See what they do, make something better", icon: Target, color: "oklch(0.5 0.13 235", from: "oklch(0.66 0.14 225", tint: "oklch(0.95 0.035 235", extra: "ideas" },
];

// The small row at the bottom of each card. Engines, numbers and features are highlighted names (no logos: engines are other
// companies' marks); platforms use the familiar round logos. "Reach" and "Engagement" are what Performance leads with; "Ad ideas" and
// "You vs them" are what Competitive Edge gives.
const PLATFORM_LOGOS: { label: string; bg: string; node: React.ReactNode }[] = [
  { label: "Facebook", bg: "#1877F2", node: <Facebook className="h-3 w-3" fill="currentColor" /> },
  { label: "Instagram", bg: "linear-gradient(45deg,#F58529,#DD2A7B 55%,#8134AF)", node: <Instagram className="h-3 w-3" /> },
  { label: "TikTok", bg: "#111111", node: <TikTokIcon className="h-3 w-3" /> },
  { label: "YouTube", bg: "#FF0000", node: <Youtube className="h-3 w-3" fill="currentColor" /> },
];

function Logos({ items }: { items: { label: string; bg: string; node: React.ReactNode }[] }) {
  return (
    <span className="mt-auto flex items-center gap-1.5 pt-0.5">
      {items.map((l) => (
        <span key={l.label} title={l.label} aria-label={l.label} className="flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm" style={{ background: l.bg }}>
          {l.node}
        </span>
      ))}
    </span>
  );
}

function Pills({ words, color }: { words: string[]; color: string }) {
  return (
    <span className="mt-auto flex flex-wrap items-center gap-1 pt-0.5">
      {words.map((w) => (
        <span key={w} className="rounded-full bg-white/85 px-1.5 py-1 text-[11px] font-bold leading-none shadow-sm" style={{ color }}>
          {w}
        </span>
      ))}
    </span>
  );
}

function StepExtra({ kind, color }: { kind: Extra; color: string }) {
  if (kind === "engines") return <Pills words={["Wan", "Kling", "Seedance"]} color={color} />;
  if (kind === "metrics") return <Pills words={["Reach", "Engagement"]} color={color} />;
  if (kind === "platforms") return <Logos items={PLATFORM_LOGOS} />;
  return <Pills words={["Ad ideas", "You vs them"]} color={color} />;
}

export function StepStrip({ onStep }: { onStep: (step: HomeStep) => void }) {
  return (
    <div className="mx-auto mb-5 w-full max-w-[740px]">
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onStep(s.key)}
                className="group relative flex h-full w-full flex-col items-start gap-2 rounded-2xl px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(165deg, oklch(1 0 0 / 88%), ${s.tint})`,
                  boxShadow: `inset 0 1px 0 rgb(255 255 255 / 85%), 0 0 0 1px rgb(255 255 255 / 65%), 0 16px 26px -18px ${s.color} / 0.55)`,
                }}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="relative shrink-0">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
                      style={{
                        background: `linear-gradient(135deg, ${s.from}), ${s.color}))`,
                        boxShadow: `inset 0 1px 0 rgb(255 255 255 / 35%), 0 6px 12px -6px ${s.color} / 0.7)`,
                      }}
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {/* the step number, tucked on the icon's corner so it costs no width */}
                    <span
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-extrabold leading-none shadow-sm"
                      style={{ color: `${s.color})` }}
                      aria-hidden="true"
                    >
                      {s.n}
                    </span>
                  </span>
                  <span className="whitespace-nowrap font-display text-[14px] font-extrabold leading-tight" style={{ color: `${s.color})` }}>
                    {s.name}
                  </span>
                  <ArrowUpRight
                    className="absolute right-2.5 top-2.5 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: `${s.color})` }}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-[12.5px] leading-snug text-foreground/85">{s.line}</span>
                <StepExtra kind={s.extra} color={`${s.color})`} />
              </button>
            </li>
          );
        })}
      </ol>
      {/* The way back to step 1, in the founder's words: a small purple "go round again" icon above one coloured label (step 1's purple). */}
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <RefreshCw className="h-5 w-5" style={{ color: `${LOOP_COLOR})` }} strokeWidth={2.5} aria-hidden="true" />
        <span className="rounded-full px-5 py-1.5 text-[13px] font-bold text-white sm:text-[14px]" style={{ background: `${LOOP_COLOR})`, boxShadow: `0 10px 20px -12px ${LOOP_COLOR} / 0.8)` }}>
          Learn, improve, and create again.
        </span>
      </div>
    </div>
  );
}
