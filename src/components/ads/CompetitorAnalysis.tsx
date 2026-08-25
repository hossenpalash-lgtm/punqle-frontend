import { AlertCircle, ArrowRight, Binoculars, Link2, Loader2 } from "lucide-react";
import { useState } from "react";
import { fetchCompetitorAnalysis, type ApiCompetitorAnalysisResponse } from "@/lib/api";

// Free — one fetch + one text-only GPT call, same economics as
// Blog-to-posts. Works best against a competitor's own website; a
// Facebook/Instagram page URL usually only exposes its public
// link-preview title/description to a plain fetch (their real feed is
// JS-rendered and login-gated), so results there will be thinner.
export function CompetitorAnalysis({ onCreateAd }: { onCreateAd: (idea: string) => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiCompetitorAnalysisResponse | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchCompetitorAnalysis(url.trim());
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't analyze that link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display mb-1 text-lg font-extrabold text-foreground">Competitive Edge</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Paste a competitor's website and find opportunities they've missed for your next ad.
      </p>

      <div className="mb-4 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://competitor.com"
          disabled={loading}
          className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleAnalyze}
          disabled={!url.trim() || loading}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
        </button>
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {!result && !loading && !error && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Binoculars className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">No analysis yet</p>
          <p className="px-6 text-xs text-muted-foreground">
            Works best on a competitor's own website — Facebook/Instagram pages usually only expose their title
            and short description.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              {result.competitor_name}
            </p>
            <p className="text-sm text-foreground">{result.summary}</p>
          </div>
          <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ways to stand out
            </p>
            <div className="flex flex-col gap-2">
              {result.differentiation_ideas.map((item, i) => (
                <div key={i} className="rounded-xl bg-secondary px-3 py-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">{item.angle}</p>
                  <p className="mb-1.5 text-sm text-secondary-foreground">{item.idea}</p>
                  {item.evidence && (
                    <p className="mb-1.5 text-xs italic text-muted-foreground">Why: {item.evidence}</p>
                  )}
                  <button
                    onClick={() => onCreateAd(item.idea)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Create an ad from this
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
