import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// One sideways-scrolling row of medium-size picture cards (2026-11-11, founder: like Creatify's, "scroll right and
// left, medium size, not too big"). Replaces the big grids on Image Ad and Video Ad so the whole choice sits in one
// short row and the page below it comes into view without scrolling.
//   - touch: swipe; mouse: the arrow buttons, the trackpad or shift + wheel; keyboard: Tab moves between cards
//     and the browser scrolls the focused card into view
//   - the next card is always peeking in at the edge, so it is obvious the row moves
//   - picking a card that is half hidden scrolls it fully into view
// Phone widths leave the next card visibly peeking (about 2 cards + a sliver); wider screens get the medium 156 px card.
const CARD_WIDTH = "w-[120px] min-[400px]:w-[132px] sm:w-[156px]";

// `cardWidth` lets another row (the home screen's "Unlock the premium features") use bigger cards with the same
// scrolling behaviour; `noun` names what the arrows move ("styles" by default).
export function StyleCarousel({
  label,
  children,
  cardWidth = CARD_WIDTH,
  noun = "styles",
}: {
  label: string;
  children: ReactNode;
  cardWidth?: string;
  noun?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, children]);

  const smooth = () => {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    } catch {
      return "smooth";
    }
  };
  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: smooth() as ScrollBehavior });
  };

  // Soft fade where more cards are hidden (works on any background, light or dark).
  const mask =
    canLeft || canRight
      ? `linear-gradient(to right, ${canLeft ? "transparent 0, #000 28px" : "#000 0"}, ${canRight ? "#000 calc(100% - 44px), transparent 100%" : "#000 100%"})`
      : undefined;

  return (
    <div className="relative w-full">
      <div
        ref={scroller}
        role="group"
        aria-label={label}
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto"
        onClickCapture={(e) => {
          // a card the customer picks slides fully into view (sideways only)
          const cell = (e.target as HTMLElement).closest("[data-carousel-cell]");
          cell?.scrollIntoView({ behavior: smooth() as ScrollBehavior, inline: "nearest", block: "nearest" });
        }}
      >
        {Children.map(children, (child) => (
          <div data-carousel-cell className={`${cardWidth} shrink-0 snap-start text-left last:snap-end [&>button]:h-full [&>button]:w-full`}>
            {child}
          </div>
        ))}
      </div>
      {canLeft && (
        <button
          type="button"
          aria-label={`Show earlier ${noun}`}
          onClick={() => page(-1)}
          className="absolute left-1 top-[calc(50%-18px)] z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:flex"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label={`Show more ${noun}`}
          onClick={() => page(1)}
          className="absolute right-1 top-[calc(50%-18px)] z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:flex"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
