# PlatePay

PlatePay is a bilingual vehicle-payment demo for drivers, merchants, and administrators, with explicit driver approval and test-mode payments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Express API server
- `pnpm --filter @workspace/platepay run dev` — run the React + Vite web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secret: `MONGODB_URI` — MongoDB Atlas URI for PlatePay application data
- Optional SOCKS5 egress proxy: `MONGODB_SOCKS5_HOST` and `MONGODB_SOCKS5_PORT`; proxy username/password belong in Replit Secrets. Atlas must allowlist the proxy's fixed egress IP.
- Clerk secrets are provisioned by Replit-managed Clerk.
- Stripe setup is paused by the user. Keep PlatePay MongoDB-only; do not add a PostgreSQL Stripe synchronization store. Test wallet top-ups remain unavailable.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite in `artifacts/platepay`
- API: shared Express 5 server in `artifacts/api-server`
- PlatePay data: MongoDB Atlas + Mongoose
- Authentication: Replit-managed Clerk; application roles are enforced by the API
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
- Clerk owns sign-in and sessions; the MongoDB profile stores the PlatePay role. Admin privileges must never be self-selected at signup.
- Replit-managed Clerk is specific to Replit-hosted applications. Preparing external Vercel authentication requires a user-managed authentication setup and explicit approval before migrating or remapping existing user identities.
- Initial admin access is designated through `PLATEPAY_ADMIN_EMAIL`, granted only to its verified primary-email owner, and recorded once so restarts cannot restore revoked privileges.
- Store KWD amounts as integer fils (1 KWD = 1,000 fils) to avoid floating-point rounding.
- Plate recognition identifies a vehicle only. A driver must explicitly approve each merchant request before any wallet debit.
- Plate OCR uses the user-selected Tesseract.js in the browser on a cropped image or still camera capture; do not persist the source photo.
- Keep the authentication proxy available during database outages, but return explicit HTTP 503 responses for database-backed operations. This preserves sign-in without inventing application data.
- Keep API process liveness (`/api/livez`) independent of MongoDB so a deployment can start while the database reconnects; `/api/healthz` remains a database-readiness check and returns 503 until MongoDB and required indexes are ready.
- Normalize equivalent Arabic/Latin numerals and separators, not guessed cross-script letter transliterations; uncertain OCR must be corrected to the registered plate to avoid matching a different vehicle.

## Product

The expanded MVP includes driver, merchant, and admin areas; vehicle registration and plate recognition; service locations and geofence checks; driver-approved payment requests; a wallet with Stripe test-mode top-ups and spending limits; transaction histories, receipts, and admin audit views.

## User preferences

- Keep the build within the approved expanded requirements brief; do not build the future autonomous-mobility vision.
- Explain changes in small, runnable increments. The user communicates in English.
- Read this root `replit.md` before each implementation step.

## Gotchas

- Never expose secret values in source code, logs, or chat. Use Replit Secrets; commit `.env.example` only.
- Validate ownership, role, available funds, daily/per-transaction limits, geofence, and pending status on the server before approving a payment.
- Payment approval must be idempotent; retries must not debit a wallet twice.
- Database-backed routes become ready only after required unique indexes are verified, including in production; connection success alone is not sufficient for safe wallet operations.
- Keep all Stripe activity in test mode until the user explicitly requests a production change.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
