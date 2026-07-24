/**
 * UK National Lottery scrapers — Lotto, EuroMillions, Thunderball, Set For Life.
 *
 * Data source: lottery.co.uk (server-rendered HTML, proven reliable).
 *
 * URL patterns:
 *   Lotto:       https://www.lottery.co.uk/lotto/results
 *   EuroMillions:https://www.lottery.co.uk/euromillions/results
 *   Thunderball: https://www.lottery.co.uk/thunderball/results
 *   Set For Life:https://www.lottery.co.uk/set-for-life/results
 *
 * Page structure (common pattern):
 *   Date:  <div class="latestHeader {game}">Day <span class="smallerHeading">22nd July 2026</span></div>
 *   Balls: <div class="result medium {game}-ball-round-1 floatLeft">N</div>
 *   Bonus: <div class="result medium {game}-{bonus-name}-round-1 floatLeft">N</div>
 *
 * Each scraper knows its game-specific CSS class prefixes and number ranges.
 */

import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

/** Parse "22nd July 2026" or "1st January 2025" → "YYYY-MM-DD" */
function parseOrdinalDate(raw: string): string | null {
  const m = raw.match(/(\d{1,2})(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/i);
  if (!m) return null;
  const mon = MONTHS[(m[2] ?? "").toLowerCase()];
  if (!mon) return null;
  return `${m[3]}-${mon}-${(m[1] ?? "1").padStart(2, "0")}`;
}

/**
 * Generic lottery.co.uk page parser.
 *
 * @param html        Raw page HTML
 * @param mainPrefix  CSS class prefix for main balls  e.g. "lotto-ball-round-"
 * @param bonusPrefix CSS class prefix for bonus balls e.g. "lotto-bonus-ball-round-"
 * @param mainMax     Maximum valid main ball number
 * @param bonusMax    Maximum valid bonus number (0 = no bonus)
 * @param maxMain     How many main balls to collect (default 6)
 * @param maxBonus    How many bonus balls to collect (default 1)
 */
function parseLotteryCoUk(
  html: string,
  mainPrefix: string,
  bonusPrefix: string | null,
  mainMax: number,
  bonusMax: number,
  maxMain = 6,
  maxBonus = 1,
): DrawResult | null {
  const $ = cheerio.load(html);

  // ── Date ──────────────────────────────────────────────────────────────────
  let drawDate: string | null = null;

  // Primary: .latestHeader .smallerHeading
  $(".latestHeader .smallerHeading, .latestHeader span").each((_, el) => {
    if (drawDate) return;
    drawDate = parseOrdinalDate($(el).text().trim());
  });

  // Fallback: any time/date element
  if (!drawDate) {
    $("time, [data-date], .draw-date").each((_, el) => {
      if (drawDate) return;
      const raw = $(el).attr("datetime") ?? $(el).attr("data-date") ?? $(el).text().trim();
      const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
      if (iso) { drawDate = iso[0] ?? null; return; }
      drawDate = parseOrdinalDate(raw);
    });
  }

  // Last resort: scan all visible text for an ordinal date
  if (!drawDate) {
    $("h1, h2, h3, p, div").each((_, el) => {
      if (drawDate) return;
      const text = $(el).children().length === 0 ? $(el).text().trim() : "";
      if (text) drawDate = parseOrdinalDate(text);
    });
  }

  if (!drawDate) drawDate = new Date().toISOString().slice(0, 10);

  // ── Main balls ─────────────────────────────────────────────────────────────
  const numbers: number[] = [];
  $(`[class*="${mainPrefix}"]`).each((_, el) => {
    if (numbers.length >= maxMain) return;
    const n = parseInt($(el).text().trim(), 10);
    if (!isNaN(n) && n >= 1 && n <= mainMax) numbers.push(n);
  });

  // ── Bonus balls ────────────────────────────────────────────────────────────
  const bonus: number[] = [];
  if (bonusPrefix && bonusMax > 0) {
    $(`[class*="${bonusPrefix}"]`).each((_, el) => {
      if (bonus.length >= maxBonus) return;
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= bonusMax) bonus.push(n);
    });
  }

  if (numbers.length < Math.min(maxMain, 5)) return null;

  return {
    drawDate,
    numbers: numbers.slice(0, maxMain),
    bonus: bonus.slice(0, maxBonus),
    jackpot: 0,
  };
}

// ── Lotto ─────────────────────────────────────────────────────────────────────

export class UKNationalLottoScraper extends BaseScraper {
  readonly name = "UKNationalLottoScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = website.includes("lottery.co.uk") ? website : "https://www.lottery.co.uk/lotto/results";
    const html = await this.fetchPage(url);
    if (!html) return null;
    return parseLotteryCoUk(html, "lotto-ball-round-", "lotto-bonus-ball-round-", 59, 59, 6, 1);
  }
}

// ── EuroMillions (UK) ─────────────────────────────────────────────────────────

export class UKEuroMillionsScraper extends BaseScraper {
  readonly name = "UKEuroMillionsScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = website.includes("lottery.co.uk") ? website : "https://www.lottery.co.uk/euromillions/results";
    const html = await this.fetchPage(url);
    if (!html) return null;

    // Try lottery.co.uk structure first
    const result = parseLotteryCoUk(html, "euromillions-ball-round-", "lucky-star-round-", 50, 12, 5, 2);
    if (result) return result;

    // Fallback: try euro-millions.com style classes (ul.balls structure)
    const $ = cheerio.load(html);
    const numbers: number[] = [];
    const bonus: number[] = [];
    $("li.resultBall.ball:not(.small)").each((_, el) => {
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= 50 && numbers.length < 5) numbers.push(n);
    });
    $("li.resultBall.lucky-star:not(.small), li.resultBall.star:not(.small)").each((_, el) => {
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= 12 && bonus.length < 2) bonus.push(n);
    });
    if (numbers.length >= 5) {
      return { drawDate: new Date().toISOString().slice(0, 10), numbers, bonus, jackpot: 0 };
    }

    return null;
  }
}

// ── Thunderball ───────────────────────────────────────────────────────────────

export class UKThunderballScraper extends BaseScraper {
  readonly name = "UKThunderballScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = website.includes("lottery.co.uk") ? website : "https://www.lottery.co.uk/thunderball/results";
    const html = await this.fetchPage(url);
    if (!html) return null;

    // Main balls: class contains "thunderball-ball-round-" (the 5 main balls 1–39)
    // Bonus:      class contains "thunderball-thunderball-round-" (the Thunderball 1–14)
    // lottery.co.uk naming convention for the bonus: "{game}-{bonus}-round-"
    const result = parseLotteryCoUk(
      html,
      "thunderball-ball-round-",
      "thunderball-thunderball-round-",
      39, 14, 5, 1,
    );
    if (result) return result;

    // Alternative bonus class name
    return parseLotteryCoUk(html, "thunderball-ball-round-", "thunderball-bonus-ball-round-", 39, 14, 5, 1);
  }
}

// ── Set For Life ──────────────────────────────────────────────────────────────

export class UKSetForLifeScraper extends BaseScraper {
  readonly name = "UKSetForLifeScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = website.includes("lottery.co.uk") ? website : "https://www.lottery.co.uk/set-for-life/results";
    const html = await this.fetchPage(url);
    if (!html) return null;

    // Main: "set-for-life-ball-round-"  (5 balls from 1–47)
    // Bonus:"set-for-life-life-ball-round-" (1 Life Ball from 1–10)
    const result = parseLotteryCoUk(
      html,
      "set-for-life-ball-round-",
      "set-for-life-life-ball-round-",
      47, 10, 5, 1,
    );
    if (result) return result;

    // Alternative bonus class
    return parseLotteryCoUk(html, "set-for-life-ball-round-", "set-for-life-bonus-ball-round-", 47, 10, 5, 1);
  }
}
