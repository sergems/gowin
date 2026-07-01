---
name: Multi-sport sync pattern
description: How Basketball/Tennis/Cricket are synced from AllSportsAPI alongside Football, and how the nav and odds refresh are sport-aware.
---

## Rule
AllSportsAPI endpoints per sport: `/football/`, `/basketball/`, `/tennis/`, `/cricket/` — all use `?met=Fixtures&APIkey=...&from=...&to=...`.

**Why:** Tennis uses `event_first_player`/`event_second_player` instead of `event_home_team`/`event_away_team`. All others use the standard home/away team fields.

## How to apply

**apiSync.ts — SportSyncConfig[]** drives all four sports. The `extractEvent` fields are per-sport; `insertMarkets` is sport-specific:
- Football → `insertFootballMarkets` (1X2, Double Chance, BTTS, O/U, AH)
- Basketball → `insertBasketballMarkets` (Moneyline, Point Spread, Total Points O/U)
- Tennis → `insertTennisMarkets` (Match Winner, O/U Games, Game Handicap, First Set Winner)
- Cricket → `insertCricketMarkets` (Match Winner with optional Draw, Total Runs O/U)

**Fixture externalId prefixes** distinguish sports in DB (basketball: `bball_`, tennis: `tennis_`, cricket: `cricket_`). The odds refresh strips these prefixes before calling the AllSportsAPI Odds endpoint.

**oddsRefresh.ts** joins `fixtures → leagues → sports` to get sport name, then routes to the correct `refresh*Fixture()` function and API base path.

**Shell.tsx nav** fetches `/api/sports` (excludes Football since it has its own dropdown). Any non-Football sport returned gets a dynamic nav item linking to `/sports?sportId=X&sportName=Y`. Basketball/Tennis/Cricket appear automatically after first sync.

**sports.tsx** reads `sportId` from search params, passes it to `useListFixtures`. `getSportMeta(fixture.sportName)` returns the sport icon + default market type (Basketball→Moneyline, Tennis/Cricket→Match Winner, Football→1X2).

**Odds: no fake odds** — same policy as Football: only create markets when API provides real odds. If `fetchRealOdds` returns null, `insertMarkets` is a no-op.
