import type Stripe from "stripe";
import { demoUsdCents } from "./demoFunding";

export function isMatchingPaidTopUp(
  checkout: Pick<Stripe.Checkout.Session, "id" | "livemode" | "mode" | "status" | "payment_status" | "currency" | "amount_total" | "metadata">,
  intent: { id: string; userId: string; amountFils: number; stripeSessionId: string | null; checkoutAmountCents?: number | null; demoUsdCentsPerKwd?: number | null },
) {
  if (!intent.checkoutAmountCents || !intent.demoUsdCentsPerKwd) return false;
  try {
    if (demoUsdCents(intent.amountFils, intent.demoUsdCentsPerKwd) !== intent.checkoutAmountCents) return false;
  } catch { return false; }
  return checkout.livemode === false
    && checkout.mode === "payment"
    && checkout.status === "complete"
    && checkout.payment_status === "paid"
    && checkout.currency === "usd"
    && Number.isSafeInteger(checkout.amount_total)
    && checkout.amount_total === intent.checkoutAmountCents
    && checkout.metadata?.app === "platepay"
    && checkout.metadata?.purpose === "wallet_top_up"
    && checkout.metadata?.topUpId === intent.id
    && checkout.metadata?.driverId === intent.userId
    && checkout.metadata?.walletAmountFils === String(intent.amountFils)
    && checkout.metadata?.demoUsdCentsPerKwd === String(intent.demoUsdCentsPerKwd)
    && checkout.id === intent.stripeSessionId;
}
