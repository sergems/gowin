---
name: Fixture status transition logic
description: Documents all the status-transition rules, bugs found/fixed, and constraints across the three sync files that control upcoming/live/finished state.
---

## Files involved
- `artifacts/api-server/src/lib/fixtureSync.ts` — football-only, runs every 5 min
- `artifacts/api-server/src/lib/fixtureExpiry.ts` — all sports, runs every 5 min (time-based)
- `artifacts/api-server/src/routes/apiSync.ts` — all 4 sports, runs daily at 07:00 or manually

## Root cause of "1375 live games" bug (fixed)
The backup DB imported football fixtures with status=live for future-dated games.
The `fixtureSync.ts` rule "never demote live→upcoming" locked them in.
**Additionally:** the football sync was using the API-computed `startTime` (event_date - 2h) for time-based checks, not the DB-stored `startTime`. When the API reports a different date (rescheduled game), the API-computed time could be in the past while the DB startTime was still future — triggering the auto-promote rule incorrectly.
**Additionally:** rescheduled games: API returns event_key as "live" (happening today) but DB `start_time` is still the old future date. Sync marks status=live but leaves `start_time` unchanged → "future_but_live" record.

## All bugs fixed

### `mapStatus` in both `fixtureSync.ts` and `apiSync.ts`
- `"p"` in the live-check array was matched via `.includes("p")`, catching unrelated statuses like "Suspended", "Interrupted".
- Fix: use exact match `s === "p"` for the penalty-shootout status.

### `fixtureSync.ts` — use DB startTime for time checks
- Time-based rules (auto-promote upcoming→live, finishedCutoff) now use `existing.startTime` (DB-stored), not API-computed startTime.
- DB startTime is the canonical value; API date may differ if game was rescheduled.

### `fixtureSync.ts` — update startTime on live transition
- When `finalStatus === "live"` AND DB `startTime > now`, the game was rescheduled to today.
- Fix: also update `startTime = apiStartTime` in the DB update to eliminate future_but_live.

### `fixtureSync.ts` — rawStatus=live guard
- The "trust API live" rule now has `t < tenMinFromNow` guard so it doesn't blindly trust live status for clearly-future games.

### `apiSync.ts` — status merge protection (was missing entirely)
- Added merge rules matching fixtureSync.ts: no live→upcoming within match window, no finished→live/upcoming.
- Added `matchDurationMs` to `SportSyncConfig` interface (Football:150min, Basketball:200min, Tennis:360min, Cricket:2880min).

### `fixtureExpiry.ts` — sport-aware match windows
- Was applying a single 150-min window to ALL sports.
- Cricket matches can last days — a 150-min window would incorrectly finish them.
- Fix: raw SQL `UPDATE FROM leagues JOIN` to apply per-sport windows.
- Sport windows: Football=150min, Basketball=200min, Tennis=360min, Cricket=2880min.

### Race safety
- Both `fixtureSync.ts` and `apiSync.ts` now use conditional WHERE in status updates:
  `WHERE id = $id AND NOT (status = 'finished' AND $finalStatus IN ('upcoming','live'))`
- Prevents a concurrent fixtureExpiry "finished" transition from being overwritten.

## Status merge rules (correct behaviour)
1. API "upcoming" must NOT demote DB "live" unless stored startTime is > now+10min (game clearly hasn't started → old stuck data).
2. API "live"/"upcoming" must NOT demote DB "finished".
3. API "live" is trusted only when stored startTime < now+10min.
4. If DB status is "live" and API says "live" but stored startTime is future → update startTime to API-computed value (rescheduled game).

## DB reset command (emergency)
```sql
UPDATE fixtures SET status = 'upcoming'
WHERE status = 'live' AND start_time > NOW() + INTERVAL '10 minutes';
```
