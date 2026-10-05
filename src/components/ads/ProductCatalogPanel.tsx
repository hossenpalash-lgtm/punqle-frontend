import { AlertCircle, CheckCircle2, Download, Link2, Loader2, Package, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  clearProducts,
  disconnectShopify,
  fetchProducts,
  fetchShopifyStatus,
  getShopifyConnectUrl,
  importProductsCsv,
  syncShopifyProducts,
  type ApiImportedProduct,
} from "@/lib/api";

const SAMPLE_CSV = `name,description,price,image_url
Handmade Ceramic Mug,Glazed stoneware mug, dishwasher safe,450,https://example.com/mug.jpg
Cotton Tote Bag,Sturdy canvas tote for everyday use,300,https://example.com/tote.jpg
`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample-products.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// A CSV-based product catalog — the fast, no-approval-needed alternative
// to a real Shopify connection. Re-importing REPLACES the whole saved
// list (mirrors the backend's delete-then-insert semantics): this is
// "here's my current product list," not an accumulating log, so a seller
// re-exporting a corrected file doesn't end up with stale duplicates.
export function ProductCatalogPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ApiImportedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState<string | null>(null);
  const [showShopifyInput, setShowShopifyInput] = useState(false);
  const [shopInput, setShopInput] = useState("");
  const [connectingShopify, setConnectingShopify] = useState(false);
  const [syncingShopify, setSyncingShopify] = useState(false);
  const [disconnectingShopify, setDisconnectingShopify] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    // The OAuth callback redirects the whole browser back here with
    // ?shopify=connected or ?shopify=error — surface that once, then
    // clean the URL so it doesn't re-trigger on a later refresh.
    const params = new URLSearchParams(window.location.search);
    const shopifyResult = params.get("shopify");
    if (shopifyResult === "connected") {
      setNotice("Shopify store connected — tap Sync to pull in your products.");
    } else if (shopifyResult === "error") {
      setError("Couldn't connect your Shopify store. Please try again.");
    }
    if (shopifyResult) {
      params.delete("shopify");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }

    Promise.all([fetchProducts(), fetchShopifyStatus()])
      .then(([productsRes, statusRes]) => {
        setProducts(productsRes.products);
        setShopifyConnected(statusRes.connected);
        setShopifyDomain(statusRes.shop_domain);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your product catalog."))
      .finally(() => setLoading(false));
  }, [open]);

  const handleConnectShopify = async () => {
    if (!shopInput.trim() || connectingShopify) return;
    setConnectingShopify(true);
    setError(null);
    try {
      const r = await getShopifyConnectUrl(shopInput.trim());
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to Shopify.");
      setConnectingShopify(false);
    }
  };

  const handleSyncShopify = async () => {
    if (syncingShopify) return;
    setSyncingShopify(true);
    setError(null);
    setNotice(null);
    try {
      const r = await syncShopifyProducts();
      setProducts(r.products);
      setNotice(`Synced ${r.products.length} product${r.products.length === 1 ? "" : "s"} from Shopify.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sync your Shopify products.");
    } finally {
      setSyncingShopify(false);
    }
  };

  const handleDisconnectShopify = async () => {
    if (disconnectingShopify) return;
    setDisconnectingShopify(true);
    setError(null);
    try {
      await disconnectShopify();
      setShopifyConnected(false);
      setShopifyDomain(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't disconnect Shopify.");
    } finally {
      setDisconnectingShopify(false);
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file || importing) return;
    setImporting(true);
    setError(null);
    try {
      const r = await importProductsCsv(file);
      setProducts(r.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't import that CSV file.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    if (clearing || products.length === 0) return;
    setClearing(true);
    setError(null);
    try {
      await clearProducts();
      setProducts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't clear your catalog.");
    } finally {
      setClearing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center">
      <div className="glass-strong max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold text-foreground">Product Catalog</h2>
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
          Import your product list once — from a CSV file or your Shopify store — then pick any product while creating a post instead of typing it out each time.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleImport(e.target.files?.[0] ?? null)}
        />

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {products.length > 0 ? "Re-import CSV" : "Import CSV"}
          </button>
          <button
            onClick={downloadSampleCsv}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-secondary px-4 py-3 text-xs font-semibold text-secondary-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Sample
          </button>
        </div>

        <p className="mb-4 text-xs text-muted-foreground">
          Works with a simple name/description/price/image_url file, or an export straight from Shopify or WooCommerce.
        </p>

        <div className="mb-4 rounded-2xl border border-border bg-background p-3.5">
          {shopifyConnected ? (
            <>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                Connected to {shopifyDomain}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSyncShopify}
                  disabled={syncingShopify}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
                >
                  {syncingShopify ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Sync products
                </button>
                <button
                  onClick={handleDisconnectShopify}
                  disabled={disconnectingShopify}
                  className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-destructive underline-offset-2 hover:underline disabled:opacity-60"
                >
                  Disconnect
                </button>
              </div>
            </>
          ) : showShopifyInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={shopInput}
                onChange={(e) => setShopInput(e.target.value)}
                placeholder="your-store.myshopify.com"
                disabled={connectingShopify}
                className="flex-1 rounded-full border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleConnectShopify}
                disabled={!shopInput.trim() || connectingShopify}
                className="flex shrink-0 items-center justify-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
              >
                {connectingShopify ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowShopifyInput(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              <Link2 className="h-3.5 w-3.5" />
              Or connect your Shopify store directly
            </button>
          )}
        </div>

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
        ) : products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No products imported yet.
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {products.length} product{products.length === 1 ? "" : "s"}
              </span>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="flex items-center gap-1 text-xs font-semibold text-destructive underline-offset-2 hover:underline disabled:opacity-60"
              >
                {clearing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Clear catalog
              </button>
            </div>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-background p-2.5">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground font-display">{p.name}</p>
                    {p.price && <p className="text-xs text-muted-foreground">{p.price}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
