import test from "node:test";
import assert from "node:assert/strict";
import { isMatchingPaidTopUp } from "./topUpValidation";
import { CreateWalletTopUpCheckoutBody, ConfirmWalletTopUpBody } from "@workspace/api-zod";

const intent = { id: "test-intent", userId: "test-driver", amountFils: 20_000, stripeSessionId: "cs_test_example" };
const good: Parameters<typeof isMatchingPaidTopUp>[0] = {
  id: intent.stripeSessionId, livemode: false, mode: "payment", status: "complete",
  payment_status: "paid", currency: "kwd", amount_total: 20_000,
  metadata: { app: "platepay", purpose: "wallet_top_up", topUpId: intent.id, driverId: intent.userId },
};

test("only a matching, paid, completed test checkout can credit a wallet", () => {
  assert.equal(isMatchingPaidTopUp(good, intent), true);
  for (const changes of [
    { livemode: true }, { mode: "subscription" }, { status: "open" },
    { payment_status: "unpaid" }, { payment_status: "no_payment_required" },
    { currency: "usd" }, { amount_total: 20 }, { amount_total: 20_001 },
    { id: "cs_test_other" }, { metadata: { ...good.metadata, driverId: "other-driver" } },
    { metadata: { ...good.metadata, topUpId: "other-intent" } },
    { metadata: { ...good.metadata, app: "other-app" } },
    { metadata: { ...good.metadata, purpose: "other-purpose" } },
  ]) assert.equal(isMatchingPaidTopUp({ ...good, ...changes } as typeof good, intent), false);
});

test("checkout inputs require bounded integer fils and an idempotency UUID", () => {
  const idempotencyKey = "d1db4dc9-7dbb-4c12-a037-8207fc280105";
  for (const amountFils of [1000, 20_000, 1_000_000]) {
    assert.equal(CreateWalletTopUpCheckoutBody.safeParse({ amountFils, idempotencyKey }).success, true);
  }
  for (const amountFils of [0, 999, 1000.5, 1_000_001, "20000"]) {
    assert.equal(CreateWalletTopUpCheckoutBody.safeParse({ amountFils, idempotencyKey }).success, false);
  }
  assert.equal(CreateWalletTopUpCheckoutBody.safeParse({ amountFils: 20_000 }).success, false);
  assert.equal(ConfirmWalletTopUpBody.safeParse({ sessionId: "cs_test_example" }).success, true);
  assert.equal(ConfirmWalletTopUpBody.safeParse({ sessionId: "cs_live_example" }).success, false);
});
