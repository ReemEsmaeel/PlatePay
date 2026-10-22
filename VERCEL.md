# Deploy PlatePay on Vercel

This deploys the React/Vite frontend and Express API **in one Vercel project**.
Application records and sessions stay in MongoDB Atlas. Payments remain **Stripe
test mode only**, with USD checkout and KWD demo balances at the disclosed fixed
demo rate of 1 KWD = USD 3.25.

## 1. Import the repository

Push the project to your Git repository, then import it into Vercel.

- **Root Directory:** repository root, not `artifacts/platepay`
- **Framework Preset:** Other
- **Node.js:** 24.x
- **Install Command:** `pnpm install --frozen-lockfile`
- **Build Command:** `pnpm run build:vercel`
- **Output Directory:** leave unset; the build emits Vercel's Build Output API
- Do not use the ordinary workspace `build` command for this deployment.

The checked-in `vercel.json` supplies the install/build settings. The build checks
shared types, API and frontend, then produces `.vercel/output`: static frontend
assets and one Node.js function for every `/api/*` route. Direct links such as
`/driver/wallet` load the SPA; API requests are never rewritten to HTML.

The same build also publishes the animated PlatePay walkthrough as a public,
unauthenticated static page at `/walkthrough/`. After redeploying this build, share
`https://platepaykw.vercel.app/walkthrough/` (or use your currently assigned
production domain with the same path).

## 2. Configure Vercel environment variables

Set these in **Vercel → Project Settings → Environment Variables**. Never commit
values, place secrets in `VITE_*` variables, or paste credentials into chat.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Your MongoDB Atlas application database URI |
| `SESSION_SECRET` | Yes | At least 32 random characters; keep stable between redeploys |
| `APP_ORIGIN` | Recommended | Exact HTTPS origin, such as your assigned Vercel URL or custom domain, without a path |
| `STRIPE_SECRET_KEY` | For top-ups | Your own Stripe account's **test** secret key (`sk_test_…`); live keys are rejected |
| `STRIPE_WEBHOOK_SECRET` | For top-ups | Signing secret for the test webhook below (`whsec_…`) |
| `PLATEPAY_ADMIN_EMAIL` | Operator CLI only | Owner-designated account; never automatically grants admin at signup |

Use your actual assigned Vercel URL; no domain is preconfigured in the source.
When `APP_ORIGIN` is omitted, checkout uses Vercel's `VERCEL_URL`. Browser mutations
must remain same-origin. For Preview deployments, configure a matching preview
origin or leave `APP_ORIGIN` unset **in that environment**; don't inherit an
unrelated production origin.

Keep Preview and Production environment configuration deliberate: preferably use
a separate Atlas database for preview tests. Do not change the existing database
name or copy/delete application data accidentally. An existing app's
`SESSION_SECRET` must be retained if existing sessions should keep working.

Vercel supplies `VERCEL`/`VERCEL_URL` and manages the HTTP server. You do not need
`PORT`, Replit identity variables, `DATABASE_URL`, Clerk keys, or a new
PostgreSQL service for this Vercel deployment.

## 3. Allow Vercel to reach Atlas

In Atlas, verify the database user has access to the chosen database and configure
**Network Access** for your hosting environment. An allowlisted Replit development
IP does not grant Vercel access. Standard serverless outbound addresses can change;
don't assume a one-time IP test creates a permanent production rule.

The user previously enabled `0.0.0.0/0` in Atlas. If you keep that rule for this
demo, understand it allows connection attempts from anywhere: use a unique,
strong database password, least-privilege database user and TLS, and never expose
the URI. It is not a restricted production-network setup. Fixed egress/private
networking is a separate decision, not silently added or purchased here.

Each warm API instance reuses MongoDB connections with a small pool. Unique
indexes are verified before account/payment routes become ready. Do not remove
this check to work around legacy data or duplicate-index failures.

## 4. Configure Stripe test checkout

Replit's managed connector identity isn't available on Vercel. Use a Stripe
account you control and obtain its **test** API key securely from Stripe's
dashboard. Do not copy Replit's internal connector credentials. Without the test
key and webhook secret, the website can still run, but top-ups stay disabled.

After you have your Vercel URL:

1. In Stripe's **test environment**, create a webhook endpoint:
   `https://YOUR-ASSIGNED-DOMAIN/api/stripe/webhook`.
2. Subscribe to `checkout.session.completed` and
   `checkout.session.async_payment_succeeded`.
3. Store that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel,
   and the matching account's test key as `STRIPE_SECRET_KEY`.
4. Set `APP_ORIGIN` to the same browser origin and redeploy after env changes.
5. Make sure Stripe can reach the webhook. If Vercel deployment protection gates
   the URL, it must be addressed before webhook delivery can work. Use a publicly
   reachable production URL for the demo webhook, not an inaccessible preview.

The Vercel adapter calls Stripe directly and verifies signatures against the raw
request bytes. It stores only PlatePay's application funding intents and wallet
records in MongoDB, not a second Stripe catalog. Products/prices remain in Stripe.
Replit's existing managed Stripe synchronization is preserved for Replit runs.

Use the synthetic Stripe test card `4242 4242 4242 4242`, a future expiry and a
test CVC. **Do not use real cards.** Selecting KWD 20.000 should show a USD 65.00
test payment, then credit exactly KWD 20.000 once payment is verified.

## 5. Verify after deployment

- `/` loads, and refreshing `/driver/wallet` doesn't produce a 404.
- `/walkthrough/` loads the PlatePay video and its local image/audio assets.
- `/api/livez` returns 200; `/api/healthz` returns 200 once MongoDB/indexes are ready.
- Registration/sign-in work with secure cookies on the Vercel domain.
- A verified merchant's request reaches its registered driver; use separate
  browsers/private windows for merchant and driver test sessions.
- A Stripe test top-up returns to the same Vercel app and credits the KWD wallet
  once. Reload/repeated confirmation must not double-credit.
- Stripe's webhook delivery log shows successful signed deliveries.

No Vercel deployment has been performed automatically. Local preparation checks:

```sh
pnpm run build:vercel
pnpm run test:vercel
pnpm --filter @workspace/api-server run test:auth
pnpm --filter @workspace/api-server run test:wallet
```
