import { Router } from "express";
import express from "express";
import Stripe from "stripe";
import { connectMongoDB, isDatabaseReady } from "../db/mongo";
import { getUncachableStripeClient, isVercelRuntime, paymentOrigin, withStripeSync } from "../lib/stripeClient";
import { creditPaidTopUp } from "../lib/walletTopUps";

export const stripeWebhookRouter = Router();
stripeWebhookRouter.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const signature = req.get("stripe-signature");
  if (!signature || !Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: "A signed Stripe payload is required." }); return;
  }
  try {
    const event = isVercelRuntime() ? await (async () => {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret?.startsWith("whsec_")) throw new Error("Stripe webhook is not configured.");
      const stripe = await getUncachableStripeClient();
      return stripe.webhooks.constructEventAsync(req.body, signature, secret);
    })() : await withStripeSync(async sync => {
      // Select this deployment's secret, not the first dev/production webhook.
      const endpoint = await sync.getManagedWebhookByUrl(`${paymentOrigin()}/api/stripe/webhook`);
      if (!endpoint?.secret) throw new Error("Stripe webhook is not configured.");
      const event = await sync.stripe.webhooks.constructEventAsync(req.body, signature, endpoint.secret);
      if (event.livemode) throw new Error("Live payments are disabled.");
      await sync.processEvent(event);
      return event;
    });
    if (event.livemode) throw new Error("Live payments are disabled.");
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
        if (isVercelRuntime()) await connectMongoDB();
        if (!isDatabaseReady()) throw new Error("Wallet database is unavailable.");
        const checkout = event.data.object as import("stripe").default.Checkout.Session;
        if (checkout.metadata?.app === "platepay" && checkout.metadata?.purpose === "wallet_top_up") {
          if (checkout.payment_status === "paid" && !await creditPaidTopUp(checkout)) {
            // Retry if the event raced checkout-intent persistence. Never acknowledge
            // an uncredited paid PlatePay session as successfully fulfilled.
            throw new Error("Wallet top-up is not yet reconciled.");
          }
        }
    }
    res.json({ received: true });
  } catch (error) {
    const invalid = error instanceof Stripe.errors.StripeSignatureVerificationError;
    req.log.warn({ errorType: error instanceof Error ? error.name : "UnknownError" }, "Stripe webhook rejected or pending retry");
    res.status(invalid ? 400 : 503).json({ error: invalid ? "Invalid Stripe signature." : "Webhook processing is unavailable. Retry required." });
  }
});
