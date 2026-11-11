// A small "Top up credits" button for the places that tell someone they are short of credits.
// It opens the same Billing panel the rest of the app opens (see the "punqle:open-billing" listener in __root.tsx).
export function TopUpButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("punqle:open-billing"))}
      className={[
        "inline-flex items-center rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className,
      ].join(" ")}
    >
      Top up credits
    </button>
  );
}
