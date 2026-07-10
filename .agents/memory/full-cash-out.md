---
name: Full Cash Out feature (GoWin)
description: Scope and known gap for the Full Cash Out feature implemented across api-server, lib/db, and gowin frontend.
---

Full Cash Out (not Partial/Auto) is fully implemented: eligibility rules, server-side-only offer calculation, admin settings/reports/audit-log UI, customer accept flow, bet-history status, wallet crediting, and a `CASH_OUT_ACCEPTED` WS broadcast.

**Known gap:** live match-state fields (red card, VAR, injury/extra time, penalty shootout, match-minute) are not persisted anywhere in the fixtures schema. The admin config/UI has toggles for disabling cash-out on these events, but they are **not enforceable** — `matchMinute` is always `null` and the live-state flags are always `false` at eligibility-check time. If fixtures data ever starts tracking these fields, wire them into `buildBetContext` in `artifacts/api-server/src/routes/cashOut.ts`.

**Why this matters:** an admin toggling "disable after red card" currently has no effect — don't assume the config UI implies real enforcement without checking the backing data exists.
