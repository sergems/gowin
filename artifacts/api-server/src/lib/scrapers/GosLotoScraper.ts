/**
 * GosLoto scrapers for Russian Stoloto lottery games.
 *
 * Primary source:  gosloto.app  (accessible from Replit and most environments)
 *   - Game-specific pages  /results/{gamePath}  show the full day's draw history.
 *   - scrapeMany() returns ALL draws from the last 24 h (oldest first) so the
 *     ScraperManager can settle missed draws after a downtime gap.
 *   - Times shown in Moscow Standard Time (MSK = UTC+3).
 *
 * Fallback source: Stoloto ISS API  https://iss.stoloto.ru/{game}/draws?count=1
 *   - Blocked from Replit dev networks; may work in production.
 *
 * Russian lotteries have NO bonus ball — bonus is always returned as [].
 *
 * Gosloto 4/20 draws 8 numbers per card (4 for Field 1 + 4 for Field 2).
 * Field 1 scraper takes numbers [0..3], Field 2 scraper takes [4..7].
 */
import * as cheerio from "cheerio";
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

// ── Month map for gosloto.app subtitle parsing ────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2,  Apr: 3,  May: 4,  Jun: 5,
  Jul: 6, Aug: 7, Sep: 8,  Oct: 9,  Nov: 10, Dec: 11,
};

/** Moscow Standard Time offset (UTC+3, no DST) */
const MSK_OFFSET_H = 3;

/**
 * Parse "Jul 25, 2026 | 15:07 | Result #14342" from gosloto.app card subtitle.
 * Returns { utc, drawNumber } or null if parsing fails.
 * Times on gosloto.app are in MSK (UTC+3).
 */
function parseGoslotoSubtitle(
  text: string
): { utc: Date; drawNumber: string } | null {
  // Collapse whitespace (the raw HTML has newlines inside the element)
  const s = text.replace(/\s+/g, " ").trim();
  // e.g. "Jul 25, 2026 | 15:07 | Result #14342"
  const m = s.match(
    /(\w{3})\s+(\d{1,2}),\s*(\d{4})\s*\|\s*(\d{1,2}):(\d{2})\s*\|\s*Result\s*#(\d+)/i
  );
  if (!m) return null;

  const [, mon, dayStr, yearStr, hourStr, minStr, drawNum] = m as [
    string, string, string, string, string, string, string
  ];
  const month = MONTH_MAP[mon];
  if (month === undefined) return null;

  const day    = parseInt(dayStr,  10);
  const year   = parseInt(yearStr, 10);
  const hour   = parseInt(hourStr, 10);
  const minute = parseInt(minStr,  10);
  if ([day, year, hour, minute].some(isNaN)) return null;

  // MSK → UTC: subtract 3 hours
  const utc = new Date(Date.UTC(year, month, day, hour - MSK_OFFSET_H, minute, 0));
  return { utc, drawNumber: drawNum };
}

// ── Shared fetch headers ───────────────────────────────────────────────────────

const GOSLOTO_APP_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

// ── Shared logic ───────────────────────────────────────────────────────────────

abstract class GosLotoBaseScraper extends BaseScraper {
  /** How many main numbers to expect in the result */
  abstract readonly expectedCount: number;
  /** Max valid number value */
  abstract readonly maxNumber: number;
  /**
   * CSS badge class on gosloto.app (e.g. "b4outof20").
   * Set to "" for games not available on gosloto.app (e.g. 6/36).
   */
  readonly goslotoAppBadgeClass: string = "";
  /**
   * Offset into the badge list (used for 4/20 Field 2 which shares a card
   * with Field 1 — Field 2 starts at index 4).
   */
  readonly goslotoAppFieldOffset: number = 0;
  /**
   * gosloto.app game path used in game-specific pages, e.g. "4x20", "6x45".
   * Set to "" for games not on gosloto.app.
   */
  readonly goslotoAppGamePath: string = "";
  /**
   * Stoloto "game key" used in fallback URLs, e.g. "gosloto645".
   */
  readonly gameKey: string = "";

  // ── scrapeMany: fetch ALL recent draws via game-specific page ─────────────

  /**
   * Returns all draws from the last 24 h found on the gosloto.app game page,
   * in chronological order (oldest first). Falls back to a single scrape if
   * the game page is unavailable or the game is not on gosloto.app.
   */
  override async scrapeMany(website: string): Promise<DrawResult[]> {
    if (this.goslotoAppGamePath && this.goslotoAppBadgeClass) {
      const many = await this.tryGoslotoAppGamePage();
      if (many.length > 0) return many;
    }
    // Fall back to single result from homepage / ISS API
    const single = await this.scrape(website);
    return single ? [single] : [];
  }

  // ── scrape: single latest result (homepage → ISS API) ────────────────────

  async scrape(website: string): Promise<DrawResult | null> {
    // ── Strategy 1: gosloto.app homepage (accessible from Replit) ────────────
    if (this.goslotoAppBadgeClass) {
      const appResult = await this.tryGoslotoAppHomepage();
      if (appResult) return appResult;
    }

    // ── Strategy 2: configured Stoloto ISS API URL ────────────────────────────
    const apiResult = await this.tryIssApi(website);
    if (apiResult) return apiResult;

    // ── Strategy 3: alternative ISS URL patterns ──────────────────────────────
    if (this.gameKey) {
      const alt = `https://iss.stoloto.ru/${this.gameKey}/draws?count=3`;
      const altResult = await this.tryIssApi(alt);
      if (altResult) return altResult;
    }

    return null;
  }

  // ── gosloto.app game-specific page (full history) ─────────────────────────

  private async tryGoslotoAppGamePage(): Promise<DrawResult[]> {
    const url = `https://gosloto.app/results/${this.goslotoAppGamePath}`;
    const html = await this.fetchPage(url, {
      timeoutMs: 20_000,
      retries: 2,
      headers: GOSLOTO_APP_HEADERS,
    });
    if (!html) return [];
    try {
      return this.parseAllDrawsFromHtml(html);
    } catch {
      return [];
    }
  }

  /**
   * Parse ALL draw cards from a gosloto.app game page (or homepage).
   * Returns draws from the last 24 h in chronological order (oldest first).
   */
  private parseAllDrawsFromHtml(html: string): DrawResult[] {
    const $ = cheerio.load(html);
    const badgeClass    = this.goslotoAppBadgeClass;
    const fieldOffset   = this.goslotoAppFieldOffset;
    const cutoffMs      = Date.now() - 24 * 60 * 60 * 1_000; // last 24 h only
    const results: DrawResult[] = [];

    $(".card-body").each((_i, el) => {
      const badges = $(el).find(`span.badge-pill.${badgeClass}`);
      if (badges.length === 0) return;

      const allNums: number[] = [];
      badges.each((_j, span) => {
        const n = parseInt($(span).text().trim(), 10);
        if (!isNaN(n) && n >= 1 && n <= this.maxNumber) allNums.push(n);
      });

      if (allNums.length < fieldOffset + this.expectedCount) return;

      const numbers = allNums.slice(fieldOffset, fieldOffset + this.expectedCount);
      if (numbers.length !== this.expectedCount) return;

      const subtitleText = $(el).find(".card-subtitle").text();
      const parsed = parseGoslotoSubtitle(subtitleText);
      if (!parsed) return; // skip cards without a parseable timestamp

      // Only include draws from the last 24 h
      if (parsed.utc.getTime() < cutoffMs) return;

      results.push({
        drawDate:     parsed.utc.toISOString().slice(0, 10),
        drawDatetime: parsed.utc.toISOString(),
        drawNumber:   parsed.drawNumber,
        numbers,
        bonus:   [],
        jackpot: 0,
      });
    });

    // gosloto.app lists newest first — reverse for chronological settlement order
    return results.reverse();
  }

  // ── gosloto.app homepage scraper (single latest result) ──────────────────

  private async tryGoslotoAppHomepage(): Promise<DrawResult | null> {
    const html = await this.fetchPage("https://gosloto.app/", {
      timeoutMs: 20_000,
      retries: 2,
      headers: GOSLOTO_APP_HEADERS,
    });
    if (!html) return null;

    try {
      const all = this.parseAllDrawsFromHtml(html);
      // Homepage shows newest first; after reverse the LAST item is the newest
      return all.length > 0 ? all[all.length - 1]! : null;
    } catch {
      return null;
    }
  }

  // ── Stoloto ISS API ─────────────────────────────────────────────────────────

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

    const items: StolotoItem[] =
      data.data?.items ??
      data.data?.draws ??
      data.items ??
      data.draws ??
      [];

    const finished =
      items.find(
        (it) =>
          it.state === "FINISHED" ||
          it.state === "RESULTS_APPROVED" ||
          it.state === "CLOSED"
      ) ?? items[0];

    if (!finished) return null;

    const numbers = this.extractIssNumbers(finished);
    if (numbers.length === 0) return null;

    const rawDate = finished.draw_date_start ?? finished.date ?? "";
    const drawDate = rawDate.slice(0, 10) || this.todayUTC();

    return {
      drawDate,
      drawNumber: finished.draw_number?.toString(),
      numbers,
      bonus: [],
      jackpot: finished.jackpot ?? 0,
    };
  }

  private extractIssNumbers(item: StolotoItem): number[] {
    if (Array.isArray(item.winning_numbers)) {
      return this.filterIssNums(item.winning_numbers.map(Number));
    }
    if (typeof item.winning_numbers === "string") {
      const nums = this.parseNumbers(item.winning_numbers);
      if (nums.length > 0) return this.filterIssNums(nums);
    }
    if (Array.isArray(item.draws)) {
      for (const d of item.draws) {
        const common = d?.draws?.common;
        if (typeof common === "string" && common.trim()) {
          const nums = this.parseNumbers(common);
          if (nums.length > 0) return this.filterIssNums(nums);
        }
        if (d?.draws) {
          for (const val of Object.values(d.draws)) {
            if (typeof val === "string" && val.trim()) {
              const nums = this.parseNumbers(val);
              if (nums.length >= this.expectedCount) return this.filterIssNums(nums);
            }
          }
        }
        if (Array.isArray((d as any).winning_numbers)) {
          return this.filterIssNums((d as any).winning_numbers.map(Number));
        }
      }
    }
    return [];
  }

  /**
   * Filter ISS numbers: valid range only, then take the first expectedCount.
   * NOTE: ISS API already returns the correct numbers for each field separately,
   * so we do NOT apply goslotoAppFieldOffset here — that offset only applies
   * to gosloto.app cards where both 4/20 fields appear in the same card.
   */
  private filterIssNums(nums: number[]): number[] {
    return nums
      .filter((n) => !isNaN(n) && n >= 1 && n <= this.maxNumber)
      .slice(0, this.expectedCount);
  }
}

// ── Concrete scrapers ──────────────────────────────────────────────────────────

/** Gosloto 6/45 — 6 numbers from 1–45, multiple draws daily */
export class GosLoto645Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto645Scraper";
  readonly expectedCount = 6;
  readonly maxNumber = 45;
  readonly gameKey = "gosloto645";
  readonly goslotoAppBadgeClass = "b6outof45";
  readonly goslotoAppGamePath = "6x45";
}

/** Gosloto 6/45 Plus — same draw as 6/45 */
export class GosLoto645PlusScraper extends GosLotoBaseScraper {
  readonly name = "GosLoto645PlusScraper";
  readonly expectedCount = 6;
  readonly maxNumber = 45;
  readonly gameKey = "gosloto645plus";
  readonly goslotoAppBadgeClass = "b6outof45";
  readonly goslotoAppGamePath = "6x45"; // same results page as 6/45
}

/** Gosloto 7/49 — 7 numbers from 1–49, multiple draws daily */
export class GosLoto749Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto749Scraper";
  readonly expectedCount = 7;
  readonly maxNumber = 49;
  readonly gameKey = "gosloto749";
  readonly goslotoAppBadgeClass = "b7outof49";
  readonly goslotoAppGamePath = "7x49";
}

/**
 * Gosloto 4/20 Field 1 — first 4 of the 8 numbers in a 4/20 card.
 * gosloto.app shows both fields together; Field 1 = indices 0–3.
 */
export class GosLoto420Field1Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto420Field1Scraper";
  readonly expectedCount = 4;
  readonly maxNumber = 20;
  readonly gameKey = "gosloto420";
  readonly goslotoAppBadgeClass = "b4outof20";
  readonly goslotoAppFieldOffset = 0;
  readonly goslotoAppGamePath = "4x20";
}

/**
 * Gosloto 4/20 Field 2 — last 4 of the 8 numbers in a 4/20 card.
 * gosloto.app shows both fields together; Field 2 = indices 4–7.
 */
export class GosLoto420Field2Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto420Field2Scraper";
  readonly expectedCount = 4;
  readonly maxNumber = 20;
  readonly gameKey = "gosloto420";
  readonly goslotoAppBadgeClass = "b4outof20";
  readonly goslotoAppFieldOffset = 4;
  readonly goslotoAppGamePath = "4x20";
}

/**
 * Gosloto 5/50 — 5 numbers from 1–50.
 * gosloto.app shows up to 7 numbers per card (5 main + extras); we take the first 5.
 */
export class GosLoto550Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto550Scraper";
  readonly expectedCount = 5;
  readonly maxNumber = 50;
  readonly gameKey = "gosloto550";
  readonly goslotoAppBadgeClass = "b5outof50";
  readonly goslotoAppGamePath = "5x50";
}

/**
 * Gosloto 6/36 — 6 numbers from 1–36, weekly Sunday draw.
 * Not available on gosloto.app (which shows the unrelated 5/36 game).
 * ISS API is blocked from Replit; works in some production environments.
 */
export class GosLoto636Scraper extends GosLotoBaseScraper {
  readonly name = "GosLoto636Scraper";
  readonly expectedCount = 6;
  readonly maxNumber = 36;
  readonly gameKey = "gosloto636";
  // goslotoAppBadgeClass / goslotoAppGamePath intentionally left "" — not on gosloto.app
}
