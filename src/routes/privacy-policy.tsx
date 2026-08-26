import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [{ title: "Privacy Policy — Punqle" }],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="August 27, 2026">
      <p>
        This Privacy Policy explains what information Punqle ("Punqle," "we," "us") collects when you use the
        Punqle app at punqle.com, how we use it, and what choices you have. Punqle is operated by HOSSEN, MD
        MOSHARRAF (ABN 47 183 516 336), based in Australia.
      </p>
      <p>
        This policy describes what Punqle actually does today. If we add new features that change what data we
        collect or how we use it, we will update this policy before that feature becomes active.
      </p>

      <h2>1. Information We Collect</h2>
      <p><strong>Account information.</strong> When you sign up, we (via our authentication provider, Supabase) collect your email address and a securely hashed password to create and secure your account.</p>
      <p><strong>Business and content information you provide.</strong> To generate ads and content for you, we collect:</p>
      <ul>
        <li>Business details you enter, such as your business name, category, brand color, and logo</li>
        <li>Product or item descriptions you type in</li>
        <li>Product photos you upload for us to turn into ad images</li>
        <li>Any web page URL you paste in for our competitor-analysis or product-import tools (we fetch the public content of that page)</li>
      </ul>
      <p><strong>Content we generate for you.</strong> We store the ad copy, captions, and images our AI generates for you, so you can view and reuse your recent posts. We keep your 20 most recently generated posts; older ones are automatically deleted as new ones are created.</p>
      <p><strong>Payment and subscription information.</strong> If you subscribe to a paid plan, payment is handled entirely by our payment processor, Stripe, on Stripe's own hosted checkout page. We never see or store your card number. We store only a Stripe customer/subscription reference, your plan tier, and billing status, so we know what you're subscribed to.</p>
      <p><strong>Shopify integration (optional).</strong> If you choose to connect a Shopify store, we store your store's domain and an access token that lets us read your product catalog, so we can import your products into Punqle. This only happens if you actively connect your store, and you can disconnect it at any time from within the app.</p>
      <p><strong>YouTube integration (optional).</strong> If you choose to connect your YouTube channel, we store your channel's ID and title, along with an OAuth access token and refresh token, so we can identify your connected channel and publish, only at your explicit request, videos you create inside Punqle to it. See "Google User Data (YouTube Integration)" below for full details. This only happens if you actively connect your channel, and you can disconnect it at any time from within the app.</p>
      <p><strong>Facebook and Instagram integration (optional).</strong> If you choose to connect a Facebook Page (and its linked Instagram account, if any), we store the Page's ID and name, a Page access token, and, if linked, the Instagram account's ID and username, so we can publish, only at your explicit request, ad content you create inside Punqle to those accounts. This only happens if you actively connect an account, and you can disconnect it at any time from within the app.</p>
      <p><strong>Try-On (optional).</strong> If you use the Try-On feature, the photo you upload (of yourself or someone else with their permission) and a product photo are sent to FASHN AI to generate a preview. We do not store these photos — see "FASHN AI (Virtual Try-On)" below for full details.</p>
      <p><strong>Referral information.</strong> Punqle has an optional referral program. If you share your referral link, it contains your account ID. If someone signs up using it, we record that a referral occurred (linking the two account IDs) so we can grant referral credits. We do not share your email or other account details through this feature.</p>
      <p><strong>Credits.</strong> We keep a simple count of your remaining ad-generation credits.</p>

      <h2>2. How We Use Third-Party AI and Service Providers</h2>
      <p>To provide Punqle's features, we send certain information to the following third-party providers. We only send what each provider needs to do its specific job:</p>
      <ul>
        <li><strong>OpenAI</strong> — receives text you provide (such as product descriptions, business category, and post ideas) to generate ad copy and captions. We do not send images or your account details to OpenAI.</li>
        <li><strong>Google (Gemini API)</strong> — receives product photos you upload (if any) and text prompts, to generate or edit ad images and videos. This is separate from YouTube (see below) and never accesses your Google Account or YouTube channel.</li>
        <li><strong>Google (YouTube Data API)</strong> — only if you connect your YouTube channel; see "YouTube integration" above and "Google User Data (YouTube Integration)" below for full details.</li>
        <li><strong>Pexels</strong> — receives only a search term, if you choose to search their stock photo library instead of uploading your own photo. No personal information is sent.</li>
        <li><strong>Stripe</strong> — handles billing and payment directly; see "Payment and subscription information" above.</li>
        <li><strong>Shopify</strong> — only if you connect your store; see "Shopify integration" above.</li>
        <li><strong>Meta (Facebook and Instagram)</strong> — only if you connect a Facebook Page or Instagram account; see "Facebook and Instagram integration" above.</li>
        <li><strong>FASHN AI</strong> — only if you use the Try-On feature; see "FASHN AI (Virtual Try-On)" below for full details.</li>
        <li><strong>Supabase</strong> — our database and authentication provider, which securely hosts your account and the information described in this policy.</li>
      </ul>
      <p>We do not sell your information to anyone, and we do not share it with advertisers.</p>

      <h2>3. Cookies and Tracking</h2>
      <p>
        Punqle does not use cookies to keep you signed in — your session is stored in your browser's local storage
        instead. We do not currently run any analytics, advertising, or tracking tools (such as Google Analytics or
        Facebook Pixel) in the app. Our error-monitoring tooling is not currently active. If this changes, we will
        update this section.
      </p>

      <h2>4. Uploaded Images</h2>
      <p>
        Product photos you upload during ad or video generation are sent to our backend and to Google's Gemini API
        to create your ad image, and the result is stored with your generated post as described above. Photos you
        add only to build a downloadable carousel (in the carousel tool) are processed entirely in your own browser
        and are never uploaded to our servers.
      </p>

      <h2>5. How We Store and Protect Your Information</h2>
      <p>
        Your data is stored with Supabase, which provides database and authentication infrastructure with
        access controls restricting data to your own account. We restrict backend access to what's needed to
        operate the service. No method of storage or transmission is completely secure, but we take reasonable
        steps to protect your information. OAuth access tokens for connected YouTube or Facebook/Instagram
        accounts are stored with the same access controls as the rest of your data, transmitted only over
        encrypted HTTPS connections, and are never exposed to your browser or any party other than our own
        backend server.
      </p>

      <h2>6. Google User Data (YouTube Integration)</h2>
      <p>
        If you choose to connect your YouTube channel, Punqle requests the Google API scopes{" "}
        <code>youtube.upload</code> and <code>youtube.readonly</code>. This section explains exactly how we
        handle that access.
      </p>
      <p>
        <strong>What we access.</strong> Your YouTube channel's ID and title, and the ability to upload videos
        to your channel. We do not access, read, or display your existing videos, playlists, subscriptions,
        comments, analytics, or any other Google Account data.
      </p>
      <p>
        <strong>How we use it.</strong> To show which channel you're connected to inside Punqle, and to upload
        a video to that channel only when you explicitly click "Publish" on a video you created inside Punqle.
        We never publish anything without that explicit action.
      </p>
      <p>
        <strong>Who we share it with.</strong> Nobody. We do not share, sell, transfer, or disclose your Google
        user data to any third party. It is used only within Punqle's own backend, solely to perform the
        actions described above.
      </p>
      <p>
        <strong>How we protect it.</strong> See "How We Store and Protect Your Information" above — the same
        protections apply to your YouTube connection's access and refresh tokens.
      </p>
      <p>
        <strong>Retention and deletion.</strong> We retain this data only for as long as your YouTube connection
        stays active. You can disconnect at any time from within the app (Sidebar → YouTube → Disconnect),
        which immediately and permanently deletes your stored channel information and tokens from our database.
        Deleting your Punqle account (see our <a href="/data-deletion">Data Deletion</a> page) also deletes this
        data.
      </p>

      <h2>7. FASHN AI (Virtual Try-On)</h2>
      <p>
        If you use Punqle's Try-On feature, you upload a photo of a person (yourself, or someone else only
        with their permission) along with a product photo. This section explains exactly what happens to
        those photos.
      </p>
      <p>
        <strong>What we send.</strong> The photo you upload and the product photo are sent to FASHN AI, a
        third-party virtual try-on provider, solely to generate your try-on preview.
      </p>
      <p>
        <strong>What we store.</strong> Punqle does not save your uploaded photo or the generated result to
        our servers beyond the time needed to generate and return it to you. It is not added to your post
        history, and it is never visible to any other Punqle user.
      </p>
      <p>
        <strong>Who else handles it.</strong> Once your photos reach FASHN AI, their own privacy policy
        governs how they're handled — see{" "}
        <a href="https://fashn.ai/privacy-policy" target="_blank" rel="noopener noreferrer">
          fashn.ai/privacy-policy
        </a>
        . We don't control, and can't guarantee, FASHN's own retention practices beyond what their policy
        states.
      </p>
      <p>
        <strong>Your responsibility.</strong> Only upload a photo of yourself, or of someone else who has
        given you permission to use their photo this way.
      </p>

      <h2>8. Your Rights and Choices</h2>
      <p>You can review and update your business profile, disconnect your Shopify store, disconnect your YouTube channel, disconnect your Facebook/Instagram connection, and delete individual generated posts at any time from within the app. For anything else — including deleting your account entirely — see our <a href="/data-deletion">Data Deletion</a> page.</p>

      <h2>9. Children's Privacy</h2>
      <p>Punqle is intended for business owners and is not directed at children. We do not knowingly collect information from anyone under 16.</p>

      <h2>10. Changes to This Policy</h2>
      <p>We may update this policy as Punqle's features change. We'll update the effective date above when we do. Significant changes — such as adding new data collection tied to a new feature — will be reflected here before that feature goes live.</p>

      <h2>11. Contact Us</h2>
      <p>Questions about this policy? Email <a href="mailto:hossenpalash@gmail.com">hossenpalash@gmail.com</a>.</p>
    </LegalLayout>
  );
}
