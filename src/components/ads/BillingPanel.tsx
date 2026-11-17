import { Check, Loader2, Sparkles, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createCheckoutSession,
  createCreditPackCheckoutSession,
  createPortalSession,
  fetchAdCredits,
  fetchSubscriptionStatus,
  type ApiSubscriptionStatus,
  type CreditPack,
  type SubscriptionTier,
} from "@/lib/api";

const TIERS: { tier: SubscriptionTier; label: string; price: string; credits: number; ads: number; blurb: string }[] = [
  { tier: "starter", label: "Starter", price: "$19", credits: 50, ads: 2, blurb: "Try it out with a steady monthly supply." },
  { tier: "growth", label: "Growth", price: "$45", credits: 125, ads: 5, blurb: "For posting regularly across your channels." },
  { tier: "pro", label: "Pro", price: "$169", credits: 500, ads: 20, blurb: "For agencies or a high volume of ads." },
];

// One-off top-ups, independent of plan — for a month where the included
// allotment just isn't enough, without upgrading. Repriced 2026-09-25:
// the first pass priced these below even Pro's own $/credit rate (a
// real bug — it meant stacking one-time packs was always cheaper than
// any subscription, undercutting the whole reason to subscribe). Now
// priced above every plan's own rate (100-pack ≈ Starter's rate, the
// least-commitment option; 1,000-pack still above Growth's) — a pack
// is deliberately never the cheapest way to get credits, subscribing
// always is.
const CREDIT_PACKS: { pack: CreditPack; label: string; price: string; credits: number }[] = [
  { pack: "pack_25", label: "25 credits", price: "$12", credits: 25 },
  { pack: "pack_100", label: "100 credits", price: "$45", credits: 100 },
  { pack: "pack_250", label: "250 credits", price: "$105", credits: 250 },
];

// Checkout (our /pay page, which opens Paddle's payment window) and the customer
// portal are hosted by Paddle — this panel only ever redirects the whole browser
// there and back (?billing=success or ?billing=cancelled on return), same
// pattern as the Shopify OAuth round-trip in ProductCatalogPanel. No card data
// ever touches Punqle.
export function BillingPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<ApiSubscriptionStatus | null>(null);
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);
  const [pendingPack, setPendingPack] = useState<CreditPack | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  // The balance shown at the top of the panel. After a purchase the credits arrive a few seconds later (Paddle tells our
  // server first), so we look again every 3 s for up to ~30 s and also tell the home screen, whose counter is behind the panel.
  const [balance, setBalance] = useState<number | null>(null);
  // Captured once at the panel's true first mount (a lazy initializer runs
  // during render, before any effect) — reading window.location.search
  // from inside the `open`-triggered effect below was racing the router's
  // own URL normalization, which strips unrecognised params like
  // `billing` and had usually already won by the time that effect ran,
  // silently swallowing the success/cancelled notice.
  const [initialBillingResult] = useState(() => new URLSearchParams(window.location.search).get("billing"));

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    if (initialBillingResult === "success") {
      setNotice("Thank you, your payment went through. Your credits show up within a few seconds.");
    } else if (initialBillingResult === "cancelled") {
      setNotice("Checkout was cancelled — no charge was made.");
    }
    // Best-effort cleanup — harmless if the router already normalised the
    // URL and `billing` is gone by now.
    const params = new URLSearchParams(window.location.search);
    if (params.has("billing")) {
      params.delete("billing");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }

    fetchSubscriptionStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your subscription."))
      .finally(() => setLoading(false));

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const readBalance = (attemptsLeft: number) => {
      fetchAdCredits()
        .then((c) => {
          if (cancelled) return;
          setBalance(c.credits);
          window.dispatchEvent(new CustomEvent("punqle:credits", { detail: c.credits }));
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled && attemptsLeft > 0) timer = setTimeout(() => readBalance(attemptsLeft - 1), 3000);
        });
    };
    readBalance(initialBillingResult === "success" ? 9 : 0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [open]);

  if (!open) return null;

  const handleChoose = async (tier: SubscriptionTier) => {
    setPendingTier(tier);
    setError(null);
    try {
      const { checkout_url } = await createCheckoutSession(tier);
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout.");
      setPendingTier(null);
    }
  };

  const handleBuyPack = async (pack: CreditPack) => {
    setPendingPack(pack);
    setError(null);
    try {
      const { checkout_url } = await createCreditPackCheckoutSession(pack);
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout.");
      setPendingPack(null);
    }
  };

  const handleManage = async () => {
    setOpeningPortal(true);
    setError(null);
    try {
      const { portal_url } = await createPortalSession();
      window.location.href = portal_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open the billing portal.");
      setOpeningPortal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className="glass-strong max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold text-foreground">Plans &amp; billing</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {notice && (
          <div className="mb-4 rounded-2xl bg-secondary/60 p-4 text-sm font-medium text-secondary-foreground">
            {notice}
          </div>
        )}
        {balance !== null && (
          <p className="mb-4 text-sm text-muted-foreground">
            You have <span className="font-display text-base font-extrabold text-foreground">{balance}</span>{" "}
            {balance === 1 ? "credit" : "credits"}.
          </p>
        )}
        {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : status?.subscribed ? (
          <div className="rounded-2xl border border-input bg-background p-5">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="mt-1 font-display text-xl font-extrabold capitalize text-foreground">{status.tier}</p>
            {status.cancel_at ? (
              <p className="mt-1 text-xs font-medium text-destructive">
                Cancelled. Your plan stays active until {new Date(status.cancel_at).toLocaleDateString()}, then it ends and nothing more is charged.
              </p>
            ) : (
              status.current_period_end && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Renews {new Date(status.current_period_end).toLocaleDateString()}
                </p>
              )
            )}
            <button
              onClick={handleManage}
              disabled={openingPortal}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {openingPortal && <Loader2 className="h-4 w-4 animate-spin" />}
              Manage subscription
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TIERS.map(({ tier, label, price, credits, ads, blurb }) => (
              <div
                key={tier}
                className="flex flex-col rounded-2xl border border-input bg-background p-5"
              >
                <p className="text-sm font-semibold text-foreground font-display">{label}</p>
                <p className="mt-2 font-display text-2xl font-extrabold text-foreground">
                  {price}
                  <span className="text-sm font-medium text-muted-foreground">/mo</span>
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  {credits} credits / month (about {ads} ads of 15 seconds)
                </p>
                <p className="mt-2 flex-1 text-xs text-muted-foreground">{blurb}</p>
                <button
                  onClick={() => handleChoose(tier)}
                  disabled={pendingTier !== null}
                  className="mt-4 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {pendingTier === tier && <Loader2 className="h-4 w-4 animate-spin" />}
                  Choose {label}
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="mt-6 border-t border-input pt-5">
            <div className="mb-3 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground font-display">Need more credits this month?</p>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              A one-time top-up, on top of whatever plan you're already on — no commitment.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CREDIT_PACKS.map(({ pack, label, price, credits }) => (
                <button
                  key={pack}
                  onClick={() => handleBuyPack(pack)}
                  disabled={pendingPack !== null}
                  className="flex flex-col items-start rounded-2xl border border-input bg-background p-4 text-left disabled:opacity-60"
                >
                  <p className="text-sm font-semibold text-foreground font-display">{label}</p>
                  <p className="mt-1 font-display text-lg font-extrabold text-foreground">{price}</p>
                  <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    {pendingPack === pack ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Buy {credits.toLocaleString()} credits
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
