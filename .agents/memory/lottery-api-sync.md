---
name: Lottery API sync
description: APIVerve integration for auto-settling lottery draws and syncing jackpots/next-draw dates
---

# Lottery API sync

## Rule
APIVerve free tier covers only powerball, megamillions, euromillions. The other 5 games (EuroJackpot, UK Lotto, SA Lotto, Daily Lotto, Irish Lotto) remain on manual admin settlement.

**Why:** APIVerve free plan is limited to those 4 lotto types (lottomax is also supported but not seeded).

**How to apply:** When expanding to more games, upgrade to LotteryResultsFeed (150+ lotteries, £15/month) and update APIVERVE_GAMES map in `artifacts/api-server/src/lib/lotterySync.ts`.

## Key files
- `artifacts/api-server/src/lib/lotterySync.ts` — APIVerve fetch + settle + next-draw scheduling; runs every hour
- `artifacts/api-server/src/lib/lotterySettle.ts` — shared settlement logic (used by sync AND admin route)
- `artifacts/api-server/src/routes/lottery.ts` — admin settle route now delegates to lotterySettle.ts

## Number splitting
APIVerve returns a flat `numbers` array (main + bonus concatenated). Split by `game.mainNumbersCount`: `mainNumbers = data.numbers.slice(0, game.mainNumbersCount)`, `bonusNumbers = data.numbers.slice(game.mainNumbersCount)`.

## Rate limiting
Free tier 429s if all 3 games fire simultaneously. Fixed with `await sleep(3_000)` between each game loop iteration.

## Ticket flexibility
Ticket buying allows 0 main numbers (bonus-only ticket) when a bonusNumber is provided. The validation in lottery.ts was updated from `length < 1` to allow 0 picks when bonus is present.

## Lottery tables
Tables were missing from the imported database.sql dump. Created via direct psql — see schema in `lib/db/src/schema/lottery.ts`. Seed runs on every startup (no-op if games exist).

## Secret
`APIVERVE_KEY` env secret — set in Replit secrets.
