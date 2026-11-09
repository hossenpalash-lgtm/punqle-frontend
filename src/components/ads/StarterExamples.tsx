import { Loader2 } from "lucide-react";

// "Try an example" (founder, 2026-11-10): a new visitor with no photo can start from a ready-made product photo and
// ready-made words, then press the free comparison. The photos are our own AI-made product shots (no people, no logos,
// nothing that belongs to anyone), 1080x1440, with small thumbnails for the row. Clicking costs nothing.
export type StarterExample = { id: string; label: string; photo: string; thumb: string; prompt: string };

export const STARTER_EXAMPLES: StarterExample[] = [
  {
    id: "cafe",
    label: "Café",
    photo: "/examples/cafe.jpg",
    thumb: "/examples/cafe-thumb.jpg",
    prompt: "Slow push-in on the latte as the steam curls up, warm window light, a calm cosy café morning.",
  },
  {
    id: "bakery",
    label: "Bakery",
    photo: "/examples/bakery.jpg",
    thumb: "/examples/bakery-thumb.jpg",
    prompt: "A gentle camera glide across the fresh croissants and sourdough, flour dust drifting through the warm light.",
  },
  {
    id: "skincare",
    label: "Skincare",
    photo: "/examples/skincare.jpg",
    thumb: "/examples/skincare-thumb.jpg",
    prompt: "A soft, slow orbit around the serum bottle as the daylight shifts across the marble, clean and calm.",
  },
  {
    id: "bag",
    label: "Leather bag",
    photo: "/examples/bag.jpg",
    thumb: "/examples/bag-thumb.jpg",
    prompt: "Slow push-in on the leather bag as golden late-afternoon light moves across the steps, the street softly alive behind.",
  },
  {
    id: "jewellery",
    label: "Jewellery",
    photo: "/examples/jewellery.jpg",
    thumb: "/examples/jewellery-thumb.jpg",
    prompt: "A slow macro drift over the gold pendant as the linen gently moves and the light glints along the chain.",
  },
  {
    id: "fitness",
    label: "Fitness",
    photo: "/examples/fitness.jpg",
    thumb: "/examples/fitness-thumb.jpg",
    prompt: "A soft, slow push-in on the yoga mat and bottle as the morning sunlight slides across the wooden floor.",
  },
];

export function StarterExamples({ onPick, loadingId }: { onPick: (example: StarterExample) => void; loadingId: string | null }) {
  return (
    <div className="mt-2 w-full border-t border-border pt-4 text-left">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">No photo yet? Try an example</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STARTER_EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            disabled={loadingId !== null}
            onClick={() => onPick(ex)}
            title={`Start with the ${ex.label.toLowerCase()} example`}
            className="shrink-0 text-center disabled:opacity-60"
          >
            <span className="relative block h-24 w-[72px] overflow-hidden rounded-xl">
              <img src={ex.thumb} alt={ex.label} className="h-full w-full object-cover" loading="lazy" />
              {loadingId === ex.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </span>
              )}
            </span>
            <span className="mt-1 block max-w-[72px] truncate text-[11px] font-semibold text-foreground">{ex.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
