import { AlertCircle, CheckCircle2, Facebook, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  disconnectMeta,
  fetchMetaAvailablePages,
  fetchMetaStatus,
  getMetaConnectUrl,
  selectMetaPage,
  type ApiMetaAvailablePage,
} from "@/lib/api";

// Mirrors ProductCatalogPanel's Shopify connect section closely — same
// {open, onClose} shape, same "read ?meta=... once on open, then strip it"
// pattern for the OAuth round-trip. The one real difference: a Facebook
// user can manage more than one Page, so there's a picker state Shopify's
// single-shop flow never needed.
export function MetaConnectPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [connected, setConnected] = useState(false);
  const [pageName, setPageName] = useState<string | null>(null);
  const [igUsername, setIgUsername] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [picking, setPicking] = useState(false);
  const [availablePages, setAvailablePages] = useState<ApiMetaAvailablePage[]>([]);
  const [selectingPageId, setSelectingPageId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    setPicking(false);

    // The OAuth callback redirects the whole browser back here with
    // ?meta=connected, ?meta=pick-page, or ?meta=error — surface that
    // once, then clean the URL so it doesn't re-trigger on a refresh.
    const params = new URLSearchParams(window.location.search);
    const metaResult = params.get("meta");
    const failReason = params.get("reason");
    const failDetail = params.get("detail");
    if (metaResult) {
      params.delete("meta");
      params.delete("reason");
      params.delete("detail");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }

    if (metaResult === "connected") {
      setNotice("Facebook connected — you can now post directly from your generated ads.");
      loadStatus();
    } else if (metaResult === "error") {
      const base: Record<string, string> = {
        denied: "Facebook says the permission request was cancelled or not approved. Start again and press Continue on every Facebook screen, ending with Save.",
        no_code: "Facebook returned without finishing the sign-in. Start again and press Continue on every Facebook screen.",
        state: "This connection attempt expired or was started in a different browser tab. Start again from the button below.",
        code_exchange: "Facebook rejected the sign-in code (this happens if the Facebook page is reloaded or the Back button is used). Start again and go through the screens once.",
        long_token: "Facebook wouldn't extend the sign-in. Start again in a moment.",
        pages_api: "Facebook wouldn't list your Pages. Start again in a moment.",
        no_pages: "Facebook didn't share any Page. On the 'Choose the Pages' screen, tick your Punqle Page, then Continue.",
        network: "Couldn't reach Facebook. Try again in a moment.",
        config: "Facebook connection isn't set up on the server.",
        server: "Something went wrong on our side while connecting. Try again.",
      };
      const msg = (failReason && base[failReason]) || "Couldn't connect Facebook. Please try again.";
      setError(failDetail ? `${msg} (${failDetail})` : msg);
      setLoading(false);
    } else if (metaResult === "pick-page") {
      setPicking(true);
      fetchMetaAvailablePages()
        .then((r) => setAvailablePages(r.pages))
        .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your Pages."))
        .finally(() => setLoading(false));
    } else {
      loadStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadStatus = () => {
    fetchMetaStatus()
      .then((r) => {
        setConnected(r.connected);
        setPageName(r.page_name);
        setIgUsername(r.ig_username);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your connection status."))
      .finally(() => setLoading(false));
  };

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const r = await getMetaConnectUrl();
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to Facebook.");
      setConnecting(false);
    }
  };

  const handleSelectPage = async (pageId: string) => {
    if (selectingPageId) return;
    setSelectingPageId(pageId);
    setError(null);
    try {
      const r = await selectMetaPage(pageId);
      setConnected(r.connected);
      setPageName(r.page_name);
      setIgUsername(r.ig_username);
      setPicking(false);
      setNotice("Facebook connected — you can now post directly from your generated ads.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect that Page.");
    } finally {
      setSelectingPageId(null);
    }
  };

  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    setError(null);
    try {
      await disconnectMeta();
      setConnected(false);
      setPageName(null);
      setIgUsername(null);
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
            <Facebook className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold text-foreground">Social Accounts</h2>
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
          Connect your Facebook Page (and its linked Instagram account, if any) once, then post your generated ads directly from the Post Kit — no downloading and re-uploading.
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
        ) : picking ? (
          <div className="space-y-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Choose a Page to connect
            </p>
            {availablePages.map((p) => (
              <button
                key={p.page_id}
                onClick={() => handleSelectPage(p.page_id)}
                disabled={!!selectingPageId}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-3 text-left disabled:opacity-60"
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">{p.page_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.has_instagram ? `Instagram: @${p.ig_username}` : "No linked Instagram account"}
                  </span>
                </span>
                {selectingPageId === p.page_id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
                    Connect
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : connected ? (
          <div className="rounded-2xl border border-border bg-background p-3.5">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              Connected to {pageName}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {igUsername ? `Instagram: @${igUsername}` : "No Instagram account linked to this Page."}
            </p>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-full px-3 py-2 text-xs font-semibold text-destructive underline-offset-2 hover:underline disabled:opacity-60"
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
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
            Connect Facebook &amp; Instagram
          </button>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">
          While Punqle's Meta app review is pending, this only works for accounts added as testers on our Meta app.
        </p>
      </div>
    </div>
  );
}
