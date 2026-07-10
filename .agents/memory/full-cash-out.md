---
name: Full Cash Out feature
description: Dynamic live Cash-Out engine — event-driven recalc via WS, probability formula, suspension rules, animation.
---

# Full Cash Out feature

## Rule
Cash-Out is fully implemented as a live dynamic engine. The offer recalculates on every live fixture/odds/stats update, not on a fixed poll.

**Why:** The original implementation polled the REST endpoint every 10 seconds. The replacement is event-driven: liveSync workers call `triggerCashOutRecalcForFixtures` after every sync, which broadcasts a privacy-safe `CASH_OUT_UPDATE { seq, ts }` WS signal (no bet IDs or amounts). Frontend `CashOutButton` components listen via a singleton WS in `lib/cashOutUpdates.ts` and immediately refetch their own offer.

## How to apply
- Core calculation: `lib/cashOut.ts` → `computeCashOutOffer` (probability = 1/liveOdds product × settledLegsWinFactor; fair value × house margin)
- Recalc trigger: `lib/cashOutEngine.ts` → `triggerCashOutRecalcForFixtures` (coalesces concurrent calls, guards with `getWsClientCount()`)
- Live state: `routes/cashOut.ts` → `buildBetContext` populates `matchMinute`, `isRedCardMatch`, `isInjuryTime`, `currentScoreHome/Away` from `liveCache.getFixture()`
- Late-match suspension: `checkCashOutEligibility` in `cashOut.ts` — if minute ≥ `suspendWhenLosingAfterMinute` (default 85) AND `getSelectionOutcome` returns `false` → suspend. Returns `null` = do NOT suspend (fail open)
- Config: stored in `settings` table as `cash_out_config` JSON; `suspendWhenLosingAfterMinute` added alongside existing fields
- Frontend singleton: `gowin/src/lib/cashOutUpdates.ts` — ref-counted WS, `window.dispatchEvent(CustomEvent('co_update'))` on each update
- Frontend button: `gowin/src/components/CashOutButton.tsx` — subscribes via `onCashOutUpdate(refetch)`, animates amount with green/red ring flash on change, shows "Cash Out Suspended" with Ban icon when ineligible
- Admin settings: `gowin/src/pages/admin/cash-out.tsx` — includes `suspendWhenLosingAfterMinute` field in Timing Rules section

## Privacy note
`CASH_OUT_UPDATE` payload contains only `{ seq, ts }` — no bet IDs, no amounts. Each client fetches its own offer via the authenticated REST endpoint. This prevents cross-user activity leakage over the public WS channel.

## Known limitations
- `isPenaltyMatch`, `isVarMatch`, `isExtraTime`, `isPenaltyShootout` are hardcoded `false` — AllSports feed doesn't currently provide these signals
- Late-match losing check only fires for markets `getSelectionOutcome` supports (1X2, Double Chance, BTTS, Over/Under); unsupported markets fail open (no suspension)
- `cashOutUpdates.ts` creates a second WS connection on pages that also use `useLiveSocket` (e.g. if Live Betting and History are open simultaneously)
