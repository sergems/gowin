---
name: UK 49s timezone fix
description: Root cause and fix for UK 49s draws showing "in 6 days" instead of today/tomorrow
---

# UK 49s timezone root cause

The imported DB had `timezone = 'Africa/Lubumbashi'` (DRC, UTC+2) on all four UK 49s games instead of `Europe/London` (BST, UTC+1). This caused `computeNextLotteryDraw` to compute draw times as if the draws happened at 12:49/13:49/17:49/18:49 DRC time, pushing them ~6 days into the future.

**Why:** The DB dump was created when the app was running in DRC and the timezone was never corrected.

## What was fixed

1. `ensureUK49sDrawTimes()` in `lotterySeed.ts` — runs on every startup. Fixes `timezone`, `nextDrawAt` on the game rows, and the nearest `pending` row in `lottery_draws`.
2. `advanceLotteryNextDrawAt()` in `lotteryScrapers.ts` — changed condition from "only update when pending date is later" to "always sync to nearest future pending". The old condition prevented a corrected (earlier) pending date from propagating back to the game row.

## Ongoing concern

When there are no pending draws left (all settled and scraper hasn't run yet), `ScraperManager` creates a fallback pending draw 7 days out. `ensureUK49sDrawTimes` corrects this on the next restart but not in real-time. The 10-minute `advanceLotteryNextDrawAt` cron will also correct it once a correct pending draw is inserted by the scraper or a restart.
