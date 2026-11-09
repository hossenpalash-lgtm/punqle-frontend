import { Facebook, Instagram } from "lucide-react";
import { TikTokIcon } from "@/components/TikTokIcon";
import { YouTubeIcon } from "@/components/YouTubeIcon";

// One place for "what a platform looks like" so the publish panels and the calendar read the same way at a glance
// (founder, 2026-11-10: make the Facebook/Instagram area and the calendar colourful and eye-catching).
export type PlatformKey = "facebook" | "instagram" | "tiktok" | "youtube";

// Same fills the sidebar's four platform buttons use.
export const PLATFORM_BRAND: Record<PlatformKey, string> = {
  facebook: "#1877F2",
  instagram: "linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)",
  tiktok: "#000000",
  youtube: "#FF0000",
};

// One solid colour per platform, for thin accent lines where a gradient does not fit.
export const PLATFORM_ACCENT: Record<PlatformKey, string> = {
  facebook: "#1877F2",
  instagram: "#D62976",
  tiktok: "#111111",
  youtube: "#FF0000",
};

export const PLATFORM_NAME: Record<PlatformKey, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

const SIZES = {
  sm: { box: "h-5 w-5 rounded-md", icon: "h-3 w-3" },
  md: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  lg: { box: "h-11 w-11 rounded-xl", icon: "h-6 w-6" },
  xl: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7" },
} as const;

export function PlatformTile({ platform, size = "md", ring = false }: { platform: PlatformKey; size?: keyof typeof SIZES; ring?: boolean }) {
  const s = SIZES[size];
  const icon =
    platform === "youtube" ? <YouTubeIcon className={s.icon} />
    : platform === "tiktok" ? <TikTokIcon className={s.icon} />
    : platform === "instagram" ? <Instagram className={s.icon} />
    : <Facebook className={s.icon} fill="currentColor" />;
  return (
    <span
      role="img"
      aria-label={PLATFORM_NAME[platform]}
      title={PLATFORM_NAME[platform]}
      className={`inline-flex shrink-0 items-center justify-center text-white ${s.box} ${ring ? "ring-2 ring-card" : ""}`}
      style={{ background: PLATFORM_BRAND[platform] }}
    >
      {icon}
    </span>
  );
}
