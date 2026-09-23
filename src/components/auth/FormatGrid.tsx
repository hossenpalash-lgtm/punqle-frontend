import { LayoutGrid } from "lucide-react";

// Replaces WorkflowShowcase.tsx's abstract "2 step" mockup (borrowed from
// a reference site — format dropdown, edit-tool pills) with a grid of
// Punqle's real 9 home-bar formats, each shown with a real generated
// photo/actor image rather than an SVG icon — per founder feedback,
// features expressed through real image/video/actor content, not
// abstract icon+text cards.
const FORMATS: { label: string; desc: string; image: string }[] = [
  { label: "Ready Actors", desc: "Real people, redubbed for your business.", image: "/actors/maya.jpg" },
  { label: "Video Ad", desc: "Cinematic, lifestyle, UGC and presenter styles.", image: "/showcase-ads/product-showcase-poster.jpg" },
  { label: "Image Ad", desc: "Goal-driven stills for Facebook & Instagram.", image: "/showcase-ads/skincare.jpg" },
  { label: "Product", desc: "An actor holding your product, styled and shot.", image: "/showcase-ads/fitness.jpg" },
  { label: "Unboxing", desc: "A fresh, styled background for your product photo.", image: "/showcase-ads/home.jpg" },
  { label: "Show Your App", desc: "A real person showing your app on screen.", image: "/showcase-ads/saas.jpg" },
  { label: "Upscale", desc: "Sharpen and enlarge any photo or video.", image: "/actors/liam.jpg" },
  { label: "Try-On", desc: "See your product on a real person, instantly.", image: "/showcase-ads/fashion.jpg" },
  { label: "Carousel", desc: "One topic, a full multi-slide carousel — auto-designed.", image: "/showcase-ads/food.jpg" },
];

export function FormatGrid() {
  return (
    <section className="relative z-10 mx-auto mt-20 w-full max-w-5xl px-1">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
          <LayoutGrid className="h-3.5 w-3.5" />
          One home bar. Nine ways to advertise.
        </span>
        <h2 className="max-w-lg text-balance font-display text-3xl font-extrabold sm:text-4xl">
          Whatever the ad needs, Punqle already builds it.
        </h2>
      </div>
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {FORMATS.map((f, i) => (
          <div
            key={f.label}
            className="animate-fade-rise overflow-hidden rounded-[18px] border border-border bg-card"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <img src={f.image} alt="" className="h-24 w-full object-cover" loading="lazy" />
            <div className="flex flex-col gap-1.5 px-4 py-4">
              <h3 className="text-[15.5px] font-semibold">{f.label}</h3>
              <p className="text-[13px] leading-snug text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
