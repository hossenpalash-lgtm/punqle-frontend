import { AlertCircle, CalendarClock, Check, CheckCircle2, ChevronRight, Clock, Facebook, Loader2, Send, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchMetaStatus, fetchSchedulingCapabilities, getMetaConnectUrl, publishToMeta, type ApiMetaPublishResponse } from "@/lib/api";
import { MIN_SCHEDULE_MINUTES, MAX_SCHEDULE_DAYS, formatScheduleDate, toDatetimeLocalMin } from "@/lib/schedule-dates";
import { showToast } from "@/components/GlassToast";
import { PlatformTile } from "@/components/PlatformTile";

// Inline in the Post Kit, next to Download/Schedule — not a modal, matching
// CarouselBuilder's "tool sits right where the image already is" pattern.
// Shapes: the Post Kit makes 1:1, 4:5 and 9:16 pictures (social-wizard.ts's PLATFORM_OPTIONS). Instagram's feed
// only takes 4:5 to 1.91:1, so the backend publishes a 9:16 picture as an Instagram Story instead
// (_publish_to_instagram); this panel just tells the person so.
export function PublishToMeta({
  compositedUrl,
  caption,
  goal,
  angle,
  style,
}: {
  compositedUrl: string | null;
  caption: string;
  goal?: string | null;
  angle?: string | null;
  style?: string | null;
}) {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connected, setConnected] = useState(false);
  const [pageName, setPageName] = useState<string | null>(null);
  const [hasInstagram, setHasInstagram] = useState(false);
  const [igName, setIgName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [postFacebook, setPostFacebook] = useState(true);
  const [postInstagram, setPostInstagram] = useState(false);
  // A tall 9:16 picture (the "Story / Reel" shape) is posted to Instagram as a Story, which has no caption.
  const [isStoryShape, setIsStoryShape] = useState(false);
  const [instagramCanSchedule, setInstagramCanSchedule] = useState(false); // true only while the server's own alarm clock is on
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<ApiMetaPublishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Success floats as a glass notice; a failure keeps its detail inline below too.
  useEffect(() => {
    if (!result) return;
    if (result.facebook?.posted) showToast(result.facebook.scheduled ? "Scheduled on Facebook" : "Posted to Facebook", { tone: "success" });
    if (result.instagram?.posted) showToast(result.instagram.scheduled ? "Scheduled on Instagram" : "Posted to Instagram", { tone: "success" });
    if (result.facebook && !result.facebook.posted) showToast(`Facebook: ${result.facebook.error}`, { tone: "error" });
    if (result.instagram && !result.instagram.posted) showToast(`Instagram: ${result.instagram.error}`, { tone: "error" });
  }, [result]);

  useEffect(() => {
    if (!compositedUrl) {
      setIsStoryShape(false);
      return;
    }
    const probe = new Image();
    probe.onload = () => setIsStoryShape(probe.naturalHeight > 0 && probe.naturalWidth / probe.naturalHeight < 0.7);
    probe.src = compositedUrl;
  }, [compositedUrl]);

  useEffect(() => {
    fetchSchedulingCapabilities().then((c) => setInstagramCanSchedule(!!c.instagram)).catch(() => setInstagramCanSchedule(false));
  }, []);

  useEffect(() => {
    fetchMetaStatus()
      .then((r) => {
        setConnected(r.connected);
        setPageName(r.page_name);
        setHasInstagram(!!r.ig_username);
        setIgName(r.ig_username || null);
        setPostInstagram(!!r.ig_username);
      })
      .catch(() => {
        // Silently stays "not connected" — this is a secondary action on
        // the result screen, not worth surfacing a loud error over.
      })
      .finally(() => setCheckingStatus(false));
  }, []);

  const handleConnect = async () => {
    if (connecting) return;
    // Reached mid-wizard with a freshly generated (already paid-for)
    // image + edited caption sitting only in memory — a bare OAuth
    // redirect would silently discard both, so this is the one place in
    // the app that warns before navigating away.
    if (!window.confirm("Connecting will leave this page — your current image and caption won't be saved. Continue?")) {
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const r = await getMetaConnectUrl();
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to Facebook.");
      setConnecting(false);
    }
  };

  const handlePublish = async () => {
    if (publishing || !compositedUrl || (!postFacebook && !postInstagram)) return;
    if (scheduling && !scheduledAt) return;
    setPublishing(true);
    setError(null);
    setResult(null);
    try {
      // datetime-local has no timezone — new Date() reads it as local time,
      // and toISOString() converts to the UTC the backend expects.
      const scheduledIso = scheduling && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
      const r = await publishToMeta(
        compositedUrl, caption, postFacebook, postInstagram, scheduledIso,
        undefined, undefined, goal, angle, style,
      );
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  if (checkingStatus) return null;

  if (!connected) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
      >
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
        Connect Facebook to post directly
      </button>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <span className="flex -space-x-2">
          <PlatformTile platform="facebook" size="lg" ring />
          {hasInstagram && <PlatformTile platform="instagram" size="lg" ring />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-extrabold text-foreground">
            Post to Facebook{hasInstagram ? " & Instagram" : ""}
          </span>
          <span className="block text-xs text-muted-foreground">Now, or at a time you choose</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    );
  }

  // Once a publish attempt has landed a real, successful post on at least
  // one platform, hide the button rather than leave it clickable — a
  // second click would publish a genuine duplicate, not just re-run a
  // harmless preview.
  const alreadyPosted = !!(result?.facebook?.posted || result?.instagram?.posted);

  const tile = (key: "facebook" | "instagram", on: boolean, setOn: (v: boolean) => void, name: string, sub: string, disabled = false) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      disabled={disabled || alreadyPosted}
      onClick={() => setOn(!on)}
      className={[
        "relative flex flex-col items-start gap-2 rounded-2xl p-3 text-left transition-colors",
        on ? "border-2 border-foreground bg-card" : "border border-border bg-secondary/60",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      <PlatformTile platform={key} size="lg" />
      <span className="min-w-0 max-w-full">
        <span className="block text-sm font-bold text-foreground">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      <span
        className={[
          "absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border",
          on ? "border-foreground bg-foreground text-background" : "border-border bg-background text-transparent",
        ].join(" ")}
        aria-hidden="true"
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  );

  return (
    <div className="mb-3 overflow-hidden rounded-3xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-3 px-4 pb-1 pt-4">
        <span className="flex -space-x-2">
          <PlatformTile platform="facebook" size="md" ring />
          {hasInstagram && <PlatformTile platform="instagram" size="md" ring />}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-extrabold leading-tight text-foreground">Post to {pageName}</p>
          <p className="text-xs text-muted-foreground">Pick where it goes and when</p>
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          {tile("facebook", postFacebook, setPostFacebook, "Facebook", pageName || "Your Page")}
          {tile("instagram", postInstagram, setPostInstagram, "Instagram", hasInstagram ? (igName ? `@${igName}` : "Linked") : "Not linked", !hasInstagram)}
        </div>
        {postInstagram && isStoryShape && (
          <p className="-mt-1 text-xs text-muted-foreground">This tall picture goes to Instagram as a Story (Stories have no caption).</p>
        )}

        <div className="flex rounded-full bg-secondary p-1" role="tablist" aria-label="When to post">
          <button
            role="tab"
            aria-selected={!scheduling}
            disabled={alreadyPosted}
            onClick={() => setScheduling(false)}
            className={["flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full py-2 text-sm font-semibold transition-colors", !scheduling ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"].join(" ")}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Post now
          </button>
          <button
            role="tab"
            aria-selected={scheduling}
            disabled={alreadyPosted}
            onClick={() => {
              setScheduling(true);
              if (!scheduledAt) setScheduledAt(toDatetimeLocalMin(MIN_SCHEDULE_MINUTES));
            }}
            className={["flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full py-2 text-sm font-semibold transition-colors", scheduling ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"].join(" ")}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Schedule
          </button>
        </div>

        {scheduling && (
          <div className="rounded-2xl bg-secondary p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              When
            </p>
            <input
              type="datetime-local"
              value={scheduledAt}
              disabled={alreadyPosted}
              min={toDatetimeLocalMin(MIN_SCHEDULE_MINUTES)}
              max={toDatetimeLocalMin(MAX_SCHEDULE_DAYS * 24 * 60)}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {scheduledAt && (
              <p className="mt-2 font-display text-[15px] font-extrabold text-foreground">{formatScheduleDate(new Date(scheduledAt))}</p>
            )}
            <ul className="mt-2.5 space-y-1.5">
              {postFacebook && (
                <li className="flex items-center gap-2 text-[13px] text-foreground">
                  <PlatformTile platform="facebook" size="sm" />
                  Facebook posts it at that time
                </li>
              )}
              {postInstagram && (
                <li className="flex items-center gap-2 text-[13px] text-foreground">
                  <PlatformTile platform="instagram" size="sm" />
                  {instagramCanSchedule ? "Punqle posts it at that time" : "Posts right now (Instagram can't wait)"}
                </li>
              )}
            </ul>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {result && (
          <ul className="space-y-1.5 text-sm">
            {result.facebook && (
              <li className={["flex items-center gap-2 rounded-xl px-3 py-2", result.facebook.posted ? "bg-emerald-500/10 text-foreground" : "bg-destructive/10 text-destructive"].join(" ")}>
                <PlatformTile platform="facebook" size="sm" />
                {result.facebook.posted ? (result.facebook.scheduled ? "Facebook: scheduled" : "Facebook: posted") : `Facebook: ${result.facebook.error}`}
              </li>
            )}
            {result.instagram && (
              <li className={["flex items-center gap-2 rounded-xl px-3 py-2", result.instagram.posted ? "bg-emerald-500/10 text-foreground" : "bg-destructive/10 text-destructive"].join(" ")}>
                <PlatformTile platform="instagram" size="sm" />
                {result.instagram.posted ? (result.instagram.scheduled ? "Instagram: scheduled" : "Instagram: posted") : `Instagram: ${result.instagram.error}`}
              </li>
            )}
            {alreadyPosted && (result.facebook?.scheduled || result.instagram?.scheduled) && (
              <li className="px-1 text-xs text-muted-foreground">See it in Plan &amp; Publish → Content Calendar.</li>
            )}
          </ul>
        )}

        {alreadyPosted ? (
          <button
            onClick={() => setExpanded(false)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"
          >
            <CheckCircle2 className="h-4 w-4" />
            Done
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handlePublish}
              disabled={publishing || (!postFacebook && !postInstagram) || (scheduling && !scheduledAt)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {scheduling ? "Schedule post" : "Publish now"}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="shrink-0 rounded-full bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
