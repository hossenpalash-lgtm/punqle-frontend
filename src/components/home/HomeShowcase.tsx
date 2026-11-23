import type { LucideIcon } from "lucide-react";

// The home screen's middle used to be a large empty void between the heading and
// the creation bar. 2026-10-06 (founder: "this page still has no premium feel"):
// after looking at how media-first AI tools (Higgsfield, Krea) fill their home,
// it now shows one row of real example outputs as tool launchers — a photo, a
// frosted-glass caption with the tool's name and what it does, a credit chip and
// a hover lift. Each card only switches the creation bar below to that tool; it
// starts nothing and costs nothing.
export interface ShowcaseCard {
  key: string;
  title: string;
  blurb: string;
  meta: string;
  image: string;
  icon: LucideIcon;
  onClick: () => void;
  // A card with no photo: a soft frosted tile with a few small tool icons (used for "More tools").
  plain?: boolean;
  extras?: LucideIcon[];
}

export function HomeShowcase({ cards }: { cards: ShowcaseCard[] }) {
  return (
    <div className="mx-auto grid w-full max-w-[740px] grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            type="button"
            onClick={c.onClick}
            className="group relative h-[clamp(132px,21vh,190px)] overflow-hidden rounded-3xl text-left transition-transform duration-300 hover:-translate-y-1"
            style={{
              boxShadow:
                "inset 0 1px 0 rgb(255 255 255 / 70%), 0 0 0 1px rgb(255 255 255 / 55%), 0 22px 44px -26px rgb(20 20 30 / 50%)",
            }}
          >
            {c.plain ? (
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-secondary">
                <div className="absolute inset-x-0 top-12 flex flex-wrap justify-center gap-2 px-4">
                  {(c.extras ?? []).slice(0, 6).map((E, i) => (
                    <span key={i} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-foreground shadow-sm">
                      <E className="h-4 w-4" />
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <img
                src={c.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            )}
            {!c.plain && <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/25 to-transparent" />}
            <span className="glass-chip absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full">
              <Icon className="h-4 w-4" />
            </span>
            {c.meta && <span className="glass-chip absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold">{c.meta}</span>}
            <div className="glass-caption absolute inset-x-0 bottom-0 min-h-[68px] px-4 py-3">
              <p className="font-display text-[16px] leading-tight text-white">{c.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-white/80">{c.blurb}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
