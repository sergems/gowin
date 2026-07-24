---
name: UK49s scraper — live API approach
description: How to get real-time UK 49s draw results from the official API (replaces stale JSON-LD scraper)
---

## Rule
Use `https://api.49s.co.uk/results/latest` — NOT the JSON-LD in the 49s.co.uk HTML (that is CDN-cached SSR and always months stale).

**Why:** 49s.co.uk is a React/Firebase SPA. The SSR-rendered JSON-LD is a stale snapshot baked at build time. The real-time data comes from the backend at `api.49s.co.uk`.

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

## Scraper design
Each draw scraper (Brunchtime/Lunchtime/Drivetime/Teatime) calls the same endpoint and matches by `event_number`. Returns null if the current latest draw doesn't match. The 5-minute cron captures each draw within its window; ScraperManager duplicate-check prevents double recording.

## What was tried and failed
- Firebase Firestore REST API → SERVICE_DISABLED (Firestore REST not enabled)
- Firebase anonymous auth → CONFIGURATION_NOT_FOUND (anonymous sign-in disabled)
- JSON-LD from 49s.co.uk HTML → stale CDN cache, always months old
- `api.49s.co.uk/pages/*` → 403 (needs partner token from localStorage)
- No date-filtered endpoints exist (only `/results/latest`)
