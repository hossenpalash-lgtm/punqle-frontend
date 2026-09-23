import { Facebook, Instagram, Send, Youtube } from "lucide-react";
import { TikTokIcon } from "@/components/TikTokIcon";

// Founder's own follow-up ask: give the 4-platform autopost capability
// its own real spotlight instead of being one small card among four in
// BeyondTheAd. Reuses the exact brand icons the app itself already uses
// for these 4 connections (Sidebar.tsx) rather than drawing new ones.
const PLATFORMS = [
  { icon: Facebook, label: "Facebook" },
  { icon: Instagram, label: "Instagram" },
  { icon: TikTokIcon, label: "TikTok" },
  { icon: Youtube, label: "YouTube" },
];

export function PublishSection() {
  return (
    <section className="relative z-10 mx-auto mt-20 w-full max-w-4xl px-1">
      <div
        className="overflow-hidden rounded-[28px] border border-border"
        style={{ boxShadow: "var(--shadow-card)", background: "linear-gradient(160deg, var(--card), var(--secondary))" }}
      >
        <div className="flex flex-col items-center gap-3.5 px-6 py-14 text-center sm:px-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <Send className="h-3.5 w-3.5" />
            One tap, four platforms
          </span>
          <h2 className="max-w-md text-balance font-display text-3xl font-extrabold sm:text-4xl">
            Publish straight to where your customers already are.
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
            No exporting, no re-uploading. Punqle posts your finished ad directly — same click, four places.
          </p>
          <div className="mt-5 flex items-center gap-4">
            {PLATFORMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border backdrop-blur-xl"
                  style={{ background: "oklch(1 0 0 / 55%)", boxShadow: "var(--shadow-card)" }}
                >
                  <Icon className="h-6 w-6 text-foreground" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
