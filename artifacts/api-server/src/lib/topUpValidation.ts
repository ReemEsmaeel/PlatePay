import type Stripe from "stripe";

export function isMatchingPaidTopUp(
  checkout: Pick<Stripe.Checkout.Session, "id" | "livemode" | "mode" | "status" | "payment_status" | "currency" | "amount_total" | "metadata">,
  intent: { id: string; userId: string; amountFils: number; stripeSessionId: string | null },
) {
  return checkout.livemode === false
    && checkout.mode === "payment"
    && checkout.status === "complete"
    && checkout.payment_status === "paid"
    && checkout.currency === "kwd"
    && Number.isSafeInteger(checkout.amount_total)
    && checkout.amount_total === intent.amountFils
    && checkout.metadata?.app === "platepay"
    && checkout.metadata?.purpose === "wallet_top_up"
    && checkout.metadata?.topUpId === intent.id
    && checkout.metadata?.driverId === intent.userId
    && checkout.id === intent.stripeSessionId;
}
