---
name: Mongoose session batches
description: Mongoose's requirement for array-based document creation within MongoDB transactions.
---

When using `Model.create()` with multiple documents in a MongoDB transaction, pass the session with `ordered: true`.

**Why:** Mongoose may attempt parallel inserts otherwise, raising a `MongooseError` and rolling back account initialization. In a public guided demo, that can appear to users as an indefinitely pending first click even though the database is healthy.

**How to apply:** Before relying on a route that seeds more than one record in a transaction, exercise that creation path against the actual MongoDB version and verify that it commits. Preserve the surrounding transaction.
