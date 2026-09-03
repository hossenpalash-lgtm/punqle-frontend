import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { disconnectTikTok, fetchTikTokStatus, getTikTokConnectUrl } from "@/lib/api";
import { TikTokIcon } from "@/components/TikTokIcon";

// Mirrors YouTubeConnectPanel's shape closely — same {open, onClose}
// props, same "read ?tiktok=... once on open, then strip it" round-trip
// pattern. Sandbox app for now: real posts land private (TikTok forces
// this on every unaudited app) until the app passes TikTok's own review.
export function TikTokConnectPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [connected, setConnected] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    // The OAuth callback redirects the whole browser back here with
    // ?tiktok=connected or ?tiktok=error — surface that once, then clean
    // the URL so it doesn't re-trigger on a refresh.
    const params = new URLSearchParams(window.location.search);
    const tiktokResult = params.get("tiktok");
    if (tiktokResult) {
      params.delete("tiktok");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }

    if (tiktokResult === "connected") {
      setNotice("TikTok connected — posts stay private while the app is in review.");
      loadStatus();
    } else if (tiktokResult === "error") {
      setError("Couldn't connect TikTok. Please try again.");
      setLoading(false);
    } else {
      loadStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadStatus = () => {
    fetchTikTokStatus()
      .then((r) => {
        setConnected(r.connected);
        setDisplayName(r.display_name);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your connection status."))
      .finally(() => setLoading(false));
  };

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const r = await getTikTokConnectUrl();
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to TikTok.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    setError(null);
    try {
      await disconnectTikTok();
      setConnected(false);
      setDisplayName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't disconnect.");
    } finally {
      setDisconnecting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TikTokIcon className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold text-foreground">TikTok</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Connect your TikTok account to publish generated videos directly. The app is still in TikTok's review, so
          posts land as private for now — that's expected, not a bug.
        </p>

        {notice && (
          <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {notice}
          </p>
        )}
        {error && (
          <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : connected ? (
          <div className="rounded-2xl border border-border bg-background p-3.5">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              Connected to {displayName}
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="mt-2 rounded-full px-3 py-2 text-xs font-semibold text-destructive underline-offset-2 hover:underline disabled:opacity-60"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TikTokIcon className="h-4 w-4" />}
            Connect TikTok
          </button>
        )}
      </div>
    </div>
  );
}
