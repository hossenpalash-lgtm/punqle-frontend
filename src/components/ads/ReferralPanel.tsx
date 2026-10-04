import { Check, Copy, Gift, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchReferralStatus, type ApiReferralStatus } from "@/lib/api";

// Every user's own Supabase user_id doubles as their referral code — no
// separate code generation/storage needed. The redemption side (capturing
// ?ref= and calling /referral/redeem) lives in __root.tsx since it needs
// to run once right after auth, not from this panel.
export function ReferralPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ApiReferralStatus | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    fetchReferralStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your referral link."))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const link = status ? `${window.location.origin}/?ref=${status.referral_code}` : "";
  const remaining = status ? Math.max(status.max_referrals - status.successful_referrals, 0) : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link — select and copy it manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center">
      <div className="glass-strong max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold text-foreground">Invite &amp; earn credits</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : error ? (
          <p className="py-4 text-sm font-medium text-destructive">{error}</p>
        ) : status ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Share your link — when a friend signs up with it, you both get{" "}
              <span className="font-semibold text-foreground">5 free credits</span>.
            </p>

            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-input bg-background px-4 py-3">
              <span className="flex-1 truncate text-sm text-foreground">{link}</span>
              <button
                onClick={handleCopy}
                className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="rounded-2xl bg-secondary/60 p-4 text-sm text-secondary-foreground">
              {remaining > 0 ? (
                <>
                  You've used <span className="font-semibold">{status.successful_referrals}</span> of{" "}
                  <span className="font-semibold">{status.max_referrals}</span> referral bonuses —{" "}
                  <span className="font-semibold">{remaining} more</span> to go.
                </>
              ) : (
                <>You've used all {status.max_referrals} referral bonuses. Thanks for spreading the word!</>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
