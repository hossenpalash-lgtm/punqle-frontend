import { AlertCircle, ChevronDown, ExternalLink, Instagram, Loader2, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchInstagramStats, getMetaConnectUrl, type ApiInstagramStats } from "@/lib/api";

export const COLORS = ["oklch(0.56 0.14 300)", "oklch(0.66 0.13 210)", "oklch(0.74 0.14 75)", "oklch(0.62 0.12 150)"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_SLOTS = ["00-04", "04-08", "08-12", "12-16", "16-20", "20-24"];

export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(n)}`;
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-2 font-display text-sm font-extrabold text-foreground">{children}</h3>;
}

// One bold colour per kind of section, so the eye can tell them apart at a glance (founder, 2026-11-23: the paragraphs were too
// much to read). Dark enough to read as text on the white card.
export const SECTION = {
  overview: "oklch(0.5 0.15 300)",
  rivals: "oklch(0.5 0.13 235)",
  content: "oklch(0.48 0.14 150)",
  top: "oklch(0.52 0.14 55)",
  timing: "oklch(0.5 0.15 15)",
};

type FactTone = "good" | "info" | "plain";
interface Fact {
  big: string;
  label: string;
  tone: FactTone;
  bar?: number;
  detail?: string; // the supporting line behind the tile's small "more" button
}
const FULL_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Number.isNaN(a) || Number.isNaN(b) ? null : Math.max(1, Math.round((b - a) / 86_400_000));
}
const FACT_COLOR: Record<FactTone, string | undefined> = { good: SECTION.content, info: SECTION.overview, plain: undefined };

// "What stands out" as a few big numbers with a short label, worked out from the numbers already on screen. The longer written
// notes (data.takeaways) stay one tap away, so nothing is lost.
function factsFrom(data: ApiInstagramStats): Fact[] {
  const out: Fact[] = [];
  if (data.posts_per_week !== null && data.posts_per_week > 0) {
    const span = daysBetween(data.date_from, data.date_to);
    out.push({
      big: `${data.posts_per_week.toFixed(1).replace(/\.0$/, "")}×`,
      label: "posts per week",
      tone: "plain",
      detail: `${data.analyzed_posts} posts analysed${span ? `, spanning ${span} days` : ""}.`,
    });
  }
  const grid = data.heatmap_engagement;
  if (grid.flat().reduce((a, b) => a + b, 0) > 0) {
    const days = grid.map((row, i) => ({ i, v: row.reduce((a, b) => a + b, 0) }));
    const bestDay = days.reduce((a, b) => (b.v > a.v ? b : a));
    const slots = TIME_SLOTS.map((t, c) => ({ t, v: grid.reduce((a, row) => a + row[c], 0) }));
    const bestSlot = slots.reduce((a, b) => (b.v > a.v ? b : a));
    out.push({
      big: WEEKDAYS[bestDay.i],
      label: `best day · ${bestSlot.t} UTC`,
      tone: "info",
      detail: `Most of their engagement comes from posts on ${FULL_WEEKDAYS[bestDay.i]}, ${bestSlot.t} UTC (your time is ${localOffsetLabel()}).`,
    });
  }
  const types = data.types.filter((t) => t.avg_engagement > 0).sort((a, b) => b.avg_engagement - a.avg_engagement);
  if (types.length >= 2) {
    const typeDetail = (t: (typeof types)[number]) => `${t.label}: ${t.posts} posts, ${t.share_pct}% of everything they post.`;
    out.push({ big: fmt(types[0].avg_engagement), label: `avg per ${types[0].label.toLowerCase()}`, tone: "good", bar: 1, detail: typeDetail(types[0]) });
    out.push({ big: fmt(types[1].avg_engagement), label: `avg per ${types[1].label.toLowerCase()}`, tone: "plain", bar: types[1].avg_engagement / types[0].avg_engagement, detail: typeDetail(types[1]) });
  }
  const best = data.top_posts[0];
  if (best && data.avg_engagement && data.avg_engagement > 0) {
    const ratio = best.engagement / data.avg_engagement;
    if (ratio >= 2) {
      out.push({
        big: `${Math.round(ratio)}×`,
        label: "their best post vs average",
        tone: "good",
        detail: `Their best post earned ${fmt(best.engagement)} (likes + comments), against an average of ${fmt(data.avg_engagement)}.`,
      });
    }
  }
  const lift = data.themes.map((t) => ({ t, gap: t.engagement_share_pct - t.share_pct })).sort((a, b) => b.gap - a.gap)[0];
  if (lift && lift.gap >= 5) {
    out.push({
      big: `${Math.round(lift.t.share_pct)}% → ${Math.round(lift.t.engagement_share_pct)}%`,
      label: `“${lift.t.theme}”: posts → engagement`,
      tone: "info",
      detail: `“${lift.t.theme}” is ${Math.round(lift.t.share_pct)}% of their posts but ${Math.round(lift.t.engagement_share_pct)}% of their engagement.`,
    });
  }
  return out;
}

function FactTile({ f }: { f: Fact }) {
  const color = FACT_COLOR[f.tone];
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-secondary px-3 py-2.5">
      <div className="flex items-start justify-between gap-1">
        <p className={`font-display text-xl font-extrabold leading-tight ${color ? "" : "text-foreground"}`} style={color ? { color } : undefined}>
          {f.big}
        </p>
        {f.detail && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Hide the detail" : "Show the detail"}
            className="no-print -mr-1 -mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      <p className="text-[12px] text-muted-foreground">{f.label}</p>
      {f.bar !== undefined && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
          <div className={`h-full rounded-full ${color ? "" : "bg-muted-foreground/50"}`} style={{ width: `${Math.max(4, Math.round(f.bar * 100))}%`, background: color }} />
        </div>
      )}
      {f.detail && <p className={`mt-1.5 text-[12px] leading-snug text-foreground/80 ${open ? "" : "hidden print:block"}`}>{f.detail}</p>}
    </div>
  );
}

// The small "show more" button. Collapsed text still prints (Save as PDF), so a printed report never loses detail.
export function MoreToggle({ open, onClick, more, less }: { open: boolean; onClick: () => void; more: string; less: string }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} className="no-print mt-2 flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground">
      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      {open ? less : more}
    </button>
  );
}

const POST_TYPE_COLOR: Record<string, string> = { video: SECTION.overview, carousel: SECTION.rivals, image: SECTION.content };

function postTypeName(t: string): string {
  return t === "video" ? "Reel / Video" : t === "carousel" ? "Carousel" : t === "image" ? "Image" : "Post";
}

// One line of caption for the compact list: hashtags and extra spaces dropped; the full caption is behind the toggle.
function shortCaption(c: string): string {
  const s = c.replace(/#[^\s#]+/g, "").replace(/\s+/g, " ").trim();
  return s || c.trim() || "(no caption)";
}

function shortDate(d: string): string {
  const t = new Date(`${d}T00:00:00`);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// One plain line for the "You vs them" card, from numbers already on screen. Engagement rate is per follower, so a small account can
// beat a big one on it; the line says "engage" rather than claiming the audience is better.
function versusTakeaway(data: ApiInstagramStats): string | null {
  const own = data.own;
  if (!own || own.analyzed_posts < 3) return null;
  const { followers: mine, engagement_rate_pct: myRate } = own;
  const { followers: theirs, engagement_rate_pct: theirRate } = data;
  if (mine === null || theirs === null || myRate === null || theirRate === null) return null;
  const theyAreBigger = theirs > mine;
  const youEngageMore = myRate > theirRate;
  if (theyAreBigger && youEngageMore) return "They have a larger audience, but your followers engage more.";
  if (theyAreBigger) return "They have a larger audience and their followers engage more. Their top posts below are the place to look for ideas.";
  if (youEngageMore) return "You have the larger audience, and your followers engage more.";
  return "You have the larger audience, but theirs engages more. See what content works for them below.";
}

// "They post most on Tue and Fri, mostly 08-12 UTC." from the 7 x 6 grid already on screen (rows Mon..Sun, six 4-hour UTC slots).
// Needs at least 8 posts (or some engagement) behind it, so a handful of posts never reads as a pattern.
function bestTimesSentence(grid: number[][], mode: "posts" | "engagement", item = "post"): string | null {
  const total = grid.flat().reduce((a, b) => a + b, 0);
  if (mode === "posts" && total < 8) return null;
  if (mode === "engagement" && total <= 0) return null;
  const days = grid.map((row, i) => ({ i, v: row.reduce((a, b) => a + b, 0) })).sort((a, b) => b.v - a.v).filter((d) => d.v > 0).slice(0, 2);
  const slots = TIME_SLOTS.map((t, c) => ({ t, v: grid.reduce((a, row) => a + row[c], 0) })).sort((a, b) => b.v - a.v);
  if (days.length === 0 || slots[0].v <= 0) return null;
  const dayText = days.map((d) => WEEKDAYS[d.i]).join(" and ");
  return mode === "posts"
    ? `They ${item === "post" ? "post" : "upload"} most on ${dayText}, mostly ${slots[0].t} UTC.`
    : `Their ${item}s earn the most on ${dayText}, especially ${slots[0].t} UTC.`;
}

function localOffsetLabel(): string {
  const off = -new Date().getTimezoneOffset() / 60;
  return off === 0 ? "UTC" : `UTC${off > 0 ? "+" : ""}${off}`;
}

export function Card({ title, note, children, accent }: { title: string; note?: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <p
        className={`flex items-center gap-1.5 text-xs uppercase tracking-wider ${accent ? "font-extrabold" : "font-semibold text-muted-foreground"}`}
        style={accent ? { color: accent } : undefined}
      >
        {accent && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} aria-hidden="true" />}
        {title}
      </p>
      {note && <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{note}</p>}
      {!note && <div className="mb-2" />}
      {children}
    </div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold leading-tight text-foreground font-display">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// One metric, two bars (you / them) scaled to the larger of the two, so the
// longer bar is always the bigger number. Missing values show "—", no bar.
export function VersusRow({ label, mine, theirs, suffix = "" }: { label: string; mine: number | null; theirs: number | null; suffix?: string }) {
  const max = Math.max(mine ?? 0, theirs ?? 0, 0.0001);
  const bar = (value: number | null, color: string, who: string) => (
    <div className="flex items-center gap-2">
      <p className="w-10 shrink-0 text-[11px] text-muted-foreground">{who}</p>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        {value !== null && <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />}
      </div>
      <p className="w-16 shrink-0 text-right text-xs font-semibold text-foreground">{value === null ? "—" : `${fmt(value)}${suffix}`}</p>
    </div>
  );
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {bar(mine, COLORS[0], "You")}
        {bar(theirs, COLORS[1], "Them")}
      </div>
    </div>
  );
}

export function Donut({ slices }: { slices: { value: number; color: string }[] }) {
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

export function TimelineChart({ points, item = "post", metric = "engagement" }: { points: ApiInstagramStats["timeline"]; item?: string; metric?: string }) {
  const W = 600;
  const H = 130;
  const max = Math.max(...points.map((p) => p.engagement), 1);
  const bw = W / points.length;
  const labelIdx = new Set([0, Math.floor(points.length / 2), points.length - 1]);
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={`${metric} over time`}>
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
              <title>{`${p.label}: ${p.posts} ${item}${p.posts === 1 ? "" : "s"}, ${fmt(p.engagement)} ${metric}`}</title>
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

export function Heatmap({ posts, engagement, item = "post", metric = "engagement" }: { posts: number[][]; engagement: number[][]; item?: string; metric?: string }) {
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
            {m === "posts" ? (item === "post" ? "When they post" : "When they upload") : "When it works"}
          </button>
        ))}
      </div>
      {bestTimesSentence(grid, mode, item) && (
        <p className="mb-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground">{bestTimesSentence(grid, mode, item)}</p>
      )}
      <div className="grid gap-1" style={{ gridTemplateColumns: "2.2rem repeat(6, 1fr)" }}>
        <div />
        {TIME_SLOTS.map((t) => (
          <p key={t} className="text-center text-[11px] text-muted-foreground">
            {t}
          </p>
        ))}
        {grid.map((row, r) => (
          <div key={r} className="contents">
            <p className="self-center text-[11px] text-muted-foreground">{WEEKDAYS[r]}</p>
            {row.map((v, c) => (
              <div key={c} className="relative h-6 overflow-hidden rounded bg-secondary" title={`${WEEKDAYS[r]} ${TIME_SLOTS[c]} UTC: ${mode === "posts" ? `${v} ${item}s` : `${fmt(v)} ${metric}`}`}>
                <div className="absolute inset-0" style={{ background: COLORS[0], opacity: v / max }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Times are UTC (your time is {localOffsetLabel()}). Darker = more. Use this as a starting point: posting time alone doesn't guarantee better results.
      </p>
    </div>
  );
}

export function InstagramStats({ initialUsername, competitorName }: { initialUsername: string; competitorName: string }) {
  const [username, setUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiInstagramStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showFullCaptions, setShowFullCaptions] = useState(false);
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
  const topMax = data ? Math.max(...data.top_posts.map((p) => p.engagement), 1) : 1;
  const facts = data && data.status === "ok" ? factsFrom(data) : [];

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
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <a
                href={`https://www.instagram.com/${data.username}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:underline"
              >
                <Instagram className="h-4 w-4" />@{data.username}
                {data.account_name && <span className="font-normal text-muted-foreground">· {data.account_name}</span>}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
              <p className="text-xs text-muted-foreground">
                {data.analyzed_posts} recent posts · {data.date_from} → {data.date_to}
              </p>
            </div>
            <p className="no-print mt-0.5 text-[12px] text-muted-foreground">
              {data.account_website ? `Website on this account: ${data.account_website.replace(/^https?:\/\//, "").replace(/\/$/, "")}. ` : ""}
              Not the right account? Type another username above.
            </p>
          </div>

          {(data.takeaways.length > 0 || facts.length > 0) && (
            <Card title="What stands out" accent={SECTION.overview}>
              {facts.length > 0 && (
                <div className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3">
                  {facts.map((f, i) => (
                    <FactTile key={i} f={f} />
                  ))}
                </div>
              )}
              {data.takeaways.length > 0 && (
                <>
                  {/* Kept in full: hidden on screen until opened, always present when printed or saved as PDF. */}
                  <ul className={`mt-3 space-y-1.5 ${showNotes || facts.length === 0 ? "" : "hidden print:block"}`}>
                    {data.takeaways.map((t, i) => (
                      <li key={i} className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                        {t}
                      </li>
                    ))}
                  </ul>
                  {facts.length > 0 && <MoreToggle open={showNotes} onClick={() => setShowNotes((v) => !v)} more="Show the full notes" less="Hide the full notes" />}
                </>
              )}
            </Card>
          )}

          {data.own && data.own.analyzed_posts >= 3 && (
            <Card
              title={`You vs @${data.username}`}
              accent={SECTION.rivals}
              note={`Your own Instagram${data.own.username ? ` (@${data.own.username})` : ""} against theirs, counted the same way`}
            >
              {versusTakeaway(data) && <p className="mb-3 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground">{versusTakeaway(data)}</p>}
              <div className="space-y-3">
                <VersusRow label="Followers" mine={data.own.followers} theirs={data.followers} />
                <VersusRow label="Posts per week" mine={data.own.posts_per_week} theirs={data.posts_per_week} />
                <VersusRow label="Engagement per post" mine={data.own.avg_engagement} theirs={data.avg_engagement} />
                <VersusRow label="Engagement rate" mine={data.own.engagement_rate_pct} theirs={data.engagement_rate_pct} suffix="%" />
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
          {data.own && data.own.analyzed_posts < 3 && (
            <p className="no-print rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              Your own Instagram has {data.own.analyzed_posts} post{data.own.analyzed_posts === 1 ? "" : "s"} so far. Once it has 3, you'll see how you compare with @{data.username} here.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi label="Followers" value={fmt(data.followers)} />
            <Kpi label="Total posts" value={fmt(data.total_posts)} />
            <Kpi label="Avg likes" value={data.likes_hidden ? "Hidden" : fmt(data.avg_likes)} hint={data.likes_hidden ? "they hide likes" : "per post"} />
            <Kpi label="Avg comments" value={fmt(data.avg_comments)} hint="per post" />
            <Kpi label="Avg engagement" value={fmt(data.avg_engagement)} hint="likes + comments" />
            <Kpi label="Engagement rate" value={data.engagement_rate_pct === null ? "—" : `${data.engagement_rate_pct}%`} hint="of followers, per post" />
          </div>

          <SectionHeading>What content works</SectionHeading>

          <Card title="Post types" note="What they post, and how each type performs" accent={SECTION.content}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Donut slices={typeSlices} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-lg font-bold text-foreground font-display">{data.analyzed_posts}</p>
                  <p className="text-[11px] text-muted-foreground">posts</p>
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
            <Card title="Content themes" note="Share of posts vs. share of engagement — a longer bar on the engagement side means the theme over-delivers" accent={SECTION.content}>
              <div className="space-y-3">
                {data.themes.map((t) => (
                  <div key={t.theme}>
                    <p className="mb-1 text-sm font-medium text-foreground">{t.theme}</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="w-14 shrink-0 text-[11px] text-muted-foreground">Posts</p>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full" style={{ width: `${(t.share_pct / maxThemeShare) * 100}%`, background: COLORS[1] }} />
                        </div>
                        <p className="w-10 shrink-0 text-right text-xs text-muted-foreground">{t.share_pct}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="w-14 shrink-0 text-[11px] text-muted-foreground">Engagement</p>
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

          <Card title="Top posts" note="Highest engagement (likes + comments)" accent={SECTION.top}>
            <div className="space-y-2">
              {data.top_posts.map((p) => (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl bg-secondary px-3 py-2 hover:bg-secondary/70"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                      style={{ background: POST_TYPE_COLOR[p.type] ?? "oklch(0.5 0 0)" }}
                    >
                      {postTypeName(p.type)}
                    </span>
                    <p className={`min-w-0 flex-1 text-sm text-secondary-foreground ${showFullCaptions ? "" : "truncate print:whitespace-normal"}`}>
                      {showFullCaptions ? p.caption || "(no caption)" : shortCaption(p.caption)}
                    </p>
                    <p className="shrink-0 text-right">
                      <span className="font-display text-base font-extrabold text-foreground">{fmt(p.likes ?? p.engagement)}</span>{" "}
                      <span className="text-[11px] text-muted-foreground">{p.likes === null ? "engagement" : "likes"}</span>
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(4, (p.engagement / topMax) * 100)}%`, background: SECTION.top }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {shortDate(p.date)} · <span className="font-semibold text-foreground">{fmt(p.comments)}</span> comments
                  </p>
                </a>
              ))}
            </div>
            <MoreToggle open={showFullCaptions} onClick={() => setShowFullCaptions((v) => !v)} more="Show full captions" less="Show short captions" />
          </Card>

          <SectionHeading>When to post</SectionHeading>

          {data.timeline.length > 1 && (
            <Card title="Engagement over time" note={`Total likes + comments per ${data.timeline_unit}`} accent={SECTION.timing}>
              <TimelineChart points={data.timeline} />
            </Card>
          )}

          <Card title="Best times" note="Days and hours of their posts" accent={SECTION.timing}>
            <Heatmap posts={data.heatmap_posts} engagement={data.heatmap_engagement} />
          </Card>

          {data.hashtags.length > 0 && (
            <>
            <Card title="Hashtags they use" accent={SECTION.top}>
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
            </>
          )}

          <p className="text-[11px] text-muted-foreground">
            Source: Instagram's official Business Discovery data for public Business and Creator accounts, last {data.analyzed_posts} posts. Themes are labelled by AI; all numbers are counted directly from the posts.
          </p>
        </>
      )}
    </div>
  );
}
