import { Download, ImageOff, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteHistoryPost,
  fetchHistory,
  fetchHistoryImage,
  fetchHistoryThumb,
  type ApiGeneratedPost,
} from "@/lib/api";

// A gallery of past generations — matches Predis's "Content Library"
// step. Only the Single Post flow saves here for now (see
// _save_generated_post in the backend, called from /ads/generate).
// Capped server-side at the 20 most recent per user.
//
// The list itself is text only; each card fetches its own small preview picture, a few at a time, and the full
// picture is fetched only when Download is tapped (the server could not send 20 full pictures in one answer).

// At most 3 preview requests at once: each one makes the server read a large saved picture.
const MAX_PREVIEWS_AT_ONCE = 3;
let previewsRunning = 0;
const previewsWaiting: Array<() => void> = [];
function loadPreview(id: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const run = () => {
      previewsRunning++;
      fetchHistoryThumb(id)
        .then((r) => resolve(r.image_base64), reject)
        .finally(() => {
          previewsRunning--;
          previewsWaiting.shift()?.();
        });
    };
    if (previewsRunning < MAX_PREVIEWS_AT_ONCE) run();
    else previewsWaiting.push(run);
  });
}

// Older saved pictures are PNG, newer ones JPEG; the first characters of the base64 tell which.
function pictureKind(base64: string): { mime: string; ext: string } {
  return base64.startsWith("/9j/") ? { mime: "image/jpeg", ext: "jpg" } : { mime: "image/png", ext: "png" };
}

function HistoryCard({
  post,
  deleting,
  onDelete,
}: {
  post: ApiGeneratedPost;
  deleting: boolean;
  onDelete: (id: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPreview(post.id)
      .then((b64) => {
        if (!cancelled) setPreview(b64);
      })
      .catch(() => {
        if (!cancelled) setPreviewFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { image_base64 } = await fetchHistoryImage(post.id);
      const { mime, ext } = pictureKind(image_base64);
      const blob = await (await fetch(`data:${mime};base64,${image_base64}`)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ad.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Couldn't download that picture.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-3" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-2 flex gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
          {preview ? (
            <img
              src={`data:${pictureKind(preview).mime};base64,${preview}`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : previewFailed ? (
            <ImageOff className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-3 text-sm text-foreground">{post.facebook_caption}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>
      {downloadError && <p className="mb-2 text-xs font-medium text-destructive">{downloadError}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
        >
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download
        </button>
        <button
          onClick={() => onDelete(post.id)}
          disabled={deleting}
          className="flex items-center justify-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

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
        <HistoryCard key={post.id} post={post} deleting={deletingId === post.id} onDelete={handleDelete} />
      ))}
    </div>
  );
}
