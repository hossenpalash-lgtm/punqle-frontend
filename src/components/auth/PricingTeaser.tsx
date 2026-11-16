import { BadgeDollarSign, Clapperboard, Image as ImageIcon } from "lucide-react";

// Real credit tiers (USD), same numbers already live in the app's own
// Billing panel — an honest affordability signal for small-business
// visitors, not a fabricated "cheaper than X" comparison.
// "Credits" mean nothing to a new visitor, so each tier also shows what they buy (founder, 2026-11-10: use a picture, not a paragraph).
// Pricing v2 (2026-11-17): 1 credit is about one image; an "ad" is a 15-second video on Wan 3.0, Kling 4.0 or Seedance 2.5, which all cost
// the same: 25 credits (1.66 credits a second). Rounded DOWN, so the numbers never promise more than the credits can pay for.
const IMAGE_CREDITS = 1;
const AD_CREDITS = 25;
const TIERS = [
  { name: "Starter", price: "$19", credits: 50, mid: false },
  { name: "Growth", price: "$45", credits: 125, mid: true },
  { name: "Pro", price: "$169", credits: 500, mid: false },
];

export function PricingTeaser() {
  return (
    <section className="relative left-1/2 z-10 w-screen -translate-x-1/2 bg-secondary px-6 py-20 sm:px-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3.5 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
          <BadgeDollarSign className="h-3.5 w-3.5" />
          Simple pricing for every business
        </span>
        <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Start from $19 a month.</h2>
      </div>
      <div className="mx-auto mt-11 flex max-w-2xl flex-col gap-4 sm:flex-row">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={[
              "flex flex-1 flex-col gap-1.5 rounded-[20px] border bg-card p-6",
              t.mid ? "border-2 border-foreground" : "border-border",
            ].join(" ")}
          >
            <span
              className={["text-[13px] font-bold uppercase tracking-wider", t.mid ? "text-accent" : "text-muted-foreground"].join(" ")}
            >
              {t.name}
            </span>
            <span className="font-display text-[32px] font-extrabold">
              {t.price}
              <span className="text-sm font-semibold text-muted-foreground">/mo</span>
            </span>
            <ul className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <li className="flex items-center gap-2.5">
                <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>
                  <span className="font-display text-xl font-extrabold">{Math.floor(t.credits / IMAGE_CREDITS)}</span>{" "}
                  <span className="text-sm text-muted-foreground">images</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clapperboard className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>
                  <span className="font-display text-xl font-extrabold">{Math.floor(t.credits / AD_CREDITS)}</span>{" "}
                  <span className="text-sm text-muted-foreground">ads (15-second video)</span>
                </span>
              </li>
            </ul>
            <span className="mt-1 text-[12.5px] text-muted-foreground">{t.credits} credits a month</span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">Prices in USD. No contracts, cancel anytime.</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">Your credits cover images, Try-On, upscaling and video: image 1 credit, Try-On 1, upscale 1, product 2, Competitive Edge 2, video 8 s = 14, 15 s = 25, 30 s = 50.</p>
    </section>
  );
}
