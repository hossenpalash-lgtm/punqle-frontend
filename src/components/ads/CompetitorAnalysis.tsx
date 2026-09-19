import { AlertCircle, ArrowRight, Binoculars, ExternalLink, FileDown, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  deleteSavedCompetitor,
  fetchCompetitorAnalysis,
  fetchSavedCompetitor,
  fetchSavedCompetitors,
  type ApiCompetitorAnalysisResponse,
  type ApiSavedCompetitor,
} from "@/lib/api";

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(seconds) || seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) === 1 ? "" : "s"} ago`;
}

// Rewritten 2026-09-19 alongside the backend's real web-search-grounded
// rewrite (see _generate_competitor_analysis) -- the richer schema
// (snapshot/public_presence/customer_signals/sources) needed this whole
// result view redesigned, not just a backend swap. Metrics that come
// back null render as "Not publicly available", never a fabricated
// number -- see main.py's own docstring for why they're usually null.
const SNAPSHOT_FIELDS: { key: keyof ApiCompetitorAnalysisResponse["snapshot"]; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "what_they_sell", label: "What they sell" },
  { key: "target_customer", label: "Target customer" },
  { key: "positioning", label: "Positioning" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
}

function SourceLink({ url }: { url: string | null }) {
  if (!url) return null;
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // keep raw url if it doesn't parse
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
    >
      <ExternalLink className="h-3 w-3" />
      {host}
    </a>
  );
}

export function CompetitorAnalysis({ onCreateAd }: { onCreateAd: (idea: string) => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiCompetitorAnalysisResponse | null>(null);
  const [saved, setSaved] = useState<ApiSavedCompetitor[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadSaved = async () => {
    try {
      const r = await fetchSavedCompetitors();
      setSaved(r.competitors);
    } catch {
      // the saved list is a convenience -- the tool still works without it
    }
  };

  useEffect(() => {
    void loadSaved();
  }, []);

  const handleAnalyze = async (refresh = false, urlOverride?: string) => {
    const target = (urlOverride ?? url).trim();
    if (!target || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchCompetitorAnalysis(target, refresh);
      setResult(r);
      void loadSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't analyze that link.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSaved = async (item: ApiSavedCompetitor) => {
    if (loading) return;
    setError(null);
    setUrl(item.source_url);
    try {
      setResult(await fetchSavedCompetitor(item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open that saved competitor.");
      void loadSaved();
    }
  };

  const handleRemoveSaved = async (id: string) => {
    try {
      await deleteSavedCompetitor(id);
      if (result?.id === id) setResult(null);
      void loadSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that competitor.");
    }
  };

  const handleSavePdf = () => {
    const el = reportRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) {
      setError("Your browser blocked the pop-up. Allow pop-ups for this site to save as PDF.");
      return;
    }
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".no-print").forEach((n) => n.remove());
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((n) => n.outerHTML)
      .join("");
    const title = `${result?.competitor_name ?? "Competitor"} - Competitive Edge`;
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title>${styles}` +
        `<style>body{background:#fff;padding:24px;max-width:820px;margin:0 auto}</style></head><body>${clone.outerHTML}</body></html>`,
    );
    w.document.close();
    w.addEventListener("load", () => setTimeout(() => w.print(), 400));
  };

  const metrics = result?.public_presence.metrics;
  const metricRows = metrics
    ? [
        { label: "Facebook followers", value: metrics.facebook_followers },
        { label: "Facebook likes", value: metrics.facebook_likes },
        { label: "Instagram followers", value: metrics.instagram_followers },
        { label: "Visible post engagement", value: metrics.visible_post_engagement },
      ]
    : [];

  return (
    <div>
      <h1 className="font-display mb-1 text-lg font-extrabold text-foreground">Competitive Edge</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Paste a competitor's website or social page — Punqle searches the real web (not just that one page) to
        find opportunities they've missed.
      </p>

      <div className="mb-4 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://competitor.com or facebook.com/theirpage"
          disabled={loading}
          className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => void handleAnalyze()}
          disabled={!url.trim() || loading}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
        </button>
      </div>

      {saved.length > 0 && (
        <div className="mb-4">
          <SectionLabel>Saved competitors</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {saved.map((c) => (
              <button
                key={c.id}
                onClick={() => void handleOpenSaved(c)}
                disabled={loading}
                title={`Analyzed ${timeAgo(c.analyzed_at)}`}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                  result?.id === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                }`}
              >
                {c.competitor_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Searching the real web for reviews, news and their own pages — this can take up to 30 seconds…</p>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Binoculars className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">No analysis yet</p>
          <p className="px-6 text-xs text-muted-foreground">
            Works on a Facebook/Instagram page too now — Punqle identifies the real brand and searches the open
            web for it, instead of only reading that one page.
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3" ref={reportRef}>
          <div className="no-print flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {result.analyzed_at
                ? `${result.cached ? "Saved analysis" : "Analyzed"} · ${timeAgo(result.analyzed_at)}`
                : "Not saved"}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => void handleAnalyze(true, result.source_url || url)}
                className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/70"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <button
                onClick={handleSavePdf}
                className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/70"
              >
                <FileDown className="h-3.5 w-3.5" />
                Save as PDF
              </button>
              {result.id && (
                <button
                  onClick={() => void handleRemoveSaved(result.id as string)}
                  aria-label="Remove saved competitor"
                  className="flex items-center rounded-full bg-secondary p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              {result.competitor_name}
            </p>
            <p className="text-sm text-foreground">{result.summary}</p>
            {result.snapshot.recent_developments && (
              <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
                <span className="font-semibold">Recent: </span>
                {result.snapshot.recent_developments}
              </p>
            )}
          </div>

          {result.limitations.length > 0 && (
            <div className="rounded-2xl bg-secondary p-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                Research notes
              </p>
              <ul className="space-y-1">
                {result.limitations.map((note, i) => (
                  <li key={i} className="text-xs text-secondary-foreground">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(result.snapshot.category || result.snapshot.what_they_sell || result.snapshot.target_customer || result.snapshot.positioning) && (
            <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <SectionLabel>Snapshot</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {SNAPSHOT_FIELDS.filter((f) => result.snapshot[f.key]).map((f) => (
                  <div key={f.key} className="rounded-lg bg-secondary px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                    <p className="text-xs text-secondary-foreground">{result.snapshot[f.key]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(result.public_presence.website || result.public_presence.facebook || result.public_presence.instagram) && (
            <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <SectionLabel>Public presence</SectionLabel>
              <div className="mb-3 flex flex-wrap gap-2">
                {result.public_presence.website && <SourceLink url={result.public_presence.website} />}
                {result.public_presence.facebook && <SourceLink url={result.public_presence.facebook} />}
                {result.public_presence.instagram && <SourceLink url={result.public_presence.instagram} />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {metricRows.map((m) => (
                  <div key={m.label} className="rounded-lg bg-secondary px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className={m.value ? "text-xs font-semibold text-secondary-foreground" : "text-xs italic text-muted-foreground"}>
                      {m.value || "Not publicly available"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.what_theyre_doing.length > 0 && (
            <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <SectionLabel>What they're doing</SectionLabel>
              <div className="flex flex-col gap-2">
                {result.what_theyre_doing.map((item, i) => (
                  <div key={i} className="rounded-xl bg-secondary px-3 py-2">
                    <p className="text-sm text-secondary-foreground">{item.observation}</p>
                    {item.evidence && <p className="mt-1 text-xs italic text-muted-foreground">{item.evidence}</p>}
                    <SourceLink url={item.source_url} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <SectionLabel>Customer signals</SectionLabel>
            {result.customer_signals.length > 0 ? (
              <div className="flex flex-col gap-2">
                {result.customer_signals.map((item, i) => (
                  <div key={i} className="rounded-xl bg-secondary px-3 py-2">
                    <p className="text-sm text-secondary-foreground">{item.signal}</p>
                    {item.evidence && <p className="mt-1 text-xs italic text-muted-foreground">{item.evidence}</p>}
                    <SourceLink url={item.source_url} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-secondary px-3 py-2 text-xs italic text-muted-foreground">
                Limited public customer feedback found — no reliable third-party reviews or discussions turned up
                for this competitor.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <SectionLabel>Opportunities for you</SectionLabel>
            {result.opportunities.length === 0 && (
              <p className="rounded-xl bg-secondary px-3 py-2 text-xs italic text-muted-foreground">
                Not enough real evidence to identify a strong opportunity for this competitor.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {result.opportunities.map((item, i) => (
                <div key={i} className="rounded-xl bg-secondary px-3 py-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">{item.title}</p>
                  <p className="mb-1.5 text-sm text-secondary-foreground">{item.opportunity}</p>
                  {item.evidence && (
                    <p className="mb-1.5 text-xs italic text-muted-foreground">Why: {item.evidence}</p>
                  )}
                  <SourceLink url={item.source_url} />
                  <button
                    onClick={() => onCreateAd(item.action || item.opportunity)}
                    className="no-print mt-1.5 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Create an ad from this
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {result.sources.length > 0 && (
            <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <SectionLabel>Sources</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {result.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:underline"
                  >
                    {s.title || s.url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
