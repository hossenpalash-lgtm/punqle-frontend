import { Download, Loader2, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchRecentVideos } from "@/lib/api";
import type { ApiRecentVideo, VideoAspectRatio } from "@/lib/api";
import { PostThisVideo } from "./PostThisVideo";
import type { PlatformKey } from "@/components/PlatformTile";

const LABELS: Record<string, string> = { omni: "Gemini Omni", kling_3_pro: "Kling", kling_4: "Kling 4.0", seedance_2_5: "Seedance 2.5" };

// A saved video has no stored shape, so read it from the picture itself: wide, tall or about square.
function aspectFromSize(width: number, height: number): VideoAspectRatio {
  const r = width / (height || 1);
  if (r > 1.2) return "16:9";
  if (r < 0.8) return "9:16";
  return "1:1";
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Couldn't read the video."));
    fr.readAsDataURL(blob);
  });
}

function readAspect(blobUrl: string): Promise<VideoAspectRatio> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(aspectFromSize(v.videoWidth, v.videoHeight));
    v.onerror = () => resolve("9:16");
    v.src = blobUrl;
  });
}

// The user's videos from the last 14 days. Videos that finished while the page was closed show up here.
// "Post" opens the same YouTube / TikTok panels as the result screen, so a customer who had to leave to connect an account
// can come back here and post the very same video.
// `returningFrom`: set when the customer has just connected that platform, so the newest video opens for posting at once.
export function RecentVideos({ onClose, returningFrom }: { onClose: () => void; returningFrom?: PlatformKey | null }) {
  const [videos, setVideos] = useState<ApiRecentVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState<{ id: string; model: string; dataUrl: string | null; aspect: VideoAspectRatio; failed: boolean } | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRecentVideos()
      .then((r) => {
        if (cancelled) return;
        setVideos(r.videos);
        if (returningFrom && r.videos.length > 0) {
          setAutoOpened(true);
          void startPosting(r.videos[0]);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load your videos."));
    return () => {
      cancelled = true;
    };
  }, []);

  const startPosting = async (v: ApiRecentVideo) => {
    setPosting({ id: v.id, model: v.model, dataUrl: null, aspect: "9:16", failed: false });
    try {
      const blob = await (await fetch(v.url)).blob();
      const [dataUrl, aspect] = await Promise.all([readAsDataUrl(blob), readAspect(URL.createObjectURL(blob))]);
      setPosting({ id: v.id, model: v.model, dataUrl, aspect, failed: false });
    } catch {
      setPosting({ id: v.id, model: v.model, dataUrl: null, aspect: "9:16", failed: true });
    }
  };

  return (
    <div className="space-y-3 px-4 py-3">
      {returningFrom && (
        <p className="rounded-2xl bg-secondary px-3 py-2.5 text-xs font-semibold text-foreground">
          Connected. Your newest video is open below: tap Post to send it.
        </p>
      )}
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
              <button
                onClick={() => startPosting(v)}
                disabled={posting?.id === v.id && !posting.dataUrl && !posting.failed}
                className="flex items-center justify-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-60"
              >
                {posting?.id === v.id && !posting.dataUrl && !posting.failed ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Post
              </button>
            </div>
          ))}
        </div>
      )}
      {posting?.failed && (
        <p className="text-xs font-medium text-destructive">
          Couldn't open that video for posting. Download it and upload it yourself, or try again.
        </p>
      )}
      {posting?.dataUrl && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-end px-3 pt-2">
            <button
              onClick={() => setPosting(null)}
              aria-label="Close posting"
              className="rounded-full bg-secondary p-1.5 text-secondary-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <PostThisVideo
            key={posting.id}
            videoUrl={posting.dataUrl}
            headline="My ad video"
            aspectRatio={posting.aspect}
            videoKept
            tags={{ style: posting.model }}
            initialOpen={autoOpened && returningFrom && videos && posting.id === videos[0]?.id ? returningFrom : undefined}
          />
        </div>
      )}
    </div>
  );
}
