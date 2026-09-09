import {
  Binoculars,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Facebook,
  Gift,
  Image as ImageIcon,
  Instagram,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Palette,
  Plus,
  Settings as SettingsIcon,
  Shirt,
  Sparkles,
  TrendingUp,
  Video,
  Youtube,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PunqleLogo } from "@/components/PunqleLogo";
import { TikTokIcon } from "@/components/TikTokIcon";
import { type ApiProject, createProject, fetchProjects } from "@/lib/api";
import { useScrolled } from "@/lib/use-scrolled";

// "single"/"video"/"ad"/"ad-video"/"bulk-creative"/"tryon" have no dedicated
// nav row in the desktop sidebar any more (2026-09-10 redesign) — every
// Create action is reached via the "home" pill row instead (see
// index.tsx); they still need tab values so nothing here incorrectly
// shows "active" while the user is actually on one of those pages, and
// mobile's own header (untouched by this redesign, see below) still
// lists them directly.
export type NavTab =
  | "home"
  | "single"
  | "plan"
  | "calendar"
  | "performance"
  | "history"
  | "competitor"
  | "video"
  | "ad"
  | "ad-video"
  | "bulk-creative"
  | "tryon";

// The single source of truth for "every real tab value" — __root.tsx
// validates its own separately-computed `search.tab` against this list
// rather than hand-duplicating a second match chain. A real bug this
// exact duplication caused: 5 tabs (calendar/ad/ad-video/bulk-creative/
// tryon) were added here over time but never added to __root.tsx's own
// ternary, so the Sidebar silently highlighted "Image Post" no matter
// which of those 5 pages was actually open — found live, not by review.
export const ALL_NAV_TABS: NavTab[] = [
  "home",
  "single",
  "plan",
  "calendar",
  "performance",
  "history",
  "competitor",
  "video",
  "ad",
  "ad-video",
  "bulk-creative",
  "tryon",
];

// Punqle's CREATE section (restructured 2026-09-08 per the approved nav
// wireframe — see adcreate_ai_project memory). Social Content and Ad
// Creation each split into 2 formats. Bulk Creative and Try-On were
// previously nested under a single "E-commerce" wrapper; both are now
// top-level entries in their own right — Try-On specifically, since it's
// a real differentiator (not a generic utility), gets the same
// accent-icon-box treatment as Social Content/Ad Creation below instead
// of a plain link, so it visually reads as equally primary.
const SOCIAL_CONTENT_FORMATS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "single", label: "Image Post", icon: ImageIcon },
  { tab: "video", label: "Video", icon: Video },
];

const AD_CREATION_FORMATS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "ad", label: "Image Ad", icon: Megaphone },
  { tab: "ad-video", label: "Video Ad", icon: Video },
];

// "Plan & Publish" (renamed from "Tools") — Weekly Plan answers "what
// should I post," Content Calendar answers "when does it go live." Kept
// as one group since they're two steps of the same real workflow.
const PLAN_PUBLISH_ITEMS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "plan", label: "Weekly Plan", icon: Calendar },
  { tab: "calendar", label: "Content Calendar", icon: CalendarClock },
];

// "Insights" (renamed from being bundled into "Tools") — deliberately not
// called "Grow": Performance/Competitive Edge don't yet do ROI/paid-ads
// optimization, so "Insights" is the honest name for what they actually
// are today.
const INSIGHTS_ITEMS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "performance", label: "Performance", icon: TrendingUp },
  { tab: "competitor", label: "Competitive Edge", icon: Binoculars },
];

// One component, two renderings via Tailwind breakpoints rather than two
// separate components — desktop gets a persistent left rail (like
// Predis's own layout), mobile keeps a compact top bar since a fixed
// sidebar doesn't work on a phone-width screen.
export function Sidebar({
  tab,
  onNavigate,
  onOpenBrandKit,
  onOpenProductCatalog,
  onOpenReferral,
  onOpenBilling,
  onOpenMetaConnect,
  onOpenYouTubeConnect,
  onOpenTikTokConnect,
  onSignOut,
}: {
  tab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenBrandKit: () => void;
  onOpenProductCatalog: () => void;
  onOpenReferral: () => void;
  onOpenBilling: () => void;
  onOpenMetaConnect: () => void;
  onOpenYouTubeConnect: () => void;
  onOpenTikTokConnect: () => void;
  onSignOut: () => void;
}) {
  const scrolled = useScrolled();
  const [moreOpen, setMoreOpen] = useState(false);

  // Desktop sidebar redesign (2026-09-10) — real "Projects" (name + when
  // created only, no content-linking yet — see migrations/projects.sql),
  // and two independently collapsible groups (no accordion component
  // existed in this codebase, so this is small new UI, not a reused
  // pattern). Initial open state checks the current tab so landing
  // directly on e.g. ?tab=plan doesn't hide the very row you're on.
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [planPublishOpen, setPlanPublishOpen] = useState(() => PLAN_PUBLISH_ITEMS.some((i) => i.tab === tab));
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(
    () => tab === "bulk-creative" || INSIGHTS_ITEMS.some((i) => i.tab === tab) || tab === "history",
  );

  useEffect(() => {
    fetchProjects()
      .then((r) => setProjects(r.projects))
      .catch((err) => setProjectsError(err instanceof Error ? err.message : "Couldn't load projects."));
  }, []);

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name || creatingProject) return;
    setCreatingProject(true);
    try {
      const created = await createProject(name);
      setProjects((prev) => [created, ...prev]);
      setNewProjectName("");
      setAddingProject(false);
    } catch (err) {
      setProjectsError(err instanceof Error ? err.message : "Couldn't create that project.");
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <>
      {/* Desktop sidebar redesign (2026-09-10) — flush, white/light rail,
          Arcads-style (a direct founder reference + an attached "Sand"
          app screenshot), replacing the earlier dark floating-card rail
          for this screen specifically. Every Create action (Social
          Content, Image Ad, Video Ad, Bulk Creative, Try-On) moved off
          the sidebar entirely onto the new home screen's pill row (see
          index.tsx) — this sidebar now only holds Projects, Plan &
          Publish, More, and account-level items, per the approved
          wireframe. Mobile's own header below is untouched. */}
      <aside className="hidden shrink-0 border-r border-border bg-[oklch(0.975_0.002_260)] px-3.5 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:flex-col">
        <button
          onClick={() => onNavigate("home")}
          className="mb-6 flex shrink-0 items-center gap-2 px-1.5"
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <PunqleLogo className="h-3.5 w-3.5" />
          </div>
          <span className="font-display text-base font-extrabold text-foreground">Punqle</span>
        </button>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mb-2 flex items-center justify-between px-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Projects</span>
            <button
              onClick={() => setAddingProject((v) => !v)}
              aria-label="New project"
              className="flex h-5 w-5 items-center justify-center rounded-md border border-border text-muted-foreground"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="mb-1 flex flex-col gap-0.5">
            {projects.map((p) => (
              <div key={p.id} className="rounded-lg px-1.5 py-1.5">
                <div className="truncate text-[13px] font-semibold text-foreground">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
              </div>
            ))}
            {projects.length === 0 && !addingProject && (
              <p className="px-1.5 py-1 text-[12px] text-muted-foreground">No projects yet.</p>
            )}
          </div>

          {addingProject && (
            <div className="mb-1 flex items-center gap-1 px-1.5">
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject();
                  if (e.key === "Escape") setAddingProject(false);
                }}
                placeholder="Project name"
                disabled={creatingProject}
                className="w-full rounded-lg border border-input bg-card px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleCreateProject}
                disabled={creatingProject || !newProjectName.trim()}
                aria-label="Create project"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          )}
          {projectsError && <p className="mb-1 px-1.5 text-[11px] text-destructive">{projectsError}</p>}

          {/* Plan & Publish — collapsed by default, matching More below;
              the FB/IG/TikTok/YouTube row stays visible regardless (status
              at a glance + click to connect/manage), only Weekly
              Plan/Content Calendar hide behind the toggle. Gap sizes
              (not rule lines) do the section-separation work — tuned
              live against real screenshots, not arbitrary. */}
          <button
            onClick={() => setPlanPublishOpen((v) => !v)}
            className="mt-[58px] flex items-center justify-between rounded-xl border px-2 py-1.5"
            style={{
              background: "oklch(0.56 0.14 300 / 8%)",
              borderColor: "oklch(0.56 0.14 300 / 22%)",
            }}
          >
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
              <span
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md"
                style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)" }}
              >
                <Zap className="h-2.5 w-2.5" />
              </span>
              Plan &amp; Publish
            </span>
            <ChevronDown
              className={["h-3.5 w-3.5 shrink-0 transition-transform", planPublishOpen ? "rotate-180" : ""].join(" ")}
              style={{ color: "oklch(0.5 0.13 300)" }}
            />
          </button>
          {planPublishOpen && (
            <div className="mb-1.5 mt-1 flex flex-col gap-0.5">
              {PLAN_PUBLISH_ITEMS.map(({ tab: t, label, icon: Icon }) => (
                <button
                  key={t}
                  onClick={() => onNavigate(t)}
                  className={[
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                    tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="mt-1.5 flex justify-between px-1">
            <button
              onClick={onOpenMetaConnect}
              aria-label="Facebook"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-secondary-foreground"
            >
              <Facebook className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onOpenMetaConnect}
              aria-label="Instagram"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-secondary-foreground"
            >
              <Instagram className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onOpenTikTokConnect}
              aria-label="TikTok"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-secondary-foreground"
            >
              <TikTokIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onOpenYouTubeConnect}
              aria-label="YouTube"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-secondary-foreground"
            >
              <Youtube className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* More — Bulk Creative moved here (2026-09-09 decision, doesn't
              fit the "3 lucrative differentiators" logic the pill row
              earns its spot with) alongside every remaining real nav
              item — nothing invented, nothing dropped from today's nav. */}
          <button
            onClick={() => setDesktopMoreOpen((v) => !v)}
            className="mt-[68px] flex items-center justify-between rounded-xl px-2 py-1.5"
          >
            <span className="text-[13px] font-bold text-foreground">More</span>
            <ChevronDown
              className={[
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                desktopMoreOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
          {desktopMoreOpen && (
            <div className="mt-1 flex flex-col gap-0.5">
              <button
                onClick={() => onNavigate("bulk-creative")}
                className={[
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                  tab === "bulk-creative"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                ].join(" ")}
              >
                <Layers className="h-3.5 w-3.5" />
                Bulk Creative
              </button>
              {INSIGHTS_ITEMS.map(({ tab: t, label, icon: Icon }) => (
                <button
                  key={t}
                  onClick={() => onNavigate(t)}
                  className={[
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                    tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
              <button
                onClick={onOpenBrandKit}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary"
              >
                <Palette className="h-3.5 w-3.5" />
                Brand Kit
              </button>
              <button
                onClick={onOpenProductCatalog}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary"
              >
                <Package className="h-3.5 w-3.5" />
                Product Catalog
              </button>
              <button
                onClick={() => onNavigate("history")}
                className={[
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                  tab === "history" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                ].join(" ")}
              >
                <Clock className="h-3.5 w-3.5" />
                History
              </button>
              <button
                onClick={onOpenReferral}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary"
              >
                <Gift className="h-3.5 w-3.5" />
                Invite &amp; Earn
              </button>
              <button
                onClick={onOpenBilling}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Plans &amp; Billing
              </button>
            </div>
          )}
        </div>

        {/* Settings/Profile at the foot, per the founder's own hand
            sketch. "Settings" has no dedicated screen of its own yet in
            this app — Billing is the closest real match, so it opens
            that panel; flagged here as a best-guess mapping, not a
            literal spec. */}
        <button
          onClick={onOpenBilling}
          className="flex shrink-0 items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[13px] font-semibold text-secondary-foreground hover:bg-secondary"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
          Settings
        </button>
        <button
          onClick={onSignOut}
          className="flex shrink-0 items-center justify-between border-t border-border pt-3 mt-1.5"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[12px] font-bold text-foreground">
              <LogOut className="h-3.5 w-3.5" />
            </span>
            <span className="text-[13px] font-semibold text-foreground">Sign out</span>
          </span>
        </button>
      </aside>

      {/* Floating frosted-glass pill nav bar (Arcads-style), inset from
          the edges — the outer header itself stays transparent so page
          content is visible in the margin around the pill, and only
          the pill surface gets the translucent blur treatment.

          Redesigned 2026-09-08 — a real, evidence-based UX audit found
          this used to be 16 unlabeled icons crammed into one
          horizontally-scrolling row with zero scroll-affordance cue
          (confirmed via DOM: scrollWidth 750 vs clientWidth 476, no
          fade/mask hint at all), hiding Product Catalog, Social
          Accounts, Invite & Earn, Plans & Billing, and Sign out
          off-screen by default. Collapsed down to the 3 labeled CREATE
          categories (same names/icons/grouping as the desktop sidebar,
          for consistency) plus one labeled "More" menu for everything
          else, grouped exactly the way the desktop sidebar already
          groups them — nothing removed, just made discoverable.

          Also fixes a separately-confirmed real gap: the logo previously
          had no onClick at all, so a mobile user who navigated to Ad
          Creation/E-commerce/Tools had no button anywhere to get back to
          Social Content. The logo is now a real "go home" link — the
          standard web convention — which solves that for free. */}
      <header className="sticky top-0 z-40 px-3 pt-3 pb-2 lg:hidden">
        <div
          className={[
            "glass-nav relative flex items-center justify-between gap-2 rounded-full py-2 pl-3 pr-2",
            scrolled ? "glass-nav-scrolled" : "",
          ].join(" ")}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <button onClick={() => onNavigate("single")} aria-label="Home" className="flex shrink-0 items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <PunqleLogo className="h-4 w-4" />
            </div>
            <span className="font-display text-sm font-extrabold text-foreground">Punqle</span>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => onNavigate("single")}
              className={[
                "flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold",
                tab === "single" || tab === "video"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Social
            </button>
            <button
              onClick={() => onNavigate("ad")}
              className={[
                "flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold",
                tab === "ad" || tab === "ad-video"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <Megaphone className="h-3.5 w-3.5" />
              Ads
            </button>
            <button
              onClick={() => onNavigate("bulk-creative")}
              className={[
                "flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold",
                tab === "bulk-creative"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <Layers className="h-3.5 w-3.5" />
              Bulk
            </button>
            {/* Try-On gets its own pill (not folded into "Bulk" anymore)
                with an accent border when inactive, matching the desktop
                rail's accent-icon-box treatment — a real differentiator,
                not a generic utility, per the approved nav wireframe. */}
            <button
              onClick={() => onNavigate("tryon")}
              className={[
                "flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold",
                tab === "tryon"
                  ? "bg-primary text-primary-foreground"
                  : "border border-accent text-accent hover:bg-secondary",
              ].join(" ")}
            >
              <Shirt className="h-3.5 w-3.5" />
              Try-On
            </button>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More"
              aria-expanded={moreOpen}
              className={[
                "flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-semibold",
                moreOpen ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <Menu className="h-3.5 w-3.5" />
              More
            </button>
          </div>
        </div>

        {moreOpen && (
          <>
            {/* Full-screen tap-to-close backdrop — simpler and more
                robust than wiring up an outside-click listener for a
                menu this size. */}
            <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
            <div
              className="glass-nav absolute right-3 top-full z-40 mt-2 flex max-h-[70vh] w-64 flex-col gap-0.5 overflow-y-auto rounded-2xl p-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <span className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Plan &amp; Publish
              </span>
              {PLAN_PUBLISH_ITEMS.map(({ tab: t, label, icon: Icon }) => (
                <button
                  key={t}
                  onClick={() => {
                    onNavigate(t);
                    setMoreOpen(false);
                  }}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                    tab === t ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}

              <span className="mb-1 mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Insights
              </span>
              {INSIGHTS_ITEMS.map(({ tab: t, label, icon: Icon }) => (
                <button
                  key={t}
                  onClick={() => {
                    onNavigate(t);
                    setMoreOpen(false);
                  }}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                    tab === t ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}

              <span className="mb-1 mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Products
              </span>
              <button
                onClick={() => {
                  onOpenProductCatalog();
                  setMoreOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                <Package className="h-4 w-4" />
                Product Catalog
              </button>

              <span className="mb-1 mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Brand
              </span>
              <button
                onClick={() => {
                  onOpenBrandKit();
                  setMoreOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                <Palette className="h-4 w-4" />
                Brand Kit
              </button>

              <span className="mb-1 mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Account
              </span>
              <button
                onClick={() => {
                  onOpenMetaConnect();
                  setMoreOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                <Facebook className="h-4 w-4" />
                Social Accounts
              </button>
              <button
                onClick={() => {
                  onOpenYouTubeConnect();
                  setMoreOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                <Youtube className="h-4 w-4" />
                YouTube
              </button>
              <button
                onClick={() => {
                  onOpenTikTokConnect();
                  setMoreOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                <TikTokIcon className="h-4 w-4" />
                TikTok
              </button>
              <button
                onClick={() => {
                  onNavigate("history");
                  setMoreOpen(false);
                }}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                  tab === "history" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary",
                ].join(" ")}
              >
                <Clock className="h-4 w-4" />
                History
              </button>
              <button
                onClick={() => {
                  onOpenReferral();
                  setMoreOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                <Gift className="h-4 w-4" />
                Invite &amp; Earn
              </button>
              <button
                onClick={() => {
                  onOpenBilling();
                  setMoreOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                <CreditCard className="h-4 w-4" />
                Plans &amp; Billing
              </button>
              <button
                onClick={() => {
                  onSignOut();
                  setMoreOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </header>
    </>
  );
}
