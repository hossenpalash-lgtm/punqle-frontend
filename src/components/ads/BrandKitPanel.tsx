import { AlertCircle, Loader2, Palette, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchBusinessProfile, setBusinessProfile, type BusinessCategory } from "@/lib/api";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/categories";

const DEFAULT_COLOR = "#2952CC";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

// Sets what makes every generated post look consistently "yours" —
// business category (already existed, just relocated here from being
// buried inside the Weekly Plan tab), plus a brand color and logo that
// compositeImage.ts now bakes onto every banner instead of the generic
// black gradient bar. Saving reloads the page rather than threading new
// state through both SinglePostForm and WeeklyPlanForm — this is a
// low-frequency settings action, not worth the extra wiring.
export function BrandKitPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<BusinessCategory>("other");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [brandName, setBrandName] = useState("");
  const [existingLogoDataUrl, setExistingLogoDataUrl] = useState<string | null>(null);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setNewLogoFile(null);
    setNewLogoPreview(null);
    fetchBusinessProfile()
      .then((profile) => {
        setCategory(profile.category);
        setColor(profile.brand_color || DEFAULT_COLOR);
        setBrandName(profile.brand_name || "");
        setExistingLogoDataUrl(
          profile.logo_base64 ? `data:${profile.logo_mime_type || "image/png"};base64,${profile.logo_base64}` : null,
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your Brand Kit."))
      .finally(() => setLoading(false));
  }, [open]);

  const handleLogoChange = (f: File | null) => {
    setNewLogoFile(f);
    setNewLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const updates: Parameters<typeof setBusinessProfile>[0] = {
        category,
        brand_color: color,
        brand_name: brandName.trim(),
      };
      if (newLogoFile) {
        updates.logo_base64 = await fileToBase64(newLogoFile);
        updates.logo_mime_type = newLogoFile.type || "image/png";
      }
      await setBusinessProfile(updates);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your Brand Kit.");
      setSaving(false);
    }
  };

  if (!open) return null;

  const previewSrc = newLogoPreview ?? existingLogoDataUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center">
      <div className="glass-strong max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-extrabold text-foreground">Brand Kit</h2>
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
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Set your business type, color, logo, and name once — every generated post will use them automatically.
            </p>

            <div className="mb-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Business type
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-semibold",
                      category === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                    ].join(" ")}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brand color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
                />
                <span className="text-sm text-muted-foreground">
                  Used on the caption bar of every generated post instead of the default black.
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Logo (optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background p-3 text-left"
              >
                {previewSrc ? (
                  <img src={previewSrc} alt="Logo" className="h-12 w-12 rounded-lg object-contain" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Palette className="h-5 w-5" />
                  </div>
                )}
                <span className="text-sm font-semibold text-muted-foreground">
                  {previewSrc ? "Change logo" : "Upload a logo"}
                </span>
              </button>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Business name (optional)
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Nova Coffee Roasters"
                maxLength={60}
                className="w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Shown as a small badge next to your logo on every generated post.
              </p>
            </div>

            {error && (
              <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-base font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Brand Kit"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
