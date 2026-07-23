/**
 * Daily Lotto scraper — nationallottery.co.za
 *
 * Scrapes the Daily Lotto (5/36, no bonus ball) draw results.
 * Draws every day of the week.
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

export class DailyLottoScraper extends BaseScraper {
  readonly name = "DailyLottoScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = `${website.replace(/\/$/, "")}/results/daily-lotto-results`;
    const html = await this.fetchPage(url);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Draw date
    let drawDate: string | null = null;
    $("time, .draw-date, .date, [data-draw-date]").each((_, el) => {
      if (drawDate) return;
      const raw = $(el).attr("datetime") ?? $(el).text().trim();
      const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
      if (iso) { drawDate = iso[0] ?? null; return; }
    });
    if (!drawDate) drawDate = this.todayUTC();

    const numbers: number[] = [];

    const ballSels = [".daily-lotto-ball", ".daily-ball", ".ball-number", ".ball", "li.number"];
    for (const sel of ballSels) {
      $(sel).each((_, el) => {
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n >= 1 && n <= 36 && numbers.length < 5) numbers.push(n);
      });
      if (numbers.length >= 4) break;
    }

    if (numbers.length < 4) return null;

    return { drawDate, numbers: numbers.slice(0, 5), bonus: [], jackpot: 0 };
  }
}
