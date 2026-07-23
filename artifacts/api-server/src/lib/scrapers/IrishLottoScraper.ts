/**
 * Irish Lotto scraper — lottery.ie results page.
 *
 * 6 main numbers from 1–47, 1 bonus ball from 1–47.
 * Draws every Wednesday and Saturday.
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

export class IrishLottoScraper extends BaseScraper {
  readonly name = "IrishLottoScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = `${website.replace(/\/$/, "")}/results`;
    const html = await this.fetchPage(url);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Draw date
    let drawDate: string | null = null;
    $("time, .draw-date, [datetime], .date").each((_, el) => {
      if (drawDate) return;
      const raw = $(el).attr("datetime") ?? $(el).text().trim();
      const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
      if (iso) { drawDate = iso[0] ?? null; return; }
      const dmy = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dmy) drawDate = this.parseDMYDate(dmy[0]);
    });
    if (!drawDate) drawDate = this.todayUTC();

    const numbers: number[] = [];
    let bonus: number[] = [];

    // Main balls
    $(".lottery-ball, .ball, .lotto-ball, .result-number, li.number").each((_, el) => {
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= 47 && numbers.length < 6) numbers.push(n);
    });

    // Bonus ball
    $(".bonus-ball, .bonus, .bonus-number").each((_, el) => {
      if (bonus.length > 0) return;
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= 47) bonus = [n];
    });

    if (numbers.length < 4) return null;

    return { drawDate, numbers: numbers.slice(0, 6), bonus, jackpot: 0 };
  }
}
