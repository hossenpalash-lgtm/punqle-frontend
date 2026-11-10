import { PublishToTikTok } from "./PublishToTikTok";
import { PublishToYouTube } from "./PublishToYouTube";
import type { VideoAspectRatio } from "@/lib/api";

// "Post this video" under a finished video (the home screens' result panel and Recent videos). Until 2026-11-11 a finished
// video could only be downloaded there, which sent the customer out of Punqle at the moment they liked the result; the
// posting buttons lived only in the Video tab's form. This reuses those same two panels (YouTube, which tags a vertical
// video as a Short, and TikTok), so title / privacy / schedule / AI-content flags behave exactly as they already do.
// Instagram Reels and Facebook video are not built yet; the line at the bottom says so instead of hiding it.
export function PostThisVideo({
  videoUrl,
  headline,
  aspectRatio,
  videoKept,
}: {
  videoUrl: string | null; // a "data:video/mp4;base64,..." URL, the shape the publish panels expect
  headline: string;
  aspectRatio: VideoAspectRatio;
  videoKept?: boolean; // true when the server keeps finished videos for 14 days (Recent videos)
}) {
  return (
    <div className="border-t border-border px-4 pb-1 pt-3">
      <p className="mb-2 font-display text-sm font-extrabold text-foreground">Post this video</p>
      <PublishToYouTube videoUrl={videoUrl} headline={headline} aspectRatio={aspectRatio} videoKept={videoKept} />
      <PublishToTikTok videoUrl={videoUrl} headline={headline} videoKept={videoKept} />
      <p className="mb-2 text-xs text-muted-foreground">Instagram Reels and Facebook video are coming next.</p>
    </div>
  );
}
