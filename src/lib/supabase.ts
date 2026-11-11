import { createClient, type Session } from "@supabase/supabase-js";
import { captureAttribution, readAttribution } from "./attribution";

// Safe to embed client-side — this is the anon/public key, scoped by
// Row Level Security on the database, not by secrecy.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// This module is imported from __root.tsx, which also renders during
// SSR — where `window`/`localStorage` don't exist. Supabase's auth
// client touches those for session persistence and URL-based session
// detection, which can throw during server-side rendering unless
// explicitly disabled outside the browser.
const isBrowser = typeof window !== "undefined";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});

// Runs once when the page loads in the browser, before the router can tidy the address bar (no-op on the server).
captureAttribution();

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpWithPassword(email: string, password: string) {
  // If the visitor arrived through a tagged link (see attribution.ts), the tags ride along as account metadata
  // so the growth report can tell which link brought them. Without tags this is exactly the old call.
  const source = readAttribution();
  return supabase.auth.signUp(source ? { email, password, options: { data: source } } : { email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export type { Session };
