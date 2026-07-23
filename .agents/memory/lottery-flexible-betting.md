---
name: Lottery flexible betting
description: Flexible play-type lottery betting (1–6 numbers + Bonus Ball Only) added to the existing lottery module
---

## Rule
The lottery ticket purchase endpoint (`POST /api/lottery/tickets`) now requires `playType`, `bonusMode`, and `stake` — it no longer accepts the old fixed `numbers + bonusNumber + (implicit ticketPrice)` shape.

**Why:** Extended system to support 7 bet markets per game (1–6 main numbers + Bonus Ball Only), each with Include/Exclude bonus mode.

## How to apply
- Frontend `game.tsx` sends `{ gameId, playType, bonusMode?, numbers, bonusNumber?, stake }`.
- `bonusMode` is omitted when `playType === "bonus_only"`.
- `bonusNumber` is required when `bonusMode === "include"` OR `playType === "bonus_only"`.
- Settlement (`lotterySettle.ts`) unchanged — existing `bonusMode` field already drives logic correctly.
- Odds string `"jackpot"` is a special value — payout = draw's jackpot amount (not stake × multiplier).
- `parseOdds("jackpot")` returns 0; `lotterySettle.ts` checks `oddsStr.toLowerCase() === "jackpot"` and uses `draw.jackpot` instead.

## Schema
`lottery_games` already had `minStake`, `maxStake`, `maxPayout`, `enabledPlayTypes` columns.
`lottery_tickets` already had `bonusMode`, `playType`, `odds`, `potentialWin` columns.
No schema migration needed.

## Frontend coercions
`game.tsx` query fn coerces all numeric fields with `Number()` to guard against DB numeric-string types coming through before `fmtGame` parse.

## `DEFAULT_PAYOUT_CONFIG` now includes `"6"` key
Both `excludedBonus["6"]` and `includedBonus["6"]` default to `"jackpot"`.
