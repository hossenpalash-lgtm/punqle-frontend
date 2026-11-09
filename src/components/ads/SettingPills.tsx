import { ImagePlus, RectangleHorizontal, RectangleVertical, X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import type { VideoAspectRatio } from "@/lib/api";

// Small settings pills shared by the Video Ad and Image Ad forms (2026-11-10): a muted label, then
// the current choice in a native select. Native on purpose — it opens the phone's own picker.
export function PillSelect({
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

// Format as one joined pill: orientation icon + ratio. Names live in the tooltip / aria-label.
export function FormatPills({ value, onChange }: { value: VideoAspectRatio; onChange: (v: VideoAspectRatio) => void }) {
  const formats: { value: VideoAspectRatio; name: string; Icon: typeof RectangleHorizontal }[] = [
    { value: "9:16", name: "Vertical", Icon: RectangleVertical },
    { value: "16:9", name: "Landscape", Icon: RectangleHorizontal },
  ];
  return (
    <div role="group" aria-label="Format" className="flex rounded-full bg-secondary p-0.5">
      {formats.map(({ value: v, name, Icon }) => (
        <button
          key={v}
          type="button"
          title={`${name} (${v})`}
          aria-label={`${name} (${v})`}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={[
            "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            value === v ? "bg-foreground text-background" : "text-muted-foreground",
          ].join(" ")}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {v}
        </button>
      ))}
    </div>
  );
}

// The optional product photo as one pill: "Product photo" before a pick, a thumbnail + name + remove after.
// `capture` lets the phone camera open straight away (used by the Social video form).
export function PhotoPill({
  file,
  previewUrl,
  onFile,
  inputRef,
  capture,
}: {
  file: File | null;
  previewUrl: string | null;
  onFile: (f: File | null) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  capture?: "environment" | "user";
}) {
  if (file) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-secondary py-1 pl-1.5 pr-2 text-xs font-semibold text-foreground">
        {previewUrl && <img src={previewUrl} alt="" className="h-5 w-5 rounded-full object-cover" />}
        <span className="max-w-[7rem] truncate">{file.name}</span>
        <button type="button" onClick={() => onFile(null)} aria-label="Remove photo" className="text-muted-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }
  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
      <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
      Product photo
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
