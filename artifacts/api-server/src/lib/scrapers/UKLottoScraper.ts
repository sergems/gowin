/**
 * UK Lotto scraper — scrapes lottery.co.uk results page.
 *
 * UK Lotto draws 6 main numbers from 1–59. No bonus ball in our DB schema
 * for this game (bonusNumbersCount=0), so bonus is returned as [].
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

export class UKLottoScraper extends BaseScraper {
  readonly name = "UKLottoScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    // lottery.co.uk has a clean results section
    const html = await this.fetchPage(website);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Draw date
    let drawDate: string | null = null;
    $("time, .draw-date, .date, [data-date]").each((_, el) => {
      if (drawDate) return;
      const raw = $(el).attr("datetime") ?? $(el).attr("data-date") ?? $(el).text().trim();
      const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
      if (iso) { drawDate = iso[0] ?? null; return; }
      const dmy = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dmy) drawDate = this.parseDMYDate(dmy[0]);
    });
    if (!drawDate) drawDate = this.todayUTC();

    const numbers: number[] = [];

    // Common selectors for lottery result balls
    const selectors = [
      ".ball", ".lottery-ball", ".lotto-ball", ".winning-number",
      ".result-ball", "li.number", ".numbers li",
    ];

    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n > 0 && numbers.length < 6) numbers.push(n);
      });
      if (numbers.length >= 5) break;
    }

    // Fallback: extract 6 numbers from any span/div containing only small integers
    if (numbers.length === 0) {
      $("span, div, li").each((_, el) => {
        if (numbers.length >= 6) return;
        const text = $(el).text().trim();
        if (/^\d{1,2}$/.test(text)) {
          const n = parseInt(text, 10);
          if (n >= 1 && n <= 59) numbers.push(n);
        }
      });
    }

    if (numbers.length < 5) return null;

    return { drawDate, numbers: numbers.slice(0, 6), bonus: [], jackpot: 0 };
  }
}
