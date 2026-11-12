import { Loader2, TrendingDown } from "lucide-react";
import { useState } from "react";
import { fetchYouTubeRetention, type ApiYouTubeRetention } from "@/lib/api";

// "Where viewers leave" for one YouTube video (2026-11-13, founder: the audience-retention curve was the missing YouTube number).
// Opens on a tap, asks the server once, then draws the curve: the share of viewers still watching at every point of the video,
// with the steepest fall marked. When the real length is known (worked out from the average view) the marks read in minutes and
// seconds; otherwise they read in percent of the video.

const W = 600;
const H = 150;
const PAD = { left: 38, right: 10, top: 10, bottom: 22 };

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RetentionChart({ videoId, durationSeconds }: { videoId: string; durationSeconds: number | null }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ApiYouTubeRetention | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) {
      setLoading(true);
      setFailed(false);
      fetchYouTubeRetention(videoId)
        .then(setData)
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
        {open ? "Hide where viewers leave" : "Where viewers leave"}
      </button>
      {open && (
        <div className="mt-2 rounded-2xl border border-border bg-card p-3.5">
          {loading && (
            <p className="flex items-center gap-2 text-[13px] text-foreground/75">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the curve…
            </p>
          )}
          {failed && <p className="text-[13px] text-foreground/75">Couldn't load this right now. Try again in a few minutes.</p>}
          {data?.state === "needs_permission" && (
            <p className="text-[13px] text-foreground/75">Reconnect YouTube once (button above) to see where viewers leave.</p>
          )}
          {data?.state === "no_data" && (
            <p className="text-[13px] text-foreground/75">Not enough viewers yet to draw this. Check again after more people have watched.</p>
          )}
          {data?.state === "unavailable" && <p className="text-[13px] text-foreground/75">YouTube didn't answer. Try again in a few minutes.</p>}
          {data?.state === "ok" && <Curve data={data} durationSeconds={durationSeconds} />}
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
