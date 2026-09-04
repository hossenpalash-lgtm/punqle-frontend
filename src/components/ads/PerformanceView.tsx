import { Eye, Facebook, Heart, Loader2, MessageCircle, RefreshCw, Share2, TrendingUp, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { TikTokIcon } from "@/components/TikTokIcon";
import { fetchOrganicPerformance, type ApiPerformancePost } from "@/lib/api";

function PlatformIcon({ platform, className }: { platform: ApiPerformancePost["platform"]; className: string }) {
  if (platform === "youtube") return <Youtube className={className} />;
  if (platform === "tiktok") return <TikTokIcon className={className} />;
  return <Facebook className={className} />;
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

// Organic-only, deliberately — see fetchOrganicPerformance's backend
// docstring (GET /performance/posts). Reach/impressions aren't fetched
// anywhere for either platform: both need a permission Punqle has never
// requested. No spend/CTR/conversions/ROAS exist here, and no
// placeholder for them either — the one prior "Coming soon" stub found
// in this codebase's own audit (PostKit.tsx's disabled Launch Campaign
// button) is the precedent this page deliberately does not repeat.
export function PerformanceView() {
  const [posts, setPosts] = useState<ApiPerformancePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <h1 className="font-display mb-1 flex items-center gap-2 text-xl font-extrabold text-foreground">
        <TrendingUp className="h-4 w-4 text-accent" />
        Performance
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Organic performance for what you've published — paid ad tracking is a separate, later phase.
      </p>

      <div className="mb-4 flex justify-end">
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground" style={{ boxShadow: "var(--shadow-card)" }}>
          Nothing published yet — publish a post to Facebook or YouTube and its numbers will show up here.
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
                </div>
                <p className="mb-2 line-clamp-2 text-sm text-foreground">{post.caption || "(no caption)"}</p>
                {post.metrics ? (
                  <div className="flex flex-wrap gap-3 text-xs font-medium text-muted-foreground">
                    {post.metrics.views !== null && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatCount(post.metrics.views)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatCount(post.metrics.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {formatCount(post.metrics.comments)}
                    </span>
                    {post.metrics.shares !== null && (
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        {formatCount(post.metrics.shares)}
                      </span>
                    )}
                  </div>
                ) : post.metrics_unavailable_reason ? (
                  <p className="text-xs text-muted-foreground">{post.metrics_unavailable_reason}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
