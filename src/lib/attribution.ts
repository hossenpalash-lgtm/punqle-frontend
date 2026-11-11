// Remembers WHERE a visitor came from (the marketing tags on the link they clicked, such as
// ?utm_source=facebook&utm_campaign=sample-ad-1) so the growth report can show which link
// brought each sign-up. Only these four marketing labels are kept - never anything personal.
// First touch wins: a later visit with other tags does not overwrite the first one.
// Every storage call is wrapped, so a blocked browser store just means "no source" and nothing else changes.
// (The ?ref= referral code has its own handling in __root.tsx and is deliberately not touched here.)

const STORAGE_KEY = "punqle_attribution_v1";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const MAX_LENGTH = 60;

export type Attribution = Partial<Record<(typeof FIELDS)[number], string>>;

// Letters, digits and a few separators only, so a crafted link can't put anything odd into the account record.
function clean(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim().slice(0, MAX_LENGTH);
  return /^[A-Za-z0-9_.\-+ ]+$/.test(v) ? v : null;
}

export function captureAttribution(): void {
  try {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const found: Attribution = {};
    for (const field of FIELDS) {
      const v = clean(params.get(field));
      if (v) found[field] = v;
    }
    if (Object.keys(found).length > 0) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
  } catch {
    /* storage unavailable: no source recorded */
  }
}

export function readAttribution(): Attribution | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Attribution = {};
    for (const field of FIELDS) {
      const v = typeof parsed[field] === "string" ? clean(parsed[field] as string) : null;
      if (v) out[field] = v;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}
