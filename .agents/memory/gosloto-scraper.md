---
name: Gosloto scraper — blocked API, game-specific pages, multi-draw settlement
description: How GosLoto scrapers work on Replit, catch-up via game pages, and scheduling notes
---

# Gosloto scraper — gosloto.app, multi-draw catch-up, scheduling

## The rule
`iss.stoloto.ru` and `www.stoloto.ru` are both completely unreachable from Replit (HTTP 000 / connection refused). `gosloto.app` IS accessible and serves as the primary source for all Russian Gosloto games except 6/36.

**Why:** Replit's egress IPs are blocked by Stoloto's CDN/firewall. gosloto.app is a third-party aggregator with no such block.

## Multi-draw catch-up via game-specific pages
`GosLotoBaseScraper.scrapeMany()` hits the game-specific page (e.g. `/results/4x20`, `/results/6x45`) rather than the homepage. The page shows ALL draws from today (4/20 draws every ~20 min, 6/45 draws many times/day). Results are returned oldest-first so `ScraperManager` can settle each draw in sequence.

**Why:** The homepage only shows the most recent draw per game. If the scraper was offline for 1-2 hours, intermediate draws would be missed permanently without the game-specific page approach.

**Game page paths:**
- 4/20 → `/results/4x20` (badge `b4outof20`, 8 nums per card — Field1=0..3, Field2=4..7)
- 6/45 → `/results/6x45` (badge `b6outof45`) — shared by 6/45 Plus
- 7/49 → `/results/7x49` (badge `b7outof49`)
- 5/50 → `/results/5x50` (badge `b5outof50`)
- 6/36 → NOT on gosloto.app (weekly Sunday draw; ISS blocked from Replit → always NO_RESULT in dev)

## ScraperManager handles multiple DrawResults
`runScraper()` now calls `scrapeMany()` → `DrawResult[]` and settles each independently using the ±90-min deduplication window. The "ensure next pending draw" step runs ONCE after all results are processed.

## Scheduling
- Scraper cron: every 5 min (2-min delay on first run after startup)
- `advanceLotteryNextDrawAt()`: every 10 min
- `ensureRussianGoslotoGames()`: on startup — creates pending draws for next 48h per schedule

## Gosloto 6/36 (game 29)
Weekly Sunday draw. Always NO_RESULT in Replit dev (gosloto.app shows unrelated 5/36 game, not 6/36). May work in production where ISS API is reachable.

## Bonus ball UI — amber everywhere
- All bonus balls use `#f59e0b` (amber) everywhere — picker, results, tickets
- Non-winning bonus balls in tickets.tsx: `background: rgba(245,158,11,0.18)` + `border: 2px solid rgba(245,158,11,0.55)` + `color: #f59e0b`
- Unselected bonus balls in game.tsx NumberBall picker: `ring-1 ring-amber-500/40 text-amber-400 bg-amber-500/10`
- Bonus separator in recent draws and ticket display: `✦` in `text-amber-400/70`
