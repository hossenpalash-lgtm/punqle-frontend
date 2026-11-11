import type { RefObject } from "react";
import type { VideoAspectRatio } from "@/lib/api";
import { ANGLES } from "./AdBriefStep";
import { FormatPills, PhotoPill, PillSelect } from "./SettingPills";

// One row of small settings right under the idea box (2026-11-10). Higgsfield, Krea and Creatify all
// do the same: the prompt first, then every setting as a small chip next to it, never as separate
// headed sections further down the page. Same settings and same state as before (Format, the
// message angle, the optional product photo) — only where they sit changed.
// (2026-11-11: the Goal pill moved into "Advanced" on the form, like on Image Ad.)
export function VideoSettingsBar({
  aspectRatio,
  onAspectRatio,
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
  return (
    <div className="mb-4 flex w-full flex-wrap items-center gap-2 text-left">
      <FormatPills value={aspectRatio} onChange={onAspectRatio} />

      {showProductOptions && (
        <PillSelect label="Message" value={angle ?? ""} onChange={(v) => onAngle(v === "" ? null : v)}>
          {ANGLES.map((a) => (
            <option key={a.label} value={a.value ?? ""}>
              {a.label}
            </option>
          ))}
        </PillSelect>
      )}

      {showProductOptions && <PhotoPill file={file} previewUrl={previewUrl} onFile={onFile} inputRef={fileInputRef} />}
    </div>
  );
}
