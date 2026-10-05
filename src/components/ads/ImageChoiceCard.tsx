import { Check, Play } from "lucide-react";

// A pick-one card with a real preview image over a bold label, on a white
// card — the pattern AdCreative.ai's own style/scene pickers use
// (2026-10-05, founder liked it). Thumbnails are static, one-time-
// generated samples shipped under /public (never per-user generations),
// so a picker costs nothing to render. `video` adds a small play badge
// (the Video Ad style picker); `sublabel` is a second quiet line (e.g.
// the credit cost, which materially affects that choice).
export function ImageChoiceCard({
  image,
  label,
  sublabel,
  selected,
  video = false,
  onClick,
}: {
  image: string;
  label: string;
  sublabel?: string;
  selected: boolean;
  video?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "flex flex-col gap-1.5 rounded-2xl border bg-card p-1.5 text-left transition-colors",
        selected ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40",
      ].join(" ")}
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-secondary">
        <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        {video && (
          <span className="glass-chip absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full">
            <Play className="h-2.5 w-2.5 fill-current" />
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
