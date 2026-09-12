import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUp, Check, Images, Layers, Loader2, Megaphone, Paperclip, Settings2, Shirt, Sparkles, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchAdCredits, generateImageDirect, type ImageGenModel } from "@/lib/api";
import { AdCreationForm } from "@/components/ads/AdCreationForm";
import { AdVideoForm } from "@/components/ads/AdVideoForm";
import { BulkCreativeForm } from "@/components/ads/BulkCreativeForm";
import { CalendarView } from "@/components/ads/CalendarView";
import { CompetitorAnalysis } from "@/components/ads/CompetitorAnalysis";
import { HistoryTab } from "@/components/ads/HistoryTab";
import { PerformanceView } from "@/components/ads/PerformanceView";
import { SinglePostForm } from "@/components/ads/SinglePostForm";
import {
  TryOnForm,
  type TryOnImageAdHandoff,
  type TryOnSocialPostHandoff,
  type TryOnVideoAdHandoff,
} from "@/components/ads/TryOnForm";
import { VideoPostForm } from "@/components/ads/VideoPostForm";
import { WeeklyPlanForm } from "@/components/ads/WeeklyPlanForm";

type Tab = "home" | "single" | "plan" | "calendar" | "performance" | "history" | "competitor" | "video" | "ad" | "ad-video" | "bulk-creative" | "tryon";

export const Route = createFileRoute("/")({
  component: HomeScreen,
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => ({
    tab:
      search.tab === "plan"
        ? "plan"
        : search.tab === "calendar"
          ? "calendar"
          : search.tab === "performance"
            ? "performance"
            : search.tab === "history"
              ? "history"
              : search.tab === "competitor"
                ? "competitor"
                : search.tab === "video"
                  ? "video"
                  : search.tab === "ad"
                    ? "ad"
                    : search.tab === "ad-video"
                      ? "ad-video"
                      : search.tab === "bulk-creative"
                        ? "bulk-creative"
                        : search.tab === "tryon"
                          ? "tryon"
                          : search.tab === "single"
                            ? "single"
                            : "home",
  }),
});

// Image Post and Video are the two formats inside the ✨ Social Content
// creation category — Punqle's product architecture is 3 categories
// (Social Content / Ad Creation / E-commerce, see Sidebar.tsx), all now
// built. Ad Creation (📣) has its own two-format split below (AD_TYPES);
// E-commerce (🛍) starts with 1 feature (Bulk Creative), so it gets a
// plain header instead of a picker grid — see the render block below.
// Weekly Plan and Competitor Analysis live in the sidebar's own "Tools"
// group rather than here, since they aren't part of that 3-category system.
const CONTENT_TYPES: {
  tab: Tab;
  label: string;
  description: string;
  icon: typeof Megaphone;
}[] = [
  { tab: "single", label: "Image Post", description: "Create a polished post in seconds", icon: Megaphone },
  { tab: "video", label: "Video", description: "Short-form video, made for social", icon: Video },
];

// Ad Creation's own two formats, same card-grid pattern as Social
// Content's CONTENT_TYPES above — Image Ad reuses Image Post's pipeline
// with angle-labeled variations; Video Ad generates exactly one video
// (Veo is 10x an image credit and 1-2 min per generation, so no
// "versions" concept here, unlike Image Ad).
const AD_TYPES: {
  tab: Tab;
  label: string;
  description: string;
  icon: typeof Megaphone;
}[] = [
  { tab: "ad", label: "Image Ad", description: "Angle-labeled ad variations", icon: Megaphone },
  { tab: "ad-video", label: "Video Ad", description: "AI presenter or product-in-hand UGC", icon: Video },
];

// Same small, curated model list as Ad Creation's own "Image Model"
// picker — only the vendors Punqle already has API access to.
const IMAGE_MODEL_OPTIONS: { id: ImageGenModel; label: string }[] = [
  { id: "nano_banana_pro", label: "Nano Banana Pro" },
  { id: "nano_banana_2", label: "Nano Banana 2" },
  { id: "gpt_image", label: "GPT Image" },
];
const IMAGE_MODEL_LABELS: Record<ImageGenModel, string> = {
  nano_banana_pro: "Nano Banana Pro",
  nano_banana_2: "Nano Banana 2",
  gpt_image: "GPT Image",
};

function HomeScreen() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  // Set by "Create an ad from this" on the Competitor Analysis tab, read
  // once by SinglePostForm on mount, then cleared — see SinglePostForm's
  // own initialIdea prop comment for why a later unrelated visit to the
  // Image Post tab shouldn't silently reuse stale competitor-insight text.
  const [prefilledIdea, setPrefilledIdea] = useState<string | undefined>(undefined);
  // Set by Try-On's "Social Post" / "Image Ad" / "Video Ad" handoffs —
  // Try-On output is deliberately unbranded, so this is how the user
  // sends a result into a flow where Brand Kit already applies. Same
  // "read once on mount, then cleared" contract as prefilledIdea above.
  const [prefilledSocialImage, setPrefilledSocialImage] = useState<TryOnSocialPostHandoff | undefined>(undefined);
  const [prefilledAdImage, setPrefilledAdImage] = useState<TryOnImageAdHandoff | undefined>(undefined);
  const [prefilledAdVideo, setPrefilledAdVideo] = useState<TryOnVideoAdHandoff | undefined>(undefined);
  // Set only by the home screen's "Carousel" pill — copy-only hint for
  // IdeaStep's placeholder, see SinglePostForm's own entryHint comment.
  // Reset at every other real entry into "single" below so it can't leak
  // into an unrelated visit (same "no stale reuse" discipline as
  // prefilledIdea above).
  const [entryHint, setEntryHint] = useState<"carousel" | undefined>(undefined);
  const [homeIdea, setHomeIdea] = useState("");
  // Standalone quick-image tool living right in the home prompt box —
  // matches a real competitor's own "type a prompt, pick a model,
  // generate" simplicity exactly (their "Image" tool, not their fuller
  // ad-creation flow). Deliberately separate from homeIdea's existing
  // "start a Social Content post" behavior below — this one never
  // navigates away, the image just appears in this same card.
  const [homeImageSettingsOpen, setHomeImageSettingsOpen] = useState(false);
  const [homeImageModel, setHomeImageModel] = useState<ImageGenModel>("nano_banana_pro");
  const [homeImageGenerating, setHomeImageGenerating] = useState(false);
  const [homeImageError, setHomeImageError] = useState<string | null>(null);
  const [homeGeneratedImage, setHomeGeneratedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchAdCredits()
      .then((c) => setCredits(c.credits))
      .catch((err) => setCreditsError(err instanceof Error ? err.message : "Couldn't load your credits."));
  }, []);

  const goTo = (t: Tab) => navigate({ to: "/", search: { tab: t } });

  const handleHomeGenerateImage = async () => {
    if (!homeIdea.trim() || homeImageGenerating) return;
    setHomeImageGenerating(true);
    setHomeImageError(null);
    try {
      const r = await generateImageDirect(homeIdea.trim(), "square", homeImageModel);
      setHomeGeneratedImage(r.banner_image_base64);
      setCredits(r.credits_remaining);
    } catch (err) {
      setHomeImageError(err instanceof Error ? err.message : "Couldn't generate that image.");
    } finally {
      setHomeImageGenerating(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col px-6 py-6">
      <div
        className="mb-5 flex items-center justify-between rounded-2xl bg-card p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Your credits</span>
        </div>
        <span className="text-lg font-extrabold text-primary">
          {credits === null ? "..." : credits}
        </span>
      </div>
      {creditsError && <p className="mb-4 text-sm text-destructive">{creditsError}</p>}

      {/* New Arcads-inspired front door (2026-09-10) — every pill and the
          prompt box itself route to an existing, already-built flow below;
          nothing here is a new generation path. Carousel specifically has
          no pre-generation flow of its own (CarouselBuilder only ever runs
          post-generation inside PostKit's result screen) — it lands on
          the exact same Social Content flow the prompt box goes to, just
          with a carousel-flavored placeholder via entryHint. */}
      {/* Desktop only, per the approved plan — the mockups were never
          designed for mobile, and mobile's own pill-nav header (a
          separate, already-shipped redesign) already gives quick access
          to every destination. Mobile lands on the fallback block just
          below instead (same Social Content grid it's always shown). */}
      {tab === "home" && (
        <div className="hidden flex-1 lg:flex lg:flex-col">
          <div className="flex flex-col items-center pt-4 text-center">
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground">
              What are we creating today?
            </h1>
            <p className="text-sm text-muted-foreground">
              Turn your ideas into scroll-stopping content, in minutes.
            </p>
          </div>

          <div className="flex-1" />

          <div className="mb-3 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => goTo("ad")}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <Megaphone className="h-4 w-4" />
              Image Ad
            </button>
            <button
              onClick={() => goTo("ad-video")}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
              AI UGC
            </button>
            <button
              onClick={() => goTo("tryon")}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <Shirt className="h-4 w-4" />
              Try-On
            </button>
            <button
              onClick={() => {
                setEntryHint("carousel");
                goTo("single");
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <Images className="h-4 w-4" />
              Carousel
            </button>
          </div>

          {homeImageError && (
            <p className="mb-2 self-center text-xs font-medium text-destructive">{homeImageError}</p>
          )}

          {homeGeneratedImage ? (
            <div
              className="mb-6 w-full self-center overflow-hidden rounded-3xl border border-border bg-card"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <img
                src={`data:image/png;base64,${homeGeneratedImage}`}
                alt="Generated"
                className="max-h-[420px] w-full object-contain bg-[#1E1F24]"
              />
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="text-xs text-muted-foreground">{IMAGE_MODEL_LABELS[homeImageModel]}</span>
                <button
                  onClick={() => {
                    setHomeGeneratedImage(null);
                    setHomeIdea("");
                  }}
                  className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                >
                  Create another
                </button>
              </div>
            </div>
          ) : (
          <div
            className="mb-6 w-full self-center rounded-3xl border border-border bg-card"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <textarea
              value={homeIdea}
              onChange={(e) => setHomeIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey || !homeIdea.trim()) return;
                e.preventDefault();
                handleHomeGenerateImage();
              }}
              placeholder="Describe what you want to create… (e.g. a Gen Z girl holding our product)"
              rows={2}
              className="w-full resize-none rounded-t-3xl bg-transparent px-5 py-4 text-sm text-foreground focus:outline-none"
            />
            {homeImageSettingsOpen && (
              <div className="border-t border-border px-4 py-3">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Model</p>
                <div className="flex flex-wrap gap-1.5">
                  {IMAGE_MODEL_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setHomeImageModel(m.id)}
                      className={[
                        "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                        homeImageModel === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                      ].join(" ")}
                    >
                      {homeImageModel === m.id && <Check className="h-3 w-3" />}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
              <button
                onClick={() => setHomeImageSettingsOpen((v) => !v)}
                aria-label="Image settings"
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  homeImageSettingsOpen ? "bg-secondary text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                <Settings2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleHomeGenerateImage}
                disabled={!homeIdea.trim() || homeImageGenerating}
                aria-label="Create"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                {homeImageGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Mobile's own landing for "home" reuses this exact block (unchanged
          from before this redesign) via lg:hidden — desktop shows the new
          hero+pill screen above instead. See the comment above that block. */}
      {(tab === "single" || tab === "video" || tab === "home") && (
        <div className={tab === "home" ? "lg:hidden" : undefined}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <h1 className="font-display flex items-center gap-2 text-xl font-extrabold text-foreground">
              {tab === "single" && entryHint === "carousel" ? (
                <>
                  <Images className="h-4 w-4 text-accent" />
                  Carousel
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-accent" />
                  Social Content
                </>
              )}
            </h1>
            {/* Compact format switcher, same treatment as Ad Creation's
                Image Ad / Video Ad toggle — quiet enough to read as
                "switch format", not a repeated forced choice. Hidden for
                Carousel specifically: CarouselBuilder only ever combines
                already-generated IMAGES (no video equivalent exists), so
                "Video" isn't a real option here — showing it would let a
                tap silently abandon the carousel and land in an unrelated
                single-video flow with no warning. Carousel is implicitly
                Image Post format; nothing to switch between. */}
            {!(tab === "single" && entryHint === "carousel") && (
              <div className="inline-flex shrink-0 gap-1 rounded-full bg-secondary p-1">
                {CONTENT_TYPES.map(({ tab: t, label, icon: Icon }, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(t)}
                    className={[
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      tab === t ? "bg-primary text-primary-foreground" : "text-secondary-foreground",
                    ].join(" ")}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            {tab === "single" && entryHint === "carousel"
              ? "Pick a few images and we'll turn them into one swipeable post."
              : "Create scroll-stopping posts for your social media."}
          </p>
        </div>
      )}

      {(tab === "ad" || tab === "ad-video") && (
        <>
          <div className="mb-1 flex items-center justify-between gap-3">
            <h1 className="font-display flex items-center gap-2 text-xl font-extrabold text-foreground">
              <Megaphone className="h-4 w-4 text-accent" />
              Ad Creation
            </h1>
            {/* Compact format switcher, not a decision gate — arriving here
                via a specific Home pill (Image Ad / AI UGC) already IS the
                choice, so this must read as "you're on X, tap to switch"
                rather than presenting two equal-weight options to pick
                from again. Deliberately smaller/quieter than the create
                screen's own primary controls (no description text, pill
                shape, inline width) — see the two large cards this
                replaced, flagged by the founder as re-asking a choice
                that was already made. */}
            <div className="inline-flex shrink-0 gap-1 rounded-full bg-secondary p-1">
              {AD_TYPES.map(({ tab: t, label, icon: Icon }, i) => (
                <button
                  key={i}
                  onClick={() => goTo(t)}
                  className={[
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    tab === t ? "bg-primary text-primary-foreground" : "text-secondary-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">Tell Punqle what you're advertising — it does the rest.</p>
        </>
      )}

      {(tab === "bulk-creative" || tab === "tryon") && (
        <h1 className="font-display mb-4 flex items-center gap-2 text-xl font-extrabold text-foreground">
          <Layers className="h-4 w-4 text-accent" />
          E-commerce — {tab === "bulk-creative" ? "Bulk Creative" : "Try-On"}
        </h1>
      )}

      {(tab === "single" || tab === "home") && (
        <div className={tab === "home" ? "lg:hidden" : undefined}>
          {/* key={tab} forces a real remount when transitioning between
              "home" (mobile fallback) and "single" — without it, both
              share this same render condition, so React would keep the
              same instance mounted across that transition and silently
              never pick up a freshly-set initialIdea (its useState
              initializer only runs once, at the ORIGINAL mount). Found
              live: prefilledIdea from the home prompt box/Carousel pill
              wasn't reaching IdeaStep until this was added. */}
          <SinglePostForm
            key={tab}
            credits={credits}
            setCredits={setCredits}
            initialIdea={prefilledIdea}
            onInitialIdeaConsumed={() => setPrefilledIdea(undefined)}
            initialGeneratedImage={prefilledSocialImage}
            onInitialGeneratedImageConsumed={() => setPrefilledSocialImage(undefined)}
            entryHint={entryHint}
          />
        </div>
      )}
      {tab === "plan" && <WeeklyPlanForm credits={credits} setCredits={setCredits} />}
      {tab === "calendar" && <CalendarView onGoToWeeklyPlan={() => goTo("plan")} />}
      {tab === "performance" && <PerformanceView />}
      {tab === "video" && <VideoPostForm credits={credits} setCredits={setCredits} />}
      {tab === "history" && <HistoryTab />}
      {tab === "competitor" && (
        <CompetitorAnalysis
          onCreateAd={(idea) => {
            setPrefilledIdea(idea);
            setEntryHint(undefined);
            goTo("single");
          }}
        />
      )}
      {tab === "ad" && (
        <AdCreationForm
          credits={credits}
          setCredits={setCredits}
          initialGeneratedImage={prefilledAdImage}
          onInitialGeneratedImageConsumed={() => setPrefilledAdImage(undefined)}
        />
      )}
      {tab === "ad-video" && (
        <AdVideoForm
          credits={credits}
          setCredits={setCredits}
          initialVideo={prefilledAdVideo}
          onInitialVideoConsumed={() => setPrefilledAdVideo(undefined)}
        />
      )}
      {tab === "bulk-creative" && <BulkCreativeForm credits={credits} setCredits={setCredits} />}
      {tab === "tryon" && (
        <TryOnForm
          credits={credits}
          setCredits={setCredits}
          onSendToSocialPost={(payload) => {
            setPrefilledSocialImage(payload);
            setEntryHint(undefined);
            goTo("single");
          }}
          onSendToImageAd={(payload) => {
            setPrefilledAdImage(payload);
            goTo("ad");
          }}
          onSendToVideoAd={(payload) => {
            setPrefilledAdVideo(payload);
            goTo("ad-video");
          }}
        />
      )}
    </main>
  );
}
