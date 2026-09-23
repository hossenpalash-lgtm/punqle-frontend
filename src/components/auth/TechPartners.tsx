// Real vendor names only — every one confirmed against the actual
// backend code (main.py's model IDs / API bases, plus the actor-clip
// pipeline scripts for Fal.ai), not guessed. Deliberately text badges in
// a consistent chassis rather than recreated logos: real best practice
// for a "powered by" row is to use official marks or, when those aren't
// available, a uniform card style — never an AI-redrawn approximation of
// someone else's trademark. Framed as "built on", not "our partners" —
// accurate to what these actually are (API integrations), not implying a
// formal co-marketing partnership this app can't confirm exists.
const PARTNERS = [
  "Google Veo",
  "OpenAI",
  "ByteDance Seedance",
  "Kling AI",
  "Sync Labs",
  "FASHN",
  "Fal.ai",
  "Topaz Labs",
  "HeyGen",
  "ElevenLabs",
];

export function TechPartners() {
  return (
    <section className="relative z-10 mx-auto mt-16 w-full max-w-4xl px-1">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Built on real, best-in-class AI models
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {PARTNERS.map((name) => (
          <span
            key={name}
            className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-secondary-foreground backdrop-blur-md"
            style={{ background: "oklch(1 0 0 / 55%)" }}
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
