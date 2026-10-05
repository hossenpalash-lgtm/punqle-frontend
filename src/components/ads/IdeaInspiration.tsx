import { ChevronDown, Lightbulb, Link2, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { fetchBlogToPosts, fetchIdeaLabsIdeas } from "@/lib/api";

// Free — text-only GPT calls, same economics as hashtag suggestions. Two
// distinct idea sources feed the same picker UI: Idea Labs needs no
// input (grounded only in the saved business category — Predis's own
// "idea generator" works the same way with no product typed in yet),
// Blog-to-posts needs a URL and is grounded in that article's actual
// content instead. Picking an idea just fills the description textarea
// below — the user still reviews and generates normally from there.
export function IdeaInspiration({ onSelect }: { onSelect: (idea: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [source, setSource] = useState<"labs" | "blog" | null>(null);
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [showBlogInput, setShowBlogInput] = useState(false);
  const [blogUrl, setBlogUrl] = useState("");
  const [loadingBlog, setLoadingBlog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetIdeas = async () => {
    if (loadingLabs) return;
    setLoadingLabs(true);
    setError(null);
    try {
      const r = await fetchIdeaLabsIdeas();
      setIdeas(r.ideas);
      setSource("labs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load post ideas.");
    } finally {
      setLoadingLabs(false);
    }
  };

  const handleFetchBlog = async () => {
    if (!blogUrl.trim() || loadingBlog) return;
    setLoadingBlog(true);
    setError(null);
    try {
      const r = await fetchBlogToPosts(blogUrl.trim());
      setIdeas(r.ideas);
      setSource("blog");
      setShowBlogInput(false);
      setBlogUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch ideas from that link.");
    } finally {
      setLoadingBlog(false);
    }
  };

  const handlePick = (idea: string) => {
    onSelect(idea);
    setExpanded(false);
    setIdeas([]);
    setSource(null);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mb-3 flex w-full items-center justify-center gap-1 text-xs font-semibold text-muted-foreground"
      >
        <Lightbulb className="h-3.5 w-3.5" />
        Need inspiration for what to post?
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Lightbulb className="h-3.5 w-3.5" />
        Get post ideas
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={handleGetIdeas}
          disabled={loadingLabs}
          className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
        >
          {loadingLabs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Get ideas for my business
        </button>
        {!showBlogInput && (
          <button
            onClick={() => setShowBlogInput(true)}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
          >
            <Link2 className="h-3.5 w-3.5" />
            From a blog/article link
          </button>
        )}
      </div>

      {showBlogInput && (
        <div className="mb-3 flex gap-2">
          <input
            type="url"
            value={blogUrl}
            onChange={(e) => setBlogUrl(e.target.value)}
            placeholder="https://example.com/blog/..."
            disabled={loadingBlog}
            className="flex-1 rounded-full border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleFetchBlog}
            disabled={!blogUrl.trim() || loadingBlog}
            className="flex shrink-0 items-center justify-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loadingBlog ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Fetch"}
          </button>
        </div>
      )}

      {error && <p className="mb-2 text-xs font-medium text-destructive">{error}</p>}

      {ideas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-semibold text-muted-foreground">
            {source === "blog" ? "Tap an idea inspired by that article:" : "Tap an idea to use it:"}
          </p>
          {ideas.map((idea, i) => (
            <button
              key={i}
              onClick={() => handlePick(idea)}
              className="rounded-xl bg-secondary px-3 py-2 text-left text-xs font-medium text-secondary-foreground hover:bg-secondary/70"
            >
              {idea}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
