import { Download, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchRecentVideos } from "@/lib/api";
import type { ApiRecentVideo } from "@/lib/api";

const LABELS: Record<string, string> = { omni: "Gemini Omni", kling_3_pro: "Kling", kling_4: "Kling 4.0", seedance_2_5: "Seedance 2.5" };

// The user's videos from the last 14 days. Videos that finished while the page was closed show up here.
export function RecentVideos({ onClose }: { onClose: () => void }) {
  const [videos, setVideos] = useState<ApiRecentVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRecentVideos()
      .then((r) => !cancelled && setVideos(r.videos))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load your videos."));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-extrabold text-foreground">Recent videos</p>
          <p className="text-xs text-muted-foreground">Your videos are kept for 14 days.</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-full bg-secondary p-2 text-secondary-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {!videos && !error && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {videos && videos.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No videos yet.</p>}
      {videos && videos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {videos.map((v) => (
            <div key={v.id} className="flex flex-col gap-1.5 rounded-2xl bg-secondary p-2">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video controls playsInline preload="metadata" src={v.url} className="aspect-[9/16] max-h-[300px] w-full rounded-xl bg-[#1E1F24] object-contain" />
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="truncate text-[11px] text-muted-foreground">
                  {LABELS[v.model] ?? v.model} · {v.duration_seconds} s · {new Date(v.created_at).toLocaleDateString()}
                </span>
                <a href={v.url} download={`punqle-video-${v.id}.mp4`} aria-label="Download" className="shrink-0 text-foreground">
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
