import type { RefObject } from "react";
import type { AdGoal, VideoAspectRatio } from "@/lib/api";
import { ANGLES, GOALS } from "./AdBriefStep";
import { FormatPills, PhotoPill, PillSelect } from "./SettingPills";

// One row of small settings right under the idea box (2026-11-10). Higgsfield, Krea and Creatify all
// do the same: the prompt first, then every setting as a small chip next to it, never as separate
// headed sections further down the page. Same settings and same state as before (Format, Goal, the
// message angle, the optional product photo) — only where they sit changed.
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
  return (
    <div className="mb-4 flex w-full flex-wrap items-center gap-2 text-left">
      <FormatPills value={aspectRatio} onChange={onAspectRatio} />

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

      {showProductOptions && <PhotoPill file={file} previewUrl={previewUrl} onFile={onFile} inputRef={fileInputRef} />}
    </div>
  );
}
