import { useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { signInWithPassword, signUpWithPassword } from "@/lib/supabase";
import { useScrolled } from "@/lib/use-scrolled";
import { RealFilmstrip } from "@/components/auth/RealFilmstrip";
import { FormatSwitcher } from "@/components/auth/FormatSwitcher";
import { TechPartners } from "@/components/auth/TechPartners";
import { ReadyActorsSection } from "@/components/auth/ReadyActorsSection";
import { FormatGrid } from "@/components/auth/FormatGrid";
import { LanguageSection } from "@/components/auth/LanguageSection";
import { PublishSection } from "@/components/auth/PublishSection";
import { BeyondTheAd } from "@/components/auth/BeyondTheAd";
import { PricingTeaser } from "@/components/auth/PricingTeaser";
import { PunqleLogo } from "@/components/PunqleLogo";
import { LegalFooter } from "@/components/LegalFooter";

// 2026-09-23 redesign — replaces the earlier Arcads-referenced hero
// (floating photo cards + "Go from idea to ad in minutes" 2-step mockup)
// with a design grounded in Punqle's own real product: a headline that
// names the real differentiator (real filmed actors, not a synthetic
// avatar), an interactive proof panel built from the app's actual home
// bar, a moving filmstrip of real generated ads + real actor photos, and
// dedicated sections for the two claims research found most defensible —
// the real-actor pipeline and Bangla/English support — before the
// existing real-ad gallery and sign-up form. The sign-in/sign-up form
// logic below is entirely unchanged from before this redesign.

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

export function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const scrolled = useScrolled();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSignupMessage(null);
    try {
      if (mode === "signin") {
        const { error } = await signInWithPassword(email.trim(), password);
        if (error) throw error;
      } else {
        const { data, error } = await signUpWithPassword(email.trim(), password);
        if (error) throw error;
        // If email confirmation is on, there's no session yet after
        // sign-up — tell the user to check their inbox instead of
        // silently doing nothing.
        if (!data.session) {
          setSignupMessage("Check your email to confirm your account, then sign in.");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openForm = () => {
    setFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 pb-10 pt-24">
      {/* Floating frosted-glass top nav — logo left, single CTA right
          (mirrors Arcads' "Login or Sign up" pattern). Since this page
          already IS the sign-in/sign-up form, the CTA toggles mode
          instead of navigating elsewhere — same action as the "New
          here?" link below, just surfaced as the premium nav pill. */}
      <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 sm:px-6">
        <div
          className={[
            "glass-nav flex w-full max-w-[1160px] items-center justify-between rounded-[20px] px-5 py-3",
            scrolled ? "glass-nav-scrolled" : "",
          ].join(" ")}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <PunqleLogo className="h-4 w-4" />
            </div>
            <span className="font-display text-base font-extrabold tracking-tight text-foreground">Punqle</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "signin" ? "signup" : "signin"));
              setFormVisible(true);
              setError(null);
              setSignupMessage(null);
            }}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "var(--gradient-primary)" }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </header>

      {/* HERO */}
      <div className="relative z-10 mt-6 flex w-full max-w-[820px] flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Sparkles className="h-3 w-3" />
          AI ads for small businesses
        </span>
        <h1 className="text-balance font-display text-[34px] font-extrabold leading-[1.05] sm:text-[52px]">
          Ads that don't look <span className="italic text-accent">AI-made.</span>
        </h1>
        <p className="max-w-xl text-[17px] leading-relaxed text-muted-foreground">
          One real filmed actor, your own product photo, or a blank page — Punqle turns any of them into
          ready-to-post ads for Facebook, Instagram, TikTok and YouTube. In English or বাংলা.
        </p>

        {!formVisible ? (
          // Default state: two buttons only — no form fields until the
          // user actually commits to signing in. "Continue with Google"
          // is present but disabled: real Google sign-in needs a Google
          // Cloud OAuth app + Supabase provider setup that hasn't been
          // done yet, so this stays honestly non-functional rather than
          // faking it.
          <div className="mt-1.5 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setFormVisible(true)}
              className="flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "var(--gradient-primary)" }}
            >
              Create your first ad
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground opacity-60 disabled:cursor-not-allowed"
            >
              Continue with Google
              <GoogleIcon />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="animate-splash-in w-full max-w-sm">
            <div className="mb-4 text-left">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="mb-6 text-left">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {signupMessage && (
              <p className="mb-4 rounded-xl bg-success/10 p-3 text-sm font-medium text-success">{signupMessage}</p>
            )}
            {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-base font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>
        )}

        {/* Interactive proof panel — the real home bar, not a generic mockup. */}
        <div className="mt-11 w-full">
          <FormatSwitcher />
        </div>
        {/* Real tech-vendor row sits right under the hero, matching real
            "powered by" placement convention. */}
        <TechPartners />
      </div>

      <RealFilmstrip />
      <ReadyActorsSection />
      <FormatGrid />
      <LanguageSection />
      <PublishSection />
      <BeyondTheAd />
      <PricingTeaser />

      {/* 2026-09-24 — founder asked to drop the real-ad gallery
          (RealAdShowcase, "See what you can create with Punqle") and
          everything below it; this closing CTA replaces the one that
          section used to end on, so the page still has exactly one. */}
      <div className="relative z-10 mt-4 flex flex-col items-center gap-5 text-center">
        <h2 className="text-balance font-display text-[30px] font-extrabold sm:text-[44px]">
          Your next ad is a few taps away.
        </h2>
        <button
          type="button"
          onClick={openForm}
          className="flex items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "var(--gradient-primary)" }}
        >
          Create your first ad
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <p className="relative z-10 mt-10 text-center text-xs text-muted-foreground">
        Punqle is operated by HOSSEN, MD MOSHARRAF &middot; ABN 47 183 516 336
      </p>
      <div className="relative z-10 w-full">
        <LegalFooter />
      </div>
    </main>
  );
}
