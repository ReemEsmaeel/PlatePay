import mongoose from "mongoose";
import type Stripe from "stripe";
import { WalletTopUpModel } from "../models/walletTopUp";
import { AuditLogModel, TransactionModel, UserModel, WalletEntryModel, WalletModel } from "../models";
import { isMatchingPaidTopUp } from "./topUpValidation";
import { DEMO_USD_CENTS_PER_KWD, demoUsdCents } from "./demoFunding";
import { getUncachableStripeClient, isStripeReady, paymentOrigin, stripeUnavailableReason } from "./stripeClient";

export class TopUpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function createTopUpCheckout(userId: mongoose.Types.ObjectId, amountFils: number, attemptKey: string) {
  if (!isStripeReady()) throw new TopUpError(503, stripeUnavailableReason());
  const quote = { checkoutAmountCents: demoUsdCents(amountFils), demoUsdCentsPerKwd: DEMO_USD_CENTS_PER_KWD };
  const intent = await WalletTopUpModel.findOneAndUpdate(
    { userId, attemptKey }, { $setOnInsert: { userId, attemptKey, amountFils, ...quote } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (intent.amountFils !== amountFils) throw new TopUpError(409, "This checkout attempt has a different amount. Choose the amount again.");
  if (intent.creditedAt) throw new TopUpError(409, "This top-up is already completed. Refresh your wallet before starting another.");
  if (!intent.checkoutAmountCents || !intent.demoUsdCentsPerKwd) {
    if (intent.stripeSessionId) throw new TopUpError(409, "This checkout uses an older quote. Choose the amount again to start a new checkout.");
    intent.set(quote);
    await intent.save();
  }
  const stripe = await getUncachableStripeClient();
  // Stripe owns products and prices; use real Price IDs rather than an inline price.
  const products = await stripe.products.search({ query: "metadata['app']:'platepay' AND metadata['purpose']:'wallet_demo_funding'", limit: 1 });
  const product = products.data[0] ?? await stripe.products.create({
    name: "PlatePay demo wallet funds",
    metadata: { app: "platepay", purpose: "wallet_demo_funding" },
  }, { idempotencyKey: "platepay-demo-wallet-product-v1" });
  const price = await stripe.prices.create({
    product: product.id, currency: "usd", unit_amount: intent.checkoutAmountCents!,
    metadata: { app: "platepay", walletAmountFils: String(intent.amountFils), demoUsdCentsPerKwd: String(intent.demoUsdCentsPerKwd) },
  }, { idempotencyKey: `platepay-topup-price-${intent._id}` });
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    allowed_payment_method_types: ["card"],
    client_reference_id: intent._id.toString(),
    metadata: {
      app: "platepay", purpose: "wallet_top_up", topUpId: intent.id, driverId: userId.toString(),
      walletAmountFils: String(intent.amountFils), demoUsdCentsPerKwd: String(intent.demoUsdCentsPerKwd),
    },
    line_items: [{ price: price.id, quantity: 1 }],
    custom_text: { submit: { message: `DEMO ONLY: USD test payment adds ${(intent.amountFils / 1000).toFixed(3)} KWD demo wallet funds. Fixed demo rate: 1 KWD = USD ${(intent.demoUsdCentsPerKwd! / 100).toFixed(2)}. Not a live exchange rate.` } },
    success_url: `${paymentOrigin()}/driver/wallet?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${paymentOrigin()}/driver/wallet?checkout=cancelled`,
  }, { idempotencyKey: `platepay-usd-demo-topup-${intent._id}` });
  if (checkout.livemode || !checkout.url) throw new TopUpError(503, "A Stripe test checkout could not be opened. No funds were added.");
  await WalletTopUpModel.updateOne({ _id: intent._id }, { $set: { stripeSessionId: checkout.id } });
  return { sessionId: checkout.id, checkoutUrl: checkout.url };
}

export async function creditPaidTopUp(checkout: Stripe.Checkout.Session) {
  const topUpId = checkout.metadata?.topUpId;
  if (!topUpId || !mongoose.isValidObjectId(topUpId)) return false;
  const session = await mongoose.startSession();
  let completed = false;
  try {
    await session.withTransaction(async () => {
      const intent = await WalletTopUpModel.findById(topUpId).session(session);
      if (!intent) return;
      if (!isMatchingPaidTopUp(checkout, {
        id: intent.id, userId: intent.userId.toString(),
        amountFils: intent.amountFils, stripeSessionId: intent.stripeSessionId ?? null,
        checkoutAmountCents: intent.checkoutAmountCents, demoUsdCentsPerKwd: intent.demoUsdCentsPerKwd,
      })) return;
      if (intent.creditedAt) { completed = true; return; }
      const user = await UserModel.findById(intent.userId).session(session);
      if (!user) throw new Error("Top-up owner no longer exists.");
      const claimed = await WalletTopUpModel.updateOne(
        { _id: intent._id, creditedAt: null }, { $set: { creditedAt: new Date() } }, { session },
      );
      if (!claimed.modifiedCount) { completed = true; return; }
      await WalletModel.updateOne(
        { userId: intent.userId }, { $inc: { balanceFils: intent.amountFils }, $setOnInsert: { currency: "KWD" } },
        { session, upsert: true },
      );
      await WalletEntryModel.create([{
        userId: intent.userId, type: "wallet_top_up", status: "completed",
        amountFils: intent.amountFils, currency: "KWD",
        description: `Demo wallet top-up: USD ${(intent.checkoutAmountCents! / 100).toFixed(2)} test payment → KWD ${(intent.amountFils / 1000).toFixed(3)}`, stripeSessionId: checkout.id,
      }], { session });
      await TransactionModel.create([{
        driverId: intent.userId, type: "wallet_top_up", status: "completed",
        amountFils: intent.amountFils, currency: "KWD", stripeSessionId: checkout.id,
      }], { session });
      await AuditLogModel.create([{
        actorId: user._id, actorName: user.displayName, action: "wallet.test_top_up",
        targetType: "wallet_top_up", targetId: intent.id,
        details: { amountFils: intent.amountFils, checkoutCurrency: "USD", checkoutAmountCents: intent.checkoutAmountCents, demoUsdCentsPerKwd: intent.demoUsdCentsPerKwd },
      }], { session });
      completed = true;
    });
    return completed;
  } finally { await session.endSession(); }
}

export async function confirmTopUp(userId: mongoose.Types.ObjectId, sessionId: string) {
  const intent = await WalletTopUpModel.findOne({ userId, stripeSessionId: sessionId });
  if (!intent) throw new TopUpError(404, "Checkout was not found for your account.");
  if (intent.creditedAt) return { status: "completed" as const };
  const stripe = await getUncachableStripeClient();
  const checkout = await stripe.checkout.sessions.retrieve(sessionId);
  if (checkout.livemode) throw new TopUpError(400, "Only Stripe test checkouts are supported.");
  if (await creditPaidTopUp(checkout)) return { status: "completed" as const };
  return { status: checkout.status === "expired" ? "expired" as const : "pending" as const };
}
