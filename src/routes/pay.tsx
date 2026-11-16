import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PunqleLogo } from "@/components/PunqleLogo";

// Paddle's "default payment link" page (set in the Paddle dashboard to https://www.punqle.com/pay).
// The backend creates a Paddle transaction and sends the browser here as /pay?_ptxn=txn_...;
// loading Paddle.js on this page is what opens Paddle's checkout window. Paddle reviews this page
// too, so it is public (no login) and says plainly what it is.
//
// Paddle.js is meant to open the checkout by itself when ?_ptxn= is present; if no checkout event
// shows up shortly after start-up we open it explicitly with that transaction id, so the page
// still works whichever way Paddle.js behaves. (Confirm in the Paddle sandbox before going live.)

const PADDLE_JS = "https://cdn.paddle.com/paddle/v2/paddle.js";
const CLIENT_TOKEN = (import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined)?.trim();
const SANDBOX = ((import.meta.env.VITE_PADDLE_ENV as string | undefined) ?? "sandbox").trim().toLowerCase() !== "live";

type PaddleEvent = { name?: string };
type PaddleApi = {
  Environment: { set: (env: string) => void };
  Initialize: (opts: { token: string; eventCallback?: (e: PaddleEvent) => void }) => void;
  Checkout: { open: (opts: { transactionId: string }) => void };
};

declare global {
  interface Window {
    Paddle?: PaddleApi;
  }
}

export const Route = createFileRoute("/pay")({
  head: () => ({
    meta: [{ title: "Checkout — Punqle" }, { name: "robots", content: "noindex" }],
  }),
  component: PayPage,
});

function PayPage() {
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!CLIENT_TOKEN) {
      setProblem("Checkout isn't switched on yet. Please try again later.");
      return;
    }
    const transactionId = new URLSearchParams(window.location.search).get("_ptxn");
    let opened = false;

    const start = () => {
      const paddle = window.Paddle;
      if (!paddle) {
        setProblem("The payment window couldn't load. Check your connection and refresh this page.");
        return;
      }
      if (SANDBOX) paddle.Environment.set("sandbox");
      paddle.Initialize({
        token: CLIENT_TOKEN,
        eventCallback: (e) => {
          const name = e?.name ?? "";
          if (name.startsWith("checkout.")) opened = true;
          // Back to the app once the person pays or closes the window.
          if (name === "checkout.completed") window.location.assign("/?billing=success");
          if (name === "checkout.closed") window.location.assign("/?billing=cancelled");
        },
      });
      if (transactionId) {
        window.setTimeout(() => {
          if (!opened) paddle.Checkout.open({ transactionId });
        }, 1500);
      }
    };

    if (window.Paddle) {
      start();
      return;
    }
    const script = document.createElement("script");
    script.src = PADDLE_JS;
    script.async = true;
    script.onload = start;
    script.onerror = () => setProblem("The payment window couldn't load. Check your connection and refresh this page.");
    document.head.appendChild(script);
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <PunqleLogo className="h-5 w-5" />
      </div>
      <h1 className="font-display text-xl font-extrabold text-foreground">
        {problem ? "Checkout unavailable" : "Opening secure checkout…"}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {problem ??
          "Payments for Punqle plans and credit packs are handled by Paddle, our payment provider and Merchant of Record."}
      </p>
      <a href="/" className="text-sm font-semibold text-foreground underline underline-offset-4">
        Back to Punqle
      </a>
    </div>
  );
}
