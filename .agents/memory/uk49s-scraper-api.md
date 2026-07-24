---
name: UK49s scraper — live API approach
description: How to get real-time UK 49s draw results from the official API (replaces stale JSON-LD scraper)
---

## Rule
Use `https://api.49s.co.uk/results/latest` for the newest completed draw. For missed earlier slots, use the dated page `https://49s.co.uk/49s/results/YYYY-MM-DD` and parse its JSON-LD result events.

**Why:** The latest API returns only the newest completed draw, so it cannot recover Brunchtime/Lunchtime/Drivetime once a later slot has completed. The dated page contains all four completed slots for that date. The undated/SPA HTML can be stale, but the dated result pages expose the requested date's JSON-LD.

## How to apply
Fetch `GET https://api.49s.co.uk/results/latest` with these headers (all required — without them you get 403/406):

```
Accept: application/json
X-Requested-With: sis-web/1.0.0
X-Country-Code: GB
Origin: https://49s.co.uk
Referer: https://49s.co.uk/49s/results
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36
```

No auth token required — the endpoint is public with correct browser headers.

## Response shape
```json
{
  "meta": { "status": 200, "code": "OK" },
  "events": [
    {
      "type": "numbers",
      "code": "49",
      "event_number": 4,
      "scheduled_time": "2026-07-24T17:49:00.000+01:00",
      "drawn_time": "2026-07-24T17:49:26.000+01:00",
      "drawns": [
        { "order": 0, "number": 9,  "bonus": true  },
        { "order": 1, "number": 16, "bonus": false },
        ...
      ]
    },
    { "type": "racing", ... }
  ]
}
```

- `type === "numbers"` and `code === "49"` → UK 49s draw
- `event_number` → 1=Brunchtime (~12:49 BST), 2=Lunchtime (~13:49 BST), 3=Drivetime (~16:49 BST), 4=Teatime (~17:49 BST)
- `drawns[].bonus === true` → bonus ball; `false` → main number
- `/results/latest` returns only the most recently completed draw (not all 4 for the day)

The dated page's JSON-LD events are named `Brunchtime Draw Results`, `Lunchtime Draw Results`, `Drivetime Draw Results`, and `Teatime Draw Results`; each contains `resultNumbers`, `bonusNumbers`, and `eventStatus`.

## Scraper design
Each draw scraper (Brunchtime/Lunchtime/Drivetime/Teatime) calls the same endpoint and matches by `event_number`; if the latest result is another slot, it falls back to today's then yesterday's dated page and matches the JSON-LD label. The dated page needs a simple `User-Agent: curl/8.0` request in this environment; browser-like headers trigger a Cloudflare challenge. The 5-minute cron captures each draw within its window; ScraperManager duplicate-check prevents double recording.

The source event mapping is: 1=Brunchtime, 2=Lunchtime, 3=Drivetime, 4=Teatime. Source UK times are 12:49, 13:49, 16:49, and 17:49 during BST; for DRC display/scheduling use `Africa/Lubumbashi` with 12:49, 13:49, 17:49, and 18:49 respectively.

Settlement must match pending draws by the same calendar date. Never attach a recovered result to the nearest future pending draw.

## What was tried and failed
- Firebase Firestore REST API → SERVICE_DISABLED (Firestore REST not enabled)
- Firebase anonymous auth → CONFIGURATION_NOT_FOUND (anonymous sign-in disabled)
- JSON-LD from 49s.co.uk HTML → stale CDN cache, always months old
- `api.49s.co.uk/pages/*` → 403 (needs partner token from localStorage)
- No date-filtered endpoints exist (only `/results/latest`)
