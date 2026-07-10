---
name: Race-safe pattern for accept-a-live-offer financial endpoints
description: Pattern used for GoWin Cash Out accept; applies to any endpoint that settles a live-computed monetary offer (odds, prices, quotes) and mutates a wallet balance.
---

For any endpoint that lets a user accept a server-computed live offer and then credits/debits a wallet (e.g. Cash Out, live-price order fills), three race classes must all be closed together — fixing only one still leaves a real exploit/bug:

1. **Stale-quote race**: compute the offer once, then re-verify it after acquiring the row lock, not before. Recompute inside the transaction from a fresh row read (`SELECT ... FOR UPDATE`), then diff against the client's expected amount — never trust an offer computed before the lock was taken.
2. **Lost-update race on the wallet balance**: never do read-balance → compute-new-balance-in-app → write-balance. Use an atomic SQL increment (`UPDATE wallets SET balance = balance + :amount ... RETURNING *`) inside the same transaction as the row lock.
3. **Aggregate-cap race** (daily liability / per-customer caps / exposure limits): reading a SUM() for a cap check and then inserting is itself a TOCTOU race across concurrent transactions — two transactions can both read the pre-insert sum and both pass. Serialize with `SELECT pg_advisory_xact_lock(hashtext('<cap-name>'))` before reading the aggregate, inside the same transaction.

**Why:** an external architect review caught all three independently on a first and second pass — each looked plausible in isolation ("we lock the bet row, so it's safe") but concurrent-load testing (firing two simultaneous accept requests) is required to actually prove no double-credit/overshoot.

**How to apply:** when building/reviewing this pattern, manually fire two concurrent accept requests at the same resource via curl and check the audit/ledger table has exactly one accepted row, plus check wallet balance math by hand — don't rely on sequential curl tests alone, they never exercise the race.
