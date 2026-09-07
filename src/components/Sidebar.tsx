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
  ShoppingBag,
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

// Punqle's 3 primary creation categories (locked in 2026-08-21) — all
// three are now built. Social Content and Ad Creation each split into 2
// formats; E-commerce now has 2 (Bulk Creative shipped 2026-08-27,
// Try-On shipped same day) — "Product Video" was proposed and dropped
// as redundant with Video Ad, see adcreate_ai_project memory.
const SOCIAL_CONTENT_FORMATS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "single", label: "Image Post", icon: ImageIcon },
  { tab: "video", label: "Video", icon: Video },
];

const AD_CREATION_FORMATS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "ad", label: "Image Ad", icon: Megaphone },
  { tab: "ad-video", label: "Video Ad", icon: Video },
];

const ECOMMERCE_FORMATS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "bulk-creative", label: "Bulk Creative", icon: Layers },
  { tab: "tryon", label: "Try-On", icon: Shirt },
];

// Weekly Plan / Competitor Analysis aren't part of the 3-category CREATE
// system the 2026-08-21 spec describes — kept working and reachable, just
// demoted into their own quiet group so they don't compete with the 3
// primary creation categories above.
const TOOLS_ITEMS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "plan", label: "Weekly Plan", icon: Calendar },
  { tab: "calendar", label: "Content Calendar", icon: CalendarClock },
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

          {/* E-commerce — 3rd of the 3 primary categories, now real.
              Same header+sub-items structure as the two above; starts
              with 1 format (Bulk Creative), more to follow. */}
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)" }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
            </span>
            E-commerce
          </div>
          <div className="mb-2 flex flex-col gap-0.5 pl-6">
            {ECOMMERCE_FORMATS.map(({ tab: t, label, icon: Icon }) => (
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

          <span className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Library
          </span>
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
          <button
            onClick={onOpenProductCatalog}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary"
          >
            <Package className="h-3.5 w-3.5" />
            Product Catalog
          </button>
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

          <span className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Tools
          </span>
          {TOOLS_ITEMS.map(({ tab: t, label, icon: Icon }) => (
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
            Account
          </span>
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
                tab === "bulk-creative" || tab === "tryon"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Shop
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
                Library
              </span>
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

              <span className="mb-1 mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Tools
              </span>
              {TOOLS_ITEMS.map(({ tab: t, label, icon: Icon }) => (
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

              <span className="mb-1 mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Account
              </span>
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
