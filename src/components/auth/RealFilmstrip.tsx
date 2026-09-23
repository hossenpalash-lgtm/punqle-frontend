// A "moving" element like the old ToolMarquee, reimagined per founder
// feedback: real generated ads + real actor photos scrolling past,
// instead of a row of plain tool-name text pills — proof, not a feature
// list. Reuses the exact seamless-loop technique already proven in
// ToolMarquee.tsx (track holds the set twice, translateX(-50%), see
// styles.css's .animate-marquee-left/-right) rather than inventing a new
// one, including its prefers-reduced-motion handling (.marquee-set).
type FilmCard = { image: string; caption: string; tall?: boolean };

const ROW_1: FilmCard[] = [
  { image: "/showcase-ads/skincare.jpg", caption: "Skincare — Image Ad" },
  { image: "/showcase-ads/food.jpg", caption: "Bakery — Image Ad" },
  { image: "/showcase-ads/fashion.jpg", caption: "Fashion — Image Ad" },
  { image: "/showcase-ads/home.jpg", caption: "Home — Image Ad" },
  { image: "/showcase-ads/saas.jpg", caption: "SaaS — Image Ad" },
  { image: "/showcase-ads/fitness.jpg", caption: "Fitness — Image Ad" },
  { image: "/showcase-ads/product-showcase-poster.jpg", caption: "Product Showcase — Video" },
];

const ROW_2: FilmCard[] = [
  { image: "/actors/maya.jpg", caption: "Maya — Kitchen", tall: true },
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
    <section className="relative left-1/2 z-10 mt-14 w-screen -translate-x-1/2 border-y border-border bg-secondary py-9">
      <div className="flex flex-col gap-3.5">
        <FilmRow cards={ROW_1} durationS={46} />
        <FilmRow cards={ROW_2} reverse durationS={40} />
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Real generated ads and real filmed actors — not stock photos.</p>
    </section>
  );
}
