// 2026-10-06: the ring was orange -> magenta -> violet; it is now ice-blue -> violet
// (no pink), part of the app-wide "pearl" de-pinking.
// Dark "generating" screen for the home bar's AI actions — approved
// 2026-10-01 after a design exploration (started from "I like Meta's new
// logo's color contrast", iterated away from anything resembling its own
// ring-of-petals mark, landed on 15 uniform dots evenly spaced on a ring
// with an empty center, orbiting as one group). Replaces the old plain
// Loader2-spinner-plus-caption used across every home-bar mode's
// generating state — same real per-mode status text each call site
// already computed, just a more premium "something is happening" moment
// for the one transient wait, nothing else in the app goes dark.
//
// Each dot's core is rendered perfectly sharp (no `filter: blur()` on the
// moving element itself) — the glow comes from `box-shadow` instead,
// which halos around a crisp shape rather than softening the shape's own
// edges. An earlier version used `filter: blur()` directly on the
// rotating dots, which read as genuinely blurry/soft while spinning
// (the reference the founder liked — Meta's own mark — stays crisp even
// in motion); box-shadow glow + a small glossy highlight gets the same
// "glowing" feel without ever softening the dot's own edge.
const RING_DOTS: { left: number; top: number; color: string; highlight: string; delay: number }[] = [
  { left: 102.0, top: 10.0, color: "#7FB6FF", highlight: "#BFDAFF", delay: 0.0 },
  { left: 139.4, top: 18.0, color: "#81B2FF", highlight: "#C0D8FF", delay: 0.15 },
  { left: 170.4, top: 40.4, color: "#83AEFF", highlight: "#C1D6FF", delay: 0.3 },
  { left: 189.5, top: 73.6, color: "#85A9FF", highlight: "#C2D4FF", delay: 0.45 },
  { left: 193.5, top: 111.6, color: "#87A5FF", highlight: "#C3D2FF", delay: 0.6 },
  { left: 181.7, top: 148.0, color: "#89A1FF", highlight: "#C4D0FF", delay: 0.75 },
  { left: 156.1, top: 176.4, color: "#8B9DFF", highlight: "#C5CEFF", delay: 0.9 },
  { left: 121.1, top: 192.0, color: "#8D98FF", highlight: "#C6CCFF", delay: 1.05 },
  { left: 82.9, top: 192.0, color: "#8F94FF", highlight: "#C7CAFF", delay: 1.2 },
  { left: 47.9, top: 176.4, color: "#9190FF", highlight: "#C8C8FF", delay: 1.35 },
  { left: 22.3, top: 148.0, color: "#938CFF", highlight: "#C9C6FF", delay: 1.5 },
  { left: 10.5, top: 111.6, color: "#9588FF", highlight: "#CAC4FF", delay: 1.65 },
  { left: 14.5, top: 73.6, color: "#9783FF", highlight: "#CBC1FF", delay: 1.8 },
  { left: 33.6, top: 40.4, color: "#997FFF", highlight: "#CCBFFF", delay: 1.95 },
  { left: 64.6, top: 18.0, color: "#9B7BFF", highlight: "#CDBDFF", delay: 2.1 },
];

export function GeneratingGlow({ label }: { label: string }) {
  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-7 overflow-hidden bg-[#0B0A0E] px-6 py-16">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[10px] animate-[generating-bloom-pulse_5s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(110,150,255,0.30) 0%, rgba(140,110,255,0.15) 45%, rgba(11,10,14,0) 72%)",
        }}
      />

      <div
        className="relative h-[220px] w-[220px] animate-[generating-ring-spin_14s_linear_infinite]"
        style={{ willChange: "transform" }}
      >
        {RING_DOTS.map((dot, i) => (
          <div
            key={i}
            className="absolute h-4 w-4 rounded-full animate-[generating-dot-twinkle_3.6s_ease-in-out_infinite]"
            style={{
              left: dot.left,
              top: dot.top,
              background: `radial-gradient(circle at 32% 28%, ${dot.highlight} 0%, ${dot.color} 70%)`,
              boxShadow: `0 0 9px 1px ${dot.color}99`,
              animationDelay: `${dot.delay}s`,
            }}
          />
        ))}
      </div>

      <p className="relative z-[2] max-w-[320px] text-center text-sm text-[#F3EADC]">{label}</p>

      <div className="relative z-[2] h-[3px] w-[150px] overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="absolute top-0 h-full w-[36%] rounded-full animate-[generating-loader-slide_1.8s_ease-in-out_infinite]"
          style={{ background: "linear-gradient(90deg,#7FB6FF,#9B7BFF,#C9BBFF)" }}
        />
      </div>
    </div>
  );
}
