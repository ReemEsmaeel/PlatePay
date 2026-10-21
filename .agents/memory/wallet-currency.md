---
name: Wallet top-up mode
description: User preference for simulated wallet funding and illustrative USD-to-KWD amounts.
---

Wallet top-ups should simulate a demo payment and credit the KWD wallet through the server. No card is charged and no USD is paid.

**Why:** The user asked to make wallet top-ups a demo payment that adds wallet credit, after Stripe checkout was unavailable.

**How to apply:** Any USD amount shown is an illustrative comparison at the fixed demo rate of 1 KWD = USD 3.25, not a payment or live FX quote. Credit only integer KWD fils after the idempotent server-side demo simulation commits.
