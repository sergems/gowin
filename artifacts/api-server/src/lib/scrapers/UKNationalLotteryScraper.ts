/**
 * UK National Lottery scrapers — Lotto, EuroMillions, Thunderball, Set For Life.
 *
 * Data source: national-lottery.co.uk XML draw-history API
 *   https://www.national-lottery.co.uk/results/{game}/draw-history/xml
 *
 * Returns the most-recent confirmed draw as structured XML. No JavaScript
 * rendering required — the endpoint is directly accessible server-side.
 *
 * XML structure (all games follow the same pattern):
 *   <draw-results>
 *     <game type="lotto">
 *       <draw>
 *         <draw-number>3191</draw-number>
 *         <draw-date>2026-07-22</draw-date>
 *       </draw>
 *       <balls>
 *         <set>L1</set>
 *         <ball number="1">3</ball>  ...  <ball number="6">53</ball>
 *         <bonus-ball type="bonusball" number="1">46</bonus-ball>
 *       </balls>
 *       ...
 *       <next-draw-date>2026-07-25</next-draw-date>
 *     </game>
 *   </draw-results>
 *
 * Lotto has two <balls> sets (L1 = primary machine, L2 = secondary); we use L1.
 * EuroMillions has two <bonus-ball type="luckystar"> elements.
 * Thunderball has one <bonus-ball type="thunderball">.
 * Set For Life has one <bonus-ball type="life ball">.
 */

import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

/**
 * Parse a national-lottery.co.uk XML draw response.
 *
 * @param xml         Raw XML string from the draw-history/xml endpoint
 * @param mainCount   Number of main balls to collect
 * @param bonusCount  Number of bonus balls to collect
 */
function parseNationalLotteryXml(
  xml: string,
  mainCount: number,
  bonusCount: number,
): DrawResult | null {
  const $ = cheerio.load(xml, { xmlMode: true });

  // Draw date — first <draw-date> element
  const drawDate = $("draw-date").first().text().trim();
  if (!drawDate || !/^\d{4}-\d{2}-\d{2}$/.test(drawDate)) return null;

  // Lotto has two <balls> sets (L1 primary, L2 secondary machine).
  // All other games have exactly one. We always use the first set.
  const $firstBalls = $("balls").first();

  // Main balls
  const numbers: number[] = [];
  $firstBalls.find("ball").each((_, el) => {
    if (numbers.length >= mainCount) return;
    const n = parseInt($(el).text().trim(), 10);
    if (!isNaN(n) && n > 0) numbers.push(n);
  });

  // Bonus balls (luckystar, bonusball, thunderball, "life ball" — all handled uniformly)
  const bonus: number[] = [];
  $firstBalls.find("bonus-ball").each((_, el) => {
    if (bonus.length >= bonusCount) return;
    const n = parseInt($(el).text().trim(), 10);
    if (!isNaN(n) && n > 0) bonus.push(n);
  });

  if (numbers.length < Math.min(mainCount, 5)) return null;

  return {
    drawDate,
    numbers: numbers.slice(0, mainCount),
    bonus: bonus.slice(0, bonusCount),
    jackpot: 0,
  };
}

// ── Lotto ─────────────────────────────────────────────────────────────────────

export class UKNationalLottoScraper extends BaseScraper {
  readonly name = "UKNationalLottoScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const xml = await this.fetchPage(website);
    if (!xml) return null;
    return parseNationalLotteryXml(xml, 6, 1);
  }
}

// ── EuroMillions (UK) ─────────────────────────────────────────────────────────

export class UKEuroMillionsScraper extends BaseScraper {
  readonly name = "UKEuroMillionsScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const xml = await this.fetchPage(website);
    if (!xml) return null;
    return parseNationalLotteryXml(xml, 5, 2);
  }
}

// ── Thunderball ───────────────────────────────────────────────────────────────

export class UKThunderballScraper extends BaseScraper {
  readonly name = "UKThunderballScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const xml = await this.fetchPage(website);
    if (!xml) return null;
    return parseNationalLotteryXml(xml, 5, 1);
  }
}

// ── Set For Life ──────────────────────────────────────────────────────────────

export class UKSetForLifeScraper extends BaseScraper {
  readonly name = "UKSetForLifeScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const xml = await this.fetchPage(website);
    if (!xml) return null;
    return parseNationalLotteryXml(xml, 5, 1);
  }
}
