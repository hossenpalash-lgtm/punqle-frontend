import { ArrowUpRight, Clapperboard, Gauge, RefreshCw, Send, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The four steps of the product, as one calm strip under the home heading (founder + Claude, 2026-11-23): Create -> Post ->
// See performance -> Beat rivals. Names are plain verbs a shop owner understands (market scan: tools say "create, publish, analyze";
// owners say "Post"; "See performance" matches the sidebar page called Performance, "Track" was unclear to the founder;
// "Beat rivals" is the founder's own wording, made concrete by its line; the way back says "Learn, improve, and create again.").
// Each step is a button that opens the matching screen. Look (founder: "make it more beautiful"): frosted glass like the rest of the
// app, a bold coloured icon chip, a soft coloured shadow, a small lift and arrow on hover.
const LOOP_COLOR = "oklch(0.5 0.15 300"; // step 1's purple, without the closing paren so an alpha can be added
export type HomeStep = "create" | "post" | "results" | "rivals";

const STEPS: { key: HomeStep; n: number; name: string; line: string; icon: LucideIcon; color: string; from: string; tint: string }[] = [
  { key: "create", n: 1, name: "Create", line: "One photo, 3 AI engines, you pick", icon: Clapperboard, color: "oklch(0.5 0.15 300", from: "oklch(0.66 0.18 310", tint: "oklch(0.95 0.035 300" },
  { key: "post", n: 2, name: "Post", line: "Facebook, Instagram, TikTok, YouTube in one tap", icon: Send, color: "oklch(0.45 0.14 150", from: "oklch(0.64 0.16 160", tint: "oklch(0.95 0.045 150" },
  { key: "results", n: 3, name: "See performance", line: "See what worked, make more of it", icon: Gauge, color: "oklch(0.5 0.14 60", from: "oklch(0.74 0.16 70", tint: "oklch(0.96 0.045 75" },
  { key: "rivals", n: 4, name: "Beat rivals", line: "See what they do, make something better", icon: Target, color: "oklch(0.5 0.13 235", from: "oklch(0.66 0.14 225", tint: "oklch(0.95 0.035 235" },
];

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
                <span className="text-[12px] leading-snug text-foreground/70">{s.line}</span>
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
