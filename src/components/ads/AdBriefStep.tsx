import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import type { AdGoal } from "@/lib/api";

export const GOALS: { value: AdGoal; label: string; description: string }[] = [
  { value: "sales", label: "Sales", description: "Get more purchases" },
  { value: "leads", label: "Leads", description: "Get people to contact you" },
  { value: "traffic", label: "Traffic", description: "Send people to your site" },
  { value: "bookings", label: "Bookings", description: "Appointments & reservations" },
];

// "Let Punqle choose" is null — no forced primary angle, every generated
// variant is freely AI-picked. Default selection, per the progressive-
// disclosure principle already used for Idea Step's chips: don't force a
// decision the user doesn't need to make.
const ANGLES: { value: string | null; label: string }[] = [
  { value: null, label: "Let Punqle choose ✨" },
  { value: "Benefit", label: "Benefit" },
  { value: "Problem → Solution", label: "Problem → Solution" },
  { value: "Offer", label: "Offer" },
  { value: "Social Proof", label: "Social Proof" },
  { value: "Comparison", label: "Comparison" },
];

// Step 1 of Ad Creation — replaces Image Post's IdeaStep + AI-understanding
// round trip with structured Offer/Goal/Angle inputs. Deliberately no live
// AI call here (unlike IdeaStep's debounced understandIdea): the AI's
// angle intelligence shows up in the generated results themselves (each
// labeled), not as a pre-generation guess — keeps this screen fast and
// simple, one screen, no waiting.
export function AdBriefStep({
  offerDescription,
  onOfferDescriptionChange,
  goal,
  onGoalChange,
  angle,
  onAngleChange,
  onContinue,
  showAngle = true,
}: {
  offerDescription: string;
  onOfferDescriptionChange: (v: string) => void;
  goal: AdGoal;
  onGoalChange: (v: AdGoal) => void;
  angle: string | null;
  onAngleChange: (v: string | null) => void;
  onContinue: () => void;
  // Video Ad hides this — its own next step shows full written scripts
  // for 3-4 angles to pick between, which makes picking a blind angle
  // label here redundant. Image Ad (the default) keeps it unchanged.
  showAngle?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = () => {
    if (!offerDescription.trim() || submitting) return;
    setSubmitting(true);
    onContinue();
  };

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">What are you advertising?</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tell Punqle about your offer — it'll create several ready-to-run ad variations.
      </p>

      <textarea
        value={offerDescription}
        onChange={(e) => onOfferDescriptionChange(e.target.value)}
        placeholder="e.g. Handmade leather wallets, 20% off this week"
        rows={4}
        autoFocus
        className="mb-6 w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mb-6 w-full text-left">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What's the goal?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => {
            const selected = goal === g.value;
            return (
              <button
                key={g.value}
                onClick={() => onGoalChange(g.value)}
                className={[
                  "rounded-2xl px-3 py-2.5 text-left transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                ].join(" ")}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {g.label}
                </span>
                <span
                  className={["block text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground"].join(
                    " ",
                  )}
                >
                  {g.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showAngle && (
      <div className="mb-6 w-full text-left">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What should the ad say?
        </p>
        <div className="flex flex-wrap gap-2">
          {ANGLES.map((a) => {
            const selected = angle === a.value;
            return (
              <button
                key={a.label}
                onClick={() => onAngleChange(a.value)}
                className={[
                  "flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                ].join(" ")}
              >
                {selected && a.value !== null && <Check className="h-3 w-3" />}
                {a.value === null && <Sparkles className="h-3 w-3" />}
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!offerDescription.trim() || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
        style={{ background: "var(--gradient-primary)" }}
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Continue
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
