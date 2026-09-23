import { ChevronDown, Images, Loader2, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { zipSync } from "fflate";
import { compositeImage, type BrandKit, type CreativeText, type EditOptions } from "@/lib/canvas-text";

// Free — every generated image here was already paid for individually
// when it was made ("Generate another image" costs 1 credit each). A
// user's own uploaded image costs nothing new either — it never touches
// the backend, everything here (reading the file, compositing, zipping)
// happens entirely client-side. This step is pure packaging: composite
// each selected slide, in the order chosen, with the current caption
// (plus whatever Brand Kit / quick-edit styling is active, so every
// slide matches the main post), zip them, download — ready to drag
// straight into Facebook/Instagram's native carousel post creator,
// since this app doesn't do direct posting (see Meta Business
// Verification blocker).

interface PoolItem {
  id: string;
  // Raw base64 for a generated image (existing behavior, unchanged) or
  // a full data: URL for an uploaded one — compositeImage tells the two
  // apart itself, so no extra plumbing is needed here.
  imageData: string;
  // Set only for slides that came from the auto-design carousel plan
  // (generateCarouselPlan) — each slide gets its OWN on-image headline
  // instead of the whole carousel sharing the main post's single
  // headline. Undefined for a manually curated/uploaded slide, which
  // falls back to the shared `text.headline` at download time.
  headline?: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB — generous for a phone photo, bounds memory/zip size
const DRAG_THRESHOLD_PX = 6; // below this, a pointer-down/up on a selected slide is a tap (deselect), not a drag

function toImgSrc(imageData: string): string {
  return imageData.startsWith("data:") ? imageData : `data:image/png;base64,${imageData}`;
}

export function CarouselBuilder({
  images,
  text,
  brandKit,
  editOptions,
  visualDirection,
  slideHeadlines,
  autoExpand,
}: {
  images: string[];
  text: CreativeText;
  brandKit?: BrandKit;
  editOptions?: EditOptions;
  visualDirection?: string;
  // Parallel to `images` — set when these came from generateCarouselPlan
  // (auto-design), giving each slide its own headline. Undefined/absent
  // entries fall back to the shared `text.headline`, same as before this
  // existed.
  slideHeadlines?: (string | undefined)[];
  // True when the caller already generated a real, sequenced carousel
  // (auto-design flow) — opens already expanded with every generated
  // slide pre-selected in order, instead of making the user discover
  // and manually build up a 2+ selection from scratch.
  autoExpand?: boolean;
}) {
  const [expanded, setExpanded] = useState(!!autoExpand);
  const [uploaded, setUploaded] = useState<PoolItem[]>([]);
  // Only reads `autoExpand`/`images` at mount, same "read once" contract
  // as every other initial-prop-derived state in this app (e.g.
  // SinglePostForm's initialIdea) — CarouselBuilder is remounted whenever
  // a fresh post/carousel is generated, so this never goes stale.
  const [selectedOrder, setSelectedOrder] = useState<string[]>(() =>
    autoExpand ? images.map((_, i) => `gen-${i}`) : [],
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const dragInfo = useRef<{ id: string; startX: number; moved: boolean } | null>(null);

  const generatedItems: PoolItem[] = images.map((img, i) => ({
    id: `gen-${i}`,
    imageData: img,
    headline: slideHeadlines?.[i],
  }));
  const allItems = [...generatedItems, ...uploaded];
  const selectedSet = new Set(selectedOrder);
  // Selected-first ordering — the chosen slides, in the user's own
  // chosen order, lead the row; anything not yet picked follows in its
  // original pool order, then the add tile. Keeps the whole feature to
  // one row (no new section), and means dragging only ever needs to
  // reason about the "already selected" segment.
  const orderedSelected = selectedOrder
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is PoolItem => !!item);
  const unselectedPool = allItems.filter((item) => !selectedSet.has(item.id));

  const toggle = (id: string) => {
    setSelectedOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const accepted: PoolItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`"${file.name}" is too large — please use images under 10MB.`);
        continue;
      }
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
      if (!dataUrl) continue;
      accepted.push({ id: `up-${Date.now()}-${Math.random().toString(36).slice(2)}`, imageData: dataUrl });
    }
    if (accepted.length > 0) {
      setUploaded((prev) => [...prev, ...accepted]);
      // Uploaded specifically to go in the carousel — include it right
      // away rather than making the user tap it a second time.
      setSelectedOrder((prev) => [...prev, ...accepted.map((a) => a.id)]);
    }
  };

  const setItemRef = (id: string) => (el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  };

  const handlePointerDown = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    dragInfo.current = { id, startX: e.clientX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const info = dragInfo.current;
    if (!info) return;
    if (!info.moved && Math.abs(e.clientX - info.startX) > DRAG_THRESHOLD_PX) {
      info.moved = true;
      setDraggingId(info.id);
    }
    if (!info.moved) return;
    for (const [otherId, el] of itemRefs.current) {
      if (otherId === info.id) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right) continue;
      const currentIndex = selectedOrder.indexOf(info.id);
      const otherIndex = selectedOrder.indexOf(otherId);
      if (currentIndex === -1 || otherIndex === -1 || currentIndex === otherIndex) continue;
      setSelectedOrder((prev) => {
        const next = [...prev];
        next.splice(currentIndex, 1);
        next.splice(otherIndex, 0, info.id);
        return next;
      });
      break;
    }
  };

  const handlePointerUp = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const info = dragInfo.current;
    dragInfo.current = null;
    setDraggingId(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (info && !info.moved) toggle(id);
  };

  const handleDownload = async () => {
    if (orderedSelected.length < 2 || building) return;
    setBuilding(true);
    setBuildError(null);
    try {
      const files: Record<string, Uint8Array> = {};
      for (let slot = 0; slot < orderedSelected.length; slot++) {
        const slide = orderedSelected[slot];
        const slideText: CreativeText = slide.headline ? { ...text, headline: slide.headline } : text;
        const dataUrl = await compositeImage(
          slide.imageData,
          slideText,
          brandKit,
          editOptions,
          visualDirection,
        );
        const base64 = dataUrl.split(",")[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        files[`slide-${slot + 1}.jpg`] = bytes;
      }
      const zipped = zipSync(files);
      const blob = new Blob([zipped], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "carousel.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setBuildError("Couldn't build the carousel. Please try again.");
    } finally {
      setBuilding(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mb-4 flex w-full items-center justify-center gap-1 text-xs font-semibold text-muted-foreground"
      >
        Build a carousel (multiple images)
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {autoExpand ? "Your carousel" : "Select 2 or more images for the carousel"}
      </p>
      {orderedSelected.length >= 2 && (
        <p className="mb-2 text-[11px] text-muted-foreground">
          {autoExpand
            ? "Each slide has its own headline. Drag to reorder, tap the pool below to swap one in."
            : "Drag a selected slide to reorder it."}
        </p>
      )}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {orderedSelected.map((item, index) => (
          <button
            key={item.id}
            ref={setItemRef(item.id)}
            onPointerDown={handlePointerDown(item.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp(item.id)}
            title={item.headline}
            className={[
              "relative h-16 w-16 shrink-0 touch-none overflow-hidden rounded-lg border-2 border-primary transition-transform",
              draggingId === item.id ? "z-10 scale-105 shadow-lg" : "",
            ].join(" ")}
          >
            <img src={toImgSrc(item.imageData)} alt="" className="pointer-events-none h-full w-full object-cover" />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {index + 1}
            </span>
          </button>
        ))}
        {unselectedPool.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-transparent"
          >
            <img src={toImgSrc(item.imageData)} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
          <span className="text-[9px] font-medium leading-none">Add image</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploadError && <p className="mb-2 text-xs font-medium text-destructive">{uploadError}</p>}
      {buildError && <p className="mb-2 text-xs font-medium text-destructive">{buildError}</p>}

      <button
        onClick={handleDownload}
        disabled={orderedSelected.length < 2 || building}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
      >
        {building ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Images className="h-3.5 w-3.5" />}
        Download carousel ({orderedSelected.length} slide{orderedSelected.length === 1 ? "" : "s"})
      </button>
    </div>
  );
}
