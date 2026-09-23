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
//
// 2026-09-24 (same day, later) — this row is the growing full-actor-
// roster showcase (distinct from FormatSwitcher/ReadyActorsSection's
// single featured pick, currently face3): founder asked to add the
// other 2 locked "gents" faces here (face5/face6), on top of what was
// already here, with more to be added as the roster grows. face1
// stays too — she's not the featured hero anymore, but she's still a
// real, locked actor worth showing in the roster.
//
// 2026-09-24 (same day, later still) — ROW_1 rebuilt per founder
// feedback that the old set (5 flat product-on-a-surface photos) was
// "boring" and repetitive. Two rounds of guidance converged on this:
// rather than more generic lifestyle photos, each card should stand
// for one of Punqle's actual formats — Try-On, Carousel, Video —
// plus real, fascinating action shots (the founder's own example was
// "a fisherman catching fish" — i.e. a real person mid-action, not a
// product sitting still). video/stack let one card autoplay a real
// clip or show a fanned mini-stack, same pattern FormatSwitcher.tsx
// already uses for its own Video/Carousel panels.
type FilmCard = { image: string; caption: string; tall?: boolean; video?: string; stack?: string[] };

const ROW_1: FilmCard[] = [
  { image: "/showcase-ads/tryon-result.jpg", caption: "Try-On — Real result" },
  {
    image: "/showcase-ads/food.jpg",
    stack: ["/showcase-ads/food.jpg", "/showcase-ads/fashion.jpg"],
    caption: "Carousel — Auto-designed",
  },
  { image: "/showcase-ads/product-showcase-poster.jpg", video: "/showcase-ads/product-showcase.mp4", caption: "Video Ad" },
  { image: "/showcase-ads/coffee-pour.jpg", caption: "Real, dynamic moments" },
  { image: "/showcase-ads/sneaker-lace.jpg", caption: "Image Ad — real moment" },
];

const ROW_2: FilmCard[] = [
  { image: "/actors/face1.jpg", caption: "Real, filmed actor", tall: true },
  { image: "/actors/liam.jpg", caption: "Liam — Car", tall: true },
  { image: "/actors/ethan.jpg", caption: "Ethan — Bedroom", tall: true },
  { image: "/actors/face5.jpg", caption: "Real, filmed actor", tall: true },
  { image: "/actors/face6.jpg", caption: "Real, filmed actor", tall: true },
];

function FilmCardEl({ image, caption, tall, video, stack }: FilmCard) {
  return (
    <div
      className={["relative shrink-0 overflow-hidden rounded-2xl", tall ? "h-[138px] w-[110px]" : "h-[124px] w-[168px]"].join(" ")}
      style={{ boxShadow: "0 6px 18px oklch(0.2 0.01 260 / 10%)" }}
    >
      {video ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={video} poster={image} autoPlay muted loop playsInline className="h-full w-full object-cover" />
      ) : stack ? (
        <div className="flex h-full w-full items-center justify-center gap-1" style={{ background: "oklch(0.1 0.01 260)" }}>
          {stack.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className="h-[92px] w-[58px] shrink-0 rounded-lg border border-white/15 object-cover"
              style={{ marginLeft: i === 0 ? 0 : "-22px", transform: `rotate(${(i === 0 ? -6 : 6)}deg)`, zIndex: i }}
            />
          ))}
        </div>
      ) : (
        <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
      )}
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
