/**
 * EuroMillions scraper — scrapes euro-millions.com results page.
 *
 * The results page embeds ball numbers in elements with class "ball" (main)
 * and "lucky-star" or "ls" (bonus Lucky Stars).
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

export class EuroMillionsScraper extends BaseScraper {
  readonly name = "EuroMillionsScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = `${website.replace(/\/$/, "")}/results`;
    const html = await this.fetchPage(url);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Extract draw date — look for first date-like pattern in page title or result heading
    let drawDate: string | null = null;
    $("time, .date, .draw-date, [data-draw-date]").each((_, el) => {
      if (drawDate) return;
      const dt = $(el).attr("datetime") ?? $(el).attr("data-draw-date") ?? $(el).text().trim();
      drawDate = this.extractDate(dt);
    });

    // Fallback: scan text nodes for date patterns
    if (!drawDate) {
      const pageText = $.root().text();
      const dRe = /(\d{1,2})[\s\/\-](\w+)[\s\/\-](\d{4})/;
      const dM = dRe.exec(pageText);
      if (dM) drawDate = this.parseVerboseDate(dM[0]);
    }

    if (!drawDate) drawDate = this.todayUTC();

    // Main balls
    const numbers: number[] = [];
    $(".ball, .balls .ball-number, li.ball").each((_, el) => {
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n > 0 && numbers.length < 5) numbers.push(n);
    });

    // Lucky Stars (bonus)
    const bonus: number[] = [];
    $(".lucky-star, .ls, .lucky-stars .ball-number, li.lucky-star").each((_, el) => {
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n > 0 && bonus.length < 2) bonus.push(n);
    });

    // Broader fallback using numbered lists
    if (numbers.length === 0) {
      $("ul.result li, .result-numbers li, .winning-numbers li").each((_, el) => {
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

  private extractDate(raw: string): string | null {
    if (!raw) return null;
    // ISO format
    const iso = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1] ?? null;
    // dd/mm/yyyy
    const dmy = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) return this.parseDMYDate(dmy[0]);
    return null;
  }

  private parseVerboseDate(raw: string): string | null {
    // "25 July 2026" or "25/07/2026"
    const months: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04",
      may: "05", june: "06", july: "07", august: "08",
      september: "09", october: "10", november: "11", december: "12",
    };
    const m = raw.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
    if (m) {
      const mon = months[(m[2] ?? "").toLowerCase()];
      if (mon) return `${m[3]}-${mon}-${(m[1] ?? "1").padStart(2, "0")}`;
    }
    return null;
  }
}
