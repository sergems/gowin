---
name: Full Cash Out feature
description: Cash Out engine architecture, pricing formula, and the live-momentum adjustment layered on top
---

Dynamic live engine: event-driven recalc via liveSync → cashOutEngine → CASH_OUT_UPDATE WS (privacy-safe, no betIds); CashOutButton animates green/red on change; late-match-losing suspension at 85'.

## Pricing formula (`artifacts/api-server/src/lib/cashOut.ts`)
`Offer = PotentialWin * CombinedProbability * (1 - TotalMargin/100)`, where `CombinedProbability` is the product of `1/liveOdds` across remaining legs. Margin stacks house margin + protection add-ons, clamped to min/max.

## Live momentum adjustment
Base `1/liveOdds` probability is pure bookmaker-feed-driven, which can lag real match events (odds poll every 10s; only "significant events" like goals force an out-of-band refresh). To make the offer react to the scoreline itself — not just wait for the odds feed — `computeMomentumMultiplier()` nudges each selection's probability using `getSelectionOutcome()` (from `autoSettle.ts`) plus match minute:
- Currently losing: probability shrinks toward 0 as minute→90, shaped by `momentumDecayPower` (default 1.6, so decay accelerates late) — tapers smoothly into the existing 85'-losing hard suspension instead of a flat value until a cliff.
- Currently winning: probability gets a modest boost that grows toward full time.
- Outcome undeterminable (market type `getSelectionOutcome` can't evaluate) → neutral (1x), fails open.

**Why:** user reported the offer wasn't reacting drastically enough when a match turned against a bet — traced to the offer being entirely bookmaker-odds-driven with no independent scoreline reaction.
**How to apply:** admin-configurable via `matchStateAdjustmentEnabled`, `losingMomentumDecayPercent`, `winningMomentumBoostPercent`, `momentumDecayPower` in `CashOutConfig` (settings key `cash_out_config`), editable at `artifacts/gowin/src/pages/admin/cash-out.tsx` "Live Momentum Adjustment" section. If tuning further, prefer adjusting these knobs over changing the core odds-implied-probability math.
