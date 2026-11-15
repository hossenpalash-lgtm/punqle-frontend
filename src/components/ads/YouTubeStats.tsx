import { AlertCircle, ExternalLink, Loader2, Youtube } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchYouTubeStats, type ApiYouTubeStats } from "@/lib/api";
import { COLORS, Card, Donut, Heatmap, Kpi, SectionHeading, TimelineChart, VersusRow, fmt } from "./InstagramStats";

// "They have more subscribers, but your typical video..." — one plain line from numbers already on screen.
function versusTakeaway(d: ApiYouTubeStats): string | null {
  const own = d.own;
  if (!own || own.analyzed_videos < 3 || own.median_views === null || d.median_views === null) return null;
  const bigger = (d.subscribers ?? 0) > (own.subscribers ?? 0);
  const yourVideosWin = own.median_views > d.median_views;
  if (bigger && yourVideosWin) return "They have more subscribers, but your typical video gets more views.";
  if (bigger) return "They have more subscribers and more views per video. Their top videos below are the place to look for ideas.";
  if (yourVideosWin) return "You have more subscribers and more views per video.";
  return "You have more subscribers, but their typical video gets more views. See what works for them below.";
}

export function YouTubeStats({ initialChannel, competitorName }: { initialChannel: string; competitorName: string }) {
  const [channel, setChannel] = useState(initialChannel);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiYouTubeStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoLoaded = useRef(false);

  const load = async (value: string) => {
    const target = value.trim();
    if (!target || loading) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      setData(await fetchYouTubeStats(target));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load YouTube stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialChannel && !autoLoaded.current) {
      autoLoaded.current = true;
      void load(initialChannel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeSlices = data?.types.map((t, i) => ({ value: t.videos, color: COLORS[i % COLORS.length] })) ?? [];
  const maxThemeShare = data ? Math.max(...data.themes.flatMap((t) => [t.share_pct, t.view_share_pct]), 1) : 1;
  const maxTag = data ? Math.max(...data.tags.map((t) => t.videos), 1) : 1;
  const timeline = data?.timeline.map((p) => ({ label: p.label, posts: p.videos, engagement: p.views })) ?? [];

  return (
    <div className="space-y-3">
      <div className="no-print flex gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-full border border-input bg-background px-4">
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load(channel)}
            placeholder="YouTube channel link or @handle"
            className="flex-1 bg-transparent py-2.5 text-sm text-foreground focus:outline-none"
          />
        </div>
        <button
          onClick={() => void load(channel)}
          disabled={!channel.trim() || loading}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
          Load stats
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-14 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Reading {competitorName || "their"} public YouTube videos…</p>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center">
          <Youtube className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">Real YouTube numbers for any public channel</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste a channel link, an @handle, or any of their video links to see subscribers, what they upload, when, and what gets views.
          </p>
        </div>
      )}

      {data && data.status !== "ok" && (
        <div className="flex items-start gap-2 rounded-2xl bg-secondary p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-secondary-foreground">{data.message}</p>
        </div>
      )}

      {data && data.status === "ok" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <a
              href={data.handle ? `https://www.youtube.com/@${data.handle}` : `https://www.youtube.com/channel/${data.channel_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline"
            >
              {data.thumbnail ? <img src={data.thumbnail} alt="" className="h-6 w-6 rounded-full" /> : <Youtube className="h-4 w-4" />}
              {data.title}
              {data.handle && <span className="font-normal text-muted-foreground">· @{data.handle}</span>}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
            <p className="text-xs text-muted-foreground">
              {data.analyzed_videos} recent videos · {data.date_from} → {data.date_to}
            </p>
          </div>

          {data.takeaways.length > 0 && (
            <Card title="What stands out">
              <ul className="space-y-1.5">
                {data.takeaways.map((t, i) => (
                  <li key={i} className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {data.own && data.own.analyzed_videos >= 3 && (
            <Card title={`You vs ${data.title}`} note={`Your own YouTube channel${data.own.title ? ` (${data.own.title})` : ""} against theirs, counted the same way`}>
              {versusTakeaway(data) && <p className="mb-3 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground">{versusTakeaway(data)}</p>}
              <div className="space-y-3">
                <VersusRow label="Subscribers" mine={data.own.subscribers} theirs={data.subscribers} />
                <VersusRow label="Uploads per week" mine={data.own.uploads_per_week} theirs={data.uploads_per_week} />
                <VersusRow label="Views on a typical video" mine={data.own.median_views} theirs={data.median_views} />
                <VersusRow label="Like + comment rate" mine={data.own.engagement_rate_pct} theirs={data.engagement_rate_pct} suffix="%" />
              </div>
              {data.compare.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                  {data.compare.map((c, i) => (
                    <li key={i} className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi label="Subscribers" value={data.subscribers_hidden ? "Hidden" : fmt(data.subscribers)} />
            <Kpi label="Total views" value={fmt(data.total_views)} hint={`${fmt(data.total_videos)} videos`} />
            <Kpi label="Typical video" value={fmt(data.median_views)} hint="median views" />
            <Kpi label="Average views" value={fmt(data.avg_views)} hint="per recent video" />
            <Kpi label="Like + comment rate" value={data.engagement_rate_pct === null ? "—" : `${data.engagement_rate_pct}%`} hint="of views" />
            <Kpi label="Uploads" value={data.uploads_per_week === null ? "—" : `${data.uploads_per_week}/wk`} hint={data.avg_duration_min ? `avg ${data.avg_duration_min} min long` : undefined} />
          </div>

          <SectionHeading>What content works</SectionHeading>

          <Card title="Video length" note="How long their videos are, and which length gets the views">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Donut slices={typeSlices} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-lg font-bold text-foreground font-display">{data.analyzed_videos}</p>
                  <p className="text-[11px] text-muted-foreground">videos</p>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {data.types.map((t, i) => (
                  <div key={t.type} className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {t.label} <span className="font-normal text-muted-foreground">· {t.share_pct}% of videos · {t.view_share_pct}% of views</span>
                      </p>
                      <p className="text-xs text-muted-foreground">avg {fmt(t.avg_views)} views</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {data.themes.length > 0 && (
            <Card title="Content themes" note="Share of videos vs. share of views — a longer bar on the views side means the theme over-delivers">
              <div className="space-y-3">
                {data.themes.map((t) => (
                  <div key={t.theme}>
                    <p className="mb-1 text-sm font-medium text-foreground">{t.theme}</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="w-14 shrink-0 text-[11px] text-muted-foreground">Videos</p>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full" style={{ width: `${(t.share_pct / maxThemeShare) * 100}%`, background: COLORS[1] }} />
                        </div>
                        <p className="w-10 shrink-0 text-right text-xs text-muted-foreground">{t.share_pct}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="w-14 shrink-0 text-[11px] text-muted-foreground">Views</p>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full" style={{ width: `${(t.view_share_pct / maxThemeShare) * 100}%`, background: COLORS[0] }} />
                        </div>
                        <p className="w-10 shrink-0 text-right text-xs font-semibold text-foreground">{t.view_share_pct}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Top videos" note="Most views among their recent uploads">
            <div className="space-y-2">
              {data.top_videos.map((v) => (
                <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-xl bg-secondary p-2 hover:bg-secondary/70">
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-secondary-foreground">{v.title}</p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">
                      {fmt(v.views)} views
                      {v.likes !== null ? ` · ${fmt(v.likes)} likes` : ""}
                      {v.comments !== null ? ` · ${fmt(v.comments)} comments` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {v.duration} · {v.type} · {v.date}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </Card>

          <SectionHeading>When to upload</SectionHeading>

          {timeline.length > 1 && (
            <Card title="Views by upload date" note={`Total views of the videos uploaded each ${data.timeline_unit}`}>
              <TimelineChart points={timeline} item="video" metric="views" />
            </Card>
          )}

          <Card title="Best times" note="Days and hours of their uploads">
            <Heatmap posts={data.heatmap_videos} engagement={data.heatmap_views} item="video" metric="views" />
          </Card>

          {data.tags.length > 0 && (
            <Card title="Tags they use" note="Video tags and hashtags, with average views">
              <div className="space-y-1.5">
                {data.tags.map((t) => (
                  <div key={t.tag} className="flex items-center gap-2">
                    <p className="w-32 shrink-0 truncate text-sm text-foreground">{t.tag}</p>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${(t.videos / maxTag) * 100}%`, background: COLORS[2] }} />
                    </div>
                    <p className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                      {t.videos} video{t.videos === 1 ? "" : "s"} · {fmt(t.avg_views)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <p className="text-[11px] text-muted-foreground">
            Source: YouTube's official Data API, public data for the channel's last {data.analyzed_videos} uploads. Themes are labelled by AI; all numbers
            are counted directly from the videos. Older videos have had more time to collect views.
          </p>
        </>
      )}
    </div>
  );
}
