import { useState } from "react";
import { PlatformTile, type PlatformKey } from "@/components/PlatformTile";
import { PublishToTikTok } from "./PublishToTikTok";
import { PublishToYouTube } from "./PublishToYouTube";
import { PublishVideoToMeta } from "./PublishVideoToMeta";
import type { VideoAspectRatio } from "@/lib/api";
import { rememberPostTile } from "@/lib/post-return";

export interface PostTags {
  goal?: string | null;
  angle?: string | null;
  style?: string | null;
}

// "Post this video" under a finished video (the home screens' result panel and Recent videos). Until 2026-11-11 a finished
// video could only be downloaded there, which sent the customer out of Punqle at the moment they liked the result.
// Four platform buttons in a row (founder's design, same colours as the sidebar's four); tapping one opens just that
// platform's form below, tapping it again closes it. Each form is the platform's own existing panel, so title / privacy /
// schedule / AI-content flags behave exactly as they do elsewhere.
//
// Labels say what actually gets posted: Instagram gets a Reel and YouTube a Short (the backend tags a vertical video as a
// Short). Facebook gets a normal Page video, not the separate Facebook Reels API, so it is NOT labelled "Reels".
const BUTTONS: { key: PlatformKey; name: string; kind: string }[] = [
  { key: "facebook", name: "Facebook", kind: "video" },
  { key: "instagram", name: "Instagram", kind: "Reel" },
  { key: "tiktok", name: "TikTok", kind: "video" },
  { key: "youtube", name: "YouTube", kind: "Shorts" },
];

export function PostThisVideo({
  videoUrl,
  headline,
  aspectRatio,
  videoKept,
  initialOpen,
  tags,
}: {
  videoUrl: string | null; // a "data:video/mp4;base64,..." URL, the shape the publish panels expect
  headline: string;
  aspectRatio: VideoAspectRatio;
  videoKept?: boolean; // true when the server keeps finished videos for 14 days (Recent videos)
  initialOpen?: PlatformKey; // reopen this platform's panel straight away (the customer just came back from connecting it)
  // What this video was made with. Sent along with the post so Performance can group results ("which engine / goal works").
  // Pass only what is really known; anything left out is stored as empty, never guessed.
  tags?: PostTags;
}) {
  const [open, setOpen] = useState<PlatformKey | null>(initialOpen ?? null);

  return (
    <div className="border-t border-border px-4 pb-1 pt-2.5">
      <p className="mb-1 font-display text-sm font-extrabold text-foreground">Post this video</p>
      <div className="mb-2 flex flex-wrap gap-0.5" role="group" aria-label="Where to post this video">
        {BUTTONS.map((b) => {
          const selected = open === b.key;
          return (
            <button
              key={b.key}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                if (!selected) rememberPostTile(b.key);
                setOpen(selected ? null : b.key);
              }}
              className={[
                "flex w-16 flex-col items-center gap-0.5 rounded-xl px-0.5 pb-1 pt-1 transition-colors",
                selected ? "bg-secondary ring-2 ring-foreground" : "hover:bg-secondary/60",
              ].join(" ")}
            >
              <PlatformTile platform={b.key} size="md" />
              <span className="text-center leading-tight">
                <span className="block text-[11px] font-bold text-foreground">{b.name}</span>
                <span className="block text-[10px] text-muted-foreground">{b.kind}</span>
              </span>
            </button>
          );
        })}
      </div>

      {open === "youtube" && (
        <PublishToYouTube key="youtube" videoUrl={videoUrl} headline={headline} aspectRatio={aspectRatio} videoKept={videoKept} startOpen goal={tags?.goal} angle={tags?.angle} style={tags?.style} />
      )}
      {open === "tiktok" && <PublishToTikTok key="tiktok" videoUrl={videoUrl} headline={headline} videoKept={videoKept} startOpen goal={tags?.goal} angle={tags?.angle} style={tags?.style} />}
      {(open === "facebook" || open === "instagram") && (
        <PublishVideoToMeta key={open} videoUrl={videoUrl} headline={headline} videoKept={videoKept} startOpen initial={open} goal={tags?.goal} angle={tags?.angle} style={tags?.style} />
      )}
    </div>
  );
}
