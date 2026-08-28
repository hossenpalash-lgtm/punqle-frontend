import { AlertCircle, CheckCircle2, Clock, Loader2, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchYouTubeStatus,
  getYouTubeConnectUrl,
  publishToYouTube,
  type ApiYouTubePublishResponse,
  type VideoAspectRatio,
} from "@/lib/api";

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

// Inline in VideoPostForm's result screen, next to Download/Create another
// — not a modal, same "tool sits right where the content already is"
// pattern as PublishToMeta. Simpler than Meta's version: one platform, no
// checkboxes — just an editable title (pre-filled from the AI headline)
// and an optional description.
export function PublishToYouTube({
  videoUrl,
  headline,
  aspectRatio,
}: {
  videoUrl: string | null;
  headline: string;
  aspectRatio: VideoAspectRatio;
}) {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connected, setConnected] = useState(false);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<ApiYouTubePublishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchYouTubeStatus()
      .then((r) => {
        setConnected(r.connected);
        setChannelTitle(r.channel_title);
      })
      .catch(() => {
        // Silently stays "not connected" — this is a secondary action on
        // the result screen, not worth surfacing a loud error over.
      })
      .finally(() => setCheckingStatus(false));
  }, []);

  useEffect(() => {
    setTitle(headline || "My ad video");
  }, [headline]);

  const handleConnect = async () => {
    if (connecting) return;
    // Reached mid-flow with a freshly generated (already paid-for) video
    // sitting only in memory — a bare OAuth redirect would silently
    // discard it, same reason PublishToMeta warns before navigating away.
    if (!window.confirm("Connecting will leave this page — your current video and headline won't be saved. Continue?")) {
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const r = await getYouTubeConnectUrl();
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to YouTube.");
      setConnecting(false);
    }
  };

  const handlePublish = async () => {
    if (publishing || !videoUrl || !title.trim()) return;
    if (scheduling && !scheduledAt) return;
    setPublishing(true);
    setError(null);
    setResult(null);
    try {
      // datetime-local has no timezone — new Date() reads it as local time,
      // and toISOString() converts to the UTC the backend expects.
      const scheduledIso = scheduling && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
      const r = await publishToYouTube(videoUrl, title.trim(), description.trim(), aspectRatio, scheduledIso);
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
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
        Connect YouTube to publish directly
      </button>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
      >
        <Youtube className="h-4 w-4" />
        Publish to YouTube
      </button>
    );
  }

  // Once a publish attempt lands a real, successful upload, hide the
  // button rather than leave it clickable — a second click would upload
  // a genuine duplicate video, not just re-run a harmless preview.
  const alreadyPosted = !!result?.posted;

  return (
    <div className="mb-3 rounded-2xl border border-border bg-background p-3.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Publish to {channelTitle}
      </p>

      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Title</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        disabled={alreadyPosted}
        className="mb-3 w-full rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      />

      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Description (optional)</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        disabled={alreadyPosted}
        className="mb-3 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      />

      {!alreadyPosted && (
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
      )}

      {!alreadyPosted && scheduling && (
        <input
          type="datetime-local"
          value={scheduledAt}
          min={toDatetimeLocalMin(MIN_SCHEDULE_MINUTES)}
          max={toDatetimeLocalMin(MAX_SCHEDULE_DAYS * 24 * 60)}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mb-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="mb-3 text-sm">
          {result.posted ? (
            <p className="text-primary">
              {result.scheduled ? "✓ Scheduled on YouTube" : "✓ Published to YouTube"}
              {result.video_url && (
                <>
                  {" — "}
                  <a href={result.video_url} target="_blank" rel="noreferrer" className="underline">
                    view it
                  </a>
                </>
              )}
            </p>
          ) : (
            <p className="text-destructive">✗ {result.error}</p>
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
            disabled={publishing || !title.trim() || (scheduling && !scheduledAt)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
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
