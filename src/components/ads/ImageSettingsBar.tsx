import { ChevronDown, UserRound } from "lucide-react";
import { PLATFORM_OPTIONS, VERSION_COUNTS, type Platform } from "@/lib/social-wizard";
import { ANGLES } from "./AdBriefStep";
import { PhotoPill, PillSelect } from "./SettingPills";

// (2026-11-11: the Goal pill moved into "Advanced" on the form. The goal still follows what the customer typed - a salon
// gets "Book Now", see lib/ad-goal.ts - and can still be picked by hand there.)
// Image Ad's settings as one row of small pills right under the idea box (2026-11-10), the same
// arrangement the Video Ad page got: Higgsfield, Krea and Creatify keep every setting as a chip
// beside the prompt, not as six headed sections between the prompt and the button. Same settings,
// same state, same defaults — only where they sit changed.
export function ImageSettingsBar({
  angle,
  onAngle,
  platform,
  onPlatform,
  versions,
  onVersions,
  file,
  previewUrl,
  onFile,
  personLabel,
  personOpen,
  onTogglePerson,
}: {
  angle: string | null;
  onAngle: (v: string | null) => void;
  platform: Platform;
  onPlatform: (v: Platform) => void;
  versions: number;
  onVersions: (v: number) => void;
  file: File | null;
  previewUrl: string | null;
  onFile: (f: File | null) => void;
  // "None" or the picked actor's name; the actor grid itself opens below this row.
  personLabel: string;
  personOpen: boolean;
  onTogglePerson: () => void;
}) {
  return (
    <div className="mb-4 flex w-full flex-wrap items-center gap-2 text-left">
      <PillSelect label="Message" value={angle ?? ""} onChange={(v) => onAngle(v === "" ? null : v)}>
        {ANGLES.map((a) => (
          <option key={a.label} value={a.value ?? ""}>
            {a.label}
          </option>
        ))}
      </PillSelect>

      <PillSelect label="For" value={platform} onChange={(v) => onPlatform(v as Platform)}>
        {PLATFORM_OPTIONS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </PillSelect>

      <div role="group" aria-label="Versions" className="flex items-center rounded-full bg-secondary py-0.5 pl-3 pr-0.5 text-xs font-semibold text-muted-foreground">
        <span className="mr-1">Versions</span>
        {VERSION_COUNTS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={versions === v}
            onClick={() => onVersions(v)}
            className={[
              "rounded-full px-2.5 py-1 transition-colors",
              versions === v ? "bg-foreground text-background" : "text-muted-foreground",
            ].join(" ")}
          >
            {v}
          </button>
        ))}
      </div>

      <PhotoPill file={file} previewUrl={previewUrl} onFile={onFile} />

      <button
        type="button"
        onClick={onTogglePerson}
        aria-expanded={personOpen}
        className="flex items-center gap-1.5 rounded-full bg-secondary py-1.5 pl-3 pr-2 text-xs font-semibold text-muted-foreground"
      >
        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        Person
        <span className="text-foreground">{personLabel}</span>
        <ChevronDown className={["h-3.5 w-3.5 transition-transform", personOpen ? "rotate-180" : ""].join(" ")} aria-hidden="true" />
      </button>
    </div>
  );
}
