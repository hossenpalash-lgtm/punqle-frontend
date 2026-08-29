import { useEffect, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Facebook, Loader2 } from "lucide-react";
import {
  fetchBusinessProfile,
  fetchCurrentContentPlan,
  fetchMetaStatus,
  generateContentPlan,
  publishToMeta,
  setBusinessProfile,
  type ApiAdGenerateResponse,
  type ApiContentPlan,
  type ApiContentPlanPost,
  type BusinessCategory,
} from "@/lib/api";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/categories";
import { compositeImage, deriveOnImageHeadline, type BrandKit } from "@/lib/canvas-text";
import { MIN_SCHEDULE_MINUTES, formatScheduleDate } from "@/lib/schedule-dates";
import { DAY_LABELS, PlanDayCard } from "./PlanDayCard";

// Weekly Plan's days are abstract weekday codes (Mon..Fri), not tied to a
// specific calendar week — mapping them to real dates only happens here,
// at schedule time, anchored on "today" rather than the plan's original
// generation date, so a plan reviewed a few days after it was made still
// schedules into the future, not the past. This is a different problem
// from the Content Calendar's own week navigation (schedule-dates.ts's
// startOfWeek/addDays) — "next real occurrence of an abstract weekday"
// vs. "the 7 dates in an arbitrary navigated-to week" — so it stays here
// rather than being merged into that shared file.
const DAY_TO_WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };

function nextDateForDay(dayCode: string, timeHHMM: string): Date | null {
  const targetWeekday = DAY_TO_WEEKDAY[dayCode];
  if (targetWeekday === undefined) return null;
  const [hh, mm] = timeHHMM.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const now = new Date();
  const candidate = new Date(now);
  const diff = (targetWeekday - now.getDay() + 7) % 7;
  candidate.setDate(now.getDate() + diff);
  candidate.setHours(hh, mm, 0, 0);
  // If today matches this weekday but the chosen time has already passed
  // (or is too soon for Meta's own 10-minute minimum), roll to next week
  // instead of handing the backend a timestamp it'll reject.
  if (candidate.getTime() < now.getTime() + MIN_SCHEDULE_MINUTES * 60_000) {
    candidate.setDate(candidate.getDate() + 7);
  }
  return candidate;
}

export function WeeklyPlanForm({
  credits,
  setCredits,
}: {
  credits: number | null;
  setCredits: (n: number) => void;
}) {
  const [category, setCategory] = useState<BusinessCategory | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit>({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [plan, setPlan] = useState<ApiContentPlan | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metaConnected, setMetaConnected] = useState(false);
  const [metaPageName, setMetaPageName] = useState<string | null>(null);
  const [hasInstagram, setHasInstagram] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [scheduleFacebook, setScheduleFacebook] = useState(true);
  const [scheduleInstagram, setScheduleInstagram] = useState(false);
  const [checkedDays, setCheckedDays] = useState<Record<string, boolean>>({});
  const [schedulingWeek, setSchedulingWeek] = useState(false);
  const [scheduleResults, setScheduleResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  useEffect(() => {
    fetchMetaStatus()
      .then((r) => {
        setMetaConnected(r.connected);
        setMetaPageName(r.page_name);
        setHasInstagram(!!r.ig_username);
      })
      .catch(() => {
        // Silently stays "not connected" — same non-critical secondary-
        // action pattern PublishToMeta.tsx itself uses.
      });
  }, []);

  // Default newly-generated days to checked without clobbering choices
  // the user already made for days generated earlier in this session.
  useEffect(() => {
    if (!plan) return;
    setCheckedDays((prev) => {
      const next = { ...prev };
      for (const p of plan.posts) {
        if (p.status === "generated" && !(p.day in next)) next[p.day] = true;
      }
      return next;
    });
  }, [plan]);

  useEffect(() => {
    Promise.all([fetchBusinessProfile(), fetchCurrentContentPlan()])
      .then(([profile, currentPlan]) => {
        setCategory(profile.category);
        setBrandKit({
          color: profile.brand_color,
          logoDataUrl: profile.logo_base64
            ? `data:${profile.logo_mime_type || "image/png"};base64,${profile.logo_base64}`
            : null,
          name: profile.brand_name,
        });
        setPlan(currentPlan);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your data."))
      .finally(() => setLoading(false));
  }, []);

  const handleCategoryChange = async (c: BusinessCategory) => {
    setCategory(c);
    setShowCategoryPicker(false);
    try {
      await setBusinessProfile({ category: c });
    } catch {
      // Non-critical — the next plan generation will just fall back to
      // whatever category is actually saved server-side.
    }
  };

  const handleGeneratePlan = async () => {
    if (!inputText.trim() || generatingPlan) return;
    setGeneratingPlan(true);
    setError(null);
    try {
      const newPlan = await generateContentPlan(inputText.trim());
      setPlan(newPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the plan.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handlePostGenerated = (day: string, result: ApiAdGenerateResponse) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((p) =>
          p.day === day
            ? {
                ...p,
                status: "generated" as const,
                caption: result.captions[0].facebook_caption,
                whatsapp_message: result.captions[0].whatsapp_message,
                image_base64: result.banner_image_base64,
              }
            : p,
        ),
      };
    });
  };

  const eligibleDays: { post: ApiContentPlanPost; date: Date }[] = plan
    ? plan.posts
        .filter((p) => p.status === "generated")
        .map((p) => ({ post: p, date: nextDateForDay(p.day, scheduleTime) }))
        .filter((d): d is { post: ApiContentPlanPost; date: Date } => d.date !== null)
    : [];
  const notReadyDays = plan ? plan.posts.filter((p) => p.status !== "generated") : [];
  const selectedDays = eligibleDays.filter((d) => checkedDays[d.post.day]);

  const handleScheduleWeek = async () => {
    if (schedulingWeek || selectedDays.length === 0 || (!scheduleFacebook && !scheduleInstagram)) return;
    setSchedulingWeek(true);
    setScheduleResults({});
    for (const { post, date } of selectedDays) {
      try {
        if (!post.image_base64) throw new Error("No image for this day.");
        const compositedUrl = await compositeImage(
          post.image_base64,
          { headline: deriveOnImageHeadline(post.whatsapp_message ?? "", post.caption ?? "") },
          brandKit,
        );
        const r = await publishToMeta(
          compositedUrl,
          post.caption ?? "",
          scheduleFacebook,
          scheduleInstagram,
          date.toISOString(),
          plan?.id,
          post.day,
        );
        const fbOk = !scheduleFacebook || !!r.facebook?.posted;
        const igOk = !scheduleInstagram || !!r.instagram?.posted;
        setScheduleResults((prev) => ({
          ...prev,
          [post.day]: {
            ok: fbOk && igOk,
            message: !fbOk
              ? `Facebook: ${r.facebook?.error ?? "failed"}`
              : !igOk
                ? `Instagram: ${r.instagram?.error ?? "failed"}`
                : "Scheduled",
          },
        }));
      } catch (err) {
        setScheduleResults((prev) => ({
          ...prev,
          [post.day]: { ok: false, message: err instanceof Error ? err.message : "Couldn't schedule this day." },
        }));
      }
    }
    setSchedulingWeek(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display mb-3 text-lg font-extrabold text-foreground">Weekly Plan</h1>
      <div className="mb-5 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your business type
        </p>
        {showCategoryPicker ? (
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => handleCategoryChange(c)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  category === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                ].join(" ")}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setShowCategoryPicker(true)}
            className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            {category ? CATEGORY_LABELS[category] : "Choose one"} — change
          </button>
        )}
      </div>

      <div className="mb-5 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What do you want to post about this week?
        </p>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={3}
          placeholder="e.g. New spring menu launching, 15% off all bookings this week — or a short description of your product/service"
          className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {!plan && (
        <button
          onClick={handleGeneratePlan}
          disabled={generatingPlan || !inputText.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {generatingPlan ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate plan"
          )}
        </button>
      )}

      {plan && (
        <>
          {plan.posts.map((post) => (
            <PlanDayCard
              key={post.day}
              planId={plan.id}
              post={post}
              credits={credits}
              setCredits={setCredits}
              brandKit={brandKit}
              onGenerated={handlePostGenerated}
            />
          ))}

          {metaConnected && (
            <div className="mb-5 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Calendar className="h-4 w-4" />
                Schedule this week
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Post each ready day to {metaPageName} on its own date — free, just publishes what you've already
                generated.
              </p>

              {eligibleDays.length === 0 ? (
                <p className="text-xs text-muted-foreground">Generate at least one day above first.</p>
              ) : (
                <>
                  <label className="mb-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    Post time
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="rounded-full border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>

                  <div className="mb-3 flex flex-col gap-2">
                    {eligibleDays.map(({ post, date }) => {
                      const result = scheduleResults[post.day];
                      return (
                        <label key={post.day} className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={!!checkedDays[post.day]}
                            onChange={(e) => setCheckedDays((prev) => ({ ...prev, [post.day]: e.target.checked }))}
                          />
                          <span className="flex-1">
                            {DAY_LABELS[post.day] ?? post.day} — {formatScheduleDate(date)}
                          </span>
                          {result && (
                            <span className={result.ok ? "text-primary" : "text-destructive"}>
                              {result.ok ? "✓" : `✗ ${result.message}`}
                            </span>
                          )}
                        </label>
                      );
                    })}
                    {notReadyDays.map((post) => (
                      <p key={post.day} className="text-sm text-muted-foreground">
                        {DAY_LABELS[post.day] ?? post.day} — not ready, generate this day first
                      </p>
                    ))}
                  </div>

                  <label className="mb-1.5 flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={scheduleFacebook}
                      onChange={(e) => setScheduleFacebook(e.target.checked)}
                    />
                    Facebook Page
                  </label>
                  <label className="mb-3 flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={scheduleInstagram}
                      disabled={!hasInstagram}
                      onChange={(e) => setScheduleInstagram(e.target.checked)}
                    />
                    Instagram{!hasInstagram && " (no Instagram linked to this Page)"}
                  </label>
                  {scheduleInstagram && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Instagram has no scheduling — those days post now, right away; only Facebook will wait for its
                      date.
                    </p>
                  )}

                  <button
                    onClick={handleScheduleWeek}
                    disabled={schedulingWeek || selectedDays.length === 0 || (!scheduleFacebook && !scheduleInstagram)}
                    className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {schedulingWeek ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {schedulingWeek ? "Scheduling..." : `Schedule ${selectedDays.length} day${selectedDays.length === 1 ? "" : "s"}`}
                  </button>
                </>
              )}
            </div>
          )}
          {!metaConnected && plan.posts.some((p) => p.status === "generated") && (
            <p className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Facebook className="h-3.5 w-3.5" />
              Connect Facebook (from a Social Post or Ad result screen) to schedule your week.
            </p>
          )}

          <button
            onClick={handleGeneratePlan}
            disabled={generatingPlan || !inputText.trim()}
            className="w-full rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
          >
            {generatingPlan ? "Generating..." : "Generate a new plan"}
          </button>
        </>
      )}
    </>
  );
}
