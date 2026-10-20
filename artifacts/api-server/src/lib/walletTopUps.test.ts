import test from "node:test";
import assert from "node:assert/strict";
import { isMatchingPaidTopUp } from "./topUpValidation";
import { CreateWalletTopUpCheckoutBody, ConfirmWalletTopUpBody } from "@workspace/api-zod";
import { demoUsdCents } from "./demoFunding";

const intent = {
  id: "test-intent", userId: "test-driver", amountFils: 20_000,
  stripeSessionId: "cs_test_example", checkoutAmountCents: 6500, demoUsdCentsPerKwd: 325,
};
const good: Parameters<typeof isMatchingPaidTopUp>[0] = {
  id: intent.stripeSessionId, livemode: false, mode: "payment", status: "complete",
  payment_status: "paid", currency: "usd", amount_total: 6500,
  metadata: {
    app: "platepay", purpose: "wallet_top_up", topUpId: intent.id, driverId: intent.userId,
    walletAmountFils: "20000", demoUsdCentsPerKwd: "325",
  },
};

test("only a matching, paid, completed test checkout can credit a wallet", () => {
  assert.equal(isMatchingPaidTopUp(good, intent), true);
  for (const changes of [
    { livemode: true }, { mode: "subscription" }, { status: "open" },
    { payment_status: "unpaid" }, { payment_status: "no_payment_required" },
    { currency: "kwd" }, { amount_total: 20_000 }, { amount_total: 6501 }, { amount_total: 6499 },
    { id: "cs_test_other" }, { metadata: { ...good.metadata, driverId: "other-driver" } },
    { metadata: { ...good.metadata, topUpId: "other-intent" } },
    { metadata: { ...good.metadata, app: "other-app" } },
    { metadata: { ...good.metadata, purpose: "other-purpose" } },
    { metadata: { ...good.metadata, walletAmountFils: "20001" } },
    { metadata: { ...good.metadata, demoUsdCentsPerKwd: "100" } },
  ]) assert.equal(isMatchingPaidTopUp({ ...good, ...changes } as typeof good, intent), false);
  assert.equal(isMatchingPaidTopUp(good, { ...intent, checkoutAmountCents: undefined }), false);
  assert.equal(isMatchingPaidTopUp(good, { ...intent, demoUsdCentsPerKwd: undefined }), false);
  assert.equal(isMatchingPaidTopUp(good, { ...intent, checkoutAmountCents: 20_000 }), false);
});

test("demo conversion rounds integer fils to USD cents and preserves KWD credit", () => {
  assert.equal(demoUsdCents(1000), 325);
  assert.equal(demoUsdCents(5000), 1625);
  assert.equal(demoUsdCents(10_000), 3250);
  assert.equal(demoUsdCents(20_000), 6500);
  assert.equal(demoUsdCents(1001), 325);
  assert.equal(demoUsdCents(1002), 326);
  assert.equal(demoUsdCents(1_000_000), 325_000);
  for (const invalid of [0, 999, 1000.5, 1_000_001, NaN, Infinity]) {
    assert.throws(() => demoUsdCents(invalid));
  }
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
