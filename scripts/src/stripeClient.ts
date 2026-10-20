import Stripe from "stripe";

// Operator scripts use the same rotating, test-only connector as the API.
export async function getUncachableStripeClient() {
  const host = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL ? `depl ${process.env.WEB_REPL_RENEWAL}` : null;
  if (!host || !token) throw new Error("Stripe connection is unavailable.");
  const response = await fetch(`https://${host}/api/v2/connection?include_secrets=true&connector_names=stripe`, {
    headers: { X_REPLIT_TOKEN: token }, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Stripe connection is unavailable.");
  const data = await response.json() as { items?: { settings?: { secret_key?: string; secret?: string } }[] };
  const settings = data.items?.[0]?.settings;
  const key = settings?.secret_key ?? settings?.secret;
  if (typeof key !== "string" || !key.startsWith("sk_test_")) throw new Error("Only Stripe test mode is supported.");
  return new Stripe(key, { timeout: 15_000, maxNetworkRetries: 2 });
}
