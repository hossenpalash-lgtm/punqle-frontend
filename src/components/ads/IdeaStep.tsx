import { AlertCircle, ArrowRight, Check, ChevronDown, Loader2, Pencil, Shuffle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchIdeaLabsIdeas, understandIdea, type ApiUnderstandIdeaResponse } from "@/lib/api";
import { IDEA_CHIPS, type IdeaChip } from "@/lib/social-wizard";

// Step 1 — idea + the AI-understanding confirmation live on ONE screen now
// (previously 2 separate step-screens) per the "one decision at a time,
// don't make the user click through a mandatory extra confirmation
// screen" refinement. The understanding call fires automatically,
// debounced, while the user is still reading/adjusting their idea, so it's
// usually already resolved by the time they reach for Continue — with an
// immediate (non-debounced) fallback fetch if they click before it lands.
export function IdeaStep({
  value,
  onChange,
  onContinue,
  entryHint,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: (understanding: ApiUnderstandIdeaResponse) => void;
  // Set when arriving here from the home screen's "Carousel" pill —
  // Carousel has no generation flow of its own (CarouselBuilder only
  // ever runs post-generation, on an already-finished image), so the
  // pill's honest job is just nudging the copy here toward carousels;
  // everything else about this step is unchanged.
  entryHint?: "carousel";
}) {
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const [surprising, setSurprising] = useState(false);
  const [surpriseError, setSurpriseError] = useState<string | null>(null);

  const [understanding, setUnderstanding] = useState<ApiUnderstandIdeaResponse | null>(null);
  const [editedSentence, setEditedSentence] = useState("");
  const [editingSentence, setEditingSentence] = useState(false);
  const [understandingFor, setUnderstandingFor] = useState<string | null>(null);
  const [loadingUnderstanding, setLoadingUnderstanding] = useState(false);
  const [understandingError, setUnderstandingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestRef = useRef(0);

  // Chip "selected" state is derived from the text itself (not separate
  // component state) — this is what actually fixes the reported
  // concatenation bug: a chip click fully replaces the textarea with its
  // own starter sentence rather than prepending onto whatever was already
  // there, so at most one chip's text is ever present, and re-clicking the
  // active chip cleanly clears it. No stale-state class of bugs possible.
  const activeChip = IDEA_CHIPS.find((c) => value.startsWith(c.starter)) ?? null;

  const runUnderstanding = (text: string) => {
    const requestId = ++requestRef.current;
    setLoadingUnderstanding(true);
    setUnderstandingError(null);
    return understandIdea(text)
      .then((r) => {
        if (requestRef.current !== requestId) return r;
        setUnderstanding(r);
        setEditedSentence(r.summary_sentence);
        setUnderstandingFor(text);
        return r;
      })
      .catch((err) => {
        if (requestRef.current === requestId) {
          setUnderstandingError(err instanceof Error ? err.message : "Couldn't understand that idea.");
        }
        throw err;
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoadingUnderstanding(false);
      });
  };

  // Debounced auto-fetch — only once the idea is substantial enough to be
  // worth interpreting, and only when it's actually changed since the last
  // successful fetch.
  useEffect(() => {
    const text = value.trim();
    if (text.length < 8 || text === understandingFor) return;
    const t = setTimeout(() => {
      runUnderstanding(text).catch(() => {});
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChip = (chip: IdeaChip) => {
    onChange(activeChip?.label === chip.label ? "" : chip.starter);
  };

  const handleSurprise = async () => {
    if (surprising) return;
    setSurprising(true);
    setSurpriseError(null);
    try {
      const r = await fetchIdeaLabsIdeas("surprise");
      if (r.ideas.length > 0) {
        onChange(r.ideas[Math.floor(Math.random() * r.ideas.length)]);
      }
    } catch (err) {
      setSurpriseError(err instanceof Error ? err.message : "Couldn't get an idea right now.");
    } finally {
      setSurprising(false);
    }
  };

  const handleContinue = async () => {
    const text = value.trim();
    if (!text || submitting) return;
    if (understanding && understandingFor === text) {
      onContinue({ ...understanding, summary_sentence: editedSentence });
      return;
    }
    setSubmitting(true);
    try {
      const r = await runUnderstanding(text);
      onContinue(r);
    } catch {
      // error already surfaced via understandingError
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-2xl font-extrabold text-foreground">
        {entryHint === "carousel" ? "What's in your carousel?" : "What do you want to post?"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {entryHint === "carousel"
          ? "Tell Punqle what to feature — we'll turn it into a swipeable set of images."
          : "Tell Punqle what you want to create — no design experience needed."}
      </p>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          entryHint === "carousel"
            ? "What do you want to feature in your carousel?"
            : "Tell Punqle what you want to post about..."
        }
        rows={4}
        autoFocus
        className="mb-3 w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Popular ideas — collapsed by default (progressive disclosure),
          same expand pattern already used by HashtagPicker/IdeaInspiration
          elsewhere in this app. */}
      <button
        onClick={() => setChipsExpanded((v) => !v)}
        className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
      >
        Popular ideas
        <ChevronDown className={["h-3.5 w-3.5 transition-transform", chipsExpanded ? "rotate-180" : ""].join(" ")} />
      </button>
      {chipsExpanded && (
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          {IDEA_CHIPS.map((chip) => {
            const selected = activeChip?.label === chip.label;
            return (
              <button
                key={chip.label}
                onClick={() => handleChip(chip)}
                className={[
                  "flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                ].join(" ")}
              >
                {selected && <Check className="h-3 w-3" />}
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={handleSurprise}
        disabled={surprising}
        className="mb-5 flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
      >
        {surprising ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Shuffle className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
        )}
        Surprise me
      </button>
      {surpriseError && <p className="mb-4 text-sm font-medium text-destructive">{surpriseError}</p>}

      {/* Inline AI-understanding card — replaces the old separate full
          step-screen. Appears once the idea is substantial enough to
          interpret; never blocks typing. */}
      {value.trim().length >= 8 && (
        <div className="mb-6 w-full rounded-2xl bg-card p-4 text-left" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>
              Punqle understands your idea
            </span>
          </div>
          {loadingUnderstanding && !understanding && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking...
            </div>
          )}
          {understandingError && !loadingUnderstanding && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {understandingError}
            </p>
          )}
          {understanding && (
            <div className="flex items-start justify-between gap-3">
              {!editingSentence ? (
                <p className="text-sm font-medium text-foreground">{editedSentence}</p>
              ) : (
                <textarea
                  value={editedSentence}
                  onChange={(e) => setEditedSentence(e.target.value)}
                  onBlur={() => setEditingSentence(false)}
                  autoFocus
                  rows={2}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
              {!editingSentence && (
                <button
                  onClick={() => setEditingSentence(true)}
                  className="shrink-0 rounded-full bg-secondary p-1.5 text-secondary-foreground"
                  aria-label="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!value.trim() || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
        style={{ background: "var(--gradient-primary)" }}
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue<ArrowRight className="h-4 w-4" /></>}
      </button>
    </div>
  );
}
