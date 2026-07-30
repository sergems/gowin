---
name: TheLotter scraper pattern
description: How TheLotter-based scrapers work and how to add new lotteries using them
---

# TheLotter Scraper Pattern

## How it works
All TheLotter scrapers extend `TheLotterBaseScraper` in `artifacts/api-server/src/lib/scrapers/TheLotterScraper.ts`.

TheLotter embeds draw results as a JSON blob inside each result page. The scraper extracts:
- `"winningNumbersRegular":"A;B;C;D;E"` — semicolon-separated main balls
- `"winningNumbersAdditional":"X"` — semicolon-separated bonus balls
- `"drawDateTime":"YYYY-MM-DDTHH:mm:ss"` — draw datetime

## URL pattern
`https://www.thelotter.com/lottery-results/{thelotterSlug}/`

## Adding a new lottery
1. Add a subclass to `TheLotterScraper.ts`:
```typescript
export class TheLotterMyLottoScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterMyLottoScraper";
  readonly thelotterSlug = "my-lotto-slug";
  readonly expectedMain = 6;
  readonly expectedBonus = 1;
}
```
2. Register in `ScraperRegistry.ts`
3. Add DB record with `scraper_class = 'TheLotterMyLottoScraper'` and `website = 'https://www.thelotter.com'`
4. Add seed entry in `lotterySeed.ts`

## Anti-bot notes
- TheLotter may rate-limit or block Replit IPs (returns 0 bytes on subsequent requests in same session)
- The scraper uses full browser headers including Referer and Sec-Fetch-* headers
- retries=2, timeout=25s

## Current TheLotter-backed scrapers (as of July 2026)
USA: Powerball, Mega Millions
Europe: EuroMillions (5+2), Austria Lotto, EuroDreams, El Gordo, Germany Lotto, SuperEnalotto, Bonoloto, La Primitiva (Spain), Hatoslottó, Ötöslottó (Hungary), Totoloto (Portugal), Joker, Loto 6/49 (Romania)
Italy: Italy Lotto (5+0), MillionDay (5+0), SuperEnalotto (6+1)
Japan: Loto 6 (6+1), Loto 7 (7+2), Mini Loto (5+1)
Mexico: Melate (6+1), Melate Retro (6+1), Chispazo (5+1)
Peru: Tinka (6+1)
Poland: Lotto (6+0), Mini Lotto (5+0)
Australia: OZ Lotto, Powerball, Saturday Lotto, Weekday Windfall
Canada: Lotto 6/49, Ontario 49
NZ: NZ Powerball

New games use ensureTheLotterInternationalGames() in lotterySeed.ts — upserts on every startup so imported DBs get them automatically.

**Why:** User replaced the official powerball.com/megamillions.com scrapers (which were unreliable) with TheLotter as a unified source. The "Including Bonus" bonus mode was also removed for Powerball and Mega Millions (slugs: `powerball`, `mega-millions`) — see `USA_SLUGS_NO_INCLUDING_BONUS` in `game.tsx`.
