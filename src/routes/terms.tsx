import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "Terms of Service — Punqle" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="August 22, 2026">
      <p>
        These Terms of Service ("Terms") govern your use of Punqle, an AI ad-creation platform at punqle.com,
        operated by HOSSEN, MD MOSHARRAF (ABN 47 183 516 336), based in Australia ("Punqle," "we," "us"). By
        creating an account or using Punqle, you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        Punqle helps businesses generate ad copy, images, video, and content plans using AI, based on
        information you provide (such as product descriptions and photos). You can also import products from a
        connected Shopify store and manage a simple credit-based billing plan.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You need an account to use Punqle. You're responsible for keeping your login credentials secure and for
        all activity under your account. You must provide accurate information and be authorized to represent the
        business you use Punqle for.
      </p>

      <h2>3. Credits, Subscriptions and Payments</h2>
      <p>
        Generating content uses credits. Free credits may be granted on signup or through our referral program.
        Paid plans and additional credits are billed through Stripe, our payment processor; by subscribing, you
        agree to Stripe's own terms for the payment itself. Prices, plans, and credit costs may change; we'll make
        current pricing available in the app. Fees are non-refundable except as required by law.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to use Punqle to:</p>
      <ul>
        <li>Generate content that is unlawful, fraudulent, deceptive, or infringes someone else's rights</li>
        <li>Attempt to disrupt, reverse-engineer, or gain unauthorized access to Punqle's systems</li>
        <li>Upload content you don't have the right to use</li>
        <li>Use Punqle to generate advertising for products or services that are illegal in your target market</li>
      </ul>
      <p>We may suspend or terminate accounts that violate these Terms.</p>

      <h2>5. Your Content and Ownership</h2>
      <p>
        You own the descriptions, photos, and other material you upload ("Your Content"), and you own the ad copy,
        images, and video Punqle generates for you based on it. By uploading Your Content, you give us permission
        to process it — including sending it to the third-party AI providers described in our{" "}
        <a href="/privacy-policy">Privacy Policy</a> — solely to provide the service to you. You're responsible
        for making sure you have the rights to any content you upload.
      </p>

      <h2>6. AI-Generated Content</h2>
      <p>
        Punqle uses third-party AI models to generate ad copy and images. AI-generated content may be inaccurate,
        generic, or occasionally unsuitable, and we don't guarantee it will be error-free or fit for every
        purpose. You're responsible for reviewing and approving any generated content before you publish or use
        it — including checking it against advertising rules and platform policies (such as Meta's) that apply to
        where you plan to post it.
      </p>

      <h2>7. Third-Party Services</h2>
      <p>
        Punqle relies on third-party providers — including OpenAI, Google (Gemini), Pexels, Stripe, Shopify, and
        Supabase — to operate. Your use of features tied to those providers (like connecting a Shopify store) may
        also be subject to that provider's own terms.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using Punqle at any time. See our <a href="/data-deletion">Data Deletion</a> page for how to
        request deletion of your account and data. We may suspend or terminate your account if you violate these
        Terms.
      </p>

      <h2>9. Disclaimers and Limitation of Liability</h2>
      <p>
        Punqle is provided "as is," without warranties of any kind, to the extent permitted by law. We are not
        liable for indirect, incidental, or consequential damages arising from your use of the service, including
        losses related to content you publish based on Punqle's output. Nothing in these Terms limits any
        liability that cannot be excluded under applicable Australian consumer law.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>We may update these Terms as Punqle changes. We'll update the effective date above when we do, and continued use of Punqle after a change means you accept the updated Terms.</p>

      <h2>11. Governing Law</h2>
      <p>These Terms are governed by the laws of Australia.</p>

      <h2>12. Contact Us</h2>
      <p>Questions about these Terms? Email <a href="mailto:hossenpalash@gmail.com">hossenpalash@gmail.com</a>.</p>
    </LegalLayout>
  );
}
