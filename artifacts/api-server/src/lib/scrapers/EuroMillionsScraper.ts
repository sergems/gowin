/**
 * EuroMillions scraper — scrapes euro-millions.com/results.
 *
 * Page structure (server-rendered HTML):
 *   The page shows multiple draws. When a draw is in progress the current
 *   draw's balls all contain "-" (invalid).  We skip those and return the
 *   first draw whose balls are all valid numbers.
 *
 *   Date header (h2-class div):
 *     "Friday's Result - 24<sup>th</sup> July 2026"
 *   Balls (ul.balls):
 *     <li class="resultBall ball">2</li>      × 5 main
 *     <li class="resultBall lucky-star">2</li> × 2 Lucky Stars
 *   Historical draws use class "resultBall ball small" — excluded.
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

export class EuroMillionsScraper extends BaseScraper {
  readonly name = "EuroMillionsScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = website.replace(/\/$/, "") + "/results";
    const html = await this.fetchPage(url);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Walk every draw section. Each section has:
    //   - a date header div (h2-class) containing "Xth Month YYYY"
    //   - a <ul class="balls"> with <li class="resultBall ball"> items (NOT .small)
    // We collect (date, numbers, bonus) pairs and return the first with valid numbers.

    // Gather date headers in document order
    interface DrawSection { date: string | null; $balls: cheerio.Cheerio<cheerio.Element> }
    const sections: DrawSection[] = [];

    // The date headers are divs with class "h2" that contain the word "Result"
    $("div.h2, div[class*='h2']").each((_, el) => {
      const text = $(el).text();
      if (!/Result/i.test(text)) return;
      const date = this.parseOrdinalDate(text);
      // Find the next ul.balls sibling (may be nested a few levels down)
      const container = $(el).closest(".fx, .box, section, [class*='box']");
      const $balls = container.find("ul.balls").first();
      if ($balls.length) {
        sections.push({ date, $balls });
      }
    });

    for (const section of sections) {
      const numbers: number[] = [];
      const bonus: number[] = [];

      // Only non-.small li elements are the current draw's balls
      section.$balls.find("li.resultBall.ball:not(.small)").each((_, el) => {
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n > 0) numbers.push(n);
      });
      section.$balls.find("li.resultBall.lucky-star:not(.small)").each((_, el) => {
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n > 0) bonus.push(n);
      });

      // Skip draws in progress (balls contain "-" → NaN) or incomplete
      if (numbers.length < 5) continue;

      const drawDate = section.date ?? this.todayUTC();
      return {
        drawDate,
        numbers: numbers.slice(0, 5),
        bonus: bonus.slice(0, 2),
        jackpot: 0,
      };
    }

    // Fallback: try the original broad selector approach on first ul.balls with real numbers
    let fallbackDate: string | null = null;
    $("time, .date, .draw-date, [data-draw-date]").each((_, el) => {
      if (fallbackDate) return;
      const dt = $(el).attr("datetime") ?? $(el).attr("data-draw-date") ?? $(el).text().trim();
      const iso = dt.match(/(\d{4}-\d{2}-\d{2})/);
      if (iso) { fallbackDate = iso[1] ?? null; return; }
      fallbackDate = this.parseOrdinalDate(dt);
    });

    const fallbackNumbers: number[] = [];
    const fallbackBonus: number[] = [];
    $("li.resultBall.ball:not(.small)").each((_, el) => {
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n > 0 && fallbackNumbers.length < 5) fallbackNumbers.push(n);
    });
    $("li.resultBall.lucky-star:not(.small)").each((_, el) => {
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n > 0 && fallbackBonus.length < 2) fallbackBonus.push(n);
    });

    if (fallbackNumbers.length < 5) return null;

    return {
      drawDate: fallbackDate ?? this.todayUTC(),
      numbers: fallbackNumbers,
      bonus: fallbackBonus,
      jackpot: 0,
    };
  }

  /**
   * Parse "24th July 2026" / "1st January 2025" / "Friday's Result - 24th July 2026"
   * → "YYYY-MM-DD"
   */
  private parseOrdinalDate(raw: string): string | null {
    const m = raw.match(/(\d{1,2})(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/i);
    if (!m) return null;
    const mon = MONTHS[(m[2] ?? "").toLowerCase()];
    if (!mon) return null;
    return `${m[3]}-${mon}-${(m[1] ?? "1").padStart(2, "0")}`;
  }
}
