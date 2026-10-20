import Stripe from "stripe";
import { StripeSync, runMigrations } from "stripe-replit-sync";
import { logger } from "./logger";

async function getStripeCredentials() {
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

export function paymentOrigin() {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN;
  const origin = new URL(process.env.APP_ORIGIN || (domain ? `https://${domain}` : ""));
  if (origin.protocol !== "https:") throw new Error("Checkout requires a configured HTTPS origin.");
  return origin.origin;
}

export async function withStripeSync<T>(action: (sync: StripeSync) => Promise<T>) {
  if (!process.env.DATABASE_URL) throw new Error("Stripe synchronization database is unavailable.");
  const sync = new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL, max: 2 },
    stripeSecretKey: await getStripeCredentials(),
    logger: { info() {}, error() {}, warn() {} },
  });
  try { return await action(sync); }
  finally { await sync.postgresClient.pool.end(); }
}

let ready = false;
let kwdSupported = false;
export const isStripeReady = () => ready && kwdSupported;
export const stripeUnavailableReason = () => ready && !kwdSupported
  ? "The connected Stripe test account does not support KWD payments. Wallet top-ups are disabled until a compatible checkout currency or account is approved. No funds have been added."
  : "Stripe test checkout is being configured or is temporarily unavailable. No funds have been added.";

export async function initializeStripe() {
  try {
    // Managed production schema changes are applied by Publish, not startup DDL.
    if (process.env.NODE_ENV !== "production") {
      if (!process.env.DATABASE_URL) throw new Error("Missing Stripe synchronization database.");
      await runMigrations({ databaseUrl: process.env.DATABASE_URL });
    }
    await withStripeSync(async sync => {
      await sync.findOrCreateManagedWebhook(`${paymentOrigin()}/api/stripe/webhook`);
      await sync.syncBackfill({ object: "all" });
    });
    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.retrieve(null);
    if (!account.country) throw new Error("Stripe account country is unavailable.");
    const specification = await stripe.countrySpecs.retrieve(account.country);
    kwdSupported = specification.supported_payment_currencies.includes("kwd");
    ready = true;
    logger.info({ kwdSupported }, "Stripe test synchronization ready; checkout requires KWD currency support");
  } catch (error) {
    ready = false;
    logger.error({ errorType: error instanceof Error ? error.name : "UnknownError" }, "Stripe test setup unavailable; wallet checkout is disabled");
    const retry = setTimeout(() => { void initializeStripe(); }, 30_000);
    retry.unref();
  }
}
