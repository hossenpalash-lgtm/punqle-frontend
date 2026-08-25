import {
  Binoculars,
  Calendar,
  Clock,
  CreditCard,
  Facebook,
  Gift,
  Image as ImageIcon,
  Lock,
  LogOut,
  Megaphone,
  Package,
  Palette,
  ShoppingBag,
  Sparkles,
  Video,
} from "lucide-react";
import { PunqleLogo } from "@/components/PunqleLogo";
import { useScrolled } from "@/lib/use-scrolled";

// "single"/"video" have no dedicated nav row on mobile (both are reached
// via the content-type card grid on the home screen instead — see
// index.tsx) but still need tab values so none of the sidebar's own rows
// incorrectly show as active while a user is actually on one of those tabs.
export type NavTab = "single" | "plan" | "history" | "competitor" | "video";

// Punqle's 3 primary creation categories (locked in 2026-08-21) — Social
// Content is the only one actually built. Ad Creation / E-commerce are
// shown as real rows (not hidden) so the architecture reads clearly from
// day one, but are non-interactive "Soon" placeholders — explicitly NOT
// built yet, per that round's instruction not to.
const SOCIAL_CONTENT_FORMATS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "single", label: "Image Post", icon: ImageIcon },
  { tab: "video", label: "Video", icon: Video },
];

const FUTURE_CATEGORIES = [
  { label: "Ad Creation", icon: Megaphone },
  { label: "E-commerce", icon: ShoppingBag },
];

// Weekly Plan / Competitor Analysis aren't part of the 3-category CREATE
// system the 2026-08-21 spec describes — kept working and reachable, just
// demoted into their own quiet group so they don't compete with the 3
// primary creation categories above.
const TOOLS_ITEMS: { tab: NavTab; label: string; icon: typeof Megaphone }[] = [
  { tab: "plan", label: "Weekly Plan", icon: Calendar },
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
  onSignOut,
}: {
  tab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenBrandKit: () => void;
  onOpenProductCatalog: () => void;
  onOpenReferral: () => void;
  onOpenBilling: () => void;
  onOpenMetaConnect: () => void;
  onSignOut: () => void;
}) {
  const scrolled = useScrolled();
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

          {/* Ad Creation / E-commerce — architecture is visible, nothing
              is clickable yet. Deliberately not hidden: the point is that
              a user can already see Punqle's 3-category shape. */}
          {FUTURE_CATEGORIES.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground/70"
              aria-disabled="true"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-3.5 w-3.5" />
              </span>
              {label}
              <span className="ml-auto flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                Soon
              </span>
            </div>
          ))}

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
          the pill surface gets the translucent blur treatment. */}
      <header className="sticky top-0 z-40 px-3 pt-3 pb-2 lg:hidden">
        <div
          className={[
            "glass-nav flex items-center justify-between gap-2 overflow-x-auto rounded-full py-2 pl-3 pr-2",
            scrolled ? "glass-nav-scrolled" : "",
          ].join(" ")}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex shrink-0 items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <PunqleLogo className="h-4 w-4" />
            </div>
            <span className="font-display text-sm font-extrabold text-foreground">Punqle</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => onNavigate("plan")}
              aria-label="Weekly Plan"
              className={[
                "flex h-9 w-9 items-center justify-center rounded-full",
                tab === "plan" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <Calendar className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate("history")}
              aria-label="History"
              className={[
                "flex h-9 w-9 items-center justify-center rounded-full",
                tab === "history" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate("competitor")}
              aria-label="Competitive Edge"
              className={[
                "flex h-9 w-9 items-center justify-center rounded-full",
                tab === "competitor" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <Binoculars className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenBrandKit}
              aria-label="Brand Kit"
              className="flex h-9 w-9 items-center justify-center rounded-full text-secondary-foreground hover:bg-secondary"
            >
              <Palette className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenProductCatalog}
              aria-label="Product Catalog"
              className="flex h-9 w-9 items-center justify-center rounded-full text-secondary-foreground hover:bg-secondary"
            >
              <Package className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenMetaConnect}
              aria-label="Social Accounts"
              className="flex h-9 w-9 items-center justify-center rounded-full text-secondary-foreground hover:bg-secondary"
            >
              <Facebook className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenReferral}
              aria-label="Invite & Earn"
              className="flex h-9 w-9 items-center justify-center rounded-full text-secondary-foreground hover:bg-secondary"
            >
              <Gift className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenBilling}
              aria-label="Plans & Billing"
              className="flex h-9 w-9 items-center justify-center rounded-full text-secondary-foreground hover:bg-secondary"
            >
              <CreditCard className="h-4 w-4" />
            </button>
            <button
              onClick={onSignOut}
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-full text-secondary-foreground hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
