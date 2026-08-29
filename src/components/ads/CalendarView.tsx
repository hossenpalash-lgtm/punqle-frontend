import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Facebook,
  Loader2,
  Send,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteScheduledPost,
  fetchCurrentContentPlan,
  fetchScheduledPosts,
  postScheduledPostNow,
  updateScheduledPost,
  type ApiScheduledPost,
} from "@/lib/api";
import { addDays, startOfWeek, toDatetimeLocalValue } from "@/lib/schedule-dates";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startPart = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endPart = end.toLocaleDateString(undefined, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startPart} – ${endPart}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const STATUS_META: Record<ApiScheduledPost["status"], { label: string; className: string; icon: typeof Clock }> = {
  scheduled: { label: "Scheduled", className: "text-muted-foreground", icon: Clock },
  // Optimistic, not verified against Meta/YouTube — see backend
  // _effective_status: a scheduled post whose time has passed is shown
  // as Published without ever confirming it actually went out, since
  // the connected Meta token can't list/read Page content back.
  published: { label: "Published", className: "text-primary", icon: CheckCircle2 },
  failed: { label: "Failed", className: "text-destructive", icon: AlertCircle },
};

// Visual week grid on top of scheduled_posts (the persistence layer added
// alongside this feature — before it, nothing scheduled was ever
// remembered once handed to Facebook/YouTube). Deliberately does NOT
// also render not-yet-scheduled Weekly Plan days as cards here — they're
// abstract-weekday-anchored with no real date until scheduled, and a
// fictional date would have to be invented just to pick a column. A
// lightweight banner points back to Weekly Plan instead.
export function CalendarView({ onGoToWeeklyPlan }: { onGoToWeeklyPlan: () => void }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [posts, setPosts] = useState<ApiScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readyToScheduleCount, setReadyToScheduleCount] = useState(0);

  const [selectedPost, setSelectedPost] = useState<ApiScheduledPost | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [postingNow, setPostingNow] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadPosts = () => {
    setLoading(true);
    setError(null);
    fetchScheduledPosts(weekStart, addDays(weekStart, 7))
      .then((r) => setPosts(r.posts))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the calendar."))
      .finally(() => setLoading(false));
  };

  useEffect(loadPosts, [weekStart]);

  useEffect(() => {
    fetchCurrentContentPlan()
      .then((plan) => setReadyToScheduleCount(plan?.posts.filter((p) => p.status === "generated").length ?? 0))
      .catch(() => {
        // Secondary banner, not worth surfacing a loud error over.
      });
  }, []);

  const openPost = (post: ApiScheduledPost) => {
    setSelectedPost(post);
    setEditCaption(post.caption);
    setEditDateTime(toDatetimeLocalValue(post.scheduled_time));
    setModalError(null);
  };

  const closeModal = () => {
    setSelectedPost(null);
    setModalError(null);
  };

  const handleSave = async () => {
    if (!selectedPost || saving) return;
    const captionChanged = editCaption !== selectedPost.caption;
    const newIso = new Date(editDateTime).toISOString();
    const timeChanged = newIso !== new Date(selectedPost.scheduled_time).toISOString();
    if (!captionChanged && !timeChanged) return;
    setSaving(true);
    setModalError(null);
    try {
      await updateScheduledPost(selectedPost.id, {
        caption: captionChanged ? editCaption : undefined,
        scheduledTime: timeChanged ? newIso : undefined,
      });
      closeModal();
      loadPosts();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Couldn't reschedule this post.");
    } finally {
      setSaving(false);
    }
  };

  const handlePostNow = async () => {
    if (!selectedPost || postingNow) return;
    setPostingNow(true);
    setModalError(null);
    try {
      await postScheduledPostNow(selectedPost.id);
      closeModal();
      loadPosts();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Couldn't post this now.");
    } finally {
      setPostingNow(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPost || deleting) return;
    if (!window.confirm("Cancel this scheduled post? This can't be undone.")) return;
    setDeleting(true);
    setModalError(null);
    try {
      await deleteScheduledPost(selectedPost.id);
      closeModal();
      loadPosts();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Couldn't cancel this post.");
    } finally {
      setDeleting(false);
    }
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <>
      <h1 className="font-display mb-1 flex items-center gap-2 text-xl font-extrabold text-foreground">
        <CalendarClock className="h-4 w-4 text-accent" />
        Content Calendar
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">Everything Punqle has scheduled, in one place.</p>

      {readyToScheduleCount > 0 && (
        <button
          onClick={onGoToWeeklyPlan}
          className="mb-4 flex w-full items-center justify-between gap-2 rounded-2xl bg-card p-3.5 text-left text-sm"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span className="text-foreground">
            <span className="font-semibold">{readyToScheduleCount} day{readyToScheduleCount === 1 ? "" : "s"}</span> ready to
            schedule this week
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">Go to Weekly Plan →</span>
        </button>
      )}

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-card p-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          aria-label="Previous week"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-foreground">{formatWeekRange(weekStart)}</span>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="text-xs font-medium text-primary">
            This week
          </button>
        </div>
        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          aria-label="Next week"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {days.map((day, i) => {
            const dayPosts = posts
              .filter((p) => isSameDay(new Date(p.scheduled_time), day))
              .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
            return (
              <div key={day.toISOString()} className="w-36 shrink-0">
                <p
                  className={[
                    "mb-2 text-center text-xs font-semibold uppercase tracking-wider",
                    isSameDay(day, today) ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {DAY_LABELS[i]} {day.getDate()}
                </p>
                <div className="flex flex-col gap-2">
                  {dayPosts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border py-4 text-center text-[11px] text-muted-foreground/70">
                      —
                    </div>
                  ) : (
                    dayPosts.map((post) => {
                      const meta = STATUS_META[post.status];
                      const StatusIcon = meta.icon;
                      const PlatformIcon = post.platform === "facebook" ? Facebook : Youtube;
                      return (
                        <button
                          key={post.id}
                          onClick={() => openPost(post)}
                          className="rounded-xl bg-card p-2 text-left"
                          style={{ boxShadow: "var(--shadow-card)" }}
                        >
                          {post.image_base64 ? (
                            <img
                              src={`data:image/jpeg;base64,${post.image_base64}`}
                              alt=""
                              className="mb-1.5 h-16 w-full rounded-lg object-cover"
                            />
                          ) : (
                            <div className="mb-1.5 flex h-16 w-full items-center justify-center rounded-lg bg-secondary">
                              <Youtube className="h-5 w-5 text-secondary-foreground" />
                            </div>
                          )}
                          <p className="line-clamp-2 text-[11px] text-foreground">{post.caption || "(no caption)"}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <PlatformIcon className="h-3 w-3" />
                              {new Date(post.scheduled_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                            </span>
                            <span
                              className={["flex items-center gap-0.5 text-[10px] font-medium", meta.className].join(" ")}
                              title={
                                post.status === "published"
                                  ? "Based on the platform accepting the scheduled post — not independently confirmed."
                                  : meta.label
                              }
                            >
                              <StatusIcon className="h-3 w-3" />
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedPost.platform === "facebook" ? (
                  <Facebook className="h-5 w-5 text-primary" />
                ) : (
                  <Youtube className="h-5 w-5 text-primary" />
                )}
                <h2 className="font-display text-lg font-extrabold text-foreground">
                  {selectedPost.platform === "facebook" ? "Facebook" : "YouTube"} post
                </h2>
              </div>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedPost.image_base64 && (
              <img
                src={`data:image/jpeg;base64,${selectedPost.image_base64}`}
                alt=""
                className="mb-3 h-40 w-full rounded-xl object-cover"
              />
            )}

            <p className={[selectedPost.status === "published" ? "mb-1" : "mb-3", "flex items-center gap-1.5 text-sm font-medium", STATUS_META[selectedPost.status].className].join(" ")}>
              {(() => {
                const StatusIcon = STATUS_META[selectedPost.status].icon;
                return <StatusIcon className="h-4 w-4" />;
              })()}
              {STATUS_META[selectedPost.status].label}
            </p>
            {selectedPost.status === "published" && (
              <p className="mb-3 text-xs text-muted-foreground">
                Based on the platform accepting the scheduled post — Punqle doesn't independently confirm it went live.
              </p>
            )}

            {selectedPost.status === "failed" && selectedPost.error && (
              <p className="mb-3 text-sm text-destructive">{selectedPost.error}</p>
            )}

            {selectedPost.status === "scheduled" ? (
              <>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Caption
                </label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  className="mb-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />

                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date &amp; time
                </label>
                <input
                  type="datetime-local"
                  value={editDateTime}
                  onChange={(e) => setEditDateTime(e.target.value)}
                  className="mb-4 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />

                {modalError && (
                  <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {modalError}
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || (editCaption === selectedPost.caption && new Date(editDateTime).toISOString() === new Date(selectedPost.scheduled_time).toISOString())}
                    className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save changes
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePostNow}
                      disabled={postingNow || deleting}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
                    >
                      {postingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Post now
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={postingNow || deleting}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-60"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 whitespace-pre-wrap text-sm text-foreground">{selectedPost.caption}</p>
                <p className="mb-4 text-xs text-muted-foreground">
                  {new Date(selectedPost.scheduled_time).toLocaleString(undefined, {
                    weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </p>
                <button
                  onClick={closeModal}
                  className="w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
