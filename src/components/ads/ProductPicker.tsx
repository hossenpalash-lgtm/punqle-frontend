import { Loader2, Package } from "lucide-react";
import { useEffect, useState } from "react";
import {
  base64ToFile,
  fetchProductImage,
  fetchProducts,
  type ApiImportedProduct,
} from "@/lib/api";

// Same "expand to pick" pattern as StockPhotoSearch, but sourced from the
// user's own imported catalog instead of a stock-photo search — picking
// an item prefills the description the same way "paste a product link"
// does, and fetches its photo through the backend (not loaded directly
// client-side) since compositeImage needs the actual image bytes, not
// just a URL to display.
export function ProductPicker({
  onSelect,
}: {
  onSelect: (description: string, file: File | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ApiImportedProduct[]>([]);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!expanded || loaded) return;
    setLoading(true);
    setError(null);
    fetchProducts()
      .then((r) => {
        setProducts(r.products);
        setLoaded(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your catalog."))
      .finally(() => setLoading(false));
  }, [expanded, loaded]);

  const handlePick = async (product: ApiImportedProduct) => {
    if (selectingId) return;
    setSelectingId(product.id);
    setError(null);
    try {
      const description = [product.name, product.description].filter(Boolean).join(" — ");
      if (product.image_url) {
        const r = await fetchProductImage(product.image_url);
        onSelect(description, base64ToFile(r.image_base64, r.mime_type, "product.jpg"));
      } else {
        onSelect(description, null);
      }
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that product's photo.");
    } finally {
      setSelectingId(null);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
      >
        <Package className="h-3 w-3" />
        Or pick from your catalog
      </button>
    );
  }

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading your catalog...
        </div>
      ) : error ? (
        <p className="mb-2 text-xs font-medium text-destructive">{error}</p>
      ) : products.length === 0 ? (
        <p className="mb-2 text-xs text-muted-foreground">
          No products imported yet — open Product Catalog (More on mobile, sidebar on desktop) to add some.
        </p>
      ) : (
        <div className="mb-2 max-h-48 space-y-1.5 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePick(p)}
              disabled={!!selectingId}
              className="flex w-full items-center gap-2.5 rounded-xl bg-background p-2 text-left disabled:opacity-60"
            >
              {p.image_url ? (
                <img src={p.image_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Package className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{p.name}</span>
              {selectingId === p.id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
