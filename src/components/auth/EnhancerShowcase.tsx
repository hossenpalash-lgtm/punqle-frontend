import { useEffect, useRef, useState } from "react";
import { ArrowRight, Wand2 } from "lucide-react";

// Landing-page proof of the Punqle Enhancer: the SAME photo and the SAME words, run through the SAME engine
// (Wan 3.0, 720p, 4 s, a real test on 2026-11-07), once as-is and once with the Enhancer. Nothing is edited except
// size and the two clips sitting side by side. Each pair is one small pre-made file (costs nothing per visitor)
// and only the pair on screen is loaded. Labels are HTML so they stay sharp.
const SCENES = [
  {
    id: "cafe",
    tab: "A person",
    words: "He smiles and says: \"Welcome, your first coffee is on us.\"",
    added: "A phone-shot look, natural skin and expressions, relaxed delivery, the room's real sound.",
    video: "/demo/enhancer-cafe.mp4",
    poster: "/demo/enhancer-cafe-poster.jpg",
    alt: "A cafe owner speaking to the camera: on the left the engine's own result with an aggressive zoom, on the right the same shot with the Enhancer, steady and natural",
  },
  {
    id: "living-room",
    tab: "A place",
    words: "show the living room",
    added: "A soft breeze moves the curtain; every object stays exactly where it is; a steady frame.",
    video: "/demo/enhancer-living-room.mp4",
    poster: "/demo/enhancer-living-room-poster.jpg",
    alt: "A bright living room: on the left a camera pushing into the plant, on the right the same room steady with a curtain moving in a breeze",
  },
  {
    id: "dog",
    tab: "A pet",
    words: "make the dog look happy",
    added: "The dog wags its tail and smiles; small relaxed movements; fur and colors stay exactly as in the photo.",
    video: "/demo/enhancer-dog.mp4",
    poster: "/demo/enhancer-dog-poster.jpg",
    alt: "A golden retriever in a park: on the left a zoom onto its face, on the right the same dog calm and happy at the same size",
  },
] as const;

export function EnhancerShowcase({ onTry }: { onTry: () => void }) {
  const [active, setActive] = useState<(typeof SCENES)[number]["id"]>("cafe");
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scene = SCENES.find((s) => s.id === active) ?? SCENES[0];

  // People who ask their device for less motion get a still picture with play controls instead of a loop.
  useEffect(() => {
    try {
      setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      /* no matchMedia: keep the loop */
    }
  }, []);

  return (
    <section className="relative z-10 mx-auto mt-20 w-full max-w-4xl px-1" aria-labelledby="enhancer-heading">
      <div
        className="overflow-hidden rounded-[28px] border border-border"
        style={{ boxShadow: "var(--shadow-card)", background: "linear-gradient(160deg, var(--card), var(--secondary))" }}
      >
        <div className="flex flex-col items-center gap-3.5 px-5 py-12 text-center sm:px-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            The Punqle Enhancer
          </span>
          <h2 id="enhancer-heading" className="max-w-lg text-balance font-display text-3xl font-extrabold sm:text-4xl">
            Same photo. Same words. A video that looks filmed.
          </h2>
          <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            AI video engines love to zoom in and move like a robot. The Enhancer reads your photo, fills in what your
            description leaves out, and keeps the shot steady and believable.
          </p>

          <div role="tablist" aria-label="Choose an example" className="mt-3 flex gap-2">
            {SCENES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === active}
                onClick={() => setActive(s.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                  s.id === active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {s.tab}
              </button>
            ))}
          </div>

          <div className="mt-2 w-full max-w-[560px]">
            <div className="grid grid-cols-2 gap-2 pb-2 text-center">
              <p className="text-[13px] font-semibold text-muted-foreground sm:text-sm">As the engine makes it</p>
              <p className="text-[13px] font-semibold text-foreground sm:text-sm">With the Enhancer</p>
            </div>
            <div className="overflow-hidden rounded-2xl bg-[#1E1F24]" style={{ aspectRatio: "720 / 646" }}>
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
            <p className="mt-3 text-sm text-foreground">
              <span className="text-muted-foreground">You wrote: </span>
              <span className="font-semibold">{scene.words}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <span>The Enhancer added: </span>
              {scene.added}
            </p>
          </div>

          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Real results: the same photo and the same words in both, made with Wan 3.0 at 720p, 4 seconds each. Sound is
            off in this preview.
          </p>
          <button
            type="button"
            onClick={onTry}
            className="mt-1 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "var(--gradient-primary)" }}
          >
            Try it on your own photo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
