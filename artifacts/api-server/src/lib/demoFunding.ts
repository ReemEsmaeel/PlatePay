// Approved demo conversion, not a live FX quote. All Stripe activity stays test-only.
export const DEMO_USD_CENTS_PER_KWD = 325;

export function demoUsdCents(amountFils: number, centsPerKwd = DEMO_USD_CENTS_PER_KWD) {
  if (!Number.isSafeInteger(amountFils) || amountFils < 1000 || amountFils > 1_000_000
    || !Number.isSafeInteger(centsPerKwd) || centsPerKwd <= 0 || centsPerKwd > 1_000_000) {
    throw new Error("Invalid demo funding quote.");
  }
  // Round to the nearest USD cent using integer arithmetic.
  return Math.floor((amountFils * centsPerKwd + 500) / 1000);
}
