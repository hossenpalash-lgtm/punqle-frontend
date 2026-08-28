import { AlertCircle, CheckCircle2, Clock, Facebook, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchMetaStatus, getMetaConnectUrl, publishToMeta, type ApiMetaPublishResponse } from "@/lib/api";

// Bounds mirror the backend's own validation (_parse_scheduled_time,
// main.py) — shown here too so a bad pick is caught before the request,
// not just after a 400 comes back.
const MIN_SCHEDULE_MINUTES = 10;
const MAX_SCHEDULE_DAYS = 30;

function toDatetimeLocalMin(minutesFromNow: number): string {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

// Inline in the Post Kit, next to Download/Schedule — not a modal, matching
// CarouselBuilder's "tool sits right where the image already is" pattern.
// Note: this app's Post Kit only ever produces "square"/"feed" aspect
// ratios today (see social-wizard.ts's PLATFORM_OPTIONS) — Instagram's
// 4:5–1.91:1 feed limit isn't a live concern yet, but would need handling
// here if a "story" (9:16) option is ever added to that entry point.
export function PublishToMeta({ compositedUrl, caption }: { compositedUrl: string | null; caption: string }) {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connected, setConnected] = useState(false);
  const [pageName, setPageName] = useState<string | null>(null);
  const [hasInstagram, setHasInstagram] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [postFacebook, setPostFacebook] = useState(true);
  const [postInstagram, setPostInstagram] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<ApiMetaPublishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetaStatus()
      .then((r) => {
        setConnected(r.connected);
        setPageName(r.page_name);
        setHasInstagram(!!r.ig_username);
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
      const r = await publishToMeta(compositedUrl, caption, postFacebook, postInstagram, scheduledIso);
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
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
      >
        <Facebook className="h-4 w-4" />
        Post to Facebook{hasInstagram ? " & Instagram" : ""}
      </button>
    );
  }

  // Once a publish attempt has landed a real, successful post on at least
  // one platform, hide the button rather than leave it clickable — a
  // second click would publish a genuine duplicate, not just re-run a
  // harmless preview.
  const alreadyPosted = !!(result?.facebook?.posted || result?.instagram?.posted);

  return (
    <div className="mb-3 rounded-2xl border border-border bg-background p-3.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Post to {pageName}
      </p>

      <label className="mb-1.5 flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={postFacebook} onChange={(e) => setPostFacebook(e.target.checked)} />
        Facebook Page
      </label>
      <label className="mb-3 flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={postInstagram}
          disabled={!hasInstagram}
          onChange={(e) => setPostInstagram(e.target.checked)}
        />
        Instagram{!hasInstagram && " (no Instagram linked to this Page)"}
      </label>

      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setScheduling(false)}
          className={[
            "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold",
            !scheduling ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
          ].join(" ")}
        >
          Post now
        </button>
        <button
          onClick={() => {
            setScheduling(true);
            if (!scheduledAt) setScheduledAt(toDatetimeLocalMin(MIN_SCHEDULE_MINUTES));
          }}
          className={[
            "flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
            scheduling ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
          ].join(" ")}
        >
          <Clock className="h-3 w-3" />
          Schedule for later
        </button>
      </div>

      {scheduling && (
        <div className="mb-3">
          <input
            type="datetime-local"
            value={scheduledAt}
            min={toDatetimeLocalMin(MIN_SCHEDULE_MINUTES)}
            max={toDatetimeLocalMin(MAX_SCHEDULE_DAYS * 24 * 60)}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {postInstagram && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Instagram has no scheduling — it'll post now regardless{postFacebook ? "; only Facebook will wait until then." : "."}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="mb-3 space-y-1 text-sm">
          {result.facebook && (
            <p className={result.facebook.posted ? "text-primary" : "text-destructive"}>
              {result.facebook.posted
                ? result.facebook.scheduled
                  ? "✓ Scheduled on Facebook"
                  : "✓ Posted to Facebook"
                : `✗ Facebook: ${result.facebook.error}`}
            </p>
          )}
          {result.instagram && (
            <p className={result.instagram.posted ? "text-primary" : "text-destructive"}>
              {result.instagram.posted ? "✓ Posted to Instagram" : `✗ Instagram: ${result.instagram.error}`}
            </p>
          )}
        </div>
      )}

      {alreadyPosted ? (
        <button
          onClick={() => setExpanded(false)}
          className="w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground"
        >
          Done
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handlePublish}
            disabled={publishing || (!postFacebook && !postInstagram) || (scheduling && !scheduledAt)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {scheduling ? "Schedule" : "Confirm & Publish"}
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="shrink-0 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
