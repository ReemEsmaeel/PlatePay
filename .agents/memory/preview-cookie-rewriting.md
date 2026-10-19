---
name: Preview cookie rewriting
description: Observed difference between Express cookie attributes and the Replit preview proxy.
---
In this workspace, the preview proxy has been observed changing `SameSite=Lax` to `SameSite=None`, while retaining `Secure` and `HttpOnly`.

**Why:** An authentication browser test reported `None` despite the application setting `Lax`. Comparing the same logout response directly from Express and through the preview proxy confirmed that the attributes changed after leaving the application.

**How to apply:** Inspect only cookie attributes, never log token values, when diagnosing this discrepancy. Keep the application's secure cookie policy and independent request-origin/CSRF checks; do not compensate by weakening them. Verify cookie behavior separately on Vercel rather than assuming the preview proxy behavior applies there.
