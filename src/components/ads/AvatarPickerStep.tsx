import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ApiAvatarOption,
  ApiAvatarVoice,
  ApiAvatarVoicesResponse,
  AvatarLanguage,
  AvatarTier,
  VideoAspectRatio,
} from "@/lib/api";

const TIERS: { value: AvatarTier; label: string; description: string; credits: number }[] = [
  { value: "standard", label: "Standard", description: "Great quality, lower cost", credits: 4 },
  { value: "premium", label: "Premium", description: "Higher fidelity, more realistic movement", credits: 10 },
];

// HeyGen's catalog is 1264 avatars — even gender-filtered, that's several
// hundred full-size images. A real, live-reproduced Chrome compositor
// bug (avatar thumbnails ghosting into a shingled stack of several
// different photos) was hit here — confirmed independently by the
// founder's own trackpad scrolling and by a from-scratch, framework-
// free HTML/CSS repro using the real HeyGen image URLs. Narrowed to:
// only a genuine OS-level/native scroll gesture over a scrollable
// (overflow-y: auto) box triggers it — a direct scrollTop jump, a
// smooth-scroll animation, and synthetic dispatched wheel events never
// did. Capping how many images mount at once (this constant) did NOT
// fix it alone (still reproduced at 24) — the real fix was removing
// the grid's own internal overflow-y:auto scrollbox entirely (below),
// letting the page scroll instead of nesting a second scrollable
// region. Keeping this cap anyway: still real, worthwhile DOM/paint
// savings against a catalog this size, independent of the ghosting bug.
const AVATAR_PAGE_SIZE = 24;

// HeyGen renders a presenter in one fixed orientation per "look", and a
// landscape look on a vertical video comes out as a small picture on a white
// canvas. So which presenters are offered depends on the chosen video format
// (about half of them have vertical looks) and, for Premium, on whether HeyGen
// has a Premium look in that format. `formats` is empty while the server is
// still loading its catalog after a restart — then everything is shown.
export function avatarAvailable(a: ApiAvatarOption, aspectRatio: VideoAspectRatio, tier: AvatarTier): boolean {
  const formats = a.formats ?? {};
  if (Object.keys(formats).length === 0) return true;
  const best = formats[aspectRatio === "9:16" ? "portrait" : "landscape"];
  return best === "premium" || (best === "standard" && tier !== "premium");
}

// Video Ad's "AI Presenter" style — shown only when videoStyle === "avatar".
// Tier is picked first since it changes the credit cost shown throughout.
export function AvatarPickerStep({
  tier,
  onTierChange,
  aspectRatio,
  avatars,
  loading,
  error,
  genderFilter,
  onGenderFilterChange,
  selectedAvatarId,
  onSelectAvatar,
  language,
  voices,
  selectedVoiceId,
  onSelectVoice,
  onRetry,
}: {
  tier: AvatarTier;
  onTierChange: (t: AvatarTier) => void;
  aspectRatio: VideoAspectRatio;
  avatars: ApiAvatarOption[];
  loading: boolean;
  error: string | null;
  genderFilter: "all" | "female" | "male";
  onGenderFilterChange: (g: "all" | "female" | "male") => void;
  selectedAvatarId: string | null;
  onSelectAvatar: (avatarId: string, gender: string | null) => void;
  language: AvatarLanguage;
  voices: ApiAvatarVoicesResponse | null;
  selectedVoiceId: string | null;
  onSelectVoice: (voiceId: string) => void;
  onRetry: () => void;
}) {
  // Voice options for the chosen script language, regardless of the
  // avatar gender *filter* above (that filter only narrows the visible
  // grid) — a user can pair any avatar with any voice; this app doesn't
  // enforce gender-matching as a hard rule, just offers sensible options.
  const voiceOptions: (ApiAvatarVoice & { gender: "female" | "male" })[] = voices
    ? [
        ...voices[language].female.map((v) => ({ ...v, gender: "female" as const })),
        ...voices[language].male.map((v) => ({ ...v, gender: "male" as const })),
      ]
    : [];
  const filtered = avatars.filter(
    (a) => (genderFilter === "all" || a.gender === genderFilter) && avatarAvailable(a, aspectRatio, tier),
  );

  // Resets whenever the visible set actually changes (gender/tier), not
  // on every render — a filter change means the previous "how many to
  // show" count no longer means anything.
  const [visibleCount, setVisibleCount] = useState(AVATAR_PAGE_SIZE);
  useEffect(() => setVisibleCount(AVATAR_PAGE_SIZE), [genderFilter, tier, aspectRatio]);
  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display mb-2 text-xl font-extrabold text-foreground">Choose your presenter</h1>
      <p className="mb-6 text-sm text-muted-foreground">An AI avatar will read your script out loud.</p>

      <div className="mb-5 grid w-full grid-cols-2 gap-2">
        {TIERS.map((t) => {
          const selected = tier === t.value;
          return (
            <button
              key={t.value}
              onClick={() => onTierChange(t.value)}
              className={[
                "rounded-2xl px-3 py-2.5 text-left transition-colors",
                selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              ].join(" ")}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold font-display">
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                {t.label}
                <span className="ml-auto text-xs font-normal opacity-80">from {t.credits} credits</span>
              </span>
              <span className={["block text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                {t.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex w-full gap-2">
        {(["all", "female", "male"] as const).map((g) => (
          <button
            key={g}
            onClick={() => onGenderFilterChange(g)}
            className={[
              "flex-1 rounded-full px-3 py-2 text-xs font-semibold capitalize",
              genderFilter === g ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
            ].join(" ")}
          >
            {g}
          </button>
        ))}
      </div>

      <p className="mb-4 w-full text-left text-xs text-muted-foreground">
        Showing presenters for {aspectRatio === "9:16" ? "vertical (9:16)" : "landscape (16:9)"} videos — change Format
        below to see the others.
      </p>

      {voiceOptions.length > 0 && (
        <div className="mb-4 w-full">
          <p className="mb-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Voice
          </p>
          <div className="flex flex-wrap gap-1.5">
            {voiceOptions.map((v) => (
              <button
                key={v.voice_id}
                onClick={() => onSelectVoice(v.voice_id)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  selectedVoiceId === v.voice_id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                ].join(" ")}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="mb-6 flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Loading avatars...
        </div>
      )}

      {!loading && error && (
        <div className="mb-6 flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/60 p-5 text-center">
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
          <button onClick={onRetry} className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="mb-6 grid w-full grid-cols-3 gap-2">
          {visible.map((a) => {
            const isSelected = selectedAvatarId === a.avatar_id;
            return (
              <button
                key={a.avatar_id}
                onClick={() => onSelectAvatar(a.avatar_id, a.gender)}
                // Hover plays HeyGen's own real preview clip (every avatar
                // has one, confirmed live) over the static photo — the
                // static-only grid was flagged as looking flat/like stills
                // next to Arcads' own actor library, which shows moving
                // footage. preload="none" keeps the grid's initial load
                // light (no bandwidth spent until someone actually
                // hovers); touch devices simply keep seeing the photo,
                // same as before this change.
                onMouseEnter={(e) => {
                  const video = e.currentTarget.querySelector("video");
                  video?.play().catch(() => {});
                }}
                onMouseLeave={(e) => {
                  const video = e.currentTarget.querySelector("video");
                  if (video) {
                    video.pause();
                    video.currentTime = 0;
                  }
                }}
                className={[
                  // aspect-[3/4] lives on the button (the grid item) itself,
                  // not just the img inside it — a grid item's own auto-height
                  // doesn't reliably pick up a descendant <img>'s aspect-ratio-
                  // derived size (confirmed live: the button collapsed to 4px
                  // and clipped its 300px-tall image via overflow-hidden),
                  // so the button needs a real, definite size of its own.
                  //
                  // isolate + [contain:paint] is a second, separate real bug
                  // fix: without it, Chrome would occasionally paint bleed
                  // from a *different* cell's downscaled WebP into this one
                  // (avatar thumbnails showing as ghosted, shingled stacks of
                  // several different photos) — a real GPU compositor-layer
                  // bug between adjacent grid cells, reproduced and fixed in
                  // isolation (a plain HTML/CSS grid, no React/Tailwind
                  // involved) before landing here. Forcing each cell into its
                  // own paint containment context stops the bleed entirely.
                  "relative isolate aspect-[3/4] w-full overflow-hidden rounded-xl border-2 text-left transition-colors [contain:paint]",
                  isSelected ? "border-primary" : "border-transparent",
                ].join(" ")}
              >
                {a.preview_image_url ? (
                  <img
                    src={a.preview_image_url}
                    alt={a.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 h-full w-full bg-secondary" />
                )}
                {a.preview_video_url && (
                  <video
                    src={a.preview_video_url}
                    muted
                    loop
                    playsInline
                    preload="none"
                    className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 hover:opacity-100"
                  />
                )}
                {isSelected && (
                  <span
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "var(--color-accent)" }}
                  >
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <span className="glass-caption absolute inset-x-0 bottom-0 block truncate px-1.5 py-1 text-[11px] font-semibold text-white">
                  {a.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!loading && !error && visibleCount < filtered.length && (
        <button
          onClick={() => setVisibleCount((n) => n + AVATAR_PAGE_SIZE)}
          className="mb-4 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
        >
          Load more ({filtered.length - visibleCount} more)
        </button>
      )}
    </div>
  );
}
