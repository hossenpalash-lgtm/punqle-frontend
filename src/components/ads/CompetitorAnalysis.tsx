import {
  AlertCircle,
  ArrowRight,
  Binoculars,
  ChevronDown,
  ExternalLink,
  Eye,
  FileDown,
  Link2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  deleteSavedCompetitor,
  fetchCompetitorAnalysis,
  fetchSavedCompetitor,
  fetchSavedCompetitors,
  type ApiCompetitorAnalysisResponse,
  type ApiSavedCompetitor,
} from "@/lib/api";
import { InstagramStats } from "./InstagramStats";
import { TopUpButton } from "./TopUpButton";

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(seconds) || seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) === 1 ? "" : "s"} ago`;
}

function instagramHandle(r: ApiCompetitorAnalysisResponse): string {
  for (const candidate of [r.public_presence.instagram, r.source_url]) {
    const m = (candidate || "").match(/instagram\.com\/([A-Za-z0-9._]+)/i);
    if (m && !["p", "reel", "reels", "explore", "stories"].includes(m[1].toLowerCase())) return m[1];
  }
  return "";
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

const KIND_STYLES: Record<string, { label: string; className: string }> = {
  review: { label: "Review", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  news: { label: "News", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  official: { label: "Their site", className: "bg-secondary text-muted-foreground" },
  discussion: { label: "Discussion", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  social: { label: "Social", className: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
};

// One opportunity: a plain headline, one or two sentences, where it comes from in a few words, and the button. The reason
// ("Why") and the source link stay one tap away instead of crowding every card.
const BASED_ON: Record<string, string> = {
  review: "Based on customer reviews",
  news: "Based on recent news",
  official: "Based on their own website",
  discussion: "Based on customer discussions",
  social: "Based on their social posts",
};

function OpportunityCard({
  item,
  kind,
  onCreateAd,
  featured = false,
}: {
  item: ApiCompetitorAnalysisResponse["opportunities"][number];
  kind?: string;
  onCreateAd: (idea: string) => void;
  featured?: boolean; // the first, strongest opportunity: shown once, here, instead of also in At a glance
}) {
  const [open, setOpen] = useState(false);
  const basedOn = kind ? BASED_ON[kind] : undefined;
  return (
    <div className={`rounded-xl bg-secondary px-3 py-2.5 ${featured ? "ring-1 ring-primary/40" : ""}`}>
      {featured && (
        <span className="mb-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-primary-foreground">
          Start here
        </span>
      )}
      <p className="text-sm font-bold text-foreground">{item.title}</p>
      <p className="mt-0.5 text-sm text-secondary-foreground">{item.opportunity}</p>
      {basedOn && <p className="mt-1 text-xs text-muted-foreground">{basedOn}</p>}
      {(item.evidence || item.source_url) && (
        <div className={open ? "mt-1.5" : "mt-1.5 hidden print:block"}>
          {item.evidence && <p className="text-xs italic text-muted-foreground">Why: {item.evidence}</p>}
          <SourceLink url={item.source_url} kind={kind} />
        </div>
      )}
      <div className="no-print mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          onClick={() => onCreateAd(item.action || item.opportunity)}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Create an ad from this
          <ArrowRight className="h-3 w-3" />
        </button>
        {(item.evidence || item.source_url) && (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            {open ? "Hide the reason" : "Why this?"}
          </button>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
}

// A small pie (donut) for how customers feel, from the tag each real customer comment already carries (founder, 2026-11-10: a pie is
// the easiest for people to read; charts instead of sentences). Shown only when EVERY comment has a tag, so it never guesses;
// otherwise the sentence stays on its own.
const SENTIMENT_STYLES = {
  positive: { label: "positive", text: "text-emerald-500", dot: "bg-emerald-500" },
  mixed: { label: "mixed", text: "text-amber-400", dot: "bg-amber-400" },
  negative: { label: "negative", text: "text-rose-500", dot: "bg-rose-500" },
} as const;

function SentimentDonut({ signals }: { signals: ApiCompetitorAnalysisResponse["customer_signals"] }) {
  if (signals.length === 0 || signals.some((s) => !s.sentiment)) return null;
  const counts = { positive: 0, mixed: 0, negative: 0 };
  for (const s of signals) counts[s.sentiment as keyof typeof counts] += 1;
  const shown = (["positive", "mixed", "negative"] as const).filter((k) => counts[k] > 0);
  let offset = 0;
  return (
    <div className="mt-2 flex items-center gap-4" role="img" aria-label={shown.map((k) => `${counts[k]} ${SENTIMENT_STYLES[k].label}`).join(", ")}>
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--background)" strokeWidth="5.5" />
          {shown.map((k) => {
            const len = (counts[k] / signals.length) * 100;
            const el = (
              <circle
                key={k}
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke="currentColor"
                className={SENTIMENT_STYLES[k].text}
                strokeWidth="5.5"
                strokeDasharray={`${len} ${100 - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center leading-none text-foreground">
          <span className="font-display text-xl font-extrabold">{signals.length}</span>
        </span>
      </div>
      <ul className="space-y-1 text-[13px] text-secondary-foreground">
        {shown.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${SENTIMENT_STYLES[k].dot}`} aria-hidden="true" />
            <span className="font-bold tabular-nums">{counts[k]}</span> {SENTIMENT_STYLES[k].label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-2xl bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold normal-case text-secondary-foreground">{count}</span>
          )}
        </span>
        <ChevronDown className="no-print h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function SourceLink({ url, kind }: { url: string | null; kind?: string }) {
  if (!url) return null;
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // keep raw url if it doesn't parse
  }
  const style = kind ? KIND_STYLES[kind] : undefined;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5">
      {style && <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${style.className}`}>{style.label}</span>}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        {host}
      </a>
    </span>
  );
}

// What a new analysis or a Refresh costs. Display only: the server charges and enforces it (COMPETITOR_ANALYSIS_CREDITS on Render,
// default 2). Opening a saved or recently cached analysis is free.
const ANALYSIS_CREDITS = 2;

export function CompetitorAnalysis({
  onCreateAd,
  credits,
  setCredits,
}: {
  onCreateAd: (idea: string) => void;
  credits: number | null;
  setCredits: (n: number) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiCompetitorAnalysisResponse | null>(null);
  const [saved, setSaved] = useState<ApiSavedCompetitor[]>([]);
  const [tab, setTab] = useState<"overview" | "instagram">("overview");
  const [igOpened, setIgOpened] = useState(false);
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

  const showResult = (r: ApiCompetitorAnalysisResponse) => {
    setResult(r);
    setTab("overview");
    setIgOpened(false);
  };

  const handleAnalyze = async (refresh = false, urlOverride?: string) => {
    const target = (urlOverride ?? url).trim();
    if (!target || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchCompetitorAnalysis(target, refresh);
      showResult(r);
      if (typeof r.credits_remaining === "number") setCredits(r.credits_remaining);
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
      showResult(await fetchSavedCompetitor(item.id));
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
    clone.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
    clone.querySelectorAll("div.hidden").forEach((d) => d.classList.remove("hidden"));
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
  const kindByUrl: Record<string, string> = {};
  result?.sources.forEach((s) => {
    kindByUrl[s.url] = s.source_type;
  });
  const igHandle = result ? instagramHandle(result) : "";
  const firstDoing = result?.what_theyre_doing[0];
  const firstSignal = result?.customer_signals[0];
  // The two things an owner wants first: what customers like and what they complain about. Only from comments that carry a tag.
  const likedSignal = result?.customer_signals.find((s) => s.sentiment === "positive");
  const complaintSignal = result?.customer_signals.find((s) => s.sentiment === "negative");

  return (
    <div>
      <h1 className="font-display mb-1 text-lg font-extrabold text-foreground">Competitive Edge</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">What can I learn from others?</span> Paste a competitor's
        website or social page — Punqle searches the real web (not just that one page) to find opportunities
        they've missed.
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Analyze · ${ANALYSIS_CREDITS} credits`}
        </button>
      </div>
      <p className="-mt-2 mb-4 text-xs text-muted-foreground">
        A new analysis costs {ANALYSIS_CREDITS} credits. Opening one you saved is free.
        {credits !== null && credits < ANALYSIS_CREDITS && (
          <span className="mt-1.5 flex flex-wrap items-center gap-2 text-foreground">
            You have {credits} {credits === 1 ? "credit" : "credits"}.
            <TopUpButton />
          </span>
        )}
      </p>

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
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
          {/credits?\b/i.test(error) && <TopUpButton className="shrink-0" />}
        </div>
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
          <p className="text-sm font-semibold text-muted-foreground font-display">No analysis yet</p>
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
                Refresh · {ANALYSIS_CREDITS} credits
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

          <div className="no-print flex gap-1.5 rounded-full bg-secondary p-1">
            {(
              [
                ["overview", "Overview"],
                ["instagram", "Instagram stats"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  if (key === "instagram") setIgOpened(true);
                }}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={`space-y-3 ${tab === "overview" ? "" : "hidden"}`}>
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

            <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              <SectionLabel>At a glance</SectionLabel>
              <div className="space-y-2">
                <div className="flex items-start gap-3 rounded-xl bg-secondary px-3 py-2.5">
                  <Eye className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What they do</p>
                    <p className="text-sm text-secondary-foreground">
                      {firstDoing?.observation || result.snapshot.positioning || "Not enough public information found."}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-secondary px-3 py-2.5">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    {likedSignal || complaintSignal ? (
                      <div className="space-y-1.5">
                        {likedSignal && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What customers like</p>
                            <p className="text-sm text-secondary-foreground">{likedSignal.signal}</p>
                          </div>
                        )}
                        {complaintSignal && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What customers complain about</p>
                            <p className="text-sm text-secondary-foreground">{complaintSignal.signal}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customers say</p>
                        <p className="text-sm text-secondary-foreground">
                          {firstSignal?.signal || "No reliable public customer feedback found."}
                        </p>
                      </>
                    )}
                    <SentimentDonut signals={result.customer_signals} />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  `${result.customer_signals.length} customer signal${result.customer_signals.length === 1 ? "" : "s"}`,
                  `${result.opportunities.length} opportunit${result.opportunities.length === 1 ? "y" : "ies"}`,
                  `${result.sources.length} source${result.sources.length === 1 ? "" : "s"}`,
                ].map((chip) => (
                  <span key={chip} className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-medium text-secondary-foreground">
                    {chip}
                  </span>
                ))}
              </div>
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

            <Section title="Opportunities for you" count={result.opportunities.length} defaultOpen>
              {result.opportunities.length === 0 && (
                <p className="rounded-xl bg-secondary px-3 py-2 text-xs italic text-muted-foreground">
                  Not enough real evidence to identify a strong opportunity for this competitor.
                </p>
              )}
              <div className="flex flex-col gap-2">
                {result.opportunities.map((item, i) => (
                  <OpportunityCard
                    key={i}
                    item={item}
                    kind={item.source_url ? kindByUrl[item.source_url] : undefined}
                    onCreateAd={onCreateAd}
                    featured={i === 0}
                  />
                ))}
              </div>
            </Section>

            <Section title="Customer signals" count={result.customer_signals.length}>
              {result.customer_signals.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {result.customer_signals.map((item, i) => (
                    <div key={i} className="rounded-xl bg-secondary px-3 py-2">
                      <p className="text-sm text-secondary-foreground">{item.signal}</p>
                      {item.evidence && <p className="mt-1 text-xs italic text-muted-foreground">{item.evidence}</p>}
                      <SourceLink url={item.source_url} kind={item.source_url ? kindByUrl[item.source_url] : undefined} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-secondary px-3 py-2 text-xs italic text-muted-foreground">
                  Limited public customer feedback found — no reliable third-party reviews or discussions turned up
                  for this competitor.
                </p>
              )}
            </Section>

            {result.what_theyre_doing.length > 0 && (
              <Section title="What they're doing" count={result.what_theyre_doing.length}>
                <div className="flex flex-col gap-2">
                  {result.what_theyre_doing.map((item, i) => (
                    <div key={i} className="rounded-xl bg-secondary px-3 py-2">
                      <p className="text-sm text-secondary-foreground">{item.observation}</p>
                      {item.evidence && <p className="mt-1 text-xs italic text-muted-foreground">{item.evidence}</p>}
                      <SourceLink url={item.source_url} kind={item.source_url ? kindByUrl[item.source_url] : undefined} />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {(result.snapshot.category || result.snapshot.what_they_sell || result.snapshot.target_customer || result.snapshot.positioning) && (
              <Section title="Snapshot">
                <div className="grid grid-cols-2 gap-2">
                  {SNAPSHOT_FIELDS.filter((f) => result.snapshot[f.key]).map((f) => (
                    <div key={f.key} className="rounded-lg bg-secondary px-2.5 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                      <p className="text-xs text-secondary-foreground">{result.snapshot[f.key]}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {(result.public_presence.website || result.public_presence.facebook || result.public_presence.instagram) && (
              <Section title="Public presence">
                <div className="mb-3 flex flex-wrap gap-2">
                  {result.public_presence.website && <SourceLink url={result.public_presence.website} />}
                  {result.public_presence.facebook && <SourceLink url={result.public_presence.facebook} />}
                  {result.public_presence.instagram && <SourceLink url={result.public_presence.instagram} />}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {metricRows.map((m) => (
                    <div key={m.label} className="rounded-lg bg-secondary px-2.5 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                      <p className={m.value ? "text-xs font-semibold text-secondary-foreground" : "text-xs italic text-muted-foreground"}>
                        {m.value || "Not publicly available"}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {result.sources.length > 0 && (
              <Section title="Sources" count={result.sources.length}>
                <div className="flex flex-wrap gap-2">
                  {result.sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-medium text-secondary-foreground hover:underline"
                    >
                      {s.title || s.url}
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {igOpened && (
            <div className={tab === "instagram" ? "" : "hidden"}>
              <InstagramStats key={result.id ?? result.source_url} initialUsername={igHandle} competitorName={result.competitor_name} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
