import { AlertCircle, ChevronDown, Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import {
  editVideo,
  type ApiVideoOperation,
  type LogoPosition,
  type TextPosition,
  type TtsVoice,
  type VideoAspectRatio,
} from "@/lib/api";

const VOICEOVER_CREDIT_COST = 2;

const LOGO_POSITIONS: { value: LogoPosition; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

const TEXT_POSITIONS: { value: TextPosition; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

const VOICES: TtsVoice[] = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

// Post-generation edit panel — headline/logo/brand-color/position/
// voiceover/captions/mute, all reusing a fresh re-download of the same
// Veo output (via videoOperation) rather than regenerating it. Free
// unless voiceover audio actually gets (re)synthesized. Deliberately not
// a drag-and-drop canvas or timeline — Veo delivers one flat, already-
// rendered clip with no "scenes" to reorder, so this stays a form of
// preset controls, same scope as the image flow's edit tools.
export function EditVideoPanel({
  videoOperation,
  headline,
  narration,
  aspectRatio,
  hasLogo,
  hasBrandColor,
  credits,
  setCredits,
  onSaved,
}: {
  videoOperation: ApiVideoOperation | null;
  headline: string;
  narration: string;
  aspectRatio: VideoAspectRatio;
  hasLogo: boolean;
  hasBrandColor: boolean;
  credits: number | null;
  setCredits: (n: number) => void;
  onSaved: (videoBase64: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editHeadline, setEditHeadline] = useState(headline);
  const [showLogo, setShowLogo] = useState(true);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("top-left");
  const [useBrandColor, setUseBrandColor] = useState(true);
  const [textPosition, setTextPosition] = useState<TextPosition>("bottom");
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [editNarration, setEditNarration] = useState(narration);
  const [voice, setVoice] = useState<TtsVoice>("alloy");
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [muted, setMuted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);

  const wantsVoiceover = voiceoverEnabled && !!editNarration.trim() && !muted;
  const cost = wantsVoiceover ? VOICEOVER_CREDIT_COST : 0;
  const insufficientCredits = cost > 0 && credits !== null && credits < cost;

  const handleMuteToggle = (v: boolean) => {
    setMuted(v);
    if (v) setVoiceoverEnabled(false);
  };

  const handleSave = async () => {
    if (!videoOperation || saving || insufficientCredits) return;
    setSaving(true);
    setError(null);
    try {
      const r = await editVideo(videoOperation, {
        headline: editHeadline,
        narration: editNarration,
        aspectRatio,
        showLogo,
        logoPosition,
        useBrandColor,
        textPosition,
        voiceoverEnabled,
        voice,
        captionsEnabled,
        muted,
      });
      onSaved(r.video_base64);
      setCredits(r.credits_remaining);
      setSavedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-3 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Pencil className="h-4 w-4" />
          Edit video
        </span>
        <ChevronDown className={["h-4 w-4 text-muted-foreground transition-transform", expanded ? "rotate-180" : ""].join(" ")} />
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Headline
            </label>
            <input
              type="text"
              value={editHeadline}
              onChange={(e) => setEditHeadline(e.target.value)}
              placeholder="No headline — video will have no text"
              maxLength={60}
              className="w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Text position
            </label>
            <div className="flex gap-2">
              {TEXT_POSITIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setTextPosition(p.value)}
                  className={[
                    "flex-1 rounded-full px-3 py-2 text-xs font-semibold",
                    textPosition === p.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {hasLogo && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo</label>
                <button
                  onClick={() => setShowLogo((v) => !v)}
                  className={["rounded-full px-3 py-1 text-xs font-semibold", showLogo ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"].join(" ")}
                >
                  {showLogo ? "Shown" : "Hidden"}
                </button>
              </div>
              {showLogo && (
                <div className="grid grid-cols-2 gap-2">
                  {LOGO_POSITIONS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setLogoPosition(p.value)}
                      className={[
                        "rounded-full px-3 py-2 text-xs font-semibold",
                        logoPosition === p.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                      ].join(" ")}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasBrandColor && (
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand color</label>
              <button
                onClick={() => setUseBrandColor((v) => !v)}
                className={["rounded-full px-3 py-1 text-xs font-semibold", useBrandColor ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"].join(" ")}
              >
                {useBrandColor ? "On" : "Off"}
              </button>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Voiceover</label>
              <button
                onClick={() => setVoiceoverEnabled((v) => !v)}
                disabled={muted}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50",
                  voiceoverEnabled ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                ].join(" ")}
              >
                {voiceoverEnabled ? "On" : "Off"}
              </button>
            </div>
            {voiceoverEnabled && (
              <div className="flex flex-col gap-3">
                <textarea
                  value={editNarration}
                  onChange={(e) => setEditNarration(e.target.value)}
                  rows={2}
                  placeholder="What should the narrator say?"
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Voice</span>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value as TtsVoice)}
                    className="rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {VOICES.map((v) => (
                      <option key={v} value={v}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Captions</span>
                  <button
                    onClick={() => setCaptionsEnabled((v) => !v)}
                    className={["rounded-full px-3 py-1 text-xs font-semibold", captionsEnabled ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"].join(" ")}
                  >
                    {captionsEnabled ? "On" : "Off"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audio</label>
            <button
              onClick={() => handleMuteToggle(!muted)}
              className={["rounded-full px-3 py-1 text-xs font-semibold", muted ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"].join(" ")}
            >
              {muted ? "Muted" : "Unmuted"}
            </button>
          </div>

          <p className="text-center text-xs font-semibold text-muted-foreground">
            {cost > 0 ? `${cost} credits — voiceover will be (re)recorded` : "Free — no voiceover changes"}
          </p>

          {insufficientCredits && (
            <p className="text-xs text-muted-foreground">Needs {cost} credits — you have {credits}.</p>
          )}
          {error && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
          {savedOnce && !error && !saving && (
            <p className="text-center text-xs font-medium text-primary">Saved.</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !videoOperation || insufficientCredits}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}
