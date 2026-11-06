import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { checkImageVideoStatus, generateImageVideo } from "@/lib/api";
import type { ImageVideoModel, VideoAspectRatio } from "@/lib/api";

// "Compare all": the same photo and words go to three tools at once and the user picks their favourite.
// Each job is started and charged like a normal single video (only when its video exists), so a tool
// that fails costs nothing. Jobs are STARTED by a click handler (startCompareJobs), never by an effect,
// so a re-render can never start them twice.

export const COMPARE_MODELS: ImageVideoModel[] = ["omni", "kling_4", "seedance_2_5"];
export const COMPARE_CHIPS = [
  { label: "Short", seconds: 10 },
  { label: "Long", seconds: 15 },
];
const LABELS: Record<string, string> = { omni: "Gemini Omni", kling_4: "Kling 4.0", seedance_2_5: "Seedance 2.5" };
const WAIT: Record<string, string> = { omni: "about 1–2 minutes", kling_4: "about 4–5 minutes", seedance_2_5: "about 3–5 minutes" };
const ASPECT_CLASS: Record<VideoAspectRatio, string> = { "9:16": "aspect-[9/16]", "16:9": "aspect-video", "1:1": "aspect-square" };

export type CompareJob = { model: ImageVideoModel; jobId: string | null; error: string | null };

export async function startCompareJobs(args: {
  image: { base64: string; mimeType: string };
  prompt: string;
  seconds: number;
  aspect: VideoAspectRatio;
  enhance: boolean;
}): Promise<CompareJob[]> {
  return Promise.all(
    COMPARE_MODELS.map(async (model): Promise<CompareJob> => {
      try {
        const r = await generateImageVideo(args.image.base64, args.image.mimeType, args.prompt, model, args.seconds, args.aspect, args.enhance, true);
        return { model, jobId: r.job_id, error: null };
      } catch (e) {
        return { model, jobId: null, error: e instanceof Error ? e.message : "Couldn't start this one." };
      }
    }),
  );
}

type CardState = { status: "making" | "done" | "failed"; video?: string; message?: string };

export function VideoCompare({
  jobs,
  starting,
  aspect,
  seconds,
  onCredits,
  onUse,
  onBack,
}: {
  jobs: CompareJob[] | null;
  starting: boolean;
  aspect: VideoAspectRatio;
  seconds: number;
  onCredits: (n: number) => void;
  onUse: (video: string, model: ImageVideoModel) => void;
  onBack: () => void;
}) {
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!jobs) return;
    let cancelled = false;
    setCards(
      Object.fromEntries(
        jobs.map((j) => [j.model, j.jobId ? ({ status: "making" } as CardState) : ({ status: "failed", message: j.error ?? "Couldn't start." } as CardState)]),
      ),
    );
    // A finished card never goes back (a late duplicate poll, e.g. in dev double-mounting, must not undo it).
    const settle = (model: string, next: CardState) =>
      setCards((prev) => (prev[model]?.status === "making" ? { ...prev, [model]: next } : prev));
    const poll = async (model: ImageVideoModel, jobId: string, errorsInARow = 0): Promise<void> => {
      if (cancelled) return;
      try {
        const r = await checkImageVideoStatus(jobId, null);
        if (cancelled) return;
        if (!r.done) {
          timers.current.push(window.setTimeout(() => poll(model, jobId), 8000));
          return;
        }
        if (r.credits_remaining !== null) onCredits(r.credits_remaining);
        if (r.video_base64) settle(model, { status: "done", video: r.video_base64 });
        else settle(model, { status: "failed", message: r.message || "This one didn't come back. You weren't charged." });
      } catch (e) {
        if (errorsInARow < 3) {
          timers.current.push(window.setTimeout(() => poll(model, jobId, errorsInARow + 1), 8000));
          return;
        }
        settle(model, { status: "failed", message: e instanceof Error ? e.message : "Couldn't check this one." });
      }
    };
    jobs.forEach((j) => {
      if (j.jobId) timers.current.push(window.setTimeout(() => poll(j.model, j.jobId as string), 8000));
    });
    return () => {
      cancelled = true;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    // onCredits is a stable setter in the parent; jobs identity changes only when a new comparison starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const allSettled = !starting && jobs !== null && COMPARE_MODELS.every((m) => cards[m] && cards[m].status !== "making");

  return (
    <div className="space-y-3 px-4 py-3">
      <div>
        <p className="font-display text-sm font-extrabold text-foreground">Comparing 3 tools</p>
        <p className="text-xs text-muted-foreground">
          Same photo, same words, {seconds} seconds. You pay only for the videos that come back. Pick your favourite.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {COMPARE_MODELS.map((m) => {
          const c = cards[m];
          return (
            <div key={m} className="flex flex-col gap-2 rounded-2xl bg-secondary p-2.5">
              <p className="text-xs font-semibold text-foreground">{LABELS[m]}</p>
              <div className={["relative w-full overflow-hidden rounded-xl bg-[#1E1F24]", ASPECT_CLASS[aspect], "max-h-[380px]"].join(" ")}>
                {c?.status === "done" && c.video ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video controls loop playsInline className="h-full w-full object-contain" src={`data:video/mp4;base64,${c.video}`} />
                ) : c?.status === "failed" ? (
                  <p className="flex h-full items-center justify-center px-3 text-center text-xs text-white/80">{c.message}</p>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-white/80">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {starting || !c ? "Starting…" : `Making it… ${seconds > 10 ? "about 5 minutes" : WAIT[m]}`}
                  </div>
                )}
              </div>
              <button
                disabled={c?.status !== "done" || !c.video}
                onClick={() => c?.video && onUse(c.video, m)}
                className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-30"
              >
                <Check className="h-3.5 w-3.5" />
                Use this one
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button onClick={onBack} className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground">
          {allSettled ? "Back" : "Leave"}
        </button>
        {!allSettled && <p className="text-[11px] text-muted-foreground">Keep this page open until they finish.</p>}
      </div>
    </div>
  );
}
