import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layers, Megaphone, Sparkles, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchAdCredits } from "@/lib/api";
import { AdCreationForm } from "@/components/ads/AdCreationForm";
import { AdVideoForm } from "@/components/ads/AdVideoForm";
import { BulkCreativeForm } from "@/components/ads/BulkCreativeForm";
import { CompetitorAnalysis } from "@/components/ads/CompetitorAnalysis";
import { HistoryTab } from "@/components/ads/HistoryTab";
import { SinglePostForm } from "@/components/ads/SinglePostForm";
import { VideoPostForm } from "@/components/ads/VideoPostForm";
import { WeeklyPlanForm } from "@/components/ads/WeeklyPlanForm";

type Tab = "single" | "plan" | "history" | "competitor" | "video" | "ad" | "ad-video" | "bulk-creative";

export const Route = createFileRoute("/")({
  component: HomeScreen,
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => ({
    tab:
      search.tab === "plan"
        ? "plan"
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
                    : "single",
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
  { tab: "ad-video", label: "Video Ad", description: "One polished video ad", icon: Video },
];

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

  useEffect(() => {
    fetchAdCredits()
      .then((c) => setCredits(c.credits))
      .catch((err) => setCreditsError(err instanceof Error ? err.message : "Couldn't load your credits."));
  }, []);

  const goTo = (t: Tab) => navigate({ to: "/", search: { tab: t } });

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

      {(tab === "single" || tab === "video") && (
        <>
          <h1 className="font-display mb-1 flex items-center gap-2 text-xl font-extrabold text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            Social Content
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">Create scroll-stopping posts for your social media.</p>
          <div className="mb-6 grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map(({ tab: t, label, description, icon: Icon }, i) => (
              <button
                key={i}
                onClick={() => goTo(t)}
                className={[
                  "flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-colors",
                  tab === t ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                ].join(" ")}
                style={tab !== t ? { boxShadow: "var(--shadow-card)" } : undefined}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-semibold">{label}</span>
                <span
                  className={[
                    "text-[10px]",
                    tab === t ? "text-primary-foreground/80" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {description}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {(tab === "ad" || tab === "ad-video") && (
        <>
          <h1 className="font-display mb-1 flex items-center gap-2 text-xl font-extrabold text-foreground">
            <Megaphone className="h-4 w-4 text-accent" />
            Ad Creation
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">Tell Punqle what you're advertising — it does the rest.</p>
          <div className="mb-6 grid grid-cols-2 gap-2">
            {AD_TYPES.map(({ tab: t, label, description, icon: Icon }, i) => (
              <button
                key={i}
                onClick={() => goTo(t)}
                className={[
                  "flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-colors",
                  tab === t ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                ].join(" ")}
                style={tab !== t ? { boxShadow: "var(--shadow-card)" } : undefined}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-semibold">{label}</span>
                <span
                  className={[
                    "text-[10px]",
                    tab === t ? "text-primary-foreground/80" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {description}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "bulk-creative" && (
        <h1 className="font-display mb-4 flex items-center gap-2 text-xl font-extrabold text-foreground">
          <Layers className="h-4 w-4 text-accent" />
          E-commerce — Bulk Creative
        </h1>
      )}

      {tab === "single" && (
        <SinglePostForm
          credits={credits}
          setCredits={setCredits}
          initialIdea={prefilledIdea}
          onInitialIdeaConsumed={() => setPrefilledIdea(undefined)}
        />
      )}
      {tab === "plan" && <WeeklyPlanForm credits={credits} setCredits={setCredits} />}
      {tab === "video" && <VideoPostForm credits={credits} setCredits={setCredits} />}
      {tab === "history" && <HistoryTab />}
      {tab === "competitor" && (
        <CompetitorAnalysis
          onCreateAd={(idea) => {
            setPrefilledIdea(idea);
            goTo("single");
          }}
        />
      )}
      {tab === "ad" && <AdCreationForm credits={credits} setCredits={setCredits} />}
      {tab === "ad-video" && <AdVideoForm credits={credits} setCredits={setCredits} />}
      {tab === "bulk-creative" && <BulkCreativeForm credits={credits} setCredits={setCredits} />}
    </main>
  );
}
