---
name: Atlas development access
description: Secure MongoDB Atlas development access without prematurely requiring a static-egress proxy.
---

For development, allowlisting the API server's current public IPv4 as a single temporary `/32` is an option even when egress is dynamic. Do not insist on a paid proxy solely because the IP might change. The user wants to avoid a proxy when unnecessary.

**Why:** Earlier guidance incorrectly treated fixed egress as a prerequisite for development. The Atlas entry shown by the user allowed their browser's network, not the hosted API server. Direct diagnostics resolved the cluster but encountered TLS rejection before authentication, consistent with network access restrictions.

**How to apply:** Recheck the server's current outbound IPv4 using independent direct requests before asking the owner to add a temporary, narrow entry in Atlas. Do not store that changing IP here. Do not use Atlas's browser-based “Add Current IP” for a remotely hosted API, open access globally, weaken TLS, or conclude that credentials work before authentication is reached. Retest MongoDB after the entry becomes Active. Stable egress remains a separate decision for long-term hosted access.
