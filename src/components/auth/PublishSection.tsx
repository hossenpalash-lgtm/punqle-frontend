import { Facebook, Instagram, Youtube } from "lucide-react";
import { TikTokIcon } from "@/components/TikTokIcon";

// A slim strip, not a full section (founder, 2026-11-09: make it smaller but keep the four logos).
// Reuses the exact brand icons the app itself already uses for these 4 connections (Sidebar.tsx).
// `schedule` is the honest truth about what each platform allows (checked in the backend 2026-11-10): Facebook and YouTube
// can be scheduled ahead (the platform holds the post); Instagram (Meta API limit) and TikTok post the moment you press the button.
const PLATFORMS = [
  { icon: Facebook, label: "Facebook", schedule: true },
  { icon: Instagram, label: "Instagram", schedule: false },
  { icon: TikTokIcon, label: "TikTok", schedule: false },
  { icon: Youtube, label: "YouTube", schedule: true },
];

export function PublishSection() {
  return (
    <section className="relative z-10 mx-auto mt-14 w-full max-w-4xl px-1" aria-label="Publishing">
      <div
        className="flex flex-col items-center justify-between gap-5 rounded-[24px] border border-border px-6 py-6 text-center sm:flex-row sm:px-8 sm:text-left"
        style={{ boxShadow: "var(--shadow-card)", background: "linear-gradient(160deg, var(--card), var(--secondary))" }}
      >
        <div>
          <h2 className="text-balance font-display text-xl font-extrabold sm:text-2xl">
            Plan your week, then publish in one click.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">No exporting, no re-uploading.</p>
        </div>
        <ul className="flex items-center gap-3">
          {PLATFORMS.map(({ icon: Icon, label, schedule }) => (
            <li key={label} className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border backdrop-blur-xl"
                style={{ background: "oklch(1 0 0 / 55%)", boxShadow: "var(--shadow-card)" }}
              >
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
              <span className="-mt-1 text-[10px] text-muted-foreground/80">{schedule ? "Schedule or post" : "Post now"}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
