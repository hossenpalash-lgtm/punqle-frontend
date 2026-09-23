import { BadgeDollarSign } from "lucide-react";

// Real credit tiers (AUD), same numbers already live in the app's own
// Billing panel — an honest affordability signal for small-business
// visitors, not a fabricated "cheaper than X" comparison.
const TIERS = [
  { name: "Starter", price: "$5.99", credits: "30 credits a month", mid: false },
  { name: "Growth", price: "$19", credits: "110 credits a month", mid: true },
  { name: "Pro", price: "$44.99", credits: "300 credits a month", mid: false },
];

export function PricingTeaser() {
  return (
    <section className="relative left-1/2 z-10 w-screen -translate-x-1/2 bg-secondary px-6 py-20 sm:px-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3.5 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
          <BadgeDollarSign className="h-3.5 w-3.5" />
          Priced for small business, not enterprise
        </span>
        <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Start from $5.99 a month.</h2>
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
            <span className="text-[13.5px] text-muted-foreground">{t.credits}</span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">Prices in AUD. No contracts — cancel anytime.</p>
    </section>
  );
}
