import { Move, RotateCcw } from "lucide-react";
import { useRef } from "react";
import type { Box } from "@/lib/canvas-text";

// Full-width bottom bar, matching compositeImage's own edge-bar default —
// close enough that the outline doesn't jump when the user's first drag
// nudges it into freeform mode.
const DEFAULT_TEXT_BOX: Box = { x: 0, y: 0.72, width: 1 };
const DEFAULT_LOGO_BOX: Box = { x: 0.03, y: 0.03, width: 0.16 };

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

type DragTarget = "text" | "logo";
type DragMode = "move" | "resize";

interface DragState {
  target: DragTarget;
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  startBox: Box;
}

// A lightweight freeform positioning editor, not a full multi-element
// canvas (no rotation, no arbitrary shapes/stickers) — lets the user drag
// the caption panel and the logo anywhere on the photo, and resize each
// by its corner handle, instead of the old fixed top/bottom-only bar and
// fixed top-left logo. The outline overlay is pure CSS for instant drag
// feedback; the actual composited image (passed in as imageUrl) re-bakes
// via the parent's existing compositeImage effect whenever a box changes.
export function DragDropEditor({
  imageUrl,
  textBox,
  onTextBoxChange,
  logoBox,
  onLogoBoxChange,
  hasLogo,
  showLogo,
}: {
  imageUrl: string;
  textBox: Box | undefined;
  onTextBoxChange: (box: Box | undefined) => void;
  logoBox: Box | undefined;
  onLogoBoxChange: (box: Box | undefined) => void;
  hasLogo: boolean;
  showLogo: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);

  const effectiveTextBox = textBox ?? DEFAULT_TEXT_BOX;
  const effectiveLogoBox = logoBox ?? DEFAULT_LOGO_BOX;

  const applyPendingMove = () => {
    rafRef.current = null;
    const drag = dragRef.current;
    const point = pendingPointRef.current;
    const container = containerRef.current;
    if (!drag || !point || !container) return;
    const bounds = container.getBoundingClientRect();
    const dxRatio = (point.x - drag.startClientX) / bounds.width;
    const dyRatio = (point.y - drag.startClientY) / bounds.height;

    let next: Box;
    if (drag.mode === "move") {
      next = {
        ...drag.startBox,
        x: clamp(drag.startBox.x + dxRatio, 0, 1 - drag.startBox.width),
        y: clamp(drag.startBox.y + dyRatio, 0, 0.94),
      };
    } else {
      const minWidth = drag.target === "text" ? 0.25 : 0.08;
      next = {
        ...drag.startBox,
        width: clamp(drag.startBox.width + dxRatio, minWidth, 1 - drag.startBox.x),
      };
    }
    if (drag.target === "text") onTextBoxChange(next);
    else onLogoBoxChange(next);
  };

  const handlePointerDown = (e: React.PointerEvent, target: DragTarget, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    // Capture keeps the drag tracking the pointer even if it moves outside
    // the image bounds mid-gesture. Guarded because setPointerCapture
    // throws if the pointerId isn't currently active — normally impossible
    // for a real pointer inside its own pointerdown handler, but cheap to
    // guard against browser edge cases rather than let a throw here kill
    // the whole drag silently.
    try {
      containerRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // continue without capture — the container's own pointermove/up
      // listeners still work as long as the pointer stays inside it.
    }
    dragRef.current = {
      target,
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startBox: target === "text" ? effectiveTextBox : effectiveLogoBox,
    };
  };

  // A real drag fires native pointermove far faster than the recomposite
  // (canvas draw + toDataURL) can keep up with — left uncapped, a fast
  // drag queues dozens of overlapping compositeImage calls per second and
  // visibly stutters. The outline itself doesn't need that: throttling
  // the actual onChange (and therefore the parent's recomposite) to ~15/s
  // still reads as smooth while cutting the expensive work by 4-5x.
  const THROTTLE_MS = 60;

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    pendingPointRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current === null) {
      rafRef.current = window.setTimeout(() => {
        rafRef.current = null;
        applyPendingMove();
      }, THROTTLE_MS);
    }
  };

  // pointerup can fire in the same synchronous tick as the last
  // pointermove (a quick flick-and-release), which would otherwise cancel
  // the pending throttled update before it ever runs — flush it here so
  // the final drag position is never dropped.
  const endDrag = (e: React.PointerEvent) => {
    pendingPointRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current !== null) {
      clearTimeout(rafRef.current);
      rafRef.current = null;
    }
    applyPendingMove();
    dragRef.current = null;
  };

  return (
    <div className="mb-3">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-card select-none"
        style={{ touchAction: "none", boxShadow: "var(--shadow-card)" }}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img src={imageUrl} alt="Generated ad — drag to reposition text or logo" className="block w-full" draggable={false} />

        <div
          onPointerDown={(e) => handlePointerDown(e, "text", "move")}
          className="absolute cursor-move rounded-lg border-2 border-dashed border-white/90"
          style={{
            left: `${effectiveTextBox.x * 100}%`,
            top: `${effectiveTextBox.y * 100}%`,
            width: `${effectiveTextBox.width * 100}%`,
            height: "20%",
          }}
        >
          <span className="absolute -top-6 left-0 flex items-center gap-1 rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-semibold text-background">
            <Move className="h-2.5 w-2.5" />
            Caption
          </span>
          <div
            onPointerDown={(e) => handlePointerDown(e, "text", "resize")}
            className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-primary"
          />
        </div>

        {hasLogo && showLogo && (
          <div
            onPointerDown={(e) => handlePointerDown(e, "logo", "move")}
            className="absolute cursor-move rounded-lg border-2 border-dashed border-white/90"
            style={{
              left: `${effectiveLogoBox.x * 100}%`,
              top: `${effectiveLogoBox.y * 100}%`,
              width: `${effectiveLogoBox.width * 100}%`,
              aspectRatio: "1",
            }}
          >
            <span className="absolute -top-6 left-0 rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-semibold text-background">
              Logo
            </span>
            <div
              onPointerDown={(e) => handlePointerDown(e, "logo", "resize")}
              className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-primary"
            />
          </div>
        )}
      </div>

      {(textBox || logoBox) && (
        <button
          onClick={() => {
            onTextBoxChange(undefined);
            onLogoBoxChange(undefined);
          }}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset positions
        </button>
      )}
    </div>
  );
}
