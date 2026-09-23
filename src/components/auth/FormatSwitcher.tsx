import { useState } from "react";
import { GalleryHorizontalEnd, Shirt, Sparkles, User, Video } from "lucide-react";

// Hero's interactive proof panel — an iOS-style segmented control (light
// capsule track, solid-white active segment) switching a real photo +
// real copy below it, replacing the old generic "format dropdown" mockup
// (borrowed from a reference site) with Punqle's own actual home-bar
// concept. Every photo here is a real Punqle asset (public/showcase-ads,
// public/actors) — same "proof, not a fabricated demo" bar RealAdShowcase
// already holds itself to.
type FormatKey = "actors" | "video" | "image" | "tryon" | "carousel";

const FORMATS: Record<
  FormatKey,
  {
    label: string;
    icon: typeof User;
    tag: string;
    headline: string;
    desc: string;
    credit: string;
    image: string;
    // Set only for the Video panel — plays the real clip instead of a
    // static poster, since a "Video Ad" format should actually show
    // motion, not a still frame pretending to be one.
    video?: string;
    // object-position for the panel's photo — most images here are
    // already landscape e-commerce shots, so plain "center" covers them
    // fine. Maya's real headshot is a square photo forced into a very
    // wide panel, and centering it cropped straight to her mouth/chin —
    // biased up here so the visible band lands on her eyes instead.
    focal?: string;
    // Set only for Carousel — a fanned stack of real slides instead of
    // one full-bleed photo, since a single background image doesn't
    // read as "multiple slides" the way the actual feature produces.
    // `image` still needs a value (used as the dark side's flat tint).
    stack?: string[];
  }
> = {
  actors: {
    label: "Ready Actors",
    icon: User,
    tag: "READY ACTORS",
    headline: "A real actor says your words.",
    desc: "Pick a filmed actor, write your script, and Punqle redubs it in their own voice.",
    credit: "30 credits",
    // face3's own composition sits lower/closer than face1's did (more
    // hair up top, face centered further down the frame) — re-measured
    // for this panel's real ~4:1 crop window rather than reusing
    // face1's tuned value, which landed on her hairline instead of her
    // smile.
    image: "/actors/face3.jpg",
    focal: "50% 45%",
  },
  video: {
    label: "Video",
    icon: Video,
    tag: "VIDEO AD",
    headline: "Cinematic, lifestyle, or UGC — you pick the style.",
    desc: "Product Showcase, Lifestyle, Cinematic UGC and AI Presenter styles, all from one prompt.",
    credit: "4–46 credits",
    image: "/showcase-ads/product-showcase-poster.jpg",
    video: "/showcase-ads/product-showcase.mp4",
  },
  image: {
    label: "Image",
    icon: Sparkles,
    tag: "IMAGE AD",
    headline: "One product photo, a goal-driven ad.",
    desc: "Pick Sales, Leads, Traffic or Bookings — Punqle writes the copy and builds the creative to match.",
    credit: "1 credit",
    // A real hands-holding-product shot reads as "real ad" far better
    // than a product sitting alone on a surface — founder's own ask.
    image: "/showcase-ads/product-in-hand.jpg",
    focal: "70% 40%",
  },
  tryon: {
    label: "Try-On",
    icon: Shirt,
    tag: "TRY-ON",
    headline: "See it on a real person before you shoot.",
    desc: "Upload a photo and a garment — Punqle shows exactly how it looks worn, in seconds.",
    credit: "2 credits",
    // A real Try-On OUTPUT (garment actually worn) instead of the bare
    // garment alone — the feature's whole point is seeing it worn.
    image: "/showcase-ads/tryon-result.jpg",
  },
  carousel: {
    label: "Carousel",
    icon: GalleryHorizontalEnd,
    tag: "CAROUSEL",
    headline: "One topic. A full carousel, auto-designed.",
    desc: "Punqle plans 3–6 sequenced slides — hook, feature, proof, offer — and generates every image.",
    credit: "3–6 credits",
    image: "/showcase-ads/food.jpg",
    stack: ["/showcase-ads/food.jpg", "/showcase-ads/fashion.jpg", "/showcase-ads/skincare.jpg"],
  },
};

const ORDER: FormatKey[] = ["actors", "video", "image", "tryon", "carousel"];

export function FormatSwitcher() {
  const [active, setActive] = useState<FormatKey>("actors");
  const f = FORMATS[active];

  return (
    <div className="w-full max-w-[900px]">
      <div className="mb-5 flex justify-center">
        <div
          className="inline-flex gap-1 rounded-full border border-border p-1.5 backdrop-blur-xl"
          style={{ background: "oklch(0.96 0.003 260 / 65%)" }}
        >
          {ORDER.map((key) => {
            const opt = FORMATS[key];
            const Icon = opt.icon;
            const selected = active === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                className={[
                  "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition-colors",
                  selected ? "bg-card text-foreground" : "text-secondary-foreground hover:text-foreground",
                ].join(" ")}
                style={selected ? { boxShadow: "var(--shadow-card)" } : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[26px]" style={{ boxShadow: "var(--shadow-card)", minHeight: "220px" }}>
        {f.stack ? (
          // Carousel — a fanned stack of real slides, not one photo, so
          // it actually reads as "multiple slides" at a glance.
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, oklch(0.1 0.01 260), oklch(0.18 0.01 260))" }}
          />
        ) : f.video ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={f.video}
            src={f.video}
            poster={f.image}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          />
        ) : (
          <img
            src={f.image}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover"
            style={{ objectPosition: f.focal ?? "center" }}
          />
        )}
        {f.stack && (
          <div className="absolute inset-y-0 right-6 hidden items-center sm:flex sm:right-10">
            {f.stack.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className="h-[150px] w-[120px] shrink-0 rounded-2xl border-2 border-white/20 object-cover"
                style={{
                  marginLeft: i === 0 ? 0 : "-64px",
                  transform: `rotate(${(i - 1) * 7}deg)`,
                  boxShadow: "0 10px 24px oklch(0 0 0 / 35%)",
                  zIndex: i,
                }}
              />
            ))}
          </div>
        )}
        {!f.stack && (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, oklch(0.08 0.01 260 / 82%) 0%, oklch(0.08 0.01 260 / 55%) 55%, oklch(0.08 0.01 260 / 25%) 100%)",
            }}
          />
        )}
        <div className="relative max-w-[540px] p-7 text-left sm:p-8">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.82 0.09 300)" }}>
            {f.tag}
          </div>
          <h3 className="font-display mb-1.5 text-xl font-bold text-white">{f.headline}</h3>
          <p className="text-[14.5px] leading-relaxed" style={{ color: "oklch(0.87 0.01 260)" }}>
            {f.desc}
          </p>
          <div
            className="mt-4 inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
            style={{ background: "oklch(1 0 0 / 16%)", borderColor: "oklch(1 0 0 / 24%)" }}
          >
            {f.credit}
          </div>
        </div>
      </div>
    </div>
  );
}
