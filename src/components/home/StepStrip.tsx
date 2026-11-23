// The four steps of the product, as one calm strip under the home heading (founder + Claude, 2026-11-23): Create -> Post ->
// See performance -> Beat rivals. Names are plain verbs a shop owner understands (market scan: tools say "create, publish, analyze";
// owners say "Post"; "See performance" matches the sidebar page called Performance, "Track" was unclear to the founder;
// "Beat rivals" is the founder's own wording, made concrete by its line; the way back says "Learn, improve, and create again."). Each step is a button that opens the matching screen; the last one
// leads back to the first, because "Create an ad from this" starts a new ad from what a rival does.
const LOOP_COLOR = "oklch(0.5 0.15 300"; // step 1's purple, without the closing paren so an alpha can be added
export type HomeStep = "create" | "post" | "results" | "rivals";

const STEPS: { key: HomeStep; name: string; line: string; color: string; bg: string }[] = [
  { key: "create", name: "Create", line: "One photo, 3 AI engines, you pick", color: "oklch(0.5 0.15 300)", bg: "oklch(0.95 0.03 300)" },
  { key: "post", name: "Post", line: "Facebook, Instagram, TikTok, YouTube in one tap", color: "oklch(0.45 0.14 150)", bg: "oklch(0.95 0.04 150)" },
  { key: "results", name: "See performance", line: "See what worked, make more of it", color: "oklch(0.5 0.14 60)", bg: "oklch(0.96 0.04 75)" },
  { key: "rivals", name: "Beat rivals", line: "See what they do, make something better", color: "oklch(0.5 0.13 235)", bg: "oklch(0.95 0.03 235)" },
];

export function StepStrip({ onStep }: { onStep: (step: HomeStep) => void }) {
  return (
    <div className="mx-auto mb-5 w-full max-w-[740px]">
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((s, i) => (
        <li key={s.key}>
          <button
            type="button"
            onClick={() => onStep(s.key)}
            className="flex h-full w-full flex-col items-start gap-1 rounded-2xl px-3 py-2.5 text-left transition-transform duration-200 hover:-translate-y-0.5"
            style={{ background: s.bg }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                style={{ background: s.color }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="font-display text-[14px] font-extrabold leading-none" style={{ color: s.color }}>
                {s.name}
              </span>
            </span>
            <span className="text-[11.5px] leading-snug text-foreground/70">{s.line}</span>
          </button>
        </li>
      ))}
    </ol>
    {/* The way back to step 1, in the founder's words: one coloured label, no arrows or lines (step 1's purple). */}
    <p className="mt-2.5 flex justify-center">
      <span className="rounded-full px-5 py-1.5 text-[13px] font-bold text-white sm:text-[14px]" style={{ background: LOOP_COLOR + ")" }}>
        Learn, improve, and create again.
      </span>
    </p>
    </div>
  );
}
