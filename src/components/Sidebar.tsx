import {
  Binoculars,
  Calendar,
  CalendarClock,
  Clock,
  CreditCard,
  Facebook,
  Gift,
  Image as ImageIcon,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Palette,
  Shirt,
  Sparkles,
  TrendingUp,
  Video,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import { PunqleLogo } from "@/components/PunqleLogo";
import { TikTokIcon } from "@/components/TikTokIcon";
import { useScrolled } from "@/lib/use-scrolled";

// "single"/"video" have no dedicated nav row on mobile (both are reached
// via the content-type card grid on the home screen instead — see
// index.tsx) but still need tab values so none of the sidebar's own rows
// incorrectly show as active while a user is actually on one of those tabs.
export type NavTab =
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
  return (
    <>
      {/* Floating frosted-glass rail — translucent + backdrop-blur
          instead of a flat --card fill, sticky so it stays in view
          instead of scrolling away with the page content. */}
      <aside
        className={[
          "glass-nav hidden shrink-0 rounded-2xl px-4 py-6 lg:sticky lg:top-4 lg:my-4 lg:ml-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-60 lg:flex-col",
          scrolled ? "glass-nav-scrolled" : "",
        ].join(" ")}
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="mb-8 flex items-center gap-2 px-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <PunqleLogo className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-extrabold text-foreground">Punqle</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <span className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Create
          </span>

          {/* Social Content — the one built, active category. Icon sits in
              a small accent-tinted box (the app's one restrained purple
              accent) so it visually reads as "the AI creation category,"
              not just another list row. */}
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Social Content
          </div>
          <div className="mb-2 flex flex-col gap-0.5 pl-6">
            {SOCIAL_CONTENT_FORMATS.map(({ tab: t, label, icon: Icon }) => (
              <button
                key={t}
                onClick={() => onNavigate(t)}
                className={[
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  tab === t ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Ad Creation — 2nd of the 3 primary categories. Now has 2
              formats (Image Ad shipped 2026-08-25, Video Ad shipped
              2026-08-26) — same header+sub-items structure as Social
              Content above, not a single row anymore. */}
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)" }}
            >
              <Megaphone className="h-3.5 w-3.5" />
            </span>
            Ad Creation
          </div>
          <div className="mb-2 flex flex-col gap-0.5 pl-6">
            {AD_CREATION_FORMATS.map(({ tab: t, label, icon: Icon }) => (
              <button
                key={t}
                onClick={() => onNavigate(t)}
                className={[
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  tab === t ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Bulk Creative — promoted out of the old "E-commerce" wrapper
              to a plain top-level Create row (no sub-formats of its own,
              so it doesn't need the header+sublist treatment). */}
          <button
            onClick={() => onNavigate("bulk-creative")}
            className={[
              "mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              tab === "bulk-creative" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary",
            ].join(" ")}
          >
            <Layers className="h-4 w-4" />
            Bulk Creative
          </button>

          {/* Try-On — also promoted out of "E-commerce," but given the
              same accent-icon-box treatment as Social Content/Ad Creation
              above rather than a plain row: it's a real differentiator
              (person + product → real fit preview → animate → hand off to
              Social/Ad), not a generic utility, and should read as
              equally primary to the two categories above it. */}
          <button
            onClick={() => onNavigate("tryon")}
            className={[
              "mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              tab === "tryon" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary",
            ].join(" ")}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)" }}
            >
              <Shirt className="h-3.5 w-3.5" />
            </span>
            Try-On
          </button>

          <span className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Plan &amp; Publish
          </span>
          {PLAN_PUBLISH_ITEMS.map(({ tab: t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => onNavigate(t)}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}

          <span className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Insights
          </span>
          {INSIGHTS_ITEMS.map(({ tab: t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => onNavigate(t)}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}

          <span className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Products
          </span>
          <button
            onClick={onOpenProductCatalog}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary"
          >
            <Package className="h-3.5 w-3.5" />
            Product Catalog
          </button>

          <span className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Brand
          </span>
          <button
            onClick={onOpenBrandKit}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary"
          >
            <Palette className="h-3.5 w-3.5" />
            Brand Kit
          </button>

          <span className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Account
          </span>
          <button
            onClick={onOpenMetaConnect}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary"
          >
            <Facebook className="h-3.5 w-3.5" />
            Social Accounts
          </button>
          <button
            onClick={onOpenYouTubeConnect}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary"
          >
            <Youtube className="h-3.5 w-3.5" />
            YouTube
          </button>
          <button
            onClick={onOpenTikTokConnect}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary"
          >
            <TikTokIcon className="h-3.5 w-3.5" />
            TikTok
          </button>
          <button
            onClick={() => onNavigate("history")}
            className={[
              "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
              tab === "history" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
            ].join(" ")}
          >
            <Clock className="h-3.5 w-3.5" />
            History
          </button>
          <button
            onClick={onOpenReferral}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary"
          >
            <Gift className="h-3.5 w-3.5" />
            Invite &amp; Earn
          </button>
          <button
            onClick={onOpenBilling}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Plans &amp; Billing
          </button>
        </nav>
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" />
          Sign out
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
