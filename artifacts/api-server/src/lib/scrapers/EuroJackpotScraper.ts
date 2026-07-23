/**
 * EuroJackpot scraper — scrapes eurojackpot.com results.
 *
 * The latest results are embedded in ball elements on the results page.
 * Main numbers: 5 from 1–50, Euro Numbers (bonus): 2 from 1–10.
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

export class EuroJackpotScraper extends BaseScraper {
  readonly name = "EuroJackpotScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = `${website.replace(/\/$/, "")}/results`;
    const html = await this.fetchPage(url);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Draw date
    let drawDate: string | null = null;
    $("time, .date, .draw-date, [datetime]").each((_, el) => {
      if (drawDate) return;
      const dt = $(el).attr("datetime") ?? $(el).text().trim();
      const iso = dt.match(/\d{4}-\d{2}-\d{2}/);
      if (iso) drawDate = iso[0] ?? null;
    });
    if (!drawDate) drawDate = this.todayUTC();

    const numbers: number[] = [];
    const bonus: number[] = [];

    // Try specific selectors
    $(".eurojackpot-ball, .lottery-ball, .ball, .number").each((_, el) => {
      const n = parseInt($(el).text().trim(), 10);
      if (isNaN(n) || n <= 0) return;
      if (numbers.length < 5) numbers.push(n);
      else if (bonus.length < 2) bonus.push(n);
    });

    // Fallback: numbered list items
    if (numbers.length === 0) {
      $("ul.numbers li, .result li, .winning li").each((_, el) => {
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n > 0) {
          if (numbers.length < 5) numbers.push(n);
          else if (bonus.length < 2) bonus.push(n);
        }
      });
    }

    if (numbers.length === 0) return null;

    return { drawDate, numbers, bonus, jackpot: 0 };
  }
}
