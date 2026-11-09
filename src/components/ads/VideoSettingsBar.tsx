import { ImagePlus, RectangleHorizontal, RectangleVertical, X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import type { AdGoal, VideoAspectRatio } from "@/lib/api";
import { ANGLES, GOALS } from "./AdBriefStep";

// One row of small settings right under the idea box (2026-11-10). Higgsfield, Krea and Creatify all
// do the same: the prompt first, then every setting as a small chip next to it, never as separate
// headed sections further down the page. Same settings and same state as before (Format, Goal, the
// message angle, the optional product photo) — only where they sit changed.
function PillSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full bg-secondary py-1.5 pl-3 pr-2 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[9.5rem] cursor-pointer truncate bg-transparent text-xs font-semibold text-foreground focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export function VideoSettingsBar({
  aspectRatio,
  onAspectRatio,
  goal,
  onGoal,
  showProductOptions,
  angle,
  onAngle,
  file,
  previewUrl,
  onFile,
  fileInputRef,
}: {
  aspectRatio: VideoAspectRatio;
  onAspectRatio: (v: VideoAspectRatio) => void;
  goal: AdGoal;
  onGoal: (v: AdGoal) => void;
  // The message angle and the product photo only apply to the plain product styles; the presenter,
  // actor and UGC styles bring their own script/scene inputs.
  showProductOptions: boolean;
  angle: string | null;
  onAngle: (v: string | null) => void;
  file: File | null;
  previewUrl: string | null;
  onFile: (f: File | null) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}) {
  const formats: { value: VideoAspectRatio; label: string; name: string; Icon: typeof RectangleHorizontal }[] = [
    { value: "9:16", label: "9:16", name: "Vertical", Icon: RectangleVertical },
    { value: "16:9", label: "16:9", name: "Landscape", Icon: RectangleHorizontal },
  ];
  return (
    <div className="mb-4 flex w-full flex-wrap items-center gap-2 text-left">
      <div role="group" aria-label="Format" className="flex rounded-full bg-secondary p-0.5">
        {formats.map(({ value, label, name, Icon }) => (
          <button
            key={value}
            type="button"
            title={`${name} (${label})`}
            aria-label={`${name} (${label})`}
            aria-pressed={aspectRatio === value}
            onClick={() => onAspectRatio(value)}
            className={[
              "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              aspectRatio === value ? "bg-foreground text-background" : "text-muted-foreground",
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <PillSelect label="Goal" value={goal} onChange={(v) => onGoal(v as AdGoal)}>
        {GOALS.map((g) => (
          <option key={g.value} value={g.value}>
            {g.label}
          </option>
        ))}
      </PillSelect>

      {showProductOptions && (
        <PillSelect label="Message" value={angle ?? ""} onChange={(v) => onAngle(v === "" ? null : v)}>
          {ANGLES.map((a) => (
            <option key={a.label} value={a.value ?? ""}>
              {a.label}
            </option>
          ))}
        </PillSelect>
      )}

      {showProductOptions &&
        (file ? (
          <span className="flex items-center gap-1.5 rounded-full bg-secondary py-1 pl-1.5 pr-2 text-xs font-semibold text-foreground">
            {previewUrl && <img src={previewUrl} alt="" className="h-5 w-5 rounded-full object-cover" />}
            <span className="max-w-[7rem] truncate">{file.name}</span>
            <button type="button" onClick={() => onFile(null)} aria-label="Remove photo" className="text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            Product photo
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        ))}
    </div>
  );
}
