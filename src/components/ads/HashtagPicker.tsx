import { Check, Hash, Loader2 } from "lucide-react";
import { useState } from "react";
import { suggestHashtags } from "@/lib/api";
import { ToolPill } from "./ToolPill";

// Free — text-only GPT call, same economics as translate. Separate from
// the caption text on purpose (matches Predis's own dedicated hashtag
// step) rather than hashtags only ever being whatever the AI happened
// to bake into the caption body. Tapping a tag appends it once; there's
// no "remove" here since the caption textarea in QuickEditPanel already
// lets the user edit freely, and surgically un-appending text from a
// possibly-hand-edited caption is more fragile than it's worth.
export function HashtagPicker({
  itemDescription,
  onAppend,
}: {
  itemDescription: string;
  onAppend: (tag: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExpand = async () => {
    setExpanded(true);
    if (hashtags.length > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await suggestHashtags(itemDescription);
      setHashtags(r.hashtags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load hashtag suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const handleTap = (tag: string) => {
    if (added.has(tag)) return;
    onAppend(tag);
    setAdded((prev) => new Set(prev).add(tag));
  };

  if (!expanded) {
    return (
      <ToolPill icon={Hash} label="Hashtags" onClick={handleExpand} />
    );
  }

  return (
    <div className="w-full rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Hash className="h-3.5 w-3.5" />
        Tap to add to your caption
      </p>
      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading suggestions...
        </div>
      )}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {!loading && hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hashtags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTap(tag)}
              disabled={added.has(tag)}
              className={[
                "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                added.has(tag)
                  ? "bg-success/15 text-success"
                  : "bg-secondary text-secondary-foreground",
              ].join(" ")}
            >
              {added.has(tag) && <Check className="h-3 w-3" />}#{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
