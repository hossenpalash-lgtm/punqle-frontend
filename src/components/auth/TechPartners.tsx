// Real vendor names only — every one confirmed against the actual
// backend code (main.py's model IDs / API bases, plus the actor-clip
// pipeline scripts for Fal.ai), not guessed. Deliberately text badges in
// a consistent chassis rather than recreated logos: real best practice
// for a "powered by" row is to use official marks or, when those aren't
// available, a uniform card style — never an AI-redrawn approximation of
// someone else's trademark. Framed as "built on", not "our partners" —
// accurate to what these actually are (API integrations), not implying a
// formal co-marketing partnership this app can't confirm exists.
//
// 2026-09-24 — founder asked for a fresher, more considered treatment
// than a static wrapped row. Reworked as one slow, single-direction
// marquee (distinct from RealFilmstrip's two-row photo-card strip right
// below it, so the two moving elements on the page don't read as the
// same trick twice) — same reused seamless-loop technique, small dot
// dividers between names instead of individual pill borders, so it
// reads as one continuous line of real names rather than a button row.
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

function PartnerRun() {
  return (
    <div className="flex shrink-0 items-center">
      {PARTNERS.map((name, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-4 text-[15px] font-semibold text-secondary-foreground">{name}</span>
          <span className="h-1 w-1 rounded-full bg-border" aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}

export function TechPartners() {
  return (
    <div className="w-full">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Built on real, best-in-class AI models
      </p>
      <div className="marquee-pausable overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-marquee-left" style={{ animationDuration: "34s" }}>
          <div className="marquee-set contents">
            <PartnerRun />
          </div>
          <div className="marquee-set contents" aria-hidden="true">
            <PartnerRun />
          </div>
        </div>
      </div>
    </div>
  );
}
