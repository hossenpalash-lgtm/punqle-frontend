// A "moving" element like the old ToolMarquee, reimagined per founder
// feedback: real generated ads + a real actor photo scrolling past,
// instead of a row of plain tool-name text pills — proof, not a feature
// list. Reuses the exact seamless-loop technique already proven in
// ToolMarquee.tsx (track holds the set twice, translateX(-50%), see
// styles.css's .animate-marquee-left/-right), including its
// prefers-reduced-motion handling (.marquee-set).
//
// 2026-09-24 revision — founder feedback on v1: it moved edge-to-edge
// across the full viewport, which meant (at real desktop widths) most of
// both duplicated copies of the set were visible on screen at once,
// reading as "the same photos twice" in a static glance rather than an
// infinite loop. Fixed by containing the strip to the page's own content
// column (matching every other section here) instead of full-bleed, and
// trimming each row to a smaller, more deliberately curated set — at
// this width the two copies genuinely don't both fit on screen together.
type FilmCard = { image: string; caption: string; tall?: boolean };

const ROW_1: FilmCard[] = [
  { image: "/showcase-ads/skincare.jpg", caption: "Skincare — Image Ad" },
  { image: "/showcase-ads/fashion.jpg", caption: "Fashion — Image Ad" },
  { image: "/showcase-ads/product-showcase-poster.jpg", caption: "Product Showcase — Video" },
  { image: "/showcase-ads/home.jpg", caption: "Home — Image Ad" },
  { image: "/showcase-ads/fitness.jpg", caption: "Fitness — Image Ad" },
];

const ROW_2: FilmCard[] = [
  { image: "/actors/face1.jpg", caption: "Real, filmed actor", tall: true },
  { image: "/actors/liam.jpg", caption: "Liam — Car", tall: true },
  { image: "/actors/ethan.jpg", caption: "Ethan — Bedroom", tall: true },
];

function FilmCardEl({ image, caption, tall }: FilmCard) {
  return (
    <div
      className={["relative shrink-0 overflow-hidden rounded-2xl", tall ? "h-[138px] w-[110px]" : "h-[124px] w-[168px]"].join(" ")}
      style={{ boxShadow: "0 6px 18px oklch(0.2 0.01 260 / 10%)" }}
    >
      <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
      <div
        className="absolute inset-x-0 bottom-0 border-t px-3 py-2 backdrop-blur-md"
        style={{ background: "oklch(0.1 0.01 260 / 42%)", borderColor: "oklch(1 0 0 / 14%)" }}
      >
        <span className="text-[11.5px] font-semibold text-white">{caption}</span>
      </div>
    </div>
  );
}

function FilmRow({ cards, reverse, durationS }: { cards: FilmCard[]; reverse?: boolean; durationS: number }) {
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <div
        className={`flex w-max gap-3.5 ${reverse ? "animate-marquee-right" : "animate-marquee-left"}`}
        style={{ animationDuration: `${durationS}s` }}
      >
        <div className="marquee-set contents">
          {cards.map((c, i) => (
            <FilmCardEl key={`a-${i}`} {...c} />
          ))}
        </div>
        <div className="marquee-set contents" aria-hidden="true">
          {cards.map((c, i) => (
            <FilmCardEl key={`b-${i}`} {...c} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RealFilmstrip() {
  return (
    <section className="relative z-10 mx-auto mt-14 w-full max-w-4xl px-1">
      <div
        className="overflow-hidden rounded-[26px] border border-border py-8"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* marquee-pausable: hover/focus pauses both rows — WCAG 2.2.2
            (pause on moving content), and lets a visitor actually read a
            caption instead of it sliding past. */}
        <div className="marquee-pausable flex flex-col gap-3.5">
          <FilmRow cards={ROW_1} durationS={30} />
          <FilmRow cards={ROW_2} reverse durationS={26} />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Real generated ads and a real filmed actor — not stock photos.
        </p>
      </div>
    </section>
  );
}
