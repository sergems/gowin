/**
 * UK Lotto scraper — scrapes lottery.co.uk/lotto/results.
 *
 * Page structure (server-rendered HTML):
 *   Date:  <div class="latestHeader lotto">Wednesday <span class="smallerHeading">22nd July 2026</span></div>
 *   Balls: <div class="result medium lotto-ball-round-1 floatLeft">3</div>  (×6 main)
 *   Bonus: <div class="result medium lotto-bonus-ball-round-1 floatLeft">46</div>
 *
 * We only take Round 1 (the first set of ball-round-1 elements on the page).
 * The DB game record should have website = https://www.lottery.co.uk/lotto/results
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

export class UKLottoScraper extends BaseScraper {
  readonly name = "UKLottoScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    // Ensure we hit the lotto-specific results page
    const url = website.endsWith("/lotto/results")
      ? website
      : website.replace(/\/?$/, "") + (website.includes("/lotto") ? "" : "/lotto/results");

    const html = await this.fetchPage(url);
    if (!html) return null;

    const $ = cheerio.load(html);

    // ── Date ──────────────────────────────────────────────────────────────────
    // <div class="latestHeader lotto">Wednesday <span class="smallerHeading">22nd July 2026</span>
    let drawDate: string | null = null;
    $(".latestHeader.lotto .smallerHeading, .latestHeader .smallerHeading").each((_, el) => {
      if (drawDate) return;
      drawDate = this.parseOrdinalDate($(el).text().trim());
    });

    // Fallback: scan any time/date element
    if (!drawDate) {
      $("time, [data-date], .draw-date").each((_, el) => {
        if (drawDate) return;
        const raw = $(el).attr("datetime") ?? $(el).attr("data-date") ?? $(el).text().trim();
        const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
        if (iso) { drawDate = iso[0] ?? null; return; }
        drawDate = this.parseOrdinalDate(raw);
      });
    }

    if (!drawDate) drawDate = this.todayUTC();

    // ── Numbers ───────────────────────────────────────────────────────────────
    // Only take the first six lotto-ball-round-N elements (Round 1)
    const numbers: number[] = [];
    $("[class*='lotto-ball-round-']").each((_, el) => {
      if (numbers.length >= 6) return;
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= 59) numbers.push(n);
    });

    // ── Bonus ball ────────────────────────────────────────────────────────────
    const bonus: number[] = [];
    $("[class*='lotto-bonus-ball-']").each((_, el) => {
      if (bonus.length >= 1) return;
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= 59) bonus.push(n);
    });

    if (numbers.length < 5) return null;

    return { drawDate, numbers: numbers.slice(0, 6), bonus, jackpot: 0 };
  }

  /** Parse "22nd July 2026" or "1st January 2025" → "YYYY-MM-DD" */
  private parseOrdinalDate(raw: string): string | null {
    const m = raw.match(/(\d{1,2})(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/i);
    if (!m) return null;
    const mon = MONTHS[(m[2] ?? "").toLowerCase()];
    if (!mon) return null;
    return `${m[3]}-${mon}-${(m[1] ?? "1").padStart(2, "0")}`;
  }
}
