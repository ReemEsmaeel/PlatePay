# PlatePay

PlatePay is a bilingual vehicle-payment demo for drivers, merchants, and administrators, with explicit driver approval and test-mode payments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Express API server
- `pnpm --filter @workspace/platepay run dev` — run the React + Vite web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm run build:vercel` — build static frontend and a single serverless API using Vercel Build Output API
- `pnpm run test:vercel` — after building, check the deployment bundle, raw Stripe signatures and fail-closed serverless behavior
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/api-server run test:auth` — authentication security regression checks
- `pnpm --filter @workspace/api-server run test:wallet` — Stripe test-mode funding validation and amount/ownership matching checks
- `pnpm --filter @workspace/platepay run test:loading` — page-scoped fetching, retry, and font-loading regression checks
- `pnpm --filter @workspace/platepay run test:plates` — Kuwait plate grouping, confidence gating, and crop geometry checks
- `pnpm --filter @workspace/api-server run admin:grant` — after building, register the owner-designated account and complete a profile, then run this operator-only command; it prompts for the account password without echoing it
- Required secret: `MONGODB_URI` — MongoDB Atlas URI for PlatePay application data
- Optional SOCKS5 egress proxy: `MONGODB_SOCKS5_HOST` and `MONGODB_SOCKS5_PORT`; proxy username/password belong in Replit Secrets. Atlas must allowlist the proxy's fixed egress IP.
- Required secret: `SESSION_SECRET` — at least 32 random characters; used for hashing opaque session tokens and authentication rate-limit keys
- The user has resumed Stripe test-checkout setup and connected Stripe. Keep PlatePay application data in MongoDB; the managed Stripe integration uses a separate PostgreSQL synchronization store, not a migration of application records. Checkout stays disabled until synchronization initializes successfully.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite in `artifacts/platepay`
- API: shared Express 5 server in `artifacts/api-server`
- PlatePay data: MongoDB Atlas + Mongoose
- Authentication: built-in email/password registration and sign-in, scrypt password hashes, MongoDB-backed opaque sessions, HttpOnly same-site cookies, and API-enforced roles. No external authentication service.
- API contract and validation: OpenAPI, Orval, and generated Zod schemas
- Build: Vite for the frontend; esbuild for the API
- Intended final deployment target: both the React frontend and Express API together on Vercel, keeping MongoDB Atlas. Do not introduce a separate backend hosting provider without approval.

## Where things live

- `artifacts/platepay/src/` — PlatePay React pages, components, and browser-side plate reader
- `artifacts/api-server/src/` — Express routes, Mongo connection, Mongoose models, and business logic
- `lib/api-spec/openapi.yaml` — source of truth for application API contracts
- `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` — generated API hooks and schemas; regenerate from OpenAPI
- `.local/platepay-design-reference/` — user-provided design reference files

## Architecture decisions

- MongoDB is the source of truth for PlatePay accounts, vehicles, merchant profiles, payment requests, wallets, and audit records; the workspace's PostgreSQL scaffold is not used for PlatePay business data.
- Preserve TLS and a restricted Atlas allowlist for production. The user prefers free alternatives to a paid proxy; a proxy subscription has not been approved. Development may connect directly through a verified, temporary single-IP `/32` entry. Do not open the database to all IPs as a permanent workaround.
- Local authentication accounts own credentials and sessions; separate MongoDB profiles own the PlatePay role. Admin privileges must never be self-selected at signup. Email verification and emailed password recovery are not provided by an external service.
- Preserve existing PlatePay records and account ownership during transitions; never link an existing account solely by matching an unverified signup email.
- Initial admin access is designated through `PLATEPAY_ADMIN_EMAIL` and granted only by the operator CLI after proving the account password. It is never granted automatically on signup or startup, and a completed grant cannot restore subsequently revoked privileges.
- Store KWD amounts as integer fils (1 KWD = 1,000 fils) to avoid floating-point rounding.
- Plate recognition identifies a vehicle only. A driver must explicitly approve each merchant request before any wallet debit.
- Plate OCR uses the user-selected Tesseract.js in the browser on a cropped image or still camera capture; do not persist the source photo.
- Public pages stay available during database outages; local authentication, account, and payment operations return explicit HTTP 503 responses rather than inventing application data.
- Keep API process liveness (`/api/livez`) independent of MongoDB so a deployment can start while the database reconnects; `/api/healthz` remains a database-readiness check and returns 503 until MongoDB and required indexes are ready.
- Normalize equivalent Arabic/Latin numerals and separators, not guessed cross-script letter transliterations; uncertain OCR must be corrected to the registered plate to avoid matching a different vehicle.

## Product

The expanded MVP includes driver, merchant, and admin areas; vehicle registration and plate recognition; service locations and geofence checks; driver-approved payment requests; a wallet with Stripe test-mode top-ups and spending limits; transaction histories, receipts, and admin audit views.

## User preferences

- Do not introduce extra external services. Use built-in user registration and sign-in instead of a third-party authentication service.
- Keep the build within the approved expanded requirements brief; do not build the future autonomous-mobility vision.
- Explain changes in small, runnable increments. The user communicates in English.
- Read this root `replit.md` before each implementation step.

## Gotchas

- Never expose secret values in source code, logs, or chat. Use Replit Secrets; commit `.env.example` only.
- Validate ownership, role, available funds, daily/per-transaction limits, geofence, and pending status on the server before approving a payment.
- Payment approval must be idempotent; retries must not debit a wallet twice.
- Stripe wallet funding is test-only. Never credit a checkout redirect or browser-provided amount: verify a paid, completed test session against its owned MongoDB funding intent, then atomically credit its wallet, ledger, transaction, and audit entry once.
- The user approved USD test checkout with KWD demo wallet balances. Use the disclosed fixed demo rate of 1 KWD = USD 3.25, not a live FX quote. Persist the server-owned quote and verify the paid USD cents before crediting the intended KWD fils. Never enable live payments or change the wallet denomination as part of this demo.
- Stripe webhooks require raw request bytes and provider signature verification before fulfillment. They bypass the browser-only CSRF header check, not authentication-by-signature.
- For Replit-managed PostgreSQL, initialize Stripe schema in development; Publish applies the schema to production. Do not add production startup DDL. On Vercel, use direct test-only Stripe credentials and a manually configured signed webhook, without Replit identity or PostgreSQL synchronization. See `VERCEL.md`; never migrate MongoDB application records.
- Database-backed routes become ready only after required unique indexes are verified, including in production; connection success alone is not sufficient for safe wallet operations.
- Keep all Stripe activity in test mode until the user explicitly requests a production change.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
