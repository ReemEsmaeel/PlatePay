import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import Stripe from "stripe";

// Isolated process-only fixtures, never actual account credentials or workspace settings.
process.env.VERCEL = "1";
process.env.NODE_ENV = "production";
process.env.SESSION_SECRET = "vercel-deployment-test-fixture-".repeat(3);
process.env.STRIPE_SECRET_KEY = "sk_test_vercel_fixture_not_a_real_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_vercel_fixture_not_a_real_secret";
delete process.env.MONGODB_URI;
delete process.env.DATABASE_URL;
delete process.env.REPL_IDENTITY;
delete process.env.WEB_REPL_RENEWAL;

const output = new URL("../../.vercel/output/", import.meta.url);
const { default: handler } = await import(new URL("functions/api.func/index.mjs", output));
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const server = createServer((req, res) => {
  void handler(req, res).catch(() => { res.statusCode = 500; res.end(); });
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

test.after(() => new Promise(resolve => {
  server.closeAllConnections();
  server.close(resolve);
}));

test("build contains static SPA, immutable assets and a raw Node API function", async () => {
  const config = JSON.parse(await readFile(new URL("config.json", output), "utf8"));
  const fn = JSON.parse(await readFile(new URL("functions/api.func/.vc-config.json", output), "utf8"));
  assert.equal(config.version, 3);
  assert.equal(config.routes[0].dest, "/api");
  assert.equal(new RegExp(`^${config.routes[0].src}$`).test("/api/stripe/webhook"), true);
  assert.equal(config.routes.at(-1).dest, "/index.html");
  assert.equal(fn.runtime, "nodejs24.x");
  assert.equal(fn.shouldAddHelpers, false, "Stripe signatures require the original raw request bytes");
  assert.match(await readFile(new URL("static/index.html", output), "utf8"), /id="root"/);
  assert.ok((await readdir(new URL("static/assets/", output))).some(name => name.endsWith(".js")));
  const walkthrough = await readFile(new URL("static/walkthrough/index.html", output), "utf8");
  assert.match(walkthrough, /\/walkthrough\/assets\//);
  assert.doesNotMatch(walkthrough, /\/platepay-guide-video\//);
  assert.ok((await readdir(new URL("static/walkthrough/assets/", output))).some(name => name.endsWith(".js")));
  assert.ok((await readdir(new URL("static/walkthrough/images/", output))).some(name => /\.(png|jpe?g|webp)$/i.test(name)));
  assert.ok((await readdir(new URL("static/walkthrough/audio/", output))).some(name => /\.mp3$/i.test(name)));
});

test("serverless liveness works without MongoDB; account routes fail explicitly without it", async () => {
  const alive = await fetch(`${origin}/api/livez`);
  assert.equal(alive.status, 200);
  const account = await fetch(`${origin}/api/auth/me`);
  assert.equal(account.status, 503);
  assert.match((await account.json()).error, /database is unavailable/);
  assert.equal(account.headers.get("cache-control"), "no-store");
});

test("missing session secret does not crash the Vercel function and blocks stateful routes explicitly", async () => {
  const originalSecret = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  try {
    const alive = await fetch(`${origin}/api/livez`);
    assert.equal(alive.status, 200);
    const account = await fetch(`${origin}/api/auth/me`);
    assert.equal(account.status, 503);
    assert.match((await account.json()).error, /SESSION_SECRET/);
  } finally {
    process.env.SESSION_SECRET = originalSecret;
  }
});

test("portable Stripe webhook verifies raw bytes without Replit identity or PostgreSQL", async () => {
  const payload = JSON.stringify({
    id: "evt_deployment_fixture", object: "event", type: "product.created",
    livemode: false, data: { object: { id: "prod_fixture", object: "product" } },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload, secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  const post = (body, signed = signature) => fetch(`${origin}/api/stripe/webhook`, {
    method: "POST", headers: { "content-type": "application/json", "stripe-signature": signed },
    body,
  });
  assert.equal((await post(payload)).status, 200);
  assert.equal((await post(`${payload} `)).status, 400);
  assert.equal((await post(payload, "invalid")).status, 400);
  const unsigned = await fetch(`${origin}/api/stripe/webhook`, {
    method: "POST", headers: { "content-type": "application/json" }, body: payload,
  });
  assert.equal(unsigned.status, 400);
  const livePayload = payload.replace('"livemode":false', '"livemode":true');
  assert.equal((await post(livePayload, stripe.webhooks.generateTestHeaderString({
    payload: livePayload, secret: process.env.STRIPE_WEBHOOK_SECRET,
  }))).status, 503);
  process.env.STRIPE_SECRET_KEY = "sk_live_fixture_not_a_real_key";
  assert.equal((await post(payload)).status, 503, "live keys must never enable demo payments");
});
