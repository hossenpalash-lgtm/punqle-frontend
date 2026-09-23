import { BadgeCheck } from "lucide-react";

// Dedicated spotlight for Punqle's real differentiator (real filmed
// footage + AI face/product swap + per-business redub) — no competitor
// page has this content, since it's Punqle's own unusual pipeline.
// Grounded in a real actor photo (Maya, public/actors/maya.jpg), not an
// abstract icon, per founder feedback to express features through real
// image/video/actor content wherever possible.
const STEPS = [
  {
    n: "01",
    title: "Film once",
    body: "We film a real actor, once, in a real setting — a kitchen, a car, a living room.",
  },
  {
    n: "02",
    title: "Swap the scene",
    body: "AI matches your product into that same real footage — no reshoot, no green screen.",
  },
  {
    n: "03",
    title: "Redub your words",
    body: "Write a script. Punqle redubs it in the actor's own voice — English or বাংলা — for every business that uses that scene.",
  },
];

export function ReadyActorsSection() {
  return (
    <section className="relative left-1/2 z-10 w-screen -translate-x-1/2 bg-secondary px-6 py-20 sm:px-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3.5 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
          <BadgeCheck className="h-3.5 w-3.5" />
          The Punqle difference
        </span>
        <h2 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
          One real actor. <span className="italic">Every business.</span>
        </h2>
        <p className="max-w-md text-[15.5px] leading-relaxed text-muted-foreground">
          Most AI ad tools give you a synthetic avatar. Punqle starts with a real filmed person.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 items-center gap-10 sm:grid-cols-[280px_1fr]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[22px]" style={{ boxShadow: "var(--shadow-card)" }}>
          <img src="/actors/maya.jpg" alt="Maya, a real filmed Punqle actor" className="h-full w-full object-cover" />
          <span
            className="absolute bottom-3 left-3 rounded-full border px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
            style={{ background: "oklch(0.1 0.01 260 / 45%)", borderColor: "oklch(1 0 0 / 16%)" }}
          >
            Maya — real, filmed once
          </span>
        </div>
        <div className="flex flex-col gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col gap-1.5">
              <span className="font-display text-sm font-bold text-accent">{s.n}</span>
              <h3 className="text-[19px] font-semibold">{s.title}</h3>
              <p className="text-[14.5px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
