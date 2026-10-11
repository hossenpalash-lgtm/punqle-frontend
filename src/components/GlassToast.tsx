import { AlertCircle, Check, X } from "lucide-react";
import { useEffect, useState } from "react";

// Floating glass notices (founder, 2026-10-12: "ভাসমান glass বার্তা"). One small
// store + one <GlassToaster /> mounted in the signed-in shell, so any screen can
// say "Posted to Facebook" with showToast(...) and the message floats at the top
// while the page scrolls underneath. Black and white on purpose: a charcoal tick
// for success, the app's red only for errors.
type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  href?: string;
  actionLabel?: string;
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function notify() {
  listeners.forEach((l) => l());
}

export function dismissToast(id: number) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  toasts = toasts.filter((x) => x.id !== id);
  notify();
}

export function showToast(
  message: string,
  opts: { tone?: ToastTone; href?: string; actionLabel?: string; durationMs?: number } = {},
) {
  const id = nextId++;
  const tone = opts.tone ?? "info";
  // At most three at once — a burst (Facebook + Instagram) shouldn't bury the page.
  const kept = toasts.slice(-2);
  toasts.slice(0, -2).forEach((x) => dismissToast(x.id));
  toasts = [...kept, { id, message, tone, href: opts.href, actionLabel: opts.actionLabel }];
  notify();
  timers.set(
    id,
    setTimeout(() => dismissToast(id), opts.durationMs ?? (tone === "error" ? 8000 : 4500)),
  );
}

export function GlassToaster() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[76px] z-[70] flex flex-col items-center gap-2 px-4 lg:top-5"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass-strong toast-drop pointer-events-auto flex max-w-[min(92vw,440px)] items-center gap-2.5 rounded-full py-2 pl-2.5 pr-3 text-sm font-semibold text-foreground"
        >
          {t.tone === "success" && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          {t.tone === "error" && <AlertCircle className="ml-0.5 h-5 w-5 shrink-0 text-destructive" />}
          <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
          {t.href && (
            <a
              href={t.href}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[13px] font-semibold text-muted-foreground underline underline-offset-2"
            >
              {t.actionLabel ?? "View"}
            </a>
          )}
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
