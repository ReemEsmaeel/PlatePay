import Stripe from "stripe";
import type { StripeSync } from "stripe-replit-sync";
import { logger } from "./logger";

async function getStripeCredentials() {
  if (isVercelRuntime()) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret?.startsWith("sk_test_")) throw new Error("A Stripe test secret key is required on Vercel.");
    return secret;
  }
  const host = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL ? `depl ${process.env.WEB_REPL_RENEWAL}` : null;
  if (!host || !token) throw new Error("Stripe connection is unavailable.");
  const response = await fetch(`https://${host}/api/v2/connection?include_secrets=true&connector_names=stripe`, {
    headers: { X_REPLIT_TOKEN: token, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Stripe connection could not be loaded.");
  const data = await response.json() as { items?: { settings?: { secret_key?: string; secret?: string } }[] };
  const settings = data.items?.[0]?.settings;
  // Connector versions use different field names. Never log these settings.
  const secret = settings?.secret_key ?? settings?.secret;
  if (typeof secret !== "string" || !secret.startsWith("sk_test_")) {
    throw new Error("PlatePay requires a Stripe test-mode connection.");
  }
  return secret;
}

export async function getUncachableStripeClient() {
  return new Stripe(await getStripeCredentials(), { timeout: 15_000, maxNetworkRetries: 2 });
}

export const isVercelRuntime = () => process.env.VERCEL === "1";

export function paymentOrigin() {
  const domain = isVercelRuntime() ? process.env.VERCEL_URL
    : process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN;
  const origin = new URL(process.env.APP_ORIGIN || (domain ? `https://${domain}` : ""));
  if (origin.protocol !== "https:") throw new Error("Checkout requires a configured HTTPS origin.");
  return origin.origin;
}

export async function withStripeSync<T>(action: (sync: StripeSync) => Promise<T>) {
  if (isVercelRuntime()) throw new Error("Replit synchronization is not used on Vercel.");
  if (!process.env.DATABASE_URL) throw new Error("Stripe synchronization database is unavailable.");
  const { StripeSync } = await import("stripe-replit-sync");
  const sync = new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL, max: 2 },
    stripeSecretKey: await getStripeCredentials(),
    logger: { info() {}, error() {}, warn() {} },
  });
  try { return await action(sync); }
  finally { await sync.postgresClient.pool.end(); }
}

let ready = false;
let usdSupported = false;
let initializationPromise: Promise<void> | undefined;
let lastFailureAt = 0;
export const isStripeReady = () => ready && usdSupported;
export const stripeUnavailableReason = () => ready && !usdSupported
  ? "The connected Stripe test account does not support USD demo checkout. No funds have been added."
  : "Stripe test checkout is being configured or is temporarily unavailable. No funds have been added.";

export function initializeStripe() {
  if (ready || Date.now() - lastFailureAt < 30_000) return Promise.resolve();
  initializationPromise ??= setupStripe().finally(() => { initializationPromise = undefined; });
  return initializationPromise;
}

async function setupStripe() {
  try {
    if (isVercelRuntime()) {
      if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) throw new Error("Stripe test webhook signing secret is required.");
      paymentOrigin();
    } else {
      // Managed production schema changes are applied by Publish, not startup DDL.
      if (process.env.NODE_ENV !== "production") {
        if (!process.env.DATABASE_URL) throw new Error("Missing Stripe synchronization database.");
        const { runMigrations } = await import("stripe-replit-sync");
        await runMigrations({ databaseUrl: process.env.DATABASE_URL });
      }
      await withStripeSync(async sync => {
        await sync.findOrCreateManagedWebhook(`${paymentOrigin()}/api/stripe/webhook`);
        await sync.syncBackfill({ object: "all" });
      });
    }
    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.retrieve(null);
    if (!account.country) throw new Error("Stripe account country is unavailable.");
    const specification = await stripe.countrySpecs.retrieve(account.country);
    usdSupported = specification.supported_payment_currencies.includes("usd");
    ready = true;
    logger.info({ usdSupported }, "Stripe test synchronization ready; USD demo checkout with a KWD wallet");
  } catch (error) {
    ready = false;
    lastFailureAt = Date.now();
    logger.error({ errorType: error instanceof Error ? error.name : "UnknownError" }, "Stripe test setup unavailable; wallet checkout is disabled");
    if (!isVercelRuntime()) {
      const retry = setTimeout(() => { void initializeStripe(); }, 30_000);
      retry.unref();
    }
  }
}
