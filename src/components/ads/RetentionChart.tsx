import { Compass, Loader2, TrendingDown } from "lucide-react";
import { useState } from "react";
import { fetchYouTubeRetention, fetchYouTubeSources, type ApiYouTubeRetention, type ApiYouTubeSources } from "@/lib/api";

// Two taps under every YouTube video (2026-11-13): "Where viewers leave" (the audience-retention curve: the share still watching
// along the video, steepest fall marked) and "Where viewers come from" (traffic sources, plus the search words people used on
// YouTube). Each asks the server once, on the first tap. When the real length is known (worked out from the average view) the
// marks read in minutes and seconds; otherwise in percent of the video.

const W = 600;
const H = 150;
const PAD = { left: 38, right: 10, top: 10, bottom: 22 };

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useLazy<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const start = () => {
    if (data || loading) return;
    setLoading(true);
    setFailed(false);
    load()
      .then(setData)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  return { data, loading, failed, start };
}

type View = "leave" | "come";

export function YouTubeDeepDive({ videoId, durationSeconds }: { videoId: string; durationSeconds: number | null }) {
  const [view, setView] = useState<View | null>(null);
  const leave = useLazy(() => fetchYouTubeRetention(videoId));
  const come = useLazy(() => fetchYouTubeSources(videoId));

  const pick = (v: View) => {
    const next = view === v ? null : v;
    setView(next);
    if (next === "leave") leave.start();
    if (next === "come") come.start();
  };
  const btn = (v: View, label: string, Icon: typeof Compass) => (
    <button
      type="button"
      onClick={() => pick(v)}
      aria-expanded={view === v}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        view === v ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-secondary",
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );

  const state = view === "leave" ? leave : view === "come" ? come : null;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {btn("leave", "Where viewers leave", TrendingDown)}
        {btn("come", "Where viewers come from", Compass)}
      </div>
      {view && state && (
        <div className="mt-2 rounded-2xl border border-border bg-card p-3.5">
          {state.loading && (
            <p className="flex items-center gap-2 text-[13px] text-foreground/75">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </p>
          )}
          {state.failed && <p className="text-[13px] text-foreground/75">Couldn't load this right now. Try again in a few minutes.</p>}
          {view === "leave" && leave.data && <LeavePanel data={leave.data} durationSeconds={durationSeconds} />}
          {view === "come" && come.data && <ComePanel data={come.data} />}
        </div>
      )}
    </div>
  );
}

function Notice({ state }: { state: "needs_permission" | "no_data" | "unavailable" }) {
  const text =
    state === "needs_permission"
      ? "Reconnect YouTube once (button above) to see this."
      : state === "no_data"
        ? "Not enough viewers yet to show this. Check again after more people have watched."
        : "YouTube didn't answer. Try again in a few minutes.";
  return <p className="text-[13px] text-foreground/75">{text}</p>;
}

function LeavePanel({ data, durationSeconds }: { data: ApiYouTubeRetention; durationSeconds: number | null }) {
  if (data.state !== "ok") return <Notice state={data.state} />;
  return <Curve data={data} durationSeconds={durationSeconds} />;
}

function ComePanel({ data }: { data: ApiYouTubeSources }) {
  if (data.state !== "ok") return <Notice state={data.state} />;
  const top = Math.max(1, ...data.sources.map((s) => s.share_pct));
  return (
    <div>
      <ul className="flex flex-col gap-2" aria-label="Where this video's views came from">
        {data.sources.map((s) => (
          <li key={s.type} className="text-[13px]">
            <div className="mb-0.5 flex items-baseline justify-between gap-3">
              <span className="font-semibold text-foreground">{s.label}</span>
              <span className="tabular-nums text-foreground/75">
                {Math.round(s.share_pct)}% · {s.views.toLocaleString()} {s.views === 1 ? "view" : "views"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${(s.share_pct / top) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {data.search_terms.length > 0 && (
        <div className="mt-3.5">
          <p className="mb-1.5 text-[12.5px] font-semibold text-foreground">What people searched on YouTube</p>
          <ul className="flex flex-wrap gap-1.5">
            {data.search_terms.map((t) => (
              <li key={t.term} className="rounded-full bg-secondary px-2.5 py-1 text-[12.5px] text-secondary-foreground">
                {t.term} <span className="tabular-nums text-foreground/60">· {t.views}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Curve({ data, durationSeconds }: { data: ApiYouTubeRetention; durationSeconds: number | null }) {
  const pts = data.points;
  const top = Math.max(1, ...pts.map((p) => p.watching));
  const x = (t: number) => PAD.left + t * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / top) * (H - PAD.top - PAD.bottom);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)} ${y(p.watching).toFixed(1)}`).join(" ");
  const base = y(0);
  const area = `${line} L${x(pts[pts.length - 1].t).toFixed(1)} ${base.toFixed(1)} L${x(pts[0].t).toFixed(1)} ${base.toFixed(1)} Z`;

  const where = (t: number) => (durationSeconds ? clock(t * durationSeconds) : `${Math.round(t * 100)}% in`);
  const half = pts.find((p) => p.watching < 0.5);
  const end = pts[pts.length - 1].watching;
  const drop = data.biggest_drop;
  const dropPoint = drop ? pts.find((p) => p.t === drop.at) : undefined;
  const ticks = top > 1 ? [0, 0.5, 1, top] : [0, 0.5, 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" className="h-auto w-full" aria-label="Share of viewers still watching, from the start to the end of the video">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth="1" strokeDasharray={v === 0 ? undefined : "3 4"} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="fill-foreground/60 text-[11px]">{Math.round(v * 100)}%</text>
          </g>
        ))}
        <path d={area} className="fill-foreground/10" />
        <path d={line} fill="none" className="stroke-foreground" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
        {drop && dropPoint && (
          <g>
            <line x1={x(dropPoint.t)} x2={x(dropPoint.t)} y1={PAD.top} y2={base} className="stroke-destructive" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx={x(dropPoint.t)} cy={y(dropPoint.watching)} r="4.5" className="fill-destructive stroke-card" strokeWidth="2" />
          </g>
        )}
        <text x={PAD.left} y={H - 5} className="fill-foreground/60 text-[11px]">Start</text>
        <text x={W - PAD.right} y={H - 5} textAnchor="end" className="fill-foreground/60 text-[11px]">{durationSeconds ? clock(durationSeconds) : "End"}</text>
      </svg>
      <ul className="mt-2 flex flex-col gap-1 text-[13px] text-foreground/85">
        {drop && (
          <li>
            <span className="font-semibold text-destructive">Biggest drop:</span> {Math.round(drop.lost_pct)}% of viewers left around {where(drop.at)}.
          </li>
        )}
        {half && <li>Half of the viewers had left by {where(half.t)}.</li>}
        <li>{Math.round(end * 100)}% were still watching at the end.</li>
      </ul>
    </div>
  );
}
