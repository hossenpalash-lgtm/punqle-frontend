import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { previewAsset } from "@/lib/preview-assets";

// The home screen's middle used to be a large empty void between the heading and
// the creation bar. 2026-10-06 (founder: "this page still has no premium feel"):
// after looking at how media-first AI tools (Higgsfield, Krea) fill their home,
// it now shows one row of real example outputs as tool launchers — a photo, a
// frosted-glass caption with the tool's name and what it does, a credit chip and
// a hover lift. Each card only switches the creation bar below to that tool; it
// starts nothing and costs nothing. 2026-11-24: the hover is now clearly visible
// (rise + deeper shadow + photo zoom + arrow chip + hand cursor, see .tool-card in styles.css),
// and (founder: "can the boxes play a video when hovered?") a card can come alive while hovered or focused:
// a short silent clip (`clip`) or a few real looks that fade into each other (`frames`). Same method as the
// "Unlock the premium features" boxes (UnlockRow): the clip is fetched only once the page has been idle on a
// device that has a mouse, it plays muted and loops only while the card is hovered or focused, it rewinds when the
// mouse leaves, and nothing moves for people who ask their device for less motion.
export interface ShowcaseCard {
  key: string;
  title: string;
  blurb: string; // not drawn (the step strip above the cards already says it, founder 2026-11-24); read out by screen readers
  meta: string;
  image: string;
  icon: LucideIcon;
  onClick: () => void;
  clip?: string; // a short silent clip made from the card's own picture, played while hovered
  frames?: string[]; // real samples that fade into each other while hovered (frames[0] is the resting picture)
  position?: string; // which part of a taller/wider picture stays in view (CSS object-position), default centre
  // A card with no photo: a soft frosted tile with a few small tool icons (used for "More tools").
  plain?: boolean;
  extras?: LucideIcon[];
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      /* no matchMedia: keep the motion */
    }
  }, []);
  return reduced;
}

// True once the page has been idle and this device has a mouse (hover) and no "save data" request: the moment it is worth
// fetching the hover clips, so the first hover plays at once instead of waiting for a download.
function useWarmAssets(): boolean {
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    let cancelled = false;
    try {
      const hasMouse = window.matchMedia("(hover: hover)").matches;
      const saver = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true;
      if (!hasMouse || saver) return;
    } catch {
      return;
    }
    const go = () => {
      if (!cancelled) setWarm(true);
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(go);
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const t = setTimeout(go, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);
  return warm;
}

function ShowcaseButton({ card, warm }: { card: ShowcaseCard; warm: boolean }) {
  const Icon = card.icon;
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(false);
  const [running, setRunning] = useState(false);
  const [frame, setFrame] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const motion = active && !reduced;

  // The clip plays from the start while hovered / focused and rewinds when the mouse leaves.
  useEffect(() => {
    const v = videoRef.current;
    if (!card.clip || !v) return;
    if (motion) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
      setRunning(false);
    }
  }, [motion, card.clip, warm]);

  // Real samples take turns while hovered.
  useEffect(() => {
    const frames = card.frames;
    if (!frames) return;
    if (!motion) {
      setFrame(0);
      return;
    }
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 900);
    return () => clearInterval(t);
  }, [motion, card.frames]);

  const zoom = "transition-transform duration-700 group-hover:scale-[1.09] group-focus-visible:scale-[1.09] motion-reduce:transition-none motion-reduce:group-hover:scale-100";
  return (
    <button
      type="button"
      onClick={card.onClick}
      aria-label={`${card.title}: ${card.blurb}`}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className="tool-card group relative h-[clamp(108px,16vh,146px)] overflow-hidden rounded-3xl text-left"
    >
      {card.plain ? (
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-secondary">
          <div className="absolute right-3 top-3 flex gap-1.5">
            {(card.extras ?? []).slice(0, 3).map((E, i) => (
              <span
                key={i}
                className="tool-card-extra flex h-7 w-7 items-center justify-center rounded-xl bg-white/80 text-foreground shadow-sm"
                style={{ transitionDelay: `${i * 45}ms` }}
              >
                <E className="h-3.5 w-3.5" />
              </span>
            ))}
          </div>
        </div>
      ) : card.frames ? (
        card.frames.map((src, i) => (
          <img
            key={src}
            src={previewAsset(src)}
            alt=""
            loading="lazy"
            style={{ objectPosition: card.position }}
            className={["absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none", i === frame ? "opacity-100" : "opacity-0"].join(" ")}
          />
        ))
      ) : (
        <img src={previewAsset(card.image)} alt="" loading="lazy" style={{ objectPosition: card.position }} className={["absolute inset-0 h-full w-full object-cover", zoom].join(" ")} />
      )}
      {card.clip && warm && (
        <video
          ref={videoRef}
          src={previewAsset(card.clip)}
          poster={previewAsset(card.image)}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          style={{ objectPosition: card.position }}
          onPlaying={() => setRunning(true)}
          className={["absolute inset-0 h-full w-full object-cover transition-opacity duration-200", running ? "opacity-100" : "opacity-0"].join(" ")}
        />
      )}
      {!card.plain && <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/25 to-transparent" />}
      <span className="glass-chip absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full">
        <Icon className="h-4 w-4" />
      </span>
      {card.meta && <span className="glass-chip absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold">{card.meta}</span>}
      <div className="tool-card-caption glass-caption absolute inset-x-0 bottom-0 px-4 py-3">
        <span className="tool-card-arrow glass-chip-light absolute right-3 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-foreground">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <p className="font-display text-[16px] leading-tight text-white">{card.title}</p>
      </div>
    </button>
  );
}

export function HomeShowcase({ cards }: { cards: ShowcaseCard[] }) {
  const warm = useWarmAssets();
  return (
    <div className="mx-auto grid w-full max-w-[740px] grid-cols-4 gap-4">
      {cards.map((c) => (
        <ShowcaseButton key={c.key} card={c} warm={warm} />
      ))}
    </div>
  );
}
