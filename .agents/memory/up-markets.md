---
name: 1UP/2UP Markets
description: Architecture and settlement rules for the football 1UP/2UP market feature
---

## Architecture

- Config stored in `settings` table as `"up_markets_config"` JSON key (`UpMarketsConfig` shape)
- All logic lives in `artifacts/api-server/src/lib/upMarkets.ts`
- 1UP/2UP selections are stored as regular rows in the 1X2 market (selection names: "Home 1UP", "Home 2UP", "Away 1UP", "Away 2UP") — no separate market type
- `bet_selections.up_won` (BOOLEAN NOT NULL DEFAULT FALSE) tracks live settlement status

## Odds injection

- `injectUpMarkets(fixtureId, config)` — upserts 1UP/2UP rows into the 1X2 market using `selection` name as upsert key (preserves row IDs)
- Called from `oddsRefresh.ts` (after football fixture refresh) and `liveSync.ts` (after `fetchAndUpdateLiveOdds` succeeds for football)
- Formula: `1UP_odds = base_home_odds × percentage1UP / 100`

## Settlement rules

- Conditions: Home 1UP = diff ≥ 1, Home 2UP = diff ≥ 2, Away 1UP = diff ≤ −1, Away 2UP = diff ≤ −2
- `settleUpMarketBets(fixtureId, scoreHome, scoreAway)` called from liveSync goal detection (async, non-blocking)
- Marks qualifying `bet_selections.up_won = TRUE`
- Immediately settles + credits only bets where **all** selections are 1UP/2UP type and all are now won
- Accumulators with mixed selections: `up_won` flag is set at goal time; `autoSettle` reads it at match end
- In `autoSettle.ts`: check `UP_SELECTIONS.has(sel.selection)` BEFORE `getSelectionOutcome`; `upWon=true` → won; fixture finished + `upWon=false` → lost

## Frontend

- `sortOdds.ts` 1X2 order: `["Home", "Home 1UP", "Home 2UP", "Draw", "Away", "Away 1UP", "Away 2UP"]`
- Admin page: `/admin/up-markets` (route + nav item with `TrendingUp` icon)

**Why:**
Once a 1UP/2UP condition is met during a match, the outcome is locked regardless of final score — so the live worker must mark `up_won` before the fixture finishes, and autoSettle must honour that flag rather than re-evaluating from the final score.
