import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { showToast } from "@/components/GlassToast";
import {
  fetchSchedulingCapabilities,
  fetchTikTokCreatorInfo,
  fetchTikTokStatus,
  getTikTokConnectUrl,
  publishToTikTok,
  type ApiTikTokCreatorInfo,
  type ApiTikTokPublishResponse,
} from "@/lib/api";
import { TikTokIcon } from "@/components/TikTokIcon";
import { PlatformTile } from "@/components/PlatformTile";
import { ScheduleSwitch } from "./ScheduleSwitch";

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

// Mirrors PublishToYouTube's shape closely — same inline-on-the-result-
// screen placement, same connect-then-expand-then-publish flow. TikTok's
// Content Posting API has no native future-publish (unlike Facebook/YouTube), so
// "Schedule for later" only appears while the server's own alarm clock is on
// (fetchSchedulingCapabilities); Punqle then sends the post at that time.
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
  videoKept,
}: {
  videoUrl: string | null;
  headline: string;
  goal?: string | null;
  angle?: string | null;
  style?: string | null;
  videoKept?: boolean; // the server keeps this video 14 days (Recent videos), so connecting does not lose it
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

  const [canSchedule, setCanSchedule] = useState(false); // true only while the server's own alarm clock is on
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<ApiTikTokPublishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Success floats as a glass notice; a failure keeps its detail inline too.
  useEffect(() => {
    if (!result) return;
    showToast(result.posted ? (result.scheduled ? "Scheduled on TikTok" : "Published to TikTok") : `TikTok: ${result.error}`, { tone: result.posted ? "success" : "error" });
  }, [result]);

  useEffect(() => {
    fetchSchedulingCapabilities().then((c) => setCanSchedule(!!c.tiktok)).catch(() => setCanSchedule(false));
  }, []);

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
        // While unaudited, TikTok's real API rejects (403) any
        // privacy_level other than SELF_ONLY — confirmed live by
        // replaying the exact publish request with only this field
        // changed. privacy_level_options reflects the creator's own
        // account settings, not the app's audit status, so it can
        // legitimately list options that would still fail right now —
        // default to the one that's actually usable instead of
        // whichever option happens to sort first.
        setPrivacyLevel(info.is_audited ? info.privacy_level_options[0] ?? "" : "SELF_ONLY");
      })
      .catch((err) => setCreatorInfoError(err instanceof Error ? err.message : "Couldn't load your TikTok posting options."))
      .finally(() => setLoadingCreatorInfo(false));
  }, [expanded, creatorInfo, loadingCreatorInfo]);

  const handleConnect = async () => {
    if (connecting) return;
    // Reached mid-flow with a freshly generated (already paid-for) video
    // sitting only in memory — a bare OAuth redirect would silently
    // discard it, same reason PublishToYouTube warns before navigating away.
    const warning = videoKept
      ? "Connecting will leave this page. Your video stays in Recent videos for 14 days: open it there and tap Post. Continue?"
      : "Connecting will leave this page — your current video won't be saved. Continue?";
    if (!window.confirm(warning)) {
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
    (promotesOwnBrand || hasPaidPartnership) &&
    (!scheduling || !!scheduledAt);

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
        // datetime-local gives the viewer's local time; toISOString() converts it to the UTC the backend expects.
        scheduling && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
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
        className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <PlatformTile platform="tiktok" size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-extrabold text-foreground">Publish to TikTok</span>
          <span className="block text-xs text-muted-foreground">{canSchedule ? "Now, or at a time you choose" : "Share this video on your TikTok"}</span>
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
        <PlatformTile platform="tiktok" size="md" />
        <div className="min-w-0">
          <p className="truncate font-display text-base font-extrabold leading-tight text-foreground">
            Publish to {creatorInfo?.nickname ?? displayName}
          </p>
          <p className="text-xs text-muted-foreground">Choose who sees it and when</p>
        </div>
      </div>
      {creatorInfo && !creatorInfo.is_audited && (
        <p className="mb-3 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Posts land as private while the app is in TikTok's review — that's expected, not a bug.
        </p>
      )}

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
            disabled={!creatorInfo.is_audited}
            className="mb-1.5 w-full rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          >
            {creatorInfo.is_audited ? (
              <>
                <option value="" disabled>
                  Choose who can see this
                </option>
                {creatorInfo.privacy_level_options.map((opt) => (
                  <option key={opt} value={opt}>
                    {PRIVACY_LABELS[opt] ?? opt}
                  </option>
                ))}
              </>
            ) : (
              <option value="SELF_ONLY">Only me</option>
            )}
          </select>
          {creatorInfo.is_audited ? (
            <div className="mb-3" />
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              Locked to "Only me" until Punqle's TikTok app passes review — TikTok itself rejects any other
              option from an app that hasn't been audited yet.
            </p>
          )}

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

      {canSchedule && !alreadyPosted && (
        <ScheduleSwitch
          scheduling={scheduling}
          onScheduling={setScheduling}
          scheduledAt={scheduledAt}
          onScheduledAt={setScheduledAt}
          lines={
            <p className="flex items-center gap-2">
              <PlatformTile platform="tiktok" size="sm" />
              Punqle posts it at that time
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
              <PlatformTile platform="tiktok" size="sm" />
              {result.scheduled ? "TikTok: scheduled. See it in Plan & Publish → Content Calendar." : "TikTok: posted"}
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
            disabled={publishing || !canPublish}
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
