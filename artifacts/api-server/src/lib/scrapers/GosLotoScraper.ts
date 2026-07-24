/**
 * GosLoto scrapers for Russian Stoloto lottery games.
 *
 * Uses the Stoloto public ISS API:
 *   https://iss.stoloto.ru/{game}/draws?count=1
 *
 * Response shape (Stoloto ISS API):
 * {
 *   success: true,
 *   data: {
 *     items: [{
 *       draw_number: 123,
 *       draw_date_start: "2024-01-15 20:00:00",
 *       state: "FINISHED",
 *       draws: [{ draws: { common: "5 12 23 34 45 1" } }]
 *     }]
 *   }
 * }
 *
 * Russian lotteries have NO bonus ball — bonus is always returned as [].
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";

// ── Stoloto ISS API response types ────────────────────────────────────────────

interface StolotoDrawEntry {
  draws?: { common?: string; [key: string]: string | undefined };
  winning_numbers?: number[] | string;
}

interface StolotoItem {
  draw_number?: number;
  draw_date_start?: string;
  date?: string;
  state?: string;
  draws?: StolotoDrawEntry[];
  winning_numbers?: number[] | string;
  jackpot?: number;
}

interface StolotoResponse {
  success?: boolean;
  data?: {
    items?: StolotoItem[];
    draws?: StolotoItem[];
  };
  items?: StolotoItem[];
  draws?: StolotoItem[];
}

// ── Shared logic ───────────────────────────────────────────────────────────────

abstract class GosLotoBaseScraper extends BaseScraper {
  /** How many main numbers to expect in the result */
  abstract readonly expectedCount: number;
  /** Max value a number can take */
  abstract readonly maxNumber: number;

  async scrape(website: string): Promise<DrawResult | null> {
    const data = await this.fetchJson<StolotoResponse>(website, {
      timeoutMs: 20_000,
      headers: {
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
        Referer: "https://www.stoloto.ru/",
      },
    });

    if (!data) return null;

    // Normalise: extract items array from different known response shapes
    const items: StolotoItem[] =
      data.data?.items ??
      data.data?.draws ??
      data.items ??
      data.draws ??
      [];

    // Find the most-recent FINISHED draw
    const finished = items.find(
      (it) =>
        it.state === "FINISHED" ||
        it.state === "RESULTS_APPROVED" ||
        it.state === "CLOSED"
    ) ?? items[0];

    if (!finished) return null;

    const numbers = this.extractNumbers(finished);
    if (numbers.length === 0) return null;

    // Date: parse "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"
    const rawDate = finished.draw_date_start ?? finished.date ?? "";
    const drawDate = rawDate.slice(0, 10) || this.todayUTC();

    return {
      drawDate,
      drawNumber: finished.draw_number?.toString(),
      numbers,
      bonus: [], // No bonus ball for Russian Gosloto games
      jackpot: finished.jackpot ?? 0,
    };
  }

  private extractNumbers(item: StolotoItem): number[] {
    // Strategy 1: item-level winning_numbers array
    if (Array.isArray(item.winning_numbers)) {
      return this.filterNumbers(item.winning_numbers.map(Number));
    }

    // Strategy 2: item-level winning_numbers string
    if (typeof item.winning_numbers === "string") {
      const nums = this.parseNumbers(item.winning_numbers);
      if (nums.length > 0) return this.filterNumbers(nums);
    }

    // Strategy 3: draws[].draws.common string
    if (Array.isArray(item.draws)) {
      for (const d of item.draws) {
        const common = d?.draws?.common;
        if (typeof common === "string" && common.trim()) {
          const nums = this.parseNumbers(common);
          if (nums.length > 0) return this.filterNumbers(nums);
        }
        // Also check other draw sub-keys (e.g. "field1", "field2")
        if (d?.draws) {
          for (const val of Object.values(d.draws)) {
            if (typeof val === "string" && val.trim()) {
              const nums = this.parseNumbers(val);
              if (nums.length >= this.expectedCount) return this.filterNumbers(nums);
            }
          }
        }
        // draws[].winning_numbers
        if (Array.isArray((d as any).winning_numbers)) {
          return this.filterNumbers((d as any).winning_numbers.map(Number));
        }
      }
    }

    return [];
  }

  private filterNumbers(nums: number[]): number[] {
    return nums
      .filter((n) => !isNaN(n) && n >= 1 && n <= this.maxNumber)
      .slice(0, this.expectedCount);
  }
}

// ── Concrete scrapers ──────────────────────────────────────────────────────────

/** Gosloto 6/45 — 6 numbers drawn from 1–45 */
export class GosLoto645Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto645Scraper";
  readonly expectedCount = 6;
  readonly maxNumber = 45;
}

/** Gosloto 6/45 Plus — same draw rules as 6/45 */
export class GosLoto645PlusScraper extends GosLotoBaseScraper {
  readonly name = "GosLoto645PlusScraper";
  readonly expectedCount = 6;
  readonly maxNumber = 45;
}

/** Gosloto 7/49 — 7 numbers drawn from 1–49 */
export class GosLoto749Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto749Scraper";
  readonly expectedCount = 7;
  readonly maxNumber = 49;
}

/** Gosloto 4/20 Field 1 (morning draw) — 4 numbers drawn from 1–20 */
export class GosLoto420Field1Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto420Field1Scraper";
  readonly expectedCount = 4;
  readonly maxNumber = 20;
}

/** Gosloto 4/20 Field 2 (evening draw) — 4 numbers drawn from 1–20 */
export class GosLoto420Field2Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto420Field2Scraper";
  readonly expectedCount = 4;
  readonly maxNumber = 20;
}

/** Gosloto 5/50 — 5 numbers drawn from 1–50 */
export class GosLoto550Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto550Scraper";
  readonly expectedCount = 5;
  readonly maxNumber = 50;
}
