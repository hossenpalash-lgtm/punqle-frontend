// Dark "generating" screen for the home bar's AI actions — approved
// 2026-10-01 after a design exploration (started from "I like Meta's new
// logo's color contrast", iterated away from anything resembling its own
// ring-of-petals mark, landed on 15 uniform dots evenly spaced on a ring
// with an empty center, orbiting as one group). Replaces the old plain
// Loader2-spinner-plus-caption used across every home-bar mode's
// generating state — same real per-mode status text each call site
// already computed, just a more premium "something is happening" moment
// for the one transient wait, nothing else in the app goes dark.
const RING_DOTS: { left: number; top: number; color: string; delay: number }[] = [
  { left: 102.0, top: 10.0, color: "#E2693F", delay: 0.0 },
  { left: 139.4, top: 18.0, color: "#DE6347", delay: 0.15 },
  { left: 170.4, top: 40.4, color: "#D95E4E", delay: 0.3 },
  { left: 189.5, top: 73.6, color: "#D55856", delay: 0.45 },
  { left: 193.5, top: 111.6, color: "#D1535E", delay: 0.6 },
  { left: 181.7, top: 148.0, color: "#CD4D65", delay: 0.75 },
  { left: 156.1, top: 176.4, color: "#C8476D", delay: 0.9 },
  { left: 121.1, top: 192.0, color: "#C44275", delay: 1.05 },
  { left: 82.9, top: 192.0, color: "#BD3E7C", delay: 1.2 },
  { left: 47.9, top: 176.4, color: "#B03E82", delay: 1.35 },
  { left: 22.3, top: 148.0, color: "#A23E88", delay: 1.5 },
  { left: 10.5, top: 111.6, color: "#953F8E", delay: 1.65 },
  { left: 14.5, top: 73.6, color: "#883F94", delay: 1.8 },
  { left: 33.6, top: 40.4, color: "#7A3F9A", delay: 1.95 },
  { left: 64.6, top: 18.0, color: "#6D3FA0", delay: 2.1 },
];

export function GeneratingGlow({ label }: { label: string }) {
  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-7 overflow-hidden bg-[#0B0A0E] px-6 py-16">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[10px] animate-[generating-bloom-pulse_5s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(193,62,122,0.32) 0%, rgba(109,63,160,0.16) 45%, rgba(11,10,14,0) 72%)",
        }}
      />

      <div className="relative h-[220px] w-[220px] animate-[generating-ring-spin_14s_linear_infinite]">
        {RING_DOTS.map((dot, i) => (
          <div
            key={i}
            className="absolute h-4 w-4 rounded-full blur-[2.5px] mix-blend-screen animate-[generating-dot-twinkle_3.6s_ease-in-out_infinite]"
            style={{ left: dot.left, top: dot.top, background: dot.color, animationDelay: `${dot.delay}s` }}
          />
        ))}
      </div>

      <p className="relative z-[2] max-w-[320px] text-center text-sm text-[#F3EADC]">{label}</p>

      <div className="relative z-[2] h-[3px] w-[150px] overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="absolute top-0 h-full w-[36%] rounded-full animate-[generating-loader-slide_1.8s_ease-in-out_infinite]"
          style={{ background: "linear-gradient(90deg,#E2693F,#C13E7A,#6D3FA0)" }}
        />
      </div>
    </div>
  );
}
