import { Check, Sparkles, Star } from "lucide-react";

// The dedicated "compare and pick" moment the spec asks for — previously
// generated images landed directly inside the Post Kit's small thumbnail
// strip with no distinct reveal. Shown once, right after generation
// completes; tapping an image selects it and advances into the Post Kit
// (see SinglePostForm.tsx's "results" step). "Recommended" marks the
// first-generated image only as a subtle label — there's no real quality
// signal to rank by, so nothing here claims a score.
export function ResultsGrid({
  images,
  onSelect,
  angleLabels,
  recommendedIndex,
  recommendedReason,
}: {
  images: string[];
  onSelect: (index: number) => void;
  // Ad Creation passes both — a real per-image persuasion-angle label and
  // GPT's own pick of the strongest variant (with reasoning shown below
  // the grid). Image Post passes neither, keeping its existing "first
  // image, no real signal" behavior unchanged.
  angleLabels?: string[];
  recommendedIndex?: number;
  recommendedReason?: string;
}) {
  const recommended = recommendedIndex ?? (images.length > 1 ? 0 : -1);
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 flex items-center gap-2 text-xl font-extrabold text-foreground">
        Your posts are ready
        <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {images.length > 1 ? `Punqle made ${images.length} options — choose one to finish your post.` : "Your post is ready."}
      </p>

      <div
        className={[
          "grid w-full gap-3",
          images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "sm:grid-cols-3",
        ].join(" ")}
      >
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className="group relative overflow-hidden rounded-2xl border border-border transition-transform hover:scale-[1.02]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <img
              src={`data:image/png;base64,${img}`}
              alt={`Option ${i + 1}`}
              className="aspect-square w-full object-cover"
            />
            {i === recommended && images.length > 1 && (
              <span
                className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)" }}
              >
                <Star className="h-2.5 w-2.5 fill-current" />
                Recommended
              </span>
            )}
            {angleLabels?.[i] && (
              <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                {angleLabels[i]}
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-foreground">
                <Check className="h-3.5 w-3.5" />
                Choose this
              </span>
            </div>
          </button>
        ))}
      </div>

      {recommendedReason && (
        <p className="mt-4 flex items-start gap-1.5 text-left text-xs text-muted-foreground">
          <Star className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--color-accent)" }} />
          <span>
            <span className="font-semibold text-foreground">Recommended: </span>
            {recommendedReason}
          </span>
        </p>
      )}
    </div>
  );
}
