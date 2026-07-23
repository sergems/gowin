/**
 * Powerball scraper — uses the official powerball.com JSON API.
 *
 * Endpoint: GET https://www.powerball.com/api/v1/numbers/powerball/latest
 * Response: [{ field1: "5,12,18,31,44", field2: "25", drawDate: "07/22/2026", nextJackpot: "$543 Million", ... }]
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";

interface PowerballApiEntry {
  field1: string;   // main numbers "5,12,18,31,44"
  field2: string;   // powerball number "25"
  drawDate: string; // "07/22/2026"
  jackpot?: string; // "$543 Million"
}

export class PowerballScraper extends BaseScraper {
  readonly name = "PowerballScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const url = `${website.replace(/\/$/, "")}/api/v1/numbers/powerball/latest`;
    const data = await this.fetchJson<PowerballApiEntry[]>(url);
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    if (!entry?.field1 || !entry.field2 || !entry.drawDate) return null;

    const drawDate = this.parseUSDate(entry.drawDate);
    if (!drawDate) return null;

    const numbers = this.parseNumbers(entry.field1);
    const bonus = this.parseNumbers(entry.field2);

    if (numbers.length !== 5 || bonus.length !== 1) return null;

    const jackpot = this.parseJackpot(entry.jackpot ?? "");

    return { drawDate, numbers, bonus, jackpot };
  }

  private parseJackpot(raw: string): number {
    // "$543 Million" → 543_000_000
    const m = raw.replace(/,/g, "").match(/([\d.]+)\s*(million|billion)?/i);
    if (!m) return 0;
    const val = parseFloat(m[1] ?? "0");
    const unit = (m[2] ?? "").toLowerCase();
    if (unit === "billion") return Math.round(val * 1_000_000_000);
    if (unit === "million") return Math.round(val * 1_000_000);
    return Math.round(val);
  }
}
