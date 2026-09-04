import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchTikTokCreatorInfo,
  fetchTikTokStatus,
  getTikTokConnectUrl,
  publishToTikTok,
  type ApiTikTokCreatorInfo,
  type ApiTikTokPublishResponse,
} from "@/lib/api";
import { TikTokIcon } from "@/components/TikTokIcon";

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

// Mirrors PublishToYouTube's shape closely — same inline-on-the-result-
// screen placement, same connect-then-expand-then-publish flow. No
// scheduling here (TikTok's Content Posting API posts immediately, no
// native future-publish the way Facebook/YouTube have).
//
// The confirmation screen below (nickname, privacy dropdown, comment/
// duet/stitch toggles, branded-content disclosure) exists because
// TikTok's own Content Sharing Guidelines mandate it be shown before
// every publish, sourced live from /tiktok/creator-info rather than any
// app-wide default — a real, documented requirement for passing
// TikTok's audit (the review that lifts the 5-users/24h + forced-
// private-post Sandbox restrictions), not decoration.
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

  const [creatorInfo, setCreatorInfo] = useState<ApiTikTokCreatorInfo | null>(null);
  const [loadingCreatorInfo, setLoadingCreatorInfo] = useState(false);
  const [creatorInfoError, setCreatorInfoError] = useState<string | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState("");
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [promotesOwnBrand, setPromotesOwnBrand] = useState(true);
  const [hasPaidPartnership, setHasPaidPartnership] = useState(false);

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

  // Fetched fresh every time the panel opens, never cached — the
  // creator could have changed these settings in the TikTok app since
  // the last visit, and TikTok's guidelines require this be current.
  useEffect(() => {
    if (!expanded || creatorInfo || loadingCreatorInfo) return;
    setLoadingCreatorInfo(true);
    setCreatorInfoError(null);
    fetchTikTokCreatorInfo()
      .then((info) => {
        setCreatorInfo(info);
        setPrivacyLevel(info.privacy_level_options[0] ?? "");
      })
      .catch((err) => setCreatorInfoError(err instanceof Error ? err.message : "Couldn't load your TikTok posting options."))
      .finally(() => setLoadingCreatorInfo(false));
  }, [expanded, creatorInfo, loadingCreatorInfo]);

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

  const canPublish =
    !!videoUrl &&
    !!creatorInfo &&
    !!privacyLevel &&
    (promotesOwnBrand || hasPaidPartnership);

  const handlePublish = async () => {
    if (publishing || !canPublish) return;
    setPublishing(true);
    setError(null);
    setResult(null);
    try {
      const r = await publishToTikTok(
        videoUrl!,
        caption.trim(),
        privacyLevel,
        allowComment,
        allowDuet,
        allowStitch,
        promotesOwnBrand,
        hasPaidPartnership,
        undefined,
        undefined,
        goal,
        angle,
        style,
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
        Publish to {creatorInfo?.nickname ?? displayName}
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Posts land as private while the app is in TikTok's review — that's expected, not a bug.
      </p>

      {loadingCreatorInfo ? (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading your TikTok posting options...
        </div>
      ) : creatorInfoError ? (
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {creatorInfoError}
        </p>
      ) : null}

      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Caption</label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={2}
        maxLength={2200}
        disabled={alreadyPosted}
        className="mb-3 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      />

      {creatorInfo && !alreadyPosted && (
        <>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Who can see this</label>
          <select
            value={privacyLevel}
            onChange={(e) => setPrivacyLevel(e.target.value)}
            className="mb-3 w-full rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="" disabled>
              Choose who can see this
            </option>
            {creatorInfo.privacy_level_options.map((opt) => (
              <option key={opt} value={opt}>
                {PRIVACY_LABELS[opt] ?? opt}
              </option>
            ))}
          </select>

          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Allow on this post</label>
          <div className="mb-3 flex flex-wrap gap-3">
            <label className={`flex items-center gap-1.5 text-xs text-foreground ${creatorInfo.comment_disabled ? "opacity-50" : ""}`}>
              <input
                type="checkbox"
                checked={allowComment && !creatorInfo.comment_disabled}
                disabled={creatorInfo.comment_disabled}
                onChange={(e) => setAllowComment(e.target.checked)}
              />
              Comments
            </label>
            <label className={`flex items-center gap-1.5 text-xs text-foreground ${creatorInfo.duet_disabled ? "opacity-50" : ""}`}>
              <input
                type="checkbox"
                checked={allowDuet && !creatorInfo.duet_disabled}
                disabled={creatorInfo.duet_disabled}
                onChange={(e) => setAllowDuet(e.target.checked)}
              />
              Duet
            </label>
            <label className={`flex items-center gap-1.5 text-xs text-foreground ${creatorInfo.stitch_disabled ? "opacity-50" : ""}`}>
              <input
                type="checkbox"
                checked={allowStitch && !creatorInfo.stitch_disabled}
                disabled={creatorInfo.stitch_disabled}
                onChange={(e) => setAllowStitch(e.target.checked)}
              />
              Stitch
            </label>
          </div>

          <label className="mb-1.5 flex items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={promotesOwnBrand}
              onChange={(e) => setPromotesOwnBrand(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
            />
            <span>This video promotes my own business.</span>
          </label>
          <label className="mb-2 flex items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={hasPaidPartnership}
              onChange={(e) => setHasPaidPartnership(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
            />
            <span>This is a paid partnership with a different brand.</span>
          </label>
          {!promotesOwnBrand && !hasPaidPartnership && (
            <p className="mb-2 text-xs font-medium text-destructive">Choose at least one of the two above.</p>
          )}
          {(promotesOwnBrand || hasPaidPartnership) && (
            <p className="mb-3 text-xs text-muted-foreground">
              By posting, you agree to TikTok's{" "}
              <a
                href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Music Usage Confirmation
              </a>
              {hasPaidPartnership && (
                <>
                  {" "}
                  and{" "}
                  <a
                    href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Branded Content Policy
                  </a>
                </>
              )}
              .
            </p>
          )}
        </>
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
            disabled={publishing || !canPublish}
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
