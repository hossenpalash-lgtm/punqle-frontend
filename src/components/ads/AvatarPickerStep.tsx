import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { ApiAvatarOption, AvatarTier } from "@/lib/api";

const TIERS: { value: AvatarTier; label: string; description: string; credits: number }[] = [
  { value: "standard", label: "Standard", description: "Great quality, lower cost", credits: 4 },
  { value: "premium", label: "Premium", description: "Higher fidelity, more realistic movement", credits: 10 },
];

// Video Ad's "AI Presenter" style — shown only when videoStyle === "avatar".
// Tier is picked first since it changes the credit cost shown throughout;
// any avatar in the catalog works at either tier (confirmed live against
// HeyGen's real API — tier is a generation-time parameter, not a
// per-avatar property), so the same grid is shown regardless of tier.
export function AvatarPickerStep({
  tier,
  onTierChange,
  avatars,
  loading,
  error,
  genderFilter,
  onGenderFilterChange,
  selectedAvatarId,
  onSelectAvatar,
  onContinue,
  onBack,
  onRetry,
}: {
  tier: AvatarTier;
  onTierChange: (t: AvatarTier) => void;
  avatars: ApiAvatarOption[];
  loading: boolean;
  error: string | null;
  genderFilter: "all" | "female" | "male";
  onGenderFilterChange: (g: "all" | "female" | "male") => void;
  selectedAvatarId: string | null;
  onSelectAvatar: (avatarId: string, gender: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
  onRetry: () => void;
}) {
  // Confirmed live against HeyGen's real API: every "expressive"-named
  // avatar (48 of 1264 in the catalog, ~4%) rejects Premium — 5/5 tested,
  // 0 exceptions. Filtering these out when Premium is selected means a
  // user picking Premium essentially never hits the tier-mismatch
  // fallback at all, rather than relying on that fallback to paper over
  // a mismatch that was preventable. The fallback itself stays in the
  // backend as a safety net for any other undiscovered incompatible
  // avatar — this is a belt-and-suspenders improvement, not a
  // replacement for it.
  const filtered = avatars.filter(
    (a) =>
      (genderFilter === "all" || a.gender === genderFilter) &&
      (tier !== "premium" || !a.avatar_id.toLowerCase().includes("expressive")),
  );

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-xl font-extrabold text-foreground">Choose your presenter</h1>
      <p className="mb-6 text-sm text-muted-foreground">An AI avatar will read your script out loud.</p>

      <div className="mb-5 grid w-full grid-cols-2 gap-2">
        {TIERS.map((t) => {
          const selected = tier === t.value;
          return (
            <button
              key={t.value}
              onClick={() => onTierChange(t.value)}
              className={[
                "rounded-2xl px-3 py-2.5 text-left transition-colors",
                selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              ].join(" ")}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                {t.label}
                <span className="ml-auto text-xs font-normal opacity-80">{t.credits} credits</span>
              </span>
              <span className={["block text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                {t.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex w-full gap-2">
        {(["all", "female", "male"] as const).map((g) => (
          <button
            key={g}
            onClick={() => onGenderFilterChange(g)}
            className={[
              "flex-1 rounded-full px-3 py-2 text-xs font-semibold capitalize",
              genderFilter === g ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
            ].join(" ")}
          >
            {g}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mb-6 flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Loading avatars...
        </div>
      )}

      {!loading && error && (
        <div className="mb-6 flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/60 p-5 text-center">
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
          <button onClick={onRetry} className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="mb-6 grid max-h-96 w-full grid-cols-3 gap-2 overflow-y-auto">
          {filtered.map((a) => {
            const isSelected = selectedAvatarId === a.avatar_id;
            return (
              <button
                key={a.avatar_id}
                onClick={() => onSelectAvatar(a.avatar_id, a.gender)}
                className={[
                  "relative overflow-hidden rounded-xl border-2 text-left transition-colors",
                  isSelected ? "border-primary" : "border-transparent",
                ].join(" ")}
              >
                {a.preview_image_url ? (
                  <img src={a.preview_image_url} alt={a.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="aspect-[3/4] w-full bg-secondary" />
                )}
                {isSelected && (
                  <span
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "var(--color-accent)" }}
                  >
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <span className="block truncate bg-black/60 px-1.5 py-1 text-[10px] font-semibold text-white">{a.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex w-full gap-2">
        <button
          onClick={onBack}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-secondary px-5 py-4 text-sm font-semibold text-secondary-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={loading || !!error || !selectedAvatarId}
          className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
