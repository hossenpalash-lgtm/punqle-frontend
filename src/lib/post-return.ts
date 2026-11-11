// Connecting Instagram / Facebook / TikTok / YouTube means leaving Punqle for the platform's own sign-in page. Just before
// leaving, the Post panels leave a note here; when the customer is back, the home screen reads it and takes them straight
// to their newest video with the same platform's Post panel open, so connecting no longer costs them the video they
// just picked. Every call is wrapped: with browser storage blocked nothing breaks, the old manual way (Recent videos)
// still works.
import type { PlatformKey } from "@/components/PlatformTile";

const MARK = "punqle_post_return_v1";
const TILE = "punqle_post_tile_v1";
const MAX_AGE_MS = 30 * 60 * 1000;
const KEYS: PlatformKey[] = ["facebook", "instagram", "tiktok", "youtube"];

export function rememberPostTile(key: PlatformKey): void {
  try {
    window.localStorage.setItem(TILE, key);
  } catch {
    /* storage blocked */
  }
}

// Call right before sending the customer away to connect an account.
export function markPostReturn(): void {
  try {
    window.localStorage.setItem(MARK, String(Date.now()));
  } catch {
    /* storage blocked */
  }
}

// Read once per page load and remembered, so a development double-run of an effect cannot lose it.
let consumed: PlatformKey | null | undefined;

// On coming back: the platform tile to reopen (or null when nobody was in the middle of connecting). Clears the note.
export function consumePostReturn(): PlatformKey | null {
  if (consumed !== undefined) return consumed;
  try {
    const at = Number(window.localStorage.getItem(MARK));
    window.localStorage.removeItem(MARK);
    if (!at || Date.now() - at > MAX_AGE_MS) return (consumed = null);
    const tile = window.localStorage.getItem(TILE) as PlatformKey | null;
    return (consumed = tile && KEYS.includes(tile) ? tile : "facebook");
  } catch {
    return (consumed = null);
  }
}
