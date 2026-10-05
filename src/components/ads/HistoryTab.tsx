import { Download, ImageOff, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteHistoryPost, fetchHistory, type ApiGeneratedPost } from "@/lib/api";

// A gallery of past generations — matches Predis's "Content Library"
// step. Only the Single Post flow saves here for now (see
// _save_generated_post in the backend, called from /ads/generate).
// Capped server-side at the 20 most recent per user.
export function HistoryTab() {
  const [posts, setPosts] = useState<ApiGeneratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory()
      .then((r) => setPosts(r.posts))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your history."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteHistoryPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that post.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm font-medium text-destructive">{error}</p>;
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-16 text-center">
        <ImageOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-muted-foreground font-display">No posts yet</p>
        <p className="text-xs text-muted-foreground">Generate a post and it'll show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="rounded-2xl bg-card p-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="mb-2 flex gap-3">
            <img
              src={`data:image/png;base64,${post.image_base64}`}
              alt=""
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-3 text-sm text-foreground">{post.facebook_caption}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`data:image/png;base64,${post.image_base64}`}
              download="ad.png"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              onClick={() => handleDelete(post.id)}
              disabled={deletingId === post.id}
              className="flex items-center justify-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
            >
              {deletingId === post.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
