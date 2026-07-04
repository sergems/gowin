---
name: AllSportsAPI odds response format differs by sport
description: Football odds are a flat bookmaker array; Basketball/Tennis/Cricket odds are nested per-market objects. Parsers must branch on sport.
---

AllSportsAPI's `met=Odds` endpoint returns two incompatible response shapes depending on sport:

- **Football**: `result[matchId]` is an array of bookmaker rows with flat keys per row, e.g. `{ odd_bookmakers: "bet365", odd_1: 2.45, odd_x: 2.75, odd_2: 3.1, ah-1.5_1: ..., o+2.5: ..., bts_yes: ... }`.
- **Basketball/Tennis/Cricket**: `result[matchId]` is an object keyed by market name → outcome → bookmaker → value, e.g. `{ "Home/Away": { "Home": { "bet365": "1.80", "1xBet": "1.73" }, "Away": {...} }, "Asian Handicap -1": {...}, "Over/Under 180.5": {...} }`.

**Why:** A parser written against the football flat-key shape will silently find no matching fields for the other three sports (fields like `bk.odd_1` are simply `undefined`), so odds rows never get inserted and no error is thrown — this looks like "the API has no odds data" when actually it does, just in a different shape.

**How to apply:** When adding/debugging odds ingestion for a new sport or market from AllSportsAPI, always `curl` the raw `Odds` endpoint for a real matchId first and inspect the actual JSON shape before assuming the football flat-array format applies. Basketball/Cricket 3-way results live under a `"3Way Result"` market key; Tennis has many nested markets (`"Over/Under by Games in Match Over/Under"`, `"Asian Handicap (Games) Home/Away"`, `"Home/Away (1st Set)"`, etc.) — pick a bookmaker per outcome (prefer bet365/1xBet, fall back to first available) rather than assuming one universal bookmaker row like football's `odd_bookmakers` field.
