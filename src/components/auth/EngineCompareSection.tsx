import { useEffect, useRef, useState } from "react";
import { ArrowRight, Columns3 } from "lucide-react";

// Landing-page proof of Punqle's "Compare" feature: the same photo and the same words, run through three
// real video engines (a real 4 s test on 2026-11-07, nothing edited except size). Costs nothing per visitor:
// it is one small pre-made file. The labels are HTML (not baked into the video) so they stay sharp.
// The resolutions are the true ones: Seedance runs at 720p, Kling 4.0 and Wan 3.0 at 1080p.
const ENGINES = [
  { name: "Seedance 2.5", resolution: "720p" },
  { name: "Kling 4.0", resolution: "1080p" },
  { name: "Wan 3.0", resolution: "1080p" },
];

export function EngineCompareSection({ onTry }: { onTry: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // People who ask their device for less motion get a still picture with play controls instead of a loop.
  useEffect(() => {
    try {
      const q = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(q.matches);
      if (q.matches) videoRef.current?.pause();
    } catch {
      /* no matchMedia: keep the loop */
    }
  }, []);

  return (
    <section className="relative z-10 mx-auto mt-20 w-full max-w-4xl px-1">
      <div
        className="overflow-hidden rounded-[28px] border border-border"
        style={{ boxShadow: "var(--shadow-card)", background: "linear-gradient(160deg, var(--card), var(--secondary))" }}
      >
        <div className="flex flex-col items-center gap-3.5 px-5 py-12 text-center sm:px-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <Columns3 className="h-3.5 w-3.5" />
            Compare before you choose
          </span>
          <h2 className="max-w-lg text-balance font-display text-3xl font-extrabold sm:text-4xl">
            One photo. Three AI video engines. You pick.
          </h2>
          <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Instead of guessing which engine will look best, Punqle runs your photo through Wan 3.0, Kling 4.0 and
            Seedance 2.5 side by side, so you can keep the video you actually like.
          </p>

          <div className="mt-4 w-full max-w-[560px]">
            <div className="overflow-hidden rounded-2xl bg-[#1E1F24]" style={{ aspectRatio: "900 / 534" }}>
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                src="/demo/engine-compare.mp4"
                poster="/demo/engine-compare-poster.jpg"
                autoPlay={!reducedMotion}
                controls={reducedMotion}
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="The same photo turned into a video by Seedance 2.5, Kling 4.0 and Wan 3.0, side by side"
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {ENGINES.map((e) => (
                <div key={e.name} className="text-center">
                  <p className="whitespace-nowrap text-[13px] font-semibold text-foreground sm:text-sm">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.resolution}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Real results from these engines: same photo, same words, 4 seconds each. Sound is off in this preview.
          </p>
          <button
            type="button"
            onClick={onTry}
            className="mt-1 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "var(--gradient-primary)" }}
          >
            Try it on your own photo
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
