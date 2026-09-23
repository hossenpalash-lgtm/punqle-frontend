import { Binoculars, Calendar, Lightbulb, TrendingUp } from "lucide-react";

// Positions Punqle as an ongoing marketing partner, not a one-off
// generator. "One-tap Publish" moved out to its own PublishSection
// (bigger spotlight, founder's own follow-up ask) — kept out of this
// grid too, rather than shown in both places.
const ITEMS = [
  { icon: Calendar, label: "Weekly Plan", desc: "A week of ready-to-post content, planned for you." },
  { icon: Binoculars, label: "Competitive Edge", desc: "See what's working for your competitors on Instagram." },
  { icon: TrendingUp, label: "Performance", desc: "Real numbers on how your posts actually did." },
];

export function BeyondTheAd() {
  return (
    <section className="relative z-10 mx-auto mt-20 w-full max-w-5xl px-1">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
          <Lightbulb className="h-3.5 w-3.5" />
          Not just a generator
        </span>
        <h2 className="max-w-md text-balance font-display text-3xl font-extrabold sm:text-4xl">
          Plan, publish, and see what worked.
        </h2>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ITEMS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-6">
            <Icon className="h-[26px] w-[26px] text-accent" strokeWidth={1.6} />
            <h3 className="text-[16.5px] font-semibold">{label}</h3>
            <p className="text-[13.5px] leading-snug text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
