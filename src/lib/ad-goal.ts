// Picks the right ad goal (and so the right button on the picture) from what the customer typed, when they have not
// chosen a goal themselves.
//
// Why: the Goal pill defaults to "Sales", whose button says "Shop Now". Real sample ads made on 2026-11-10 for a hair
// salon and a barber came out with a "SHOP NOW" button. A person who books an appointment is not shopping, and a
// business owner who sees the wrong button on their own ad stops trusting the rest of it.
//
// Rules: only ever returns a goal when the text clearly describes a booking or quote business; otherwise null, and the
// caller keeps whatever goal is selected. A goal the customer picked by hand is never overridden (the form checks that).
import type { AdGoal } from "./api";

// Service businesses where the customer books a time. "book" alone is NOT enough (a "book shop" sells books).
const BOOKINGS =
  /\b(hair\s?(salon|dresser|dressers|dressing|cut|cuts|stylist)|hairdressing|barber(s|shop)?|salon|nail(s)?\s?(salon|bar|studio|tech)?|beauty|spa|massage|waxing|lash(es)?|brows?|facial(s)?|tattoo|physio(therapy)?|chiropract\w*|dentist|clinic|therapy|personal trainer|appointments?|bookings?|book (online|now|an|your|a|in))\b/i;

// Trades that give a price after looking at the job.
const LEADS = /\b(quotes?|plumb(er|ers|ing)|electrician|builder|renovations?|landscap(er|ing)|roofing|handyman|removalists?|cleaning service)\b/i;

export function inferGoalFromDescription(text: string): AdGoal | null {
  const t = (text || "").trim();
  if (t.length < 3) return null;
  if (BOOKINGS.test(t)) return "bookings";
  if (LEADS.test(t)) return "leads";
  return null;
}

// Customer-facing wording for a failed ad. Raw provider text such as "402 RESOURCE_EXHAUSTED ..." or "Failed to fetch"
// must never reach the screen. The server already sends a friendly 503; this is the safety net for everything else.
export function friendlyAdError(err: unknown, fallback = "Couldn't generate your ads."): string {
  const raw = err instanceof Error ? err.message : "";
  if (!raw) return fallback;
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return "Couldn't reach Punqle. Check your internet connection and try again.";
  }
  if (/resource_exhausted|prepayment|quota|billing|\b(402|429)\b/i.test(raw)) {
    return "Image creation is temporarily unavailable on our side. You were not charged. Please try again in a little while.";
  }
  return raw;
}
