import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { showToast } from "@/components/GlassToast";
import { markPostReturn } from "@/lib/post-return";
import {
  fetchSchedulingCapabilities,
  fetchTikTokCreatorInfo,
  fetchTikTokStatus,
  getTikTokConnectUrl,
  publishToTikTok,
  type ApiTikTokCreatorInfo,
  type ApiTikTokPublishResponse,
  type VideoPostTags,
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
  videoTags,
  videoKept,
  startOpen,
  watermarkFree,
}: {
  videoUrl: string | null;
  headline: string;
  goal?: string | null;
  angle?: string | null;
  style?: string | null;
  videoTags?: VideoPostTags; // length + Enhancer of this video (see PostThisVideo)
  videoKept?: boolean; // the server keeps this video 14 days (Recent videos), so connecting does not lose it
  startOpen?: boolean; // open the form straight away (the caller already showed a button for it)
  watermarkFree?: boolean; // this exact video is a clean copy (an unlocked one); TikTok forbids a brand watermark on posted videos
}) {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connected, setConnected] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [expanded, setExpanded] = useState(!!startOpen);
  const [caption, setCaption] = useState("");

  const [creatorInfo, setCreatorInfo] = useState<ApiTikTokCreatorInfo | null>(null);
  const [loadingCreatorInfo, setLoadingCreatorInfo] = useState(false);
  const [creatorInfoError, setCreatorInfoError] = useState<string | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState("");
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  // TikTok's Content Sharing Guidelines: the commercial-content disclosure is a toggle that is OFF by default; only when it
  // is on do "Your brand" / "Branded content" appear, and then at least one must be chosen.
  const [discloseOn, setDiscloseOn] = useState(false);
  const [promotesOwnBrand, setPromotesOwnBrand] = useState(false);
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
        // TikTok's guidelines: the creator picks who can see the post from a dropdown of THEIR real options, and there is
        // no default value. While the app is unaudited the server still publishes every post as "Only me" (TikTok's own
        // API rejects anything else), which the notice below says openly.
        setPrivacyLevel("");
      })
      .catch((err) => setCreatorInfoError(err instanceof Error ? err.message : "Couldn't load your TikTok posting options."))
      .finally(() => setLoadingCreatorInfo(false));
  }, [expanded, creatorInfo, loadingCreatorInfo]);

  const handleConnect = async () => {
    if (connecting) return;
    // Reached mid-flow with a freshly generated (already paid-for) video
    // sitting only in memory — a bare OAuth redirect would silently
    // discard it, same reason PublishToYouTube warns before navigating away.
    // A kept video needs no warning: Punqle brings the customer straight back to it afterwards (lib/post-return.ts).
    if (!videoKept && !window.confirm("Connecting will leave this page — your current video won't be saved. Continue?")) {
      return;
    }
    if (videoKept) markPostReturn();
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

  // TikTok forbids a brand watermark on posted videos; every video a free account makes carries the Punqle one.
  const watermarkBlocked = !!creatorInfo?.watermark_blocked && !watermarkFree;
  const canPublish =
    !!videoUrl &&
    !!creatorInfo &&
    !!privacyLevel &&
    !watermarkBlocked &&
    (!discloseOn || promotesOwnBrand || hasPaidPartnership) &&
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
        discloseOn && promotesOwnBrand,
        discloseOn && hasPaidPartnership,
        undefined,
        undefined,
        goal,
        angle,
        style,
        // datetime-local gives the viewer's local time; toISOString() converts it to the UTC the backend expects.
        scheduling && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        videoTags,
        watermarkFree,
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
          While Punqle's TikTok access is in review, TikTok publishes every post as "Only me" (private), whatever you pick below — that's expected, not a bug.
        </p>
      )}
      {watermarkBlocked && (
        <p className="mb-3 flex items-start gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            TikTok doesn't allow a brand watermark on posted videos, and this video carries the Punqle watermark. Get it without the
            watermark (or make a new one with a paid plan or a credit pack), then post it.
          </span>
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
            className="mb-1.5 w-full rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {/* TikTok's guidelines: the creator's own options from creator_info, no default value, chosen by hand. */}
            <option value="" disabled>
              Choose who can see this
            </option>
            {creatorInfo.privacy_level_options.map((opt) => (
              <option key={opt} value={opt} disabled={discloseOn && hasPaidPartnership && opt === "SELF_ONLY"}>
                {PRIVACY_LABELS[opt] ?? opt}
                {discloseOn && hasPaidPartnership && opt === "SELF_ONLY" ? " — branded content can't be private" : ""}
              </option>
            ))}
          </select>
          <div className="mb-3" />

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

          {/* Commercial-content disclosure, TikTok's way: a toggle that is OFF by default; only when it is on do the two
              choices appear, and then at least one must be picked. */}
          <label className="mb-1 flex items-start gap-2 text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={discloseOn}
              onChange={(e) => {
                setDiscloseOn(e.target.checked);
                if (!e.target.checked) {
                  setPromotesOwnBrand(false);
                  setHasPaidPartnership(false);
                }
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
            />
            <span>Disclose post content</span>
          </label>
          <p className="mb-2 pl-6 text-xs text-muted-foreground">
            Turn this on to say that this video promotes yourself, a brand, product or service.
          </p>
          {discloseOn && (
            <div className="mb-2 pl-6">
              <label className="mb-1.5 flex items-start gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={promotesOwnBrand}
                  onChange={(e) => setPromotesOwnBrand(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                />
                <span>
                  <span className="font-semibold">Your brand</span>
                  <span className="block text-muted-foreground">You are promoting yourself or your own business. This video will be classified as Brand Organic.</span>
                </span>
              </label>
              <label className={`mb-1.5 flex items-start gap-2 text-xs text-foreground ${!creatorInfo.is_audited ? "opacity-60" : ""}`}>
                <input
                  type="checkbox"
                  checked={hasPaidPartnership}
                  disabled={!creatorInfo.is_audited}
                  onChange={(e) => {
                    setHasPaidPartnership(e.target.checked);
                    if (e.target.checked && privacyLevel === "SELF_ONLY") setPrivacyLevel(""); // branded content can't be private: pick again
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                />
                <span>
                  <span className="font-semibold">Branded content</span>
                  <span className="block text-muted-foreground">
                    You are promoting another brand or a third party. This video will be classified as Branded Content.
                    {!creatorInfo.is_audited && " Not available yet: branded content can't be private, and TikTok publishes every Punqle post as private for now."}
                  </span>
                </span>
              </label>
              {!promotesOwnBrand && !hasPaidPartnership && (
                <p className="text-xs font-medium text-destructive">You need to indicate if your content promotes yourself, a third party, or both.</p>
              )}
            </div>
          )}
          <p className="mb-3 text-xs text-muted-foreground">
            By posting, you agree to TikTok's{" "}
            {discloseOn && hasPaidPartnership && (
              <>
                <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer" className="underline">
                  Branded Content Policy
                </a>{" "}
                and{" "}
              </>
            )}
            <a
              href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Music Usage Confirmation
            </a>
            .
          </p>
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
