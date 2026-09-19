import { AlertCircle, ExternalLink, Instagram, Loader2, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchInstagramStats, getMetaConnectUrl, type ApiInstagramStats } from "@/lib/api";

const COLORS = ["oklch(0.56 0.14 300)", "oklch(0.66 0.13 210)", "oklch(0.74 0.14 75)", "oklch(0.62 0.12 150)"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_SLOTS = ["00-04", "04-08", "08-12", "12-16", "16-20", "20-24"];

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(n)}`;
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {note && <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{note}</p>}
      {!note && <div className="mb-2" />}
      {children}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold leading-tight text-foreground">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Donut({ slices }: { slices: { value: number; color: string }[] }) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  return (
    <svg viewBox="0 0 36 36" className="h-32 w-32 shrink-0 -rotate-90" role="img" aria-label="Post type mix">
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--secondary)" strokeWidth="5" />
      {slices.map((s, i) => {
        const len = (s.value / total) * 100;
        const el = (
          <circle
            key={i}
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            stroke={s.color}
            strokeWidth="5"
            strokeDasharray={`${len} ${100 - len}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

function TimelineChart({ points }: { points: ApiInstagramStats["timeline"] }) {
  const W = 600;
  const H = 130;
  const max = Math.max(...points.map((p) => p.engagement), 1);
  const bw = W / points.length;
  const labelIdx = new Set([0, Math.floor(points.length / 2), points.length - 1]);
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label="Engagement over time">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="var(--border)" strokeWidth="1" />
      ))}
      <text x="2" y="10" fontSize="11" fill="var(--muted-foreground)">
        {fmt(max)}
      </text>
      {points.map((p, i) => {
        const h = (p.engagement / max) * (H - 14);
        return (
          <g key={i}>
            <rect x={i * bw + bw * 0.15} y={H - h} width={bw * 0.7} height={Math.max(h, p.posts ? 2 : 0)} rx="2" fill={COLORS[0]}>
              <title>{`${p.label}: ${p.posts} post${p.posts === 1 ? "" : "s"}, ${fmt(p.engagement)} engagement`}</title>
            </rect>
            {labelIdx.has(i) && (
              <text x={i * bw + bw / 2} y={H + 16} fontSize="11" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fill="var(--muted-foreground)">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Heatmap({ posts, engagement }: { posts: number[][]; engagement: number[][] }) {
  const [mode, setMode] = useState<"posts" | "engagement">("posts");
  const grid = mode === "posts" ? posts : engagement;
  const max = Math.max(...grid.flat(), 1);
  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        {(["posts", "engagement"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`no-print rounded-full px-3 py-1 text-xs font-medium ${
              mode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {m === "posts" ? "When they post" : "When it works"}
          </button>
        ))}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "2.2rem repeat(6, 1fr)" }}>
        <div />
        {TIME_SLOTS.map((t) => (
          <p key={t} className="text-center text-[10px] text-muted-foreground">
            {t}
          </p>
        ))}
        {grid.map((row, r) => (
          <div key={r} className="contents">
            <p className="self-center text-[10px] text-muted-foreground">{WEEKDAYS[r]}</p>
            {row.map((v, c) => (
              <div key={c} className="relative h-6 overflow-hidden rounded bg-secondary" title={`${WEEKDAYS[r]} ${TIME_SLOTS[c]} UTC: ${mode === "posts" ? `${v} posts` : `${fmt(v)} engagement`}`}>
                <div className="absolute inset-0" style={{ background: COLORS[0], opacity: v / max }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">Times are UTC. Darker = more.</p>
    </div>
  );
}

export function InstagramStats({ initialUsername, competitorName }: { initialUsername: string; competitorName: string }) {
  const [username, setUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiInstagramStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const autoLoaded = useRef(false);

  const load = async (name: string) => {
    const target = name.trim();
    if (!target || loading) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      setData(await fetchInstagramStats(target));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load Instagram stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialUsername && !autoLoaded.current) {
      autoLoaded.current = true;
      void load(initialUsername);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    try {
      const r = await getMetaConnectUrl(true);
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the Instagram permission step.");
      setUnlocking(false);
    }
  };

  const typeSlices = data?.types.map((t, i) => ({ value: t.posts, color: COLORS[i % COLORS.length] })) ?? [];
  const maxThemeShare = data ? Math.max(...data.themes.flatMap((t) => [t.share_pct, t.engagement_share_pct]), 1) : 1;
  const maxTag = data ? Math.max(...data.hashtags.map((h) => h.posts), 1) : 1;

  return (
    <div className="space-y-3">
      <div className="no-print flex gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-full border border-input bg-background px-4">
          <span className="text-sm text-muted-foreground">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load(username)}
            placeholder="instagram username"
            className="flex-1 bg-transparent py-2.5 text-sm text-foreground focus:outline-none"
          />
        </div>
        <button
          onClick={() => void load(username)}
          disabled={!username.trim() || loading}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
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
          <p className="text-xs text-muted-foreground">Reading {competitorName || "their"} public Instagram posts…</p>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center">
          <Instagram className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">Real Instagram numbers for any public Business or Creator account</p>
          <p className="mt-1 text-xs text-muted-foreground">Enter a username above to see followers, what they post, when, and what works.</p>
        </div>
      )}

      {data && data.status === "needs_unlock" && (
        <Card title="One more permission needed">
          <p className="mb-3 text-sm text-foreground">
            {data.message} You approve it once on Instagram's own screen. Afterwards, open Competitive Edge again and load the stats.
          </p>
          <button
            onClick={() => void handleUnlock()}
            disabled={unlocking}
            className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Unlock Instagram stats
          </button>
        </Card>
      )}

      {data && (data.status === "no_instagram" || data.status === "unavailable_account" || data.status === "error") && (
        <div className="flex items-start gap-2 rounded-2xl bg-secondary p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-secondary-foreground">{data.message}</p>
        </div>
      )}

      {data && data.status === "ok" && (
        <>
          <div className="flex items-center justify-between">
            <a
              href={`https://www.instagram.com/${data.username}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:underline"
            >
              <Instagram className="h-4 w-4" />@{data.username}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
            <p className="text-xs text-muted-foreground">
              {data.analyzed_posts} recent posts · {data.date_from} → {data.date_to}
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

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi label="Followers" value={fmt(data.followers)} />
            <Kpi label="Total posts" value={fmt(data.total_posts)} />
            <Kpi label="Avg likes" value={data.likes_hidden ? "Hidden" : fmt(data.avg_likes)} hint={data.likes_hidden ? "they hide likes" : "per post"} />
            <Kpi label="Avg comments" value={fmt(data.avg_comments)} hint="per post" />
            <Kpi label="Avg engagement" value={fmt(data.avg_engagement)} hint="likes + comments" />
            <Kpi label="Engagement rate" value={data.engagement_rate_pct === null ? "—" : `${data.engagement_rate_pct}%`} hint="of followers, per post" />
          </div>

          <Card title="Post types" note="What they post, and how each type performs">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Donut slices={typeSlices} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-lg font-bold text-foreground">{data.analyzed_posts}</p>
                  <p className="text-[10px] text-muted-foreground">posts</p>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {data.types.map((t, i) => (
                  <div key={t.type} className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {t.label} <span className="font-normal text-muted-foreground">· {t.share_pct}%</span>
                      </p>
                      <p className="text-xs text-muted-foreground">avg {fmt(t.avg_engagement)} engagement per post</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {data.themes.length > 0 && (
            <Card title="Content themes" note="Share of posts vs. share of engagement — a longer bar on the engagement side means the theme over-delivers">
              <div className="space-y-3">
                {data.themes.map((t) => (
                  <div key={t.theme}>
                    <p className="mb-1 text-sm font-medium text-foreground">{t.theme}</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="w-14 shrink-0 text-[10px] text-muted-foreground">Posts</p>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full" style={{ width: `${(t.share_pct / maxThemeShare) * 100}%`, background: COLORS[1] }} />
                        </div>
                        <p className="w-10 shrink-0 text-right text-xs text-muted-foreground">{t.share_pct}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="w-14 shrink-0 text-[10px] text-muted-foreground">Engagement</p>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full" style={{ width: `${(t.engagement_share_pct / maxThemeShare) * 100}%`, background: COLORS[0] }} />
                        </div>
                        <p className="w-10 shrink-0 text-right text-xs font-semibold text-foreground">{t.engagement_share_pct}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.timeline.length > 1 && (
            <Card title="Engagement over time" note={`Total likes + comments per ${data.timeline_unit}`}>
              <TimelineChart points={data.timeline} />
            </Card>
          )}

          <Card title="Best times" note="Days and hours of their posts">
            <Heatmap posts={data.heatmap_posts} engagement={data.heatmap_engagement} />
          </Card>

          {data.hashtags.length > 0 && (
            <Card title="Hashtags they use">
              <div className="space-y-1.5">
                {data.hashtags.map((h) => (
                  <div key={h.tag} className="flex items-center gap-2">
                    <p className="w-28 shrink-0 truncate text-sm text-foreground">#{h.tag}</p>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${(h.posts / maxTag) * 100}%`, background: COLORS[2] }} />
                    </div>
                    <p className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                      {h.posts} post{h.posts === 1 ? "" : "s"} · {fmt(h.avg_engagement)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Top posts" note="Highest engagement (likes + comments)">
            <div className="space-y-2">
              {data.top_posts.map((p) => (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl bg-secondary px-3 py-2 hover:bg-secondary/70"
                >
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.type === "video" ? "Reel / Video" : p.type === "carousel" ? "Carousel" : p.type === "image" ? "Image" : "Post"} · {p.date}
                  </p>
                  <p className="text-sm text-secondary-foreground">{p.caption || "(no caption)"}</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">
                    {p.likes === null ? "" : `${fmt(p.likes)} likes · `}
                    {fmt(p.comments)} comments
                  </p>
                </a>
              ))}
            </div>
          </Card>

          <p className="text-[10px] text-muted-foreground">
            Source: Instagram's official Business Discovery data for public Business and Creator accounts, last {data.analyzed_posts} posts. Themes are labelled by AI; all numbers are counted directly from the posts.
          </p>
        </>
      )}
    </div>
  );
}
