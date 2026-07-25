---
name: Gosloto scraper — blocked API + scheduling
description: Stoloto ISS API is blocked from Replit; how to keep draws advancing and settle manually
---

# Gosloto scraper — blocked API + scheduling

## The rule
`iss.stoloto.ru` and `www.stoloto.ru` are both completely unreachable from Replit (HTTP 000 / connection refused). No accessible third-party site carries Gosloto results either. Scrapers for Russian games will always return NO_RESULT in the dev environment.

**Why:** Replit's egress IPs are blocked by Stoloto's CDN/firewall. Works in some production environments.

## How to apply
- In deployed prod the scraper may work as-is; test after first deploy.
- In dev, use the admin endpoint to enter results manually:
  `POST /admin/lottery/games/:gameId/manual-result` — body: `{ numbers, bonus?, drawDate? }`
  This settles the nearest pending draw and advances next_draw_at automatically.
- `advanceLotteryNextDrawAt()` runs every 10 minutes (exported from lotteryScrapers.ts, called in index.ts). It syncs `lottery_games.next_draw_at` to the earliest future pending draw, preventing the "Drawing now" stuck state.
- `ensureRussianGoslotoGames()` runs on startup and creates pending draws for the next 48h for all Gosloto games per their draw schedule.
- If a game has zero future pending draws (e.g. after a fresh DB import without successful scrapes), run `ensureRussianGoslotoGames()` or insert draws manually.

## Bonus ball UI — amber everywhere
- All bonus balls use `#f59e0b` (amber) everywhere — picker, results, tickets
- Non-winning bonus balls in tickets.tsx: `background: rgba(245,158,11,0.18)` + `border: 2px solid rgba(245,158,11,0.55)` + `color: #f59e0b` — clearly distinct from grey main balls
- Unselected bonus balls in game.tsx NumberBall picker: `ring-1 ring-amber-500/40 text-amber-400 bg-amber-500/10`
- Bonus separator in recent draws and ticket display: `✦` in `text-amber-400/70`
