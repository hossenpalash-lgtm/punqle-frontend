import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.punqle.com/terms" }],
    meta: [{ title: "Terms of Service — Punqle" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="November 14, 2026">
      <p>
        These Terms of Service ("Terms") govern your use of Punqle, an AI ad-creation platform at punqle.com,
        operated by HOSSEN, MD MOSHARRAF (ABN 47 183 516 336), trading as Punqle and based in Australia ("Punqle,"
        "we," "us"). When you use Punqle, you are contracting with HOSSEN, MD MOSHARRAF. By creating an account or
        using Punqle, you agree to these Terms; if you keep using Punqle after we change them, you agree to the
        changed Terms.
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
        Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for
        all our orders. Paddle provides all customer service inquiries and handles returns and refunds for paid plans
        and credit packs. Payment, billing, sales taxes, renewals and cancellation of paid plans are governed by{" "}
        <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">
          Paddle's checkout buyer terms
        </a>
        . Prices, plans, and credit costs may change; we'll make current pricing available in the app, and a price
        change never applies to a period you have already paid for. You can cancel a paid plan at any time and keep
        using it until the end of the period you paid for. Our <a href="/refund-policy">Refund Policy</a> explains
        how to get a refund; nothing in these Terms limits your rights under Australian consumer law or other law
        that applies to you.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to use Punqle to:</p>
      <ul>
        <li>Generate content that is unlawful, fraudulent, deceptive, or infringes someone else's rights</li>
        <li>Attempt to disrupt, reverse-engineer, or gain unauthorized access to Punqle's systems</li>
        <li>Upload content you don't have the right to use</li>
        <li>Use Punqle to generate advertising for products or services that are illegal in your target market</li>
        <li>Create sexual or intimate content of a real person without their consent, or deepfakes or other content
          meant to impersonate or mislead people about a real person</li>
        <li>Create content that harasses, threatens, or promotes hatred of a person or group, or that reveals other
          people's private information (doxxing)</li>
        <li>Create or spread malware, spam, scams, or other deceptive content</li>
        <li>Try to get around Punqle's safeguards (for example, "jailbreaking" the AI), probe or scan our systems, or
          scrape Punqle at scale</li>
      </ul>
      <p>
        We may refuse, remove, or block content that breaks these rules, and we may suspend or terminate accounts
        that violate these Terms, do not pay, or put the service or other people at risk (for example through fraud
        or security abuse).
      </p>

      <h2>5. Your Content and Ownership</h2>
      <p>
        You own the descriptions, photos, and other material you upload ("Your Content"), and you own the ad copy,
        images, and video Punqle generates for you based on it. By uploading Your Content, you give us permission
        to process it — including sending it to the third-party AI providers described in our{" "}
        <a href="/privacy-policy">Privacy Policy</a> — solely to provide the service to you. You're responsible
        for making sure you have the rights to any content you upload, and for the prompts you write and what you do
        with the results. Punqle itself — the software, design, and brand — remains ours.
      </p>
      <p>
        <strong>Copyright and takedown.</strong> If you believe something made or published with Punqle infringes
        your rights, email <a href="mailto:hossenpalash@gmail.com">hossenpalash@gmail.com</a> with a link or
        description of the content and what right you hold. We will review it and remove or disable content that
        infringes, and we may terminate accounts that repeatedly infringe other people's rights.
      </p>

      <h2>6. AI-Generated Content</h2>
      <p>
        Punqle uses third-party AI models to generate ad copy and images. AI-generated content may be inaccurate,
        generic, or occasionally unsuitable, and we don't guarantee it will be error-free or fit for every
        purpose, and it is not professional (legal, medical, financial, or tax) advice. You're responsible for reviewing and approving any generated content before you publish or use
        it — including checking it against advertising rules and platform policies (such as Meta's) that apply to
        where you plan to post it.
      </p>

      <h2>7. Third-Party Services</h2>
      <p>
        Punqle relies on third-party providers — including OpenAI, Google (Gemini), Pexels, Paddle (payments), Shopify, and
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
        Punqle is provided "as is," without warranties of any kind, to the extent permitted by law, and we don't
        promise that it will be uninterrupted or error-free. We are not
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
