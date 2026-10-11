import {
  Bookmark,
  Eye,
  Facebook,
  Heart,
  Instagram,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCw,
  Share2,
  Trophy,
  TrendingUp,
  Users,
  Youtube,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TikTokIcon } from "@/components/TikTokIcon";
import {
  fetchOrganicPerformance,
  getMetaConnectUrl,
  getTikTokConnectUrl,
  getYouTubeConnectUrl,
  type ApiPerformancePost,
} from "@/lib/api";
import { bestWinner, groupLeaders, isWinner, scorePosts, type TagDimension } from "@/lib/performance-insights";

function PlatformIcon({ platform, className }: { platform: ApiPerformancePost["platform"]; className: string }) {
  if (platform === "youtube") return <Youtube className={className} />;
  if (platform === "tiktok") return <TikTokIcon className={className} />;
  if (platform === "instagram") return <Instagram className={className} />;
  return <Facebook className={className} />;
}

const PLATFORM_LABEL: Record<ApiPerformancePost["platform"], string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const DIMENSION_LABEL: Record<TagDimension, string> = { angle: "angle", style: "style", goal: "goal" };

function formatMultiple(n: number): string {
  return `${n.toFixed(1)}×`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatCount(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatLabel(raw: string): string {
  return raw
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type UnlockAction = NonNullable<ApiPerformancePost["metrics_action"]>;

// Each "unlock" is a reconnect that asks the platform for one more permission.
// `approved` flips to true when the platform has approved that permission for
// every user: until then the reconnect only works for people with a role on our
// app (the founder, and the reviewers), so the banner is hidden from everyone
// else unless the page was opened with #insights-preview.
//   Instagram  instagram_manage_insights — approved 2026-10-11
//   Facebook   read_insights             — requested 2026-10-12
//   YouTube    yt-analytics.readonly     — Google verification requested 2026-10-12
//   TikTok     video.list                — TikTok revision requested 2026-10-12
const UNLOCKS: Record<UnlockAction, { title: string; body: string; button: string; approved: boolean; start: () => Promise<{ authorize_url: string }> }> = {
  unlock_instagram_insights: {
    title: "See reach, views and saves for your Instagram posts",
    body: "Likes and comments already show. Reconnect Instagram once to also see how many people each post reached.",
    button: "Reconnect Instagram",
    approved: true,
    start: () => getMetaConnectUrl(true),
  },
  unlock_facebook_insights: {
    title: "See reach and views for your Facebook posts",
    body: "Likes, comments and shares already show. Reconnect Facebook once to also see how many people each post reached.",
    button: "Reconnect Facebook",
    approved: false,
    start: () => getMetaConnectUrl(false, true),
  },
  unlock_youtube_analytics: {
    title: "See watch time, retention and impressions for your YouTube videos",
    body: "Views, likes and comments already show. Reconnect YouTube once to also see how long people watch and how often your thumbnail was shown.",
    button: "Reconnect YouTube",
    approved: false,
    start: () => getYouTubeConnectUrl(true),
  },
  unlock_tiktok_stats: {
    title: "See views, likes and shares for your TikTok posts",
    body: "Reconnect TikTok once to let Punqle read how each of your posts is doing.",
    button: "Reconnect TikTok",
    approved: false,
    start: () => getTikTokConnectUrl(true),
  },
};

const PREVIEW_KEY = "punqle_insights_preview";
function insightsPreviewOn(): boolean {
  try {
    if (window.location.hash.includes("insights-preview")) sessionStorage.setItem(PREVIEW_KEY, "1");
    return sessionStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.round(total % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// The longer YouTube numbers that don't fit as icons.
function youtubeDetails(m: NonNullable<ApiPerformancePost["metrics"]>): string[] {
  const parts: string[] = [];
  if (m.watch_minutes !== null) parts.push(`${formatCount(Math.round(m.watch_minutes))} min watched`);
  if (m.avg_view_seconds !== null) {
    parts.push(`avg view ${formatSeconds(m.avg_view_seconds)}${m.avg_view_pct !== null ? ` (${Math.round(m.avg_view_pct)}%)` : ""}`);
  }
  if (m.subscribers_gained) parts.push(`+${m.subscribers_gained} subscriber${m.subscribers_gained === 1 ? "" : "s"}`);
  if (m.impressions !== null) {
    parts.push(`${formatCount(m.impressions)} impressions${m.ctr_pct !== null ? ` · ${m.ctr_pct}% clicked` : ""}`);
  }
  return parts;
}

type GroupBy = "none" | "angle" | "style" | "goal";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "All posts" },
  { value: "angle", label: "By angle" },
  { value: "style", label: "By style" },
  { value: "goal", label: "By goal" },
];

interface GroupRow {
  key: string;
  label: string;
  postCount: number;
  measuredCount: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
}

function groupPosts(posts: ApiPerformancePost[], by: Exclude<GroupBy, "none">): GroupRow[] {
  const rows = new Map<string, GroupRow>();
  for (const post of posts) {
    const raw = post[by];
    const key = raw || "untagged";
    const label = raw ? formatLabel(raw) : "Untagged (older post, or Social Content)";
    if (!rows.has(key)) {
      rows.set(key, {
        key, label, postCount: 0, measuredCount: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0,
      });
    }
    const row = rows.get(key)!;
    row.postCount += 1;
    if (post.metrics) {
      row.measuredCount += 1;
      row.views += post.metrics.views ?? 0;
      row.likes += post.metrics.likes ?? 0;
      row.comments += post.metrics.comments ?? 0;
      row.shares += post.metrics.shares ?? 0;
      row.saves += post.metrics.saves ?? 0;
      row.reach += post.metrics.reach ?? 0;
    }
  }
  return Array.from(rows.values()).sort(
    (a, b) =>
      b.views + b.likes + b.comments + b.shares + b.saves - (a.views + a.likes + a.comments + a.shares + a.saves),
  );
}

// Organic-only, deliberately — see fetchOrganicPerformance's backend
// docstring (GET /performance/posts). Instagram also shows reach, views and
// saves (instagram_manage_insights, approved 2026-10-11); Facebook reach and
// YouTube impressions still need permissions Punqle hasn't requested. No
// spend/CTR/conversions/ROAS exist here, and no placeholder for them either — the one prior "Coming soon" stub found
// in this codebase's own audit (PostKit.tsx's disabled Launch Campaign
// button) is the precedent this page deliberately does not repeat.
//
// Grouping (By angle/style/goal) is real A/B *insight* from actual
// published organic metrics, not true paid split-testing — Ad Creation
// (Image Ad + Video Ad) tags each publish with goal/angle/style at
// publish time; Social Content has no such concept and always lands in
// "Untagged" here, same as any post published before this existed.
export function PerformanceView() {
  const [posts, setPosts] = useState<ApiPerformancePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [unlocking, setUnlocking] = useState<UnlockAction | null>(null);
  const [preview] = useState(insightsPreviewOn);

  const load = (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    fetchOrganicPerformance()
      .then((r) => setPosts(r.posts))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load performance data."))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => load(false), []);

  // A connection made before a permission existed holds a token without it —
  // reconnecting once (the normal Connect asks for approved permissions) is
  // the whole fix. Platforms whose permission isn't approved yet only show
  // their banner in preview mode (see UNLOCKS).
  const wanted = new Set<UnlockAction>(posts.flatMap((p) => (p.metrics_action ? [p.metrics_action] : [])));
  const visibleUnlocks = (Object.keys(UNLOCKS) as UnlockAction[]).filter((a) =>
    UNLOCKS[a].approved ? wanted.has(a) : preview,
  );
  const handleUnlock = async (action: UnlockAction) => {
    if (unlocking) return;
    setUnlocking(action);
    try {
      const r = await UNLOCKS[action].start();
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the permission step.");
      setUnlocking(null);
    }
  };

  const scores = useMemo(() => scorePosts(posts), [posts]);
  const winner = useMemo(() => bestWinner(posts, scores), [posts, scores]);
  const leaders = useMemo(() => groupLeaders(posts, scores), [posts, scores]);

  const groupRows = useMemo(
    () => (groupBy === "none" ? [] : groupPosts(posts, groupBy)),
    [posts, groupBy],
  );

  return (
    <>
      <h1 className="font-display mb-1 flex items-center gap-2 text-xl font-extrabold text-foreground">
        <TrendingUp className="h-4 w-4 text-accent" />
        Performance
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Organic performance for what you've published — paid ad tracking is a separate, later phase.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 rounded-full bg-secondary p-1">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGroupBy(opt.value)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                groupBy === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:bg-background/60",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}

      {visibleUnlocks.map((action) => (
        <div key={action} className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground font-display">{UNLOCKS[action].title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{UNLOCKS[action].body}</p>
          </div>
          <button
            onClick={() => void handleUnlock(action)}
            disabled={unlocking !== null}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {unlocking === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            {UNLOCKS[action].button}
          </button>
        </div>
      ))}

      {!loading && posts.length > 0 && (winner || leaders.length > 0) && (
        <div className="mb-4 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Trophy className="h-3.5 w-3.5" />
            What's working
          </p>
          {winner && (
            <div className="flex gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
                {winner.post.image_base64 ? (
                  <img src={`data:image/jpeg;base64,${winner.post.image_base64}`} alt="" className="h-full w-full object-cover" />
                ) : (
                  <PlatformIcon platform={winner.post.platform} className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground font-display">
                  Your best post earned {formatMultiple(winner.score.multiple)} your {PLATFORM_LABEL[winner.post.platform]} average
                </p>
                <p className="mb-1 line-clamp-1 text-xs text-muted-foreground">{winner.post.caption || "(no caption)"}</p>
                <p className="text-xs text-muted-foreground">
                  {winner.score.engagement} interactions (likes, comments, shares, saves)
                </p>
              </div>
            </div>
          )}
          {leaders.length > 0 && (
            <ul className={`space-y-1 text-sm text-foreground ${winner ? "mt-3 border-t border-border pt-3" : ""}`}>
              {leaders.map((l) => (
                <li key={l.dimension}>
                  Your <span className="font-semibold">{formatLabel(l.value)}</span> {DIMENSION_LABEL[l.dimension]} does{" "}
                  {formatMultiple(l.averageMultiple)} your average{" "}
                  <span className="text-xs text-muted-foreground">({l.postCount} posts)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground" style={{ boxShadow: "var(--shadow-card)" }}>
          Nothing published yet — publish a post to Facebook, Instagram, YouTube, or TikTok and it will show up here.
        </div>
      ) : groupBy !== "none" ? (
        <div className="space-y-3">
          {groupRows.map((row) => (
            <div key={row.key} className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground font-display">{row.label}</p>
                <span className="text-xs text-muted-foreground">
                  {row.postCount} post{row.postCount === 1 ? "" : "s"}
                </span>
              </div>
              {row.measuredCount === 0 ? (
                <p className="text-xs text-muted-foreground">No metrics available yet for this group.</p>
              ) : (
                <div className="flex flex-wrap gap-4 text-sm font-medium text-muted-foreground">
                  {row.views > 0 && (
                    <span className="flex items-center gap-1.5" title="Views">
                      <Eye className="h-3.5 w-3.5" />
                      {formatCount(row.views)}
                    </span>
                  )}
                  {row.reach > 0 && (
                    <span className="flex items-center gap-1.5" title="Reach">
                      <Users className="h-3.5 w-3.5" />
                      {formatCount(row.reach)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5" />
                    {formatCount(row.likes)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {formatCount(row.comments)}
                  </span>
                  {row.shares > 0 && (
                    <span className="flex items-center gap-1.5" title="Shares">
                      <Share2 className="h-3.5 w-3.5" />
                      {formatCount(row.shares)}
                    </span>
                  )}
                  {row.saves > 0 && (
                    <span className="flex items-center gap-1.5" title="Saves">
                      <Bookmark className="h-3.5 w-3.5" />
                      {formatCount(row.saves)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="flex gap-3 rounded-2xl bg-card p-3" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
                {post.image_base64 ? (
                  <img src={`data:image/jpeg;base64,${post.image_base64}`} alt="" className="h-full w-full object-cover" />
                ) : (
                  <PlatformIcon platform={post.platform} className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PlatformIcon platform={post.platform} className="h-3 w-3" />
                  {formatDate(post.scheduled_time)}
                  {isWinner(scores.get(post.id)) && (
                    <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                      <Trophy className="h-2.5 w-2.5" />
                      Winner · {formatMultiple(scores.get(post.id)!.multiple)}
                    </span>
                  )}
                  {post.angle && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                      {formatLabel(post.angle)}
                    </span>
                  )}
                </div>
                <p className="mb-2 line-clamp-2 text-sm text-foreground">{post.caption || "(no caption)"}</p>
                {post.metrics ? (
                  <div className="flex flex-wrap gap-3 text-xs font-medium text-muted-foreground">
                    {post.metrics.views !== null && (
                      <span className="flex items-center gap-1" title="Views">
                        <Eye className="h-3 w-3" />
                        {formatCount(post.metrics.views)}
                      </span>
                    )}
                    {post.metrics.reach !== null && (
                      <span className="flex items-center gap-1" title="Reach — people who saw it">
                        <Users className="h-3 w-3" />
                        {formatCount(post.metrics.reach)}
                      </span>
                    )}
                    <span className="flex items-center gap-1" title="Likes">
                      <Heart className="h-3 w-3" />
                      {formatCount(post.metrics.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {formatCount(post.metrics.comments)}
                    </span>
                    {post.metrics.shares !== null && (
                      <span className="flex items-center gap-1" title="Shares">
                        <Share2 className="h-3 w-3" />
                        {formatCount(post.metrics.shares)}
                      </span>
                    )}
                    {post.metrics.saves !== null && (
                      <span className="flex items-center gap-1" title="Saves">
                        <Bookmark className="h-3 w-3" />
                        {formatCount(post.metrics.saves)}
                      </span>
                    )}
                  </div>
                ) : post.metrics_unavailable_reason ? (
                  <p className="text-xs text-muted-foreground">{post.metrics_unavailable_reason}</p>
                ) : null}
                {post.metrics && youtubeDetails(post.metrics).length > 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">{youtubeDetails(post.metrics).join(" · ")}</p>
                )}
                {post.metrics_note && <p className="mt-1 text-xs text-muted-foreground">{post.metrics_note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
