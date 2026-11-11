import { useEffect, useRef, useState } from "react";
import { Check, Play } from "lucide-react";

// A pick-one card with a real preview image over a bold label, on a white
// card — the pattern AdCreative.ai's own style/scene pickers use
// (2026-10-05, founder liked it). Thumbnails are static, one-time-
// generated samples shipped under /public (never per-user generations),
// so a picker costs nothing to render. `video` adds a small play badge
// (the Video Ad style picker); `sublabel` is a second quiet line (e.g.
// the credit cost, which materially affects that choice).
//
// `videoSrc` (2026-11-11): a short silent clip that really plays, so the play badge is a promise that is kept. It
// plays while the card is hovered, focused or picked (a tap on a phone picks it), and not at all for people who ask
// their device for less motion. The file is only requested the first time it is needed (preload none), so a page
// with several cards does not download them all. The still image stays underneath until the clip is really running.
export function ImageChoiceCard({
  image,
  label,
  sublabel,
  selected,
  video = false,
  videoSrc,
  badge,
  onClick,
}: {
  image: string;
  label: string;
  sublabel?: string;
  selected: boolean;
  video?: boolean;
  videoSrc?: string;
  badge?: string; // a small tag over the picture, e.g. "Recommended"
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [wanted, setWanted] = useState(false); // becomes true once, then the <video> element exists
  const [running, setRunning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = !!videoSrc && (hovered || selected);

  useEffect(() => {
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
  }, [active, wanted]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={[
        "flex flex-col gap-1.5 rounded-2xl border bg-card p-1.5 text-left transition-colors",
        selected ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40",
      ].join(" ")}
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-secondary">
        <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        {videoSrc && wanted && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={image}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            onPlaying={() => setRunning(true)}
            className={["absolute inset-0 h-full w-full object-cover transition-opacity duration-200", running ? "opacity-100" : "opacity-0"].join(" ")}
          />
        )}
        {video && (
          <span className="glass-chip absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full">
            <Play className="h-2.5 w-2.5 fill-current" />
          </span>
        )}
        {badge && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-[#C13584] px-2 py-0.5 text-[10px] font-semibold leading-none text-white">
            {badge}
          </span>
        )}
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
            <Check className="h-3 w-3" />
          </span>
        )}
      </span>
      <span className="px-1 font-display text-[13px] leading-tight text-foreground">{label}</span>
      {sublabel && <span className="px-1 pb-0.5 text-[11.5px] font-semibold leading-none text-muted-foreground">{sublabel}</span>}
      {!sublabel && <span className="pb-0.5" />}
    </button>
  );
}
