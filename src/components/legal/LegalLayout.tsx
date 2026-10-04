import { Link } from "@tanstack/react-router";
import { PunqleLogo } from "@/components/PunqleLogo";
import { LegalFooter } from "@/components/LegalFooter";

// Shared shell for the 3 public legal pages (Privacy Policy, Terms,
// Data Deletion) — these render outside the normal auth-gated app shell
// (see __root.tsx) so they're reachable by anyone, logged in or not,
// including Meta's own reviewers/crawlers. Plain prose styling, not the
// app chrome (no sidebar/wizard), since these are reference documents.
export function LegalLayout({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex justify-center px-4 pt-4 sm:px-6">
        <div className="flex w-full max-w-[720px] items-center gap-2 py-3">
          <Link to="/" search={{ tab: "single" }} className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <PunqleLogo className="h-4 w-4" />
            </div>
            <span className="font-display text-base font-extrabold text-foreground">Punqle</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] flex-1 px-6 py-8">
        <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-xs text-muted-foreground">Effective {effectiveDate}</p>
        <div className="legal-prose mt-6">{children}</div>
      </main>

      <LegalFooter className="mt-auto border-t border-border" />
    </div>
  );
}
