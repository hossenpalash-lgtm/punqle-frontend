import { useEffect, useState, type RefObject } from "react";

// True once the element has come within `margin` of the screen (and stays true). Used to hold back the
// landing page's below-the-fold videos until a visitor scrolls near them — they used to start
// downloading ~1.3 MB at the same moment as the hero picture (2026-11-10). Without
// IntersectionObserver (very old browsers) it answers true straight away, so nothing breaks.
export function useNearViewport<T extends Element>(ref: RefObject<T | null>, margin = "400px"): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, ref, margin]);
  return near;
}
