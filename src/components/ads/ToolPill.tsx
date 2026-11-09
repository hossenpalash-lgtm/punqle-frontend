import type { LucideIcon } from "lucide-react";

// One small pill for an optional tool on the result screen (Translate, Edit post, Hashtags, Carousel,
// Image tools). They used to be five centered text links stacked one under another, each with a
// chevron; now they sit together in one row and a tool's panel opens full width right under it
// (2026-11-10).
export function ToolPill({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
