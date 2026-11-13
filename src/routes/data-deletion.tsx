import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/data-deletion")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.punqle.com/data-deletion" }],
    meta: [{ title: "Data Deletion — Punqle" }],
  }),
  component: DataDeletionPage,
});

function DataDeletionPage() {
  return (
    <LegalLayout title="Data Deletion" effectiveDate="August 22, 2026">
      <p>
        You can delete some things yourself directly in the app — for example, individual generated posts (from
        History) and a connected Shopify store (from Product Catalog). To delete your entire Punqle account and
        the data associated with it, follow the steps below.
      </p>

      <h2>How to Request Deletion</h2>
      <p>
        Send an email to <a href="mailto:hossenpalash@gmail.com">hossenpalash@gmail.com</a> from the email address
        associated with your Punqle account, with the subject line "Delete my Punqle account." We'll use this to
        verify the request is coming from the account owner.
      </p>

      <h2>What Gets Deleted</h2>
      <p>Once we verify your request, we will delete:</p>
      <ul>
        <li>Your account (email and login credentials)</li>
        <li>Your business profile, including your logo and brand details</li>
        <li>Your generated posts, images, and content plans</li>
        <li>Your Shopify connection and imported products, if any</li>
        <li>Your referral records and remaining credits</li>
      </ul>
      <p>
        Where you have an active or past paid subscription, we may retain minimal billing records (such as your
        Paddle customer/subscription reference) as required for tax, accounting, or legal compliance, even after
        the rest of your data is deleted.
      </p>

      <h2>Timeframe</h2>
      <p>We aim to complete deletion requests within 30 days of verifying your request.</p>

      <p>
        For more detail on what we collect and how, see our <a href="/privacy-policy">Privacy Policy</a>.
      </p>
    </LegalLayout>
  );
}
