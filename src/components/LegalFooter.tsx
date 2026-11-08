import { Link } from "@tanstack/react-router";

// Shared across LoginScreen (pre-auth) and the authenticated app shell
// (__root.tsx, below the Outlet) so the 4 links are reachable whether or
// not the visitor is signed in — matters for Meta App Review, which needs
// to be able to reach these URLs itself, not just a logged-in user.
export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-6 py-6 text-xs text-muted-foreground ${className}`}
    >
      <Link to="/privacy-policy" className="hover:text-foreground">
        Privacy Policy
      </Link>
      <span className="text-border" aria-hidden="true">
        &middot;
      </span>
      <Link to="/terms" className="hover:text-foreground">
        Terms of Service
      </Link>
      <span className="text-border" aria-hidden="true">
        &middot;
      </span>
      <Link to="/data-deletion" className="hover:text-foreground">
        Data Deletion
      </Link>
      <span className="text-border" aria-hidden="true">
        &middot;
      </span>
      <Link to="/tools" className="hover:text-foreground">
        Free tools
      </Link>
      <span className="text-border" aria-hidden="true">
        &middot;
      </span>
      <a href="mailto:hossenpalash@gmail.com" className="hover:text-foreground">
        Contact
      </a>
    </footer>
  );
}
