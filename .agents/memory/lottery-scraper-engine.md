---
name: Lottery scraper engine
description: Architecture and key decisions for the web-scraper-based lottery results pipeline
---

# Lottery Scraper Engine

## Architecture
- **Scrapers live in**: `artifacts/api-server/src/lib/scrapers/`
- **Entry point**: `ScraperManager.ts` → `runAllScrapers()` / `runScraper(gameId)`
- **Registry**: `ScraperRegistry.ts` maps `scraper_class` DB column → class instance
- **Base class**: `BaseScraper.ts` with `fetchPage()`, `fetchJson()`, `parseUSDate()`, `parseDMYDate()` helpers
- **Admin routes**: `artifacts/api-server/src/routes/lotteryScrapers.ts`

## DB additions (applied via psql, NOT drizzle-kit)
- New columns on `lottery_games`: `website`, `scraper_class`, `draw_days` (jsonb), `draw_time`, `timezone`
- New table `scraper_logs`: id, game_id, website, status, message, execution_time, created_at
- New table `settlement_logs`: id, draw_id, game_id, tickets_checked, winning_tickets, total_paid, execution_time, created_at
- Schema types also added to `lib/db/src/schema/lottery.ts`

## Key decisions

**Why scraper_logs/settlement_logs separate from lottery_draws?**
The draws table tracks the game state; logs are an operational audit trail. Keeping them separate avoids polluting game state queries.

**Duplicate detection**: query `lottery_draws` for a settled row with same `(game_id, draw_date)` window. If found → log DUPLICATE, skip.

**Settlement**: reuses existing `settleLotteryDraw()` from `lotterySettle.ts`. ScraperManager calls it after confirming no duplicate.

**Concurrency**: `_running` boolean mutex in ScraperManager prevents overlapping cron runs.

**Stagger**: 1.5s sleep between scrapers during a batch run to avoid hammering upstream sites.

**How to apply:**  
When adding a new lottery: (1) create a scraper class in `scrapers/`, (2) register in `ScraperRegistry.ts`, (3) `UPDATE lottery_games SET scraper_class='ClassName', website='...' WHERE slug='...'`.

## Cron schedule
Every 5 minutes with 2-minute initial delay (in `artifacts/api-server/src/index.ts`).
