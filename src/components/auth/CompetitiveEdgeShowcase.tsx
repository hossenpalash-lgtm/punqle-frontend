// RESERVED SLOT (founder, 2026-11-09): a showcase of Competitive Edge for the landing page, to be filled in later.
// It renders NOTHING until SHOWCASE below is set, so the public page never shows an empty box.
//
// To fill it (after a real run, see memory "project_second_killer_feature_decision"):
//   1. Take a real screenshot/short video of a Competitive Edge result (a real competitor, real numbers).
//   2. Put the file in public/demo/ and set SHOWCASE (heading, one honest sentence, the image, alt text).
//   3. The slot sits right after the Enhancer section in LoginScreen.tsx; no other change is needed.
// Keep it honest: only claims the tool really delivers (Instagram Business Discovery data is real, see
// competitive_edge_v2 notes), and no invented competitor names or figures.
import { ArrowRight, Binoculars } from "lucide-react";

interface Showcase {
  heading: string;
  body: string;
  image: string;
  alt: string;
  caption?: string;
}

// Filled 2026-11-10 from a REAL run (a national coffee chain's public website, ~25 s, about 2 US cents): the summary, "at a glance" and
// the evidence behind every idea came back from the live tool; only the business name is hidden on purpose (we do not put a real
// company's name and its customers' complaints on our own marketing page without asking). Nothing in the picture is invented.
const SHOWCASE: Showcase | null = {
  // Short on purpose (founder, 2026-11-10: people skim, they do not read line by line): a 6-word promise, one 16-word line,
  // and a picture that is itself a three-row "at a glance" card (what they do / what customers say / your best move).
  heading: "See what your competitors do. Post something better.",
  body: "Paste a competitor's link. Get post ideas backed by real evidence in about 30 seconds.",
  image: "/demo/competitive-edge.jpg",
  alt: "The at-a-glance card of a real Competitive Edge result: what the competitor does, what customers say, and your best move, with a button to create an ad from the idea.",
  caption: "A real result for a national coffee chain (name hidden).",
};

export function CompetitiveEdgeShowcase({ onTry }: { onTry: () => void }) {
  if (!SHOWCASE) return null;
  return (
    <section className="relative z-10 mx-auto mt-20 w-full max-w-4xl px-1" aria-labelledby="edge-heading">
      <div
        className="overflow-hidden rounded-[28px] border border-border"
        style={{ boxShadow: "var(--shadow-card)", background: "linear-gradient(160deg, var(--card), var(--secondary))" }}
      >
        <div className="flex flex-col items-center gap-3.5 px-5 py-12 text-center sm:px-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <Binoculars className="h-3.5 w-3.5" aria-hidden="true" />
            Competitive Edge
          </span>
          <h2 id="edge-heading" className="max-w-lg text-balance font-display text-3xl font-extrabold sm:text-4xl">
            {SHOWCASE.heading}
          </h2>
          <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">{SHOWCASE.body}</p>
          <img
            src={SHOWCASE.image}
            alt={SHOWCASE.alt}
            className="mt-4 w-full max-w-[640px] rounded-2xl border border-border"
            loading="lazy"
          />
          {SHOWCASE.caption && <p className="-mt-1 text-xs text-muted-foreground">{SHOWCASE.caption}</p>}
          <button
            type="button"
            onClick={onTry}
            className="mt-1 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "var(--gradient-primary)" }}
          >
            See what your competitors are doing
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
