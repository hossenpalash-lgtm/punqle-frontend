import { AlertCircle, CheckCircle2, Loader2, X, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { disconnectYouTube, fetchYouTubeStatus, getYouTubeConnectUrl } from "@/lib/api";

// Mirrors MetaConnectPanel's shape closely — same {open, onClose} props,
// same "read ?youtube=... once on open, then strip it" round-trip
// pattern. Simpler than Meta's: channels.list(mine=true) has no
// equivalent "list every channel I can act as" call, so there's no
// multi-item picker state here — whatever it returns is the one channel.
export function YouTubeConnectPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [connected, setConnected] = useState(false);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    // The OAuth callback redirects the whole browser back here with
    // ?youtube=connected or ?youtube=error(&reason=no_channel) — surface
    // that once, then clean the URL so it doesn't re-trigger on a refresh.
    const params = new URLSearchParams(window.location.search);
    const youtubeResult = params.get("youtube");
    const reason = params.get("reason");
    if (youtubeResult) {
      params.delete("youtube");
      params.delete("reason");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }

    if (youtubeResult === "connected") {
      setNotice("YouTube connected — you can now publish videos directly.");
      loadStatus();
    } else if (youtubeResult === "error") {
      setError(
        reason === "no_channel"
          ? "No YouTube channel found on that Google account."
          : "Couldn't connect YouTube. Please try again.",
      );
      setLoading(false);
    } else {
      loadStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadStatus = () => {
    fetchYouTubeStatus()
      .then((r) => {
        setConnected(r.connected);
        setChannelTitle(r.channel_title);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your connection status."))
      .finally(() => setLoading(false));
  };

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const r = await getYouTubeConnectUrl();
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to YouTube.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    setError(null);
    try {
      await disconnectYouTube();
      setConnected(false);
      setChannelTitle(null);
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
            <Youtube className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold text-foreground">YouTube</h2>
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
          Connect your YouTube channel once, then publish your generated videos directly — no downloading and re-uploading.
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
              Connected to {channelTitle}
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
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
            Connect YouTube
          </button>
        )}
      </div>
    </div>
  );
}
