/**
 * Mega Millions scraper — uses the official megamillions.com JSON API.
 *
 * Endpoint: GET https://www.megamillions.com/api/v1/getnumbers/latest
 * Fallback:  GET https://www.megamillions.com/cmspages/utilpage.aspx?pagetype=getlatestdrawdata
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";

interface MegaApiEntry {
  WinningNumbers: string;   // "4 8 19 27 34"
  MegaBall: string;         // "11"
  DrawDate: string;         // "07/19/2026" or "2026-07-19"
  NextJackpot?: string;
}

export class MegaMillionsScraper extends BaseScraper {
  readonly name = "MegaMillionsScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const base = website.replace(/\/$/, "");

    // Try official JSON API first
    const apiUrl = `${base}/api/v1/getnumbers/latest`;
    const data = await this.fetchJson<MegaApiEntry | MegaApiEntry[]>(apiUrl);

    if (data) {
      const entry = Array.isArray(data) ? data[0] : data;
      if (entry?.WinningNumbers && entry.MegaBall && entry.DrawDate) {
        return this.parse(entry);
      }
    }

    // Fallback: utility page returns JSON-like payload
    const utilUrl = `${base}/cmspages/utilpage.aspx?pagetype=getlatestdrawdata`;
    const html = await this.fetchPage(utilUrl);
    if (!html) return null;

    return this.parseHtml(html);
  }

  private parse(entry: MegaApiEntry): DrawResult | null {
    const numbers = this.parseNumbers(entry.WinningNumbers);
    const bonus = this.parseNumbers(entry.MegaBall);
    if (numbers.length !== 5 || bonus.length !== 1) return null;

    const drawDate =
      this.parseUSDate(entry.DrawDate) ??
      (entry.DrawDate.includes("-") ? entry.DrawDate.slice(0, 10) : null);
    if (!drawDate) return null;

    return { drawDate, numbers, bonus, jackpot: 0 };
  }

  private parseHtml(html: string): DrawResult | null {
    // The utility page embeds numbers like: <span class="white-ball">4</span>
    const balls: number[] = [];
    const mainRe = /<span[^>]*class="[^"]*white-ball[^"]*"[^>]*>(\d+)<\/span>/gi;
    let m: RegExpExecArray | null;
    while ((m = mainRe.exec(html)) !== null && balls.length < 5) {
      balls.push(parseInt(m[1] ?? "0", 10));
    }

    const megaRe = /<span[^>]*class="[^"]*mega-ball[^"]*"[^>]*>(\d+)<\/span>/i;
    const megaM = megaRe.exec(html);

    const dateRe = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const dateM = dateRe.exec(html);

    if (balls.length !== 5 || !megaM || !dateM) return null;

    const drawDate = this.parseUSDate(dateM[0]);
    if (!drawDate) return null;

    return {
      drawDate,
      numbers: balls,
      bonus: [parseInt(megaM[1] ?? "0", 10)],
      jackpot: 0,
    };
  }
}
