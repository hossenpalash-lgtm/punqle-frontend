import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Send, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { showToast } from "@/components/GlassToast";
import { PlatformTile } from "@/components/PlatformTile";
import { ScheduleSwitch } from "./ScheduleSwitch";
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
  goal,
  angle,
  style,
  videoKept,
}: {
  videoUrl: string | null;
  headline: string;
  aspectRatio: VideoAspectRatio;
  goal?: string | null;
  angle?: string | null;
  style?: string | null;
  videoKept?: boolean; // the server keeps this video 14 days (Recent videos), so connecting does not lose it
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

  // Success floats as a glass notice (with a link to the video); a failure keeps its detail inline too.
  useEffect(() => {
    if (!result) return;
    if (result.posted) {
      showToast(result.scheduled ? "Scheduled on YouTube" : "Published to YouTube", {
        tone: "success",
        href: result.video_url ?? undefined,
      });
    } else {
      showToast(`YouTube: ${result.error}`, { tone: "error" });
    }
  }, [result]);

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
    const warning = videoKept
      ? "Connecting will leave this page. Your video stays in Recent videos for 14 days: open it there and tap Post. Continue?"
      : "Connecting will leave this page — your current video and headline won't be saved. Continue?";
    if (!window.confirm(warning)) {
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
      const r = await publishToYouTube(
        videoUrl, title.trim(), description.trim(), aspectRatio, scheduledIso,
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
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
        Connect YouTube to publish directly
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
        <PlatformTile platform="youtube" size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-extrabold text-foreground">Publish to YouTube</span>
          <span className="block text-xs text-muted-foreground">Now, or at a time you choose</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    );
  }

  // Once a publish attempt lands a real, successful upload, hide the
  // button rather than leave it clickable — a second click would upload
  // a genuine duplicate video, not just re-run a harmless preview.
  const alreadyPosted = !!result?.posted;

  return (
    <div className="mb-3 overflow-hidden rounded-3xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-3 flex items-center gap-3">
        <PlatformTile platform="youtube" size="md" />
        <div className="min-w-0">
          <p className="truncate font-display text-base font-extrabold leading-tight text-foreground">Publish to {channelTitle}</p>
          <p className="text-xs text-muted-foreground">Title, description and when</p>
        </div>
      </div>

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
        <ScheduleSwitch
          scheduling={scheduling}
          onScheduling={setScheduling}
          scheduledAt={scheduledAt}
          onScheduledAt={setScheduledAt}
          lines={
            <p className="flex items-center gap-2">
              <PlatformTile platform="youtube" size="sm" />
              YouTube posts it at that time
            </p>
          }
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
            <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-foreground">
              <PlatformTile platform="youtube" size="sm" />
              {result.scheduled ? "YouTube: scheduled. See it in Plan & Publish → Content Calendar." : "YouTube: published"}
            </p>
          ) : (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive">✗ {result.error}</p>
          )}
        </div>
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
            disabled={publishing || !title.trim() || (scheduling && !scheduledAt)}
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
  );
}
