import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { ToolPill } from "./ToolPill";

const FONT_SCALES: { label: string; value: number }[] = [
  { label: "Small", value: 0.8 },
  { label: "Medium", value: 1 },
  { label: "Large", value: 1.25 },
];

// A quick-edit panel for the non-spatial knobs — caption text, font size,
// bar color, logo visibility. Position/size are handled separately by the
// drag-and-drop editor directly on the preview image (see
// DragDropEditor.tsx) rather than here, so this panel no longer has a
// "text position" control. Collapsed by default, consistent with the
// other advanced tools on this screen.
export function QuickEditPanel({
  captionText,
  onCaptionChange,
  fontScale,
  onFontScaleChange,
  barColorOverride,
  onBarColorOverrideChange,
  hasLogo,
  showLogo,
  onShowLogoChange,
}: {
  captionText: string;
  onCaptionChange: (text: string) => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  barColorOverride: string | null | undefined;
  onBarColorOverrideChange: (color: string | null | undefined) => void;
  hasLogo: boolean;
  showLogo: boolean;
  onShowLogoChange: (show: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <ToolPill icon={SlidersHorizontal} label="Edit post" onClick={() => setExpanded(true)} />
    );
  }

  return (
    <div className="w-full rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Edit this post
      </div>

      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Caption text
      </label>
      <textarea
        value={captionText}
        onChange={(e) => onCaptionChange(e.target.value)}
        rows={3}
        className="mb-4 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Font size
      </label>
      <div className="mb-4 flex gap-2">
        {FONT_SCALES.map((f) => (
          <button
            key={f.label}
            onClick={() => onFontScaleChange(f.value)}
            className={[
              "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold",
              fontScale === f.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Bar color
      </label>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="color"
          value={barColorOverride ?? "#000000"}
          onChange={(e) => onBarColorOverrideChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-input bg-background"
        />
        {barColorOverride !== undefined && (
          <button
            onClick={() => onBarColorOverrideChange(undefined)}
            className="flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            Use brand color
          </button>
        )}
      </div>

      {hasLogo && (
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={showLogo}
            onChange={(e) => onShowLogoChange(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-[var(--primary)]"
          />
          Show logo on this post
        </label>
      )}
    </div>
  );
}
