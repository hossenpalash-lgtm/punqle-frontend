import { useEffect, useRef, useState } from "react";
import { ArrowRight, Columns3 } from "lucide-react";

// Landing-page proof of Punqle's "Compare" feature: the same photo and the same words, run through three
// real video engines (a real 4 s test on 2026-11-07, nothing edited except size). Costs nothing per visitor:
// it is one small pre-made file. The labels are HTML (not baked into the video) so they stay sharp.
// The resolutions are the true ones. "A person": Seedance 720p, Kling 4.0 and Wan 3.0 1080p (a 2026-11-07 test).
// "A product" (a wrist watch): the real result of the FREE comparison on 2026-11-09, all three at 720p, 4 s, with the
// free-plan watermark, nothing edited except size and the three clips sitting side by side.
const SCENES = [
  {
    id: "product",
    tab: "A product",
    video: "/demo/engine-compare-watch.mp4",
    poster: "/demo/engine-compare-watch-poster.jpg",
    aspect: "1080 / 450",
    maxWidth: "max-w-[720px]",
    engines: [
      { name: "Seedance 2.5", resolution: "720p" },
      { name: "Kling 4.0", resolution: "720p" },
      { name: "Wan 3.0", resolution: "720p" },
    ],
    note: "Real results from the free comparison: the same photo and the same words, 4 seconds each, 720p, with the free-plan watermark. Sound is off in this preview.",
    alt: "One wrist-watch photo turned into a video by Seedance 2.5, Kling 4.0 and Wan 3.0, side by side",
  },
  {
    id: "person",
    tab: "A person",
    video: "/demo/engine-compare.mp4",
    poster: "/demo/engine-compare-poster.jpg",
    aspect: "900 / 534",
    maxWidth: "max-w-[560px]",
    engines: [
      { name: "Seedance 2.5", resolution: "720p" },
      { name: "Kling 4.0", resolution: "1080p" },
      { name: "Wan 3.0", resolution: "1080p" },
    ],
    note: "Real results from these engines: same photo, same words, 4 seconds each. Sound is off in this preview.",
    alt: "The same photo of a person turned into a video by Seedance 2.5, Kling 4.0 and Wan 3.0, side by side",
  },
] as const;

export function EngineCompareSection({ onTry }: { onTry: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState<(typeof SCENES)[number]["id"]>("product");
  const scene = SCENES.find((x) => x.id === active) ?? SCENES[0];

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

          <div role="tablist" aria-label="Choose an example" className="mt-3 flex gap-2">
            {SCENES.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={x.id === active}
                onClick={() => setActive(x.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                  x.id === active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {x.tab}
              </button>
            ))}
          </div>

          <div className={`mt-2 w-full ${scene.maxWidth}`}>
            <div className="overflow-hidden rounded-2xl bg-[#1E1F24]" style={{ aspectRatio: scene.aspect }}>
              <video
                key={scene.id}
                ref={videoRef}
                className="h-full w-full object-cover"
                src={scene.video}
                poster={scene.poster}
                autoPlay={!reducedMotion}
                controls={reducedMotion}
                loop
                muted
                playsInline
                preload="metadata"
                aria-label={scene.alt}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {scene.engines.map((e) => (
                <div key={e.name} className="text-center">
                  <p className="whitespace-nowrap text-[13px] font-semibold text-foreground sm:text-sm">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.resolution}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{scene.note}</p>
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
