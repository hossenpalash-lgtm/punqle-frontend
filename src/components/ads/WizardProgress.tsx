const STAGES = ["What you want", "Choose a look", "Set it up", "Generate"];

// A calm 4-stage indicator shown across the pre-generation steps. Doesn't
// restructure SinglePostForm's own step machine — the caller maps its
// real step onto one of these 4 display stages, so this is purely
// additive UI. Completed stages (1-3 only — see SinglePostForm's
// STAGE_STEP) are clickable so the user can jump back and revisit an
// earlier choice without losing anything on the current step.
export function WizardProgress({
  currentStage,
  onNavigate,
}: {
  currentStage: 1 | 2 | 3 | 4;
  onNavigate?: (stage: 1 | 2 | 3) => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-center gap-1.5">
      {STAGES.map((label, i) => {
        const stage = (i + 1) as 1 | 2 | 3 | 4;
        const done = stage < currentStage;
        const active = stage === currentStage;
        const clickable = done && stage !== 4 && !!onNavigate;
        return (
          <div key={label} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={clickable ? () => onNavigate!(stage as 1 | 2 | 3) : undefined}
              disabled={!clickable}
              className={[
                "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
                done || active ? "text-white" : "bg-secondary text-muted-foreground",
                clickable ? "cursor-pointer hover:opacity-80" : "cursor-default",
              ].join(" ")}
              style={done || active ? { background: "var(--color-accent)" } : undefined}
              aria-current={active ? "step" : undefined}
              aria-label={label}
              title={label}
            >
              {stage}
            </button>
            {stage < STAGES.length && (
              <div className={["h-px w-4 sm:w-6", done ? "bg-[var(--color-accent)]" : "bg-border"].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
