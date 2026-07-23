/**
 * South African National Lottery scraper — nationallottery.co.za
 *
 * Scrapes the Lotto (6/52 + bonus ball) draw results.
 * SA Lotto draws every Wednesday and Saturday.
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

export class SALottoScraper extends BaseScraper {
  readonly name = "SALottoScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = `${website.replace(/\/$/, "")}/results/lotto-results`;
    const html = await this.fetchPage(url);
    if (!html) return null;

    return this.parseResultsPage($url => cheerio.load($url), html, "lotto");
  }

  protected parseResultsPage(
    _loadFn: (html: string) => cheerio.CheerioAPI,
    html: string,
    gameType: "lotto" | "daily"
  ): DrawResult | null {
    const $ = cheerio.load(html);

    // Draw date
    let drawDate: string | null = null;
    $("time, .draw-date, .date, [data-draw-date]").each((_, el) => {
      if (drawDate) return;
      const raw = $(el).attr("datetime") ?? $(el).text().trim();
      const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
      if (iso) { drawDate = iso[0] ?? null; return; }
      const dmy = raw.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
      if (dmy) drawDate = this.parseDMYDate(dmy[0].replace(/-/g, "/"));
    });

    // Fallback: scan for date pattern in page text
    if (!drawDate) {
      const pageText = $.root().text();
      const iso = pageText.match(/\d{4}-\d{2}-\d{2}/);
      if (iso) drawDate = iso[0] ?? null;
    }

    if (!drawDate) drawDate = this.todayUTC();

    const numbers: number[] = [];
    let bonus: number[] = [];

    // Try game-specific selectors
    const ballSels = [
      `.${gameType}-ball`, ".ball-number", ".lotto-ball", ".ball",
      ".winning-numbers li", ".result-numbers li",
    ];
    for (const sel of ballSels) {
      $(sel).each((_, el) => {
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n > 0) {
          if (numbers.length < (gameType === "lotto" ? 6 : 5)) numbers.push(n);
        }
      });
      if (numbers.length >= (gameType === "lotto" ? 5 : 4)) break;
    }

    // Bonus ball for SA Lotto
    if (gameType === "lotto") {
      $(".bonus-ball, .bonus, .bonus-number").each((_, el) => {
        if (bonus.length > 0) return;
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n > 0) bonus = [n];
      });
    }

    if (numbers.length < 3) return null;

    return {
      drawDate,
      numbers: numbers.slice(0, gameType === "lotto" ? 6 : 5),
      bonus,
      jackpot: 0,
    };
  }
}
