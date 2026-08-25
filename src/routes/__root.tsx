import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  useSearch,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { supabase, signOut, type Session } from "../lib/supabase";
import { redeemReferral } from "../lib/api";
import { Sentry } from "../lib/sentry";
import { LoginScreen } from "../components/auth/LoginScreen";
import { PunqleLogo } from "../components/PunqleLogo";
import { LegalFooter } from "../components/LegalFooter";
import { BillingPanel } from "../components/ads/BillingPanel";
import { BrandKitPanel } from "../components/ads/BrandKitPanel";
import { MetaConnectPanel } from "../components/ads/MetaConnectPanel";
import { YouTubeConnectPanel } from "../components/ads/YouTubeConnectPanel";
import { ProductCatalogPanel } from "../components/ads/ProductCatalogPanel";
import { ReferralPanel } from "../components/ads/ReferralPanel";
import { Sidebar, type NavTab } from "../components/Sidebar";

// These render their own full page (header/footer, no sidebar) and must
// stay reachable regardless of auth state — signed out, mid-splash, or
// signed in — since Meta's own reviewers/crawlers and logged-out visitors
// both need to load them directly.
const PUBLIC_ROUTES = new Set(["/privacy-policy", "/terms", "/data-deletion"]);

const PENDING_REFERRAL_KEY = "punqle_pending_ref";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-muted-foreground">Page not found</p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Back to Punqle
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#ffffff" },
      { title: "Punqle — AI Ad Creation Platform for Small Businesses" },
      {
        name: "description",
        content: "Punqle is an AI ad creation platform for small businesses — generate Facebook ad copy, banner images, and weekly content plans with AI.",
      },
      { property: "og:title", content: "Punqle — AI Ad Creation Platform for Small Businesses" },
      {
        property: "og:description",
        content: "Generate Facebook ad copy, banner images, and weekly content plans with AI.",
      },
      { property: "og:type", content: "website" },
      { name: "facebook-domain-verification", content: "qmge0ogh6sbh0c79cu1zpwc1von0vq" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap",
      },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {/* Visually hidden but present in the raw server-rendered HTML —
            the app's own UI is client-rendered, so this is what lets
            non-JS crawlers (e.g. Meta's business verification) see the
            legal business name. */}
        <p className="sr-only">Punqle is operated by HOSSEN, MD MOSHARRAF &middot; ABN 47 183 516 336</p>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  // undefined = still checking for an existing session, null = signed out
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // The auth check usually resolves almost instantly (localStorage, not a
  // network call), which would make the splash below flash by unseen —
  // holding it for a fixed minimum makes the brand reveal actually land.
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [brandKitOpen, setBrandKitOpen] = useState(false);
  const [productCatalogOpen, setProductCatalogOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [metaConnectOpen, setMetaConnectOpen] = useState(false);
  const [youtubeConnectOpen, setYoutubeConnectOpen] = useState(false);
  // Lazy initializer (runs synchronously at first render, before any
  // effect) rather than a useEffect checking window.location.search —
  // the router normalizes the URL and strips unrecognised params like
  // `billing` early enough to beat a plain effect, which silently
  // dropped the auto-open on Stripe's redirect back in earlier testing.
  const [billingOpen, setBillingOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("billing"),
  );
  const navigate = useNavigate();
  // strict: false — root wraps every route generically, so it can't
  // assume it's on "/" the way index.tsx's own Route.useSearch() can.
  // There's only one real route today, but this keeps root decoupled
  // from that route's specifics.
  const search = useSearch({ strict: false }) as { tab?: string };
  const tab: NavTab =
    search.tab === "plan"
      ? "plan"
      : search.tab === "history"
        ? "history"
        : search.tab === "competitor"
          ? "competitor"
          : search.tab === "video"
            ? "video"
            : "single";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), 700);
    return () => clearTimeout(t);
  }, []);

  // Stashed on first load (works whether the link was opened before or
  // after signing up/in) so it survives the login/signup flow, then
  // redeemed once a real session exists — the endpoint itself is
  // idempotent (unique referee_id), so a re-run here from an auth-state
  // refresh is harmless, not a double-grant risk.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem(PENDING_REFERRAL_KEY, ref);
  }, []);

  // The Shopify OAuth callback redirects the whole browser back to "/"
  // with ?shopify=connected or ?shopify=error — open the panel so the
  // result is immediately visible instead of landing on a blank home
  // screen. ProductCatalogPanel itself reads and clears the param.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("shopify")) {
      setProductCatalogOpen(true);
    }
  }, []);

  // Same round-trip pattern as the Shopify OAuth callback above — Meta's
  // callback redirects back to "/" with ?meta=connected|pick-page|error.
  // MetaConnectPanel itself reads and clears the param.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("meta")) {
      setMetaConnectOpen(true);
    }
  }, []);

  // Same round-trip pattern again — YouTube's callback redirects back to
  // "/" with ?youtube=connected|error. YouTubeConnectPanel itself reads
  // and clears the param.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("youtube")) {
      setYoutubeConnectOpen(true);
    }
  }, []);

  // Stripe Checkout redirects the whole browser back to "/" with
  // ?billing=success or ?billing=cancelled — same round-trip pattern as
  // the Shopify OAuth callback above (see billingOpen's lazy initializer
  // for why this can't be a useEffect). BillingPanel itself reads and
  // clears the param once open.

  useEffect(() => {
    if (!session) return;
    const pending = localStorage.getItem(PENDING_REFERRAL_KEY);
    if (!pending) return;
    redeemReferral(pending)
      .catch(() => {})
      .finally(() => localStorage.removeItem(PENDING_REFERRAL_KEY));
  }, [session]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen w-full flex-col bg-background lg:flex-row">
        {isPublicRoute ? (
          // Bypasses the splash/login/sidebar gate entirely — these pages
          // (LegalLayout) render their own full page and must load the
          // same way whether the visitor is signed in, signed out, or a
          // crawler with no session at all.
          <Outlet />
        ) : session === undefined || !minSplashDone ? (
          // Branded splash on app open — dark radial glow + logo reveal,
          // matching the reference "title card" transition energy but
          // with Punqle's own mark, not a literal copy of anyone else's
          // text. Held for a fixed minimum (see the timer above) since
          // the real auth check usually resolves too fast to be seen.
          <main
            className="flex min-h-screen w-full items-center justify-center overflow-hidden"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, oklch(0.24 0.02 260) 0%, oklch(0.07 0.008 260) 72%)",
            }}
          >
            <div className="flex animate-splash-in flex-col items-center gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-white"
                style={{ boxShadow: "0 0 70px 14px rgba(255,255,255,0.16)" }}
              >
                <PunqleLogo className="h-10 w-10" />
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">Punqle</h1>
            </div>
          </main>
        ) : session === null ? (
          // No max-w constraint here (unlike the signed-in app shell below) —
          // LoginScreen's own <form> already caps itself at max-w-sm, but the
          // outer container needs the full viewport width so its desktop-only
          // floating decorative cards have room to spread out around it.
          <div className="flex min-h-screen w-full flex-col">
            <LoginScreen />
          </div>
        ) : (
          <>
            <Sidebar
              tab={tab}
              onNavigate={(t) => navigate({ to: "/", search: { tab: t } })}
              onOpenBrandKit={() => setBrandKitOpen(true)}
              onOpenProductCatalog={() => setProductCatalogOpen(true)}
              onOpenReferral={() => setReferralOpen(true)}
              onOpenBilling={() => setBillingOpen(true)}
              onOpenMetaConnect={() => setMetaConnectOpen(true)}
              onOpenYouTubeConnect={() => setYoutubeConnectOpen(true)}
              onSignOut={() => signOut()}
            />
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-3xl">
              <Outlet />
              <LegalFooter />
            </div>
            <BrandKitPanel open={brandKitOpen} onClose={() => setBrandKitOpen(false)} />
            <ProductCatalogPanel open={productCatalogOpen} onClose={() => setProductCatalogOpen(false)} />
            <ReferralPanel open={referralOpen} onClose={() => setReferralOpen(false)} />
            <BillingPanel open={billingOpen} onClose={() => setBillingOpen(false)} />
            <MetaConnectPanel open={metaConnectOpen} onClose={() => setMetaConnectOpen(false)} />
            <YouTubeConnectPanel open={youtubeConnectOpen} onClose={() => setYoutubeConnectOpen(false)} />
          </>
        )}
      </div>
    </QueryClientProvider>
  );
}
