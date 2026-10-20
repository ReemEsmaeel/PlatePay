---
name: Stripe runtime compatibility
description: Non-obvious packaging and SDK-version failures when wiring the managed Stripe test integration.
---

Keep libraries that load migration files relative to their own entrypoint external to the API bundle.

**Why:** Bundling the Stripe synchronization package made its migration runner silently skip its SQL directory. The runner returned successfully, but synchronization then failed because its account tables were missing. This was an asset-resolution issue, not missing database credentials.

**How to apply:** Preserve package-relative assets when changing the API bundler, and verify actual schema initialization rather than trusting a resolved migration promise. Keep production schema application in the managed Publish flow; do not compensate with custom production DDL.

Use the installed Stripe SDK's type definitions and changelog when older examples do not compile.

**Why:** The installed SDK changed Checkout's card-method restriction field from older examples. Forcing old examples through type assertions would conceal an API-version mismatch.

**How to apply:** Check the current package before changing request fields. Preserve explicit test-only checks and do not downgrade or weaken payment validation merely to make a template compile.
