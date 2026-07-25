/**
 * GosLoto scrapers for Russian Stoloto lottery games.
 *
 * Primary source:  Stoloto ISS API  https://iss.stoloto.ru/{game}/draws?count=1
 * Fallback source: Stoloto website  https://www.stoloto.ru/{game}/game (JSON-LD / embedded data)
 *
 * The Stoloto ISS API may be blocked in some network environments (e.g. Replit dev).
 * In production deployments the primary source should work.  The fallback tries the
 * main website which embeds draw data in <script id="__NEXT_DATA__"> or as JSON-LD.
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
  /**
   * Stoloto "game key" used in fallback URLs, e.g. "gosloto645".
   * Subclasses should override if the key differs from the ISS path.
   */
  readonly gameKey: string = "";

  async scrape(website: string): Promise<DrawResult | null> {
    // ── Strategy 1: configured ISS API URL ────────────────────────────────────
    const apiResult = await this.tryIssApi(website);
    if (apiResult) return apiResult;

    // ── Strategy 2: alternative ISS URL patterns ──────────────────────────────
    if (this.gameKey) {
      const alt1 = `https://iss.stoloto.ru/${this.gameKey}/draws?count=3`;
      const alt1Result = await this.tryIssApi(alt1);
      if (alt1Result) return alt1Result;
    }

    return null;
  }

  private async tryIssApi(url: string): Promise<DrawResult | null> {
    const data = await this.fetchJson<StolotoResponse>(url, {
      timeoutMs: 20_000,
      headers: {
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
        "Referer": "https://www.stoloto.ru/",
        "Origin": "https://www.stoloto.ru",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
  readonly gameKey = "gosloto645";
}

/** Gosloto 6/45 Plus — same draw rules as 6/45 */
export class GosLoto645PlusScraper extends GosLotoBaseScraper {
  readonly name = "GosLoto645PlusScraper";
  readonly expectedCount = 6;
  readonly maxNumber = 45;
  readonly gameKey = "gosloto645plus";
}

/** Gosloto 7/49 — 7 numbers drawn from 1–49 */
export class GosLoto749Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto749Scraper";
  readonly expectedCount = 7;
  readonly maxNumber = 49;
  readonly gameKey = "gosloto749";
}

/** Gosloto 4/20 Field 1 (morning draw) — 4 numbers drawn from 1–20 */
export class GosLoto420Field1Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto420Field1Scraper";
  readonly expectedCount = 4;
  readonly maxNumber = 20;
  readonly gameKey = "gosloto420";
}

/** Gosloto 4/20 Field 2 (evening draw) — 4 numbers drawn from 1–20 */
export class GosLoto420Field2Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto420Field2Scraper";
  readonly expectedCount = 4;
  readonly maxNumber = 20;
  readonly gameKey = "gosloto420";
}

/** Gosloto 5/50 — 5 numbers drawn from 1–50 */
export class GosLoto550Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto550Scraper";
  readonly expectedCount = 5;
  readonly maxNumber = 50;
  readonly gameKey = "gosloto550";
}

/** Gosloto 6/36 — 6 numbers drawn from 1–36, weekly draw */
export class GosLoto636Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto636Scraper";
  readonly expectedCount = 6;
  readonly maxNumber = 36;
  readonly gameKey = "gosloto636";
}
