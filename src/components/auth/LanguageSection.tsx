import { useState } from "react";
import { Globe2 } from "lucide-react";

// A real, concrete demo of the Bangla/English claim instead of just
// stating it — one tap swaps a sample ad's headline between the two
// languages, same "make the claim provable" principle as FormatSwitcher.
const SAMPLES = {
  en: {
    headline: "20% off this week only.",
    sub: "Handmade leather wallets — grab yours before they're gone.",
    font: "var(--font-sans)",
  },
  bn: {
    headline: "এই সপ্তাহে ২০% ছাড়।",
    sub: "হাতে তৈরি চামড়ার মানিব্যাগ — এখনই সংগ্রহ করুন।",
    font: "var(--font-display)",
  },
} as const;

export function LanguageSection() {
  const [lang, setLang] = useState<"en" | "bn">("en");
  const s = SAMPLES[lang];

  return (
    <section className="relative left-1/2 z-10 w-screen -translate-x-1/2 bg-[#050505] px-6 py-20 sm:px-10">
      <div className="mx-auto grid max-w-4xl grid-cols-1 items-center gap-10 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "oklch(0.72 0.14 300)" }}
          >
            <Globe2 className="h-3.5 w-3.5" />
            Built for where your customers actually are
          </span>
          <h2 className="text-balance font-display text-3xl font-extrabold text-white sm:text-[38px]">
            English in the morning.{" "}
            <span className="italic" style={{ color: "oklch(0.78 0.13 300)" }}>
              বাংলা by evening.
            </span>
          </h2>
          <p className="max-w-sm text-[15px] leading-relaxed" style={{ color: "oklch(0.72 0.01 260)" }}>
            Switch the script language with one tap — same actor, same product, same ad, word for word in either language.
          </p>
          <div className="mt-1 flex gap-2.5">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={[
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                lang === "en" ? "text-primary-foreground" : "border border-white/15 text-white hover:bg-white/5",
              ].join(" ")}
              style={lang === "en" ? { background: "var(--gradient-primary)" } : undefined}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang("bn")}
              className={[
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                lang === "bn" ? "text-primary-foreground" : "border border-white/15 text-white hover:bg-white/5",
              ].join(" ")}
              style={lang === "bn" ? { background: "var(--gradient-primary)" } : undefined}
            >
              বাংলা
            </button>
          </div>
        </div>
        <div
          className="flex aspect-[4/5] flex-col justify-end rounded-[22px] border border-white/10 bg-[#0e0e10] p-7"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span className="mb-auto w-fit rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white">
            Made with Punqle
          </span>
          <div>
            <div className="mb-3.5 h-[3px] w-[52px] rounded-full bg-accent" />
            <p className="text-2xl font-bold leading-tight text-white" style={{ fontFamily: s.font }}>
              {s.headline}
            </p>
            <p className="mt-2 text-[13.5px]" style={{ color: "oklch(0.68 0.01 260)" }}>
              {s.sub}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
