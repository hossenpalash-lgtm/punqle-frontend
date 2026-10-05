import { ArrowLeft, ArrowRight, Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { searchStockPhotos } from "@/lib/api";
import type { ApiStockPhotoResult, VisualDirection } from "@/lib/api";
import {
  MORE_VISUAL_DIRECTIONS,
  VISUAL_DIRECTIONS,
  type VisualDirectionOption,
} from "@/lib/social-wizard";

// Real mini social-creative previews, semantically grounded in the
// user's own idea. `visualSubject`/`offer` come from the REAL
// GPT-derived understanding of the idea (/ads/understand-idea, see
// _understand_idea in main.py) — genuine subject/entity extraction, not
// a client-side regex guess, and deliberately empty when the idea
// states no concrete subject rather than inventing one. Each style
// card searches for its OWN style-appropriate photo (see
// STYLE_QUERY_MODIFIER below) so the 5 cards look like genuinely
// different photography, not 5 arbitrary draws from one generic pool —
// but the real subject is always the anchor of that search, never
// replaced by the style keyword: every per-style query is
// "<subject> <mood words>", never the mood words alone, and if that
// combination returns nothing, the style falls back to the bare
// validated subject rather than drifting onto an unrelated photo (see
// resolveBaseQuery/fetchStylePhotos). When the idea states no concrete
// subject (most of the app's own "Popular ideas" starters — e.g.
// "Create a promotional post for my special offer" — land here), the
// search subject falls back to the post's own content type ("Special
// offer", "Customer story", ...) rather than skipping the search
// entirely: that's exactly the same word already shown as the real
// headline text, so it adds no invented fact, just gives every card a
// real, on-topic photo instead of a flat color swatch. Each style still
// falls back to its own CSS gradient only if even that content-type
// search comes back empty. Deliberately NOT a live Gemini regeneration
// — that would mean extra PAID image-generation calls (and a 30-45s
// wait) every time anyone reaches this step, including everyone who
// never finishes generating.
const ALL_DIRECTIONS = [...VISUAL_DIRECTIONS, ...MORE_VISUAL_DIRECTIONS];

// Short, safe mood adjectives only — never a noun that could itself
// become the photo's subject (the earlier per-style-search era's real
// failure mode: a CTA verb like "book" or a vague noun like "special
// offer" pulled photos of literal books/generic retail, unrelated to
// the actual idea). An adjective pair can only narrow which "coffee
// beans" photo comes back, never replace "coffee beans" with something
// else entirely.
const STYLE_QUERY_MODIFIER: Record<string, string> = {
  clean_premium: "premium elegant",
  bold_energetic: "bold vibrant",
  warm_lifestyle: "warm cozy",
  minimal_editorial: "minimal simple",
  vibrant_playful: "colorful playful",
};

// Hand-picked semantic anchor per content type — used as the search
// subject instead of the bare content-type string when the idea states
// no concrete subject. The literal category name alone ("Poll", "Behind
// the scenes") is a weak, ambiguous Pexels query; a phrase describing
// what that category actually LOOKS like keeps every style's photo
// clearly recognizable as belonging to the same category even after a
// style mood word is appended. Content types not listed here (e.g.
// "Special offer", which already searches well as-is) fall back to the
// literal content type unchanged.
const CONTENT_TYPE_SEARCH_QUERY: Record<string, string> = {
  poll: "people voting survey",
  announcement: "megaphone",
  "product launch": "product showcase display",
  "educational tip": "teaching learning knowledge",
  "customer story": "customer service experience",
  "behind the scenes": "team workspace process",
  // Added for Step 1's "Surprise me" engagement formats (see
  // SURPRISE_FORMATS in main.py) — each anchor was hand-checked against
  // real Pexels results the same way Announcement's was, so a Surprise
  // Me pick renders as its own genuine concept, not a generic photo.
  question: "person asking question",
  "this or that": "two choices hands",
  "myth vs fact": "magnifying glass research",
  "fun fact": "lightbulb idea",
  quote: "handwritten quote notebook",
  "quick tip": "notebook tip pen",
  checklist: "checklist notepad pen",
  "before & after": "makeover transformation",
  "did you know": "magnifying glass discovery",
  "industry insight": "business chart analytics",
  "conversation starter": "people talking coffee chat",
  "mini story": "storytelling open book",
};

// Announcement is a real exception to "append a style mood word": hand
// -checked the actual Pexels results first (not assumed) and found its
// genuinely on-topic photos (megaphones, speech-bubble props, spotlight
// stages, studio mics) are a small, tightly-clustered set — appending
// ANY style adjective ("premium elegant", "bold vibrant"...) reliably
// dragged the top result into unrelated abstract art or product shots
// instead of narrowing it, the opposite of what the modifier does for a
// concrete noun like "coffee beans". So Announcement searches ONCE and
// spreads that one on-topic pool across the 5 styles — still 5
// different photos, all clearly announcement-themed — and lets each
// style's own existing filter/composition (already different per
// style) carry the visual-treatment difference instead.
const SINGLE_QUERY_CONTENT_TYPES = new Set(["announcement"]);

// Pexels has no relevance/caption metadata we can score candidates
// against (the proxy only returns id/thumbnail/full url/photographer —
// see /ads/stock-photos in main.py), so a true per-candidate semantic
// score isn't something this stack can honestly compute without adding
// a new paid call. The real lever for relevance is upstream: getting a
// verified, non-hallucinated subject INTO the query (see
// visualSubject above) rather than trying to re-rank results after the
// fact with no signal to rank by.
//
// Resolves ONE validated base query for the whole idea — broadening
// (first significant word, then content type) only when the subject
// itself returns zero Pexels results, same as before. This runs once
// per idea rather than once per style, and every style's modifier
// search below builds on top of whatever this returns — so a style
// keyword can only ever narrow an already real, idea-relevant search,
// never stand in on its own.
async function resolveBaseQuery(subject: string, contentType: string): Promise<string | null> {
  if (!subject) return null;
  const primary = await searchStockPhotos(subject).catch(() => ({ results: [] }));
  if (primary.results.length > 0) return subject;
  const broadTerm = subject.split(" ")[0] || contentType;
  if (broadTerm && broadTerm.toLowerCase() !== subject.toLowerCase()) {
    const broader = await searchStockPhotos(broadTerm).catch(() => ({ results: [] }));
    if (broader.results.length > 0) return broadTerm;
  }
  return null;
}

// One search per style, in parallel: "<baseQuery> <style mood words>" —
// the validated subject is always present, the style modifier only ever
// rides alongside it. A style whose styled search comes back empty
// falls back to a single shared bare-subject search (not its own extra
// call) so every style still gets a real, on-topic photo even when
// Pexels has nothing for "subject + mood". A light dedup pass across
// the combined candidates keeps the 5 cards showing 5 different photos
// rather than accidentally repeating one. `applyModifiers = false`
// (only used for SINGLE_QUERY_CONTENT_TYPES) instead runs ONE search
// and spreads its results across the styles by position — still 5
// different photos, no modifier-induced drift.
async function fetchStylePhotos(
  baseQuery: string,
  styleIds: string[],
  applyModifiers = true
): Promise<Record<string, string | undefined>> {
  if (!applyModifiers) {
    const { results } = await searchStockPhotos(baseQuery).catch(() => ({ results: [] as ApiStockPhotoResult[] }));
    const result: Record<string, string | undefined> = {};
    styleIds.forEach((id, i) => {
      result[id] = results.length > 0 ? results[i % results.length]?.thumbnail_url : undefined;
    });
    return result;
  }
  const styled = await Promise.all(
    styleIds.map((id) => {
      const modifier = STYLE_QUERY_MODIFIER[id] ?? "";
      const query = modifier ? `${baseQuery} ${modifier}` : baseQuery;
      return searchStockPhotos(query).catch(() => ({ results: [] }));
    })
  );
  const needsFallback = styleIds.some((_, i) => styled[i].results.length === 0);
  const fallback = needsFallback
    ? await searchStockPhotos(baseQuery).catch(() => ({ results: [] }))
    : { results: [] as ApiStockPhotoResult[] };

  const used = new Set<string>();
  const result: Record<string, string | undefined> = {};
  styleIds.forEach((id, i) => {
    const candidates = styled[i].results.length > 0 ? styled[i].results : fallback.results;
    const pick = candidates.find((r) => !used.has(r.id)) ?? candidates[0];
    if (pick) used.add(pick.id);
    result[id] = pick?.thumbnail_url;
  });
  return result;
}

// `tier1` (the big poster headline) is always real: the actual subject
// when one exists, else the real content type. `tier2`/`badge` are real
// GPT-derived data (content type / stated offer) shown ONLY when they
// add something tier1 doesn't already say — e.g. "20% off our new
// coffee beans" genuinely has all three: COFFEE BEANS / SPECIAL OFFER /
// 20% OFF. When the idea states no concrete subject/offer beyond its
// bare content type, tier2/badge are simply absent — tier1 alone
// (e.g. just "SPECIAL OFFER" or "BEHIND THE SCENES") is the complete,
// honest label. An earlier round added a generic supporting-phrase
// fallback here ("A look behind the work" etc.) but it was reverted:
// at this thumbnail's compact size that second line frequently got cut
// off mid-word, and it wasn't adding real information the label didn't
// already carry — a short label alone reads cleaner than a truncated
// subtitle.
interface PreviewCopy {
  tier1: string;
  tier2: string | null;
  badge: string | null;
}

function buildPreviewCopy(visualSubject: string, offer: string, contentType: string): PreviewCopy {
  const tier1 = (visualSubject || contentType).toUpperCase();
  const contentTypeUpper = contentType.toUpperCase();
  const tier2 = contentTypeUpper && contentTypeUpper !== tier1 ? contentTypeUpper : null;
  const offerUpper = offer.toUpperCase();
  const badge = offerUpper && offerUpper !== tier1 && offerUpper !== tier2 ? offerUpper : null;
  return { tier1, tier2, badge };
}

// Each style renders a genuinely different MINIATURE SOCIAL-CREATIVE
// COMPOSITION at a real landscape ad size (the thumbnail is now a
// full-width 16:10 banner, not a small square) — real poster-scale
// typography with a headline/subtitle/badge hierarchy and a layered,
// art-directed background, not a photo with one small caption line. The
// composition (how much of the card is photo vs. negative space, where
// the photo sits, whether the headline is an overlay or a standalone
// badge/sticker) differs per style, which is what actually reads as
// "different design direction" at a glance rather than "different color
// filter." `imageUrl` is the one shared-pool photo (still one search for
// the whole idea, unchanged) — every style draws from the same photo,
// only the layout around it differs. When there's no real subject,
// `imageUrl` is deliberately undefined and every style falls back to its
// own layered CSS gradient instead of a photo — a graphic promotional
// composition, not a random stock object standing in for a subject that
// was never stated.
// Clean & Premium — a "photo window, then a real card" composition: the
// image occupies only the top portion inside a thin frame, and the
// caption sits on a genuinely SOLID white panel below it (not a
// gradient fade over the photo, which is what Warm/Bold/Vibrant all do)
// — the same "product shot up top, plain info block below" structure
// real premium app-store/e-commerce creatives use. A thin rule above the
// headline and a bordered (not filled) badge keep every accent
// restrained rather than decorative.
function CleanPremiumPreview({ imageUrl, copy }: { imageUrl: string | undefined; copy: PreviewCopy }) {
  return (
    <div className="relative flex h-full w-full flex-col bg-white p-1">
      <div className="relative min-h-0 flex-[1.3] overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: "radial-gradient(circle at 30% 30%, #faf9f5, #e5e1d5 100%)" }}
          />
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center px-1 pt-1">
        <div className="mb-0.5 h-px w-4 bg-black/25" />
        <p className="line-clamp-2 text-[10px] font-bold uppercase leading-[1.05] tracking-tight text-black">
          {copy.tier1}
        </p>
        {copy.tier2 && (
          <p className="line-clamp-1 text-[6px] font-medium uppercase tracking-[0.14em] text-black/50">
            {copy.tier2}
          </p>
        )}
        {copy.badge && (
          <span className="mt-0.5 inline-block w-fit rounded-full border border-black/25 px-1.5 py-0.5 text-[5.5px] font-semibold uppercase tracking-wide text-black/75">
            {copy.badge}
          </span>
        )}
      </div>
    </div>
  );
}

// Bold & Energetic — a real diagonal color block cut with `clip-path`
// (a genuine graphic shape, not a rotated rectangle peeking from a
// corner), full-bleed high-contrast photo, and the headline pushed to
// the largest scale of any style — the "obvious promotional energy"
// this direction is supposed to have. Deliberately just ONE accent
// shape (an earlier version layered a second white sliver on top,
// which read as crowded at this size alongside the photo and text) —
// one clean diagonal reads as confidently bold, two overlapping ones
// read as busy.
function BoldEnergeticPreview({ imageUrl, copy }: { imageUrl: string | undefined; copy: PreviewCopy }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-75"
          style={{ filter: "contrast(1.35) saturate(1.25)" }}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "linear-gradient(150deg, #0d0d0d, #2a2a2a 60%, #1a0505)" }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/40" />
      <div
        className="absolute inset-0 bg-accent"
        style={{ clipPath: "polygon(60% 0%, 100% 0%, 100% 38%)" }}
      />
      <div className="absolute inset-x-1.5 bottom-1.5">
        <p className="line-clamp-2 text-sm font-black uppercase leading-[0.95] tracking-tight text-white">
          {copy.tier1}
        </p>
        {copy.tier2 && (
          <p className="mt-0.5 line-clamp-1 text-[6px] font-semibold uppercase tracking-wide text-white/70">
            {copy.tier2}
          </p>
        )}
        {copy.badge && (
          <span className="mt-1 inline-block rounded bg-white px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-tight text-black">
            {copy.badge}
          </span>
        )}
      </div>
    </div>
  );
}

// Warm & Lifestyle — a soft radial vignette (dark at the edges, clear in
// the middle) stands in for "natural light falling on the frame" rather
// than a flat corner accent, and the caption reads as a real editorial
// caption block (serif headline, italic support line) sitting low and
// centered the way a magazine photo credit/caption does.
function WarmLifestylePreview({ imageUrl, copy }: { imageUrl: string | undefined; copy: PreviewCopy }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          style={{ filter: "sepia(0.25) saturate(1.15)" }}
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full" style={{ background: "linear-gradient(165deg, #e6b87d, #b5793f 55%, #6e4423)" }} />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(46,26,12,0.55) 100%)" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#2e1a0c]/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-1.5 flex flex-col items-center text-center">
        <p className="font-display line-clamp-2 max-w-[90%] text-[10px] font-bold leading-[1.15] text-[#fdf3e7]">
          {copy.tier1}
        </p>
        {copy.tier2 && <p className="line-clamp-1 text-[6.5px] italic text-[#fdf3e7]/85">{copy.tier2}</p>}
        {copy.badge && (
          <span className="mt-1 inline-block w-fit rounded-full bg-[#fdf3e7]/90 px-1.5 py-0.5 text-[5.5px] font-semibold uppercase tracking-wide text-[#5a3a1e]">
            {copy.badge}
          </span>
        )}
      </div>
    </div>
  );
}

// Minimal & Editorial — a genuine two-column magazine-spread split
// (image confined to a fixed vertical strip, caption in its own column
// with generous unused space above it) instead of a photo with an
// overlay — the negative space is a real structural choice here, not
// leftover space around a caption.
function MinimalEditorialPreview({ imageUrl, copy }: { imageUrl: string | undefined; copy: PreviewCopy }) {
  return (
    <div className="flex h-full w-full bg-[#f7f7f4]">
      <div className="h-full w-[38%] shrink-0 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full" style={{ background: "linear-gradient(165deg, #eae8e1, #cecbc2)" }} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-end p-1.5">
        <div className="mb-1 h-px w-3 bg-black/20" />
        <p className="line-clamp-3 text-[8px] font-semibold uppercase leading-[1.3] tracking-tight text-black/85">
          {copy.tier1}
        </p>
        {copy.tier2 && (
          <p className="mt-0.5 line-clamp-1 text-[5px] font-normal uppercase tracking-[0.2em] text-black/45">
            {copy.tier2}
          </p>
        )}
        {copy.badge && (
          <p className="line-clamp-1 text-[5px] font-normal uppercase tracking-[0.2em] text-black/45">
            {copy.badge}
          </p>
        )}
      </div>
    </div>
  );
}

// Vibrant & Playful — one soft rounded blob accent rather than three
// layered shapes (an earlier version stacked a blob, a confetti chip,
// and a ringed dot together, which crowded the corner alongside the
// photo and text), and a plainer badge (no rotation/ring/shadow
// stacked together) — still colorful and social-first, just not busy.
function VibrantPlayfulPreview({ imageUrl, copy }: { imageUrl: string | undefined; copy: PreviewCopy }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          style={{ filter: "saturate(1.5) contrast(1.05) brightness(1.05)" }}
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full" style={{ background: "linear-gradient(150deg, #ff9466, #d946ef 55%, #9333ea)" }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
      <div className="absolute -right-4 -top-4 h-14 w-14 rounded-full bg-white/20" />
      <div className="absolute inset-x-1.5 bottom-1.5">
        <p className="line-clamp-2 text-[11px] font-extrabold uppercase leading-[1.1] text-white">
          {copy.tier1}
        </p>
        {copy.tier2 && (
          <p className="mt-0.5 line-clamp-1 text-[6.5px] font-semibold uppercase tracking-wide text-white/80">
            {copy.tier2}
          </p>
        )}
        {copy.badge && (
          <span className="mt-1 inline-block w-fit rounded-md bg-accent px-1.5 py-0.5 text-[6.5px] font-extrabold uppercase text-accent-foreground">
            {copy.badge}
          </span>
        )}
      </div>
    </div>
  );
}

const STYLE_PREVIEWS: Record<string, (props: { imageUrl: string | undefined; copy: PreviewCopy }) => ReactNode> = {
  clean_premium: CleanPremiumPreview,
  bold_energetic: BoldEnergeticPreview,
  warm_lifestyle: WarmLifestylePreview,
  minimal_editorial: MinimalEditorialPreview,
  vibrant_playful: VibrantPlayfulPreview,
};

function StylePreview({
  opt,
  previewUrl,
  loading,
  copy,
}: {
  opt: VisualDirectionOption;
  previewUrl: string | undefined;
  loading: boolean;
  copy: PreviewCopy;
}) {
  const Preview = STYLE_PREVIEWS[opt.id] ?? CleanPremiumPreview;
  // previewUrl is only ever a real search result for the real subject
  // (or, when there's none, the post's own content type — see
  // fetchStylePhotos). Each style's own component falls back to its
  // layered CSS gradient whenever this is undefined, whether that's
  // because the search is still in flight or came back genuinely empty.
  return (
    <div className="relative h-full w-full">
      <Preview imageUrl={previewUrl} copy={copy} />
      {loading && !previewUrl && <div className="absolute inset-0 animate-pulse bg-black/10" />}
    </div>
  );
}

// Step 2 — 3 AI-recommended style directions instead of browsing a huge
// template library. "Recommended" is whichever direction the Understanding
// step derived from the user's idea; "Show more styles" reveals 2 more for
// users who want a different look than the recommendation.
export function VisualDirectionStep({
  visualSubject,
  offer,
  contentType,
  recommended,
  selected,
  onSelect,
  onContinue,
  onBack,
}: {
  // Real GPT-derived fields from /ads/understand-idea — visualSubject and
  // offer are "" when the idea genuinely doesn't state one, never guessed.
  visualSubject: string;
  offer: string;
  contentType: string;
  recommended: VisualDirection;
  selected: VisualDirection;
  onSelect: (id: VisualDirection) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const [photosByStyle, setPhotosByStyle] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const generationRef = useRef(0);
  // Guards against firing the same search twice for an unchanged idea —
  // React can legitimately re-run an effect without its dependency
  // actually changing (e.g. dev-mode double-invoke), and since the
  // search is real (if free) network call, this keeps it to exactly one
  // batch of requests per idea regardless.
  const lastFetchedKeyRef = useRef<string | null>(null);

  const options = showMore ? ALL_DIRECTIONS : VISUAL_DIRECTIONS;
  const copy = buildPreviewCopy(visualSubject, offer, contentType);

  // One validated base query per idea, then one style-appropriate search
  // per style (including the 2 behind "Show more") built on top of it —
  // a fresh generation id invalidates any still-in-flight search from a
  // previous idea so a slow response can't overwrite a newer one. The
  // real subject anchors the search when there is one; when there isn't,
  // a hand-picked semantic anchor for the post's own content type does
  // instead (CONTENT_TYPE_SEARCH_QUERY, see top-of-file comment) —
  // either way something real and category-relevant is always searched,
  // so this is keyed on whichever of the two is actually driving the
  // query.
  useEffect(() => {
    const searchSubject =
      visualSubject || CONTENT_TYPE_SEARCH_QUERY[contentType.toLowerCase().trim()] || contentType;
    const key = searchSubject;
    if (lastFetchedKeyRef.current === key) return;
    lastFetchedKeyRef.current = key;
    const generation = ++generationRef.current;
    setPhotosByStyle({});
    setLoading(true);
    const applyModifiers = visualSubject ? true : !SINGLE_QUERY_CONTENT_TYPES.has(contentType.toLowerCase().trim());
    resolveBaseQuery(searchSubject, contentType)
      .then((baseQuery) => {
        if (generationRef.current !== generation || !baseQuery) return {} as Record<string, string | undefined>;
        return fetchStylePhotos(baseQuery, ALL_DIRECTIONS.map((d) => d.id), applyModifiers);
      })
      .then((photos) => {
        if (generationRef.current !== generation) return;
        setPhotosByStyle(photos);
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug("[Step 2 preview]", {
            visualSubject,
            offer,
            contentType,
            searchSubject,
            photosByStyle: photos,
            recommended,
          });
        }
      })
      .finally(() => {
        if (generationRef.current !== generation) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualSubject, contentType]);

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-xl font-extrabold text-foreground">Choose a look</h1>
      <p className="mb-6 text-sm text-muted-foreground">Punqle picked a style that fits your idea best.</p>

      <div className="mb-3 flex w-full flex-col gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          const isRecommended = recommended === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={[
                "flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                isSelected ? "border-primary bg-primary/5" : "border-border bg-card",
              ].join(" ")}
              style={!isSelected ? { boxShadow: "var(--shadow-card)" } : undefined}
            >
              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl">
                <StylePreview
                  opt={opt}
                  previewUrl={photosByStyle[opt.id]}
                  loading={loading}
                  copy={copy}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground font-display">{opt.label}</span>
                  {isRecommended && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
              <div
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                ].join(" ")}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>
            </button>
          );
        })}
      </div>

      {!showMore && (
        <button
          onClick={() => setShowMore(true)}
          className="mb-6 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          Show more styles
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
      {showMore && <div className="mb-3" />}

      <div className="flex w-full gap-2">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 rounded-full bg-secondary px-5 py-4 text-sm font-semibold text-secondary-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onContinue}
          className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
