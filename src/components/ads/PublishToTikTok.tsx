import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchTikTokStatus, getTikTokConnectUrl, publishToTikTok, type ApiTikTokPublishResponse } from "@/lib/api";
import { TikTokIcon } from "@/components/TikTokIcon";

// Mirrors PublishToYouTube's shape closely — same inline-on-the-result-
// screen placement, same connect-then-expand-then-publish flow. No
// scheduling here (TikTok's Content Posting API posts immediately, no
// native future-publish the way Facebook/YouTube have) and one extra
// required control: the branded-content disclosure checkbox, since
// TikTok's own guidelines forbid silently defaulting that choice.
export function PublishToTikTok({
  videoUrl,
  headline,
  goal,
  angle,
  style,
}: {
  videoUrl: string | null;
  headline: string;
  goal?: string | null;
  angle?: string | null;
  style?: string | null;
}) {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connected, setConnected] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [caption, setCaption] = useState("");
  const [isOwnBrand, setIsOwnBrand] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<ApiTikTokPublishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTikTokStatus()
      .then((r) => {
        setConnected(r.connected);
        setDisplayName(r.display_name);
      })
      .catch(() => {
        // Silently stays "not connected" — this is a secondary action on
        // the result screen, not worth surfacing a loud error over.
      })
      .finally(() => setCheckingStatus(false));
  }, []);

  useEffect(() => {
    setCaption(headline || "");
  }, [headline]);

  const handleConnect = async () => {
    if (connecting) return;
    // Reached mid-flow with a freshly generated (already paid-for) video
    // sitting only in memory — a bare OAuth redirect would silently
    // discard it, same reason PublishToYouTube warns before navigating away.
    if (!window.confirm("Connecting will leave this page — your current video won't be saved. Continue?")) {
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const r = await getTikTokConnectUrl();
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to TikTok.");
      setConnecting(false);
    }
  };

  const handlePublish = async () => {
    if (publishing || !videoUrl) return;
    setPublishing(true);
    setError(null);
    setResult(null);
    try {
      const r = await publishToTikTok(videoUrl, caption.trim(), isOwnBrand, undefined, undefined, goal, angle, style);
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
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TikTokIcon className="h-4 w-4" />}
        Connect TikTok to publish directly
      </button>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
      >
        <TikTokIcon className="h-4 w-4" />
        Publish to TikTok
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
        Publish to {displayName}
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Posts land as private while the app is in TikTok's review — that's expected, not a bug.
      </p>

      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Caption</label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={2}
        maxLength={2200}
        disabled={alreadyPosted}
        className="mb-3 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      />

      {!alreadyPosted && (
        <label className="mb-3 flex items-start gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={isOwnBrand}
            onChange={(e) => setIsOwnBrand(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
          />
          <span>
            This video promotes my own business (required by TikTok — uncheck only if this is a paid partnership
            with a different brand).
          </span>
        </label>
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
            <p className="text-primary">✓ Published to TikTok</p>
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
            disabled={publishing}
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirm & Publish
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
