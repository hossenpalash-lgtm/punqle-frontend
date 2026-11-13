import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

// DRAFT (2026-11-14), not live until the founder has reviewed it. Written to Paddle's published seller requirements: a refund
// window of 14-90 days, how to request it, and no "all sales are final" wording (Paddle rejects those at domain review).
export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [{ title: "Refund Policy — Punqle" }],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund Policy" effectiveDate="November 14, 2026">
      <p>
        This Refund Policy applies to paid plans and credit packs for Punqle (punqle.com), operated by HOSSEN, MD
        MOSHARRAF (ABN 47 183 516 336), trading as Punqle. Our order process is conducted by our online reseller
        Paddle.com. Paddle.com is the Merchant of Record for all our orders, so Paddle takes your payment and
        processes your refund.
      </p>

      <h2>1. 14-day refund</h2>
      <p>
        If you change your mind, you can ask for a refund of any purchase within 14 days of the date you paid. You
        don't need to give a reason. Credits from a refunded purchase are removed from your account.
      </p>

      <h2>2. How to ask for a refund</h2>
      <p>
        Request your refund from Paddle at{" "}
        <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">
          paddle.net
        </a>
        , using the email address you paid with (the link in your Paddle receipt email works too). If you'd rather
        write to us, email <a href="mailto:hossenpalash@gmail.com">hossenpalash@gmail.com</a> and we'll pass it on
        to Paddle. Refunds go back to the original payment method; your bank can take several business days to show
        it.
      </p>

      <h2>3. Subscriptions</h2>
      <p>
        You can cancel a paid plan at any time. Cancelling stops the next renewal, and you keep your plan until the
        end of the period you've paid for. If a renewal charge surprises you, ask for a refund within 14 days of that
        charge.
      </p>

      <h2>4. When something goes wrong</h2>
      <p>
        If a generation fails because of a problem on our side, email us and we'll restore the credits it used. Where
        we're at fault in other ways, we'll put it right, including with a refund.
      </p>

      <h2>5. Your legal rights</h2>
      <p>
        Nothing in this policy limits your rights under Australian consumer law or any other law that applies to
        you, including any right to a refund or remedy for a faulty service.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions about a refund? Email <a href="mailto:hossenpalash@gmail.com">hossenpalash@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
