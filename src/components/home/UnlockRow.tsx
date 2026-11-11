import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { StyleCarousel } from "@/components/ads/StyleCarousel";

// "Unlock the premium features" (2026-11-12, founder): the row a visitor sees right after the free video test and the
// post. It tells the rest of Punqle as a short story, one sideways row of boxes, each box the answer to a problem the
// visitor has at that moment:
//   1 Make that video better  ->  2 More kinds of video from the same photo  ->  3 No good photo yet?  ->  4 Keep going every week
// The order goes from "the thing you just did" to "what a business needs next", and inside each chapter from the tools
// most businesses need to the ones only some do (Show Your App and Try-On come last in chapter 2).
// A box only opens that tool; it starts nothing and costs nothing. For people who already pay the same row is simply
// "More from Punqle" with no padlocks and no plan box.
// Real clips play (silent, once the box is hovered or focused) only where a real clip of that very tool exists; the
// other boxes stay still pictures on purpose, so no box promises something it does not show.

export type UnlockTarget =
  | "video"
  | "product"
  | "actors"
  | "unboxing"
  | "show_app"
  | "tryon"
  | "image"
  | "upscale"
  | "plan"
  | "performance"
  | "billing";

type Chapter = 0 | 1 | 2 | 3;

const CHAPTERS: { name: string; tone: string }[] = [
  { name: "Make that video better", tone: "bg-emerald-100 text-emerald-800" },
  { name: "More kinds of video from the same photo", tone: "bg-blue-100 text-blue-800" },
  { name: "No good photo yet?", tone: "bg-amber-100 text-amber-900" },
  { name: "Keep going every week", tone: "bg-rose-100 text-rose-800" },
];

interface Item {
  target: UnlockTarget;
  chapter: Chapter;
  problem: string;
  name: string;
  blurb: string;
  image?: string;
  clip?: string;
  chip?: string;
  picture?: "sharpen" | "week";
  focus?: string; // where a wide picture is cropped from (a Tailwind object-position class), default top
}

// Credit chips only where the app itself already states a "from N credits" price.
const ITEMS: Item[] = [
  { target: "video", chapter: 0, problem: "Only 4 seconds, with a watermark?", name: "Full video", blurb: "Up to 30 s, 1080p, no watermark. 3 engines and the Enhancer.", image: "/demo/engine-compare-poster.jpg", clip: "/demo/engine-compare.mp4", chip: "from 15 credits" },
  { target: "product", chapter: 1, problem: "Want a person showing your product?", name: "Product", blurb: "Someone holds it and talks about it.", image: "/video-style-previews/cinematic_ugc.jpg", clip: "/video-style-previews/cinematic_ugc.mp4", chip: "from 3 credits" },
  { target: "actors", chapter: 1, problem: "Don't want to be on camera yourself?", name: "Ready Actors", blurb: "A real filmed actor says your words.", image: "/video-style-previews/ai_actor.jpg", clip: "/video-style-previews/ai_actor.mp4", chip: "from 30 credits" },
  { target: "unboxing", chapter: 1, problem: "Selling something people open?", name: "Unboxing", blurb: "Hands open your product on camera.", image: "/showcase-ads/product-in-hand.jpg" },
  { target: "show_app", chapter: 1, problem: "Have an app or a website?", name: "Show Your App", blurb: "Your screen, on a phone, in a hand.", image: "/showcase-ads/saas.jpg" },
  { target: "tryon", chapter: 1, problem: "Selling clothes?", name: "Try-On", blurb: "Your clothes on a model, then bring it to life.", image: "/showcase-ads/tryon-result.jpg", chip: "from 2 credits" },
  { target: "image", chapter: 2, problem: "Nothing to start from?", name: "Image", blurb: "Studio ad images from one line.", image: "/home/image.jpg", chip: "from 2 credits" },
  { target: "upscale", chapter: 2, problem: "Photo or clip a bit blurry?", name: "Upscale", blurb: "Sharpen it to 1080p or 4K.", image: "/examples/jewellery.jpg", picture: "sharpen" },
  { target: "plan", chapter: 3, problem: "Can't keep posting every week?", name: "Weekly Plan", blurb: "A week of posts planned for you, then posted.", picture: "week" },
  { target: "performance", chapter: 3, problem: "What works, and what do others do?", name: "Performance and Competitive Edge", blurb: "Your real numbers, and what your competitors post.", image: "/demo/competitive-edge.jpg", focus: "object-left-top" },
];

const WEEK_TILES = [
  { day: "Mon", image: "/thumbs/food.jpg" },
  { day: "Tue", image: "/thumbs/skincare.jpg" },
  { day: "Wed", image: "/thumbs/fitness.jpg" },
  { day: "Thu", image: "/thumbs/coffee-pour.jpg" },
  { day: "Fri", image: "/thumbs/fashion.jpg" },
  { day: "Sat", image: "/thumbs/home.jpg" },
];

const PLANS = [
  { name: "Starter", price: "A$5.99", credits: 30 },
  { name: "Growth", price: "A$19", credits: 110 },
  { name: "Pro", price: "A$44.99", credits: 300 },
];

const CARD_WIDTH = "w-[172px] min-[400px]:w-[184px] sm:w-[200px]";
const PICTURE_HEIGHT = "h-[128px] sm:h-[140px]";

// The still picture, with an optional silent clip over it that plays while the box is hovered or focused. The clip file is
// asked for only the first time it is needed, and never for people who ask their device for less motion.
function BoxPicture({ item, active, locked }: { item: Item; active: boolean; locked: boolean }) {
  const [wanted, setWanted] = useState(false);
  const [running, setRunning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!item.clip) return;
    if (active) {
      try {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      } catch {
        /* no matchMedia: carry on */
      }
      setWanted(true);
    }
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
      setRunning(false);
    }
  }, [active, wanted, item.clip]);

  return (
    <span className={["relative block w-full overflow-hidden bg-secondary", PICTURE_HEIGHT].join(" ")}>
      {item.picture === "week" ? (
        <span className="grid h-full w-full grid-cols-3 grid-rows-2 gap-1 bg-secondary p-1.5">
          {WEEK_TILES.map((t) => (
            <span key={t.day} className="relative overflow-hidden rounded-md">
              <img src={t.image} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute left-1 top-0.5 text-[10px] font-bold leading-none text-white [text-shadow:0_1px_2px_rgb(0_0_0/70%)]">{t.day}</span>
            </span>
          ))}
        </span>
      ) : (
        <>
          <img src={item.image} alt="" loading="lazy" className={["h-full w-full object-cover", item.focus ?? "object-top"].join(" ")} />
          {item.picture === "sharpen" && (
            <>
              {/* the left half is softened, the right half is left sharp: what Upscale does, drawn with the same photo */}
              <img
                src={item.image}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full scale-110 object-cover object-top blur-[5px] [clip-path:inset(0_50%_0_0)]"
              />
              <span className="absolute inset-y-0 left-1/2 w-px bg-white/90" />
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold leading-none text-white">Before</span>
              <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold leading-none text-white">After</span>
            </>
          )}
        </>
      )}
      {item.clip && wanted && (
        <video
          ref={videoRef}
          src={item.clip}
          poster={item.image}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          onPlaying={() => setRunning(true)}
          className={["absolute inset-0 h-full w-full object-cover transition-opacity duration-200", running ? "opacity-100" : "opacity-0"].join(" ")}
        />
      )}
      {locked && (
        <span className="glass-chip absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full">
          <Lock className="h-3 w-3" aria-hidden="true" />
        </span>
      )}
      {item.chip && <span className="glass-chip absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold">{item.chip}</span>}
    </span>
  );
}

function UnlockBox({ item, locked, onPick }: { item: Item; locked: boolean; onPick: (t: UnlockTarget) => void }) {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onPick(item.target)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[18px] border border-border bg-card text-left transition-colors hover:border-foreground/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <BoxPicture item={item} active={active} locked={locked} />
      <span className="flex flex-1 flex-col gap-1 px-3 pb-3.5 pt-2.5">
        <span className="min-h-[32px] text-[12px] leading-snug text-muted-foreground">{item.problem}</span>
        <span className="font-display text-[15px] leading-tight text-foreground">{item.name}</span>
        <span className="text-[12px] leading-snug text-muted-foreground">{item.blurb}</span>
      </span>
    </button>
  );
}

function PlanBox({ onPick }: { onPick: (t: UnlockTarget) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick("billing")}
      className="flex min-h-0 w-full flex-1 flex-col justify-between gap-3 rounded-[18px] bg-foreground p-4 text-left text-background transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span>
        <span className="block text-[12px] leading-snug text-background/70">Ready to open all of this?</span>
        <span className="mt-1 block font-display text-[19px] leading-tight">Pick a plan</span>
      </span>
      <span className="flex flex-col">
        {PLANS.map((p) => (
          <span key={p.name} className="flex items-center justify-between gap-2 border-t border-background/20 py-1.5 text-[13px]">
            <span className="font-semibold">{p.name}</span>
            <span className="flex flex-col items-end leading-tight">
              <span className="font-semibold">{p.price}/mo</span>
              <span className="text-[11px] text-background/70">{p.credits} credits</span>
            </span>
          </span>
        ))}
      </span>
      <span className="rounded-full bg-accent px-4 py-2 text-center text-[13px] font-bold text-white">See plans</span>
    </button>
  );
}

export function UnlockRow({ subscribed, onPick }: { subscribed: boolean; onPick: (t: UnlockTarget) => void }) {
  const locked = !subscribed;
  return (
    <section className="mb-10 w-full" aria-labelledby="unlock-row-heading">
      <h2 id="unlock-row-heading" className="font-display text-2xl leading-tight text-foreground sm:text-[28px]">
        {locked ? "Unlock the premium features" : "More from Punqle"}
      </h2>
      <p className="mb-4 mt-1 max-w-xl text-sm text-muted-foreground">
        {locked
          ? "Everything Punqle can do, in the order a business needs it. Slide sideways, then tap a box to open that tool."
          : "Slide sideways, then tap a box to open that tool."}
      </p>
      <StyleCarousel label="Punqle tools" cardWidth={CARD_WIDTH} noun="tools">
        {ITEMS.map((item, i) => {
          const first = i === 0 || ITEMS[i - 1].chapter !== item.chapter;
          const chapter = CHAPTERS[item.chapter];
          return (
            <div key={item.target} className="flex h-full flex-col gap-2">
              <span className="block h-6 shrink-0">
                {first && (
                  <span className={["inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-wider", chapter.tone].join(" ")}>
                    {chapter.name}
                  </span>
                )}
              </span>
              <UnlockBox item={item} locked={locked} onPick={onPick} />
            </div>
          );
        })}
        {locked && (
          <div key="plan" className="flex h-full flex-col gap-2">
            <span className="block h-6 shrink-0" />
            <PlanBox onPick={onPick} />
          </div>
        )}
      </StyleCarousel>
    </section>
  );
}
