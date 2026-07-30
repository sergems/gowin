---
name: UK 49s timezone fix
description: Root cause and fix for UK 49s draws showing wrong times; display timezone override for DRC users
---

# UK 49s draw time root cause

The imported DB had `timezone = 'Africa/Lubumbashi'` (DRC, UTC+2) on all four UK 49s games instead of `Europe/London`. This caused `computeNextLotteryDraw` to push draws far into the future.

**Second bug:** The draw times stored were also 1 hour too late in UK local time (12:49/13:49/17:49/18:49 instead of 11:49/12:49/16:49/17:49). The correct UK local draw times and their CAT equivalents:
- Brunchtime: 11:49 UK → 12:49 CAT (BST) / 13:49 CAT (GMT) — closes 12:45 / 13:45 CAT
- Lunchtime:  12:49 UK → 13:49 CAT (BST) / 14:49 CAT (GMT) — closes 13:45 / 14:45 CAT
- Drivetime:  16:49 UK → 17:49 CAT (BST) / 18:49 CAT (GMT) — closes 17:45 / 18:45 CAT
- Teatime:    17:49 UK → 18:49 CAT (BST) / 19:49 CAT (GMT) — closes 18:45 / 19:45 CAT

**Why:** Draw schedule uses `Europe/London` for correct UTC computation (UK has DST). But users are in eastern DRC (UTC+2, Africa/Lubumbashi, no DST), so display timezone differs from schedule timezone.

## What was fixed

1. `UK_49S_DRAW_CONFIGS` in `lotterySeed.ts` — corrected draw times and descriptions.
2. `ensureUK49sDrawTimes()` — now also updates `description` on each startup; runs on every server start.
3. `resolveDisplayTimezone()` in `artifacts/gowin/src/pages/lottery/game.tsx` — returns `Africa/Lubumbashi` for `uk-49s-*` slugs. Used in all three `fmtDraw*` calls (header, betting-closed panel, results list).

## Key constraint

`timezone` on the game row stays `Europe/London` — this is required for `computeNextLotteryDraw` to produce correct UTC timestamps. Only the frontend display overrides to `Africa/Lubumbashi`.

## Ongoing concern

When there are no pending draws left, `ScraperManager` creates a fallback draw 7 days out. `ensureUK49sDrawTimes` corrects this on next restart. The 10-minute `advanceLotteryNextDrawAt` cron also self-heals once a correct pending draw exists.
