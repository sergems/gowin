/**
 * French Loto scraper — fdj.fr / lotto.net fallback
 *
 * French Loto: 5 main numbers from 1–49, 1 "numéro chance" from 1–10.
 * Draws every Monday, Wednesday, and Saturday.
 *
 * Used by both "French 5/49" and "French 5/49 Plus" games — both games
 * are settled against the same FDJ draw result.
 *
 * Strategy:
 *   1. FDJ Remix JSON data endpoint (fast, structured)
 *   2. FDJ HTML results page (cheerio)
 *   3. lotto.net France Loto results page (cheerio fallback)
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

// ── FDJ Remix API response shapes (union of observed variants) ────────────────
interface FdjRemixDraw {
  drawDate?: string;
  date?: string;
  dateDeClôture?: string;
  numbers?: unknown;
  mainNumbers?: unknown;
  boules?: unknown;
  winning_numbers?: unknown;
  winningNumbers?: unknown;
  complementaire?: unknown;
  bonus?: unknown;
  chance?: unknown;
  numeroChance?: unknown;
  luckyNumber?: unknown;
  lucky_number?: unknown;
}

interface FdjRemixPayload {
  draws?: FdjRemixDraw[];
  results?: FdjRemixDraw[];
  tirage?: FdjRemixDraw;
  draw?: FdjRemixDraw;
  lastDraw?: FdjRemixDraw;
  data?: { draws?: FdjRemixDraw[]; draw?: FdjRemixDraw };
}

export class FrenchLotoScraper extends BaseScraper {
  readonly name = "FrenchLotoScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const base = website.replace(/\/$/, "");

    // 1 ─ FDJ Remix JSON endpoint
    const remix = await this.tryRemixApi(base);
    if (remix) return remix;

    // 2 ─ FDJ HTML results page
    const fdj = await this.tryFdjHtml(base);
    if (fdj) return fdj;

    // 3 ─ lotto.net fallback
    return this.tryLottoNet();
  }

  // ── Strategy 1: FDJ Remix JSON ───────────────────────────────────────────────

  private async tryRemixApi(base: string): Promise<DrawResult | null> {
    const url =
      `${base}/jeux-de-tirage/loto/resultats/` +
      `?_data=routes%2Fjeux-de-tirage%2F%24jeuDeTirage%2Fresultats%2Findex`;

    const data = await this.fetchJson<FdjRemixPayload>(url, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${base}/jeux-de-tirage/loto/resultats/`,
      },
    });
    if (!data) return null;

    // Normalise: dig out the most-recent draw object
    const raw: FdjRemixDraw | null =
      (data.draws ?? data.results ?? data.data?.draws)?.[0] ??
      data.tirage ??
      data.draw ??
      data.lastDraw ??
      data.data?.draw ??
      null;

    if (!raw) return null;

    const numbers = this.extractMainNums(raw);
    const bonus   = this.extractBonus(raw);
    const drawDate = this.extractDateField(raw) ?? this.todayUTC();

    if (numbers.length < 4) return null;
    return { drawDate, numbers: numbers.slice(0, 5), bonus: bonus.slice(0, 1), jackpot: 0 };
  }

  // ── Strategy 2: FDJ HTML page ────────────────────────────────────────────────

  private async tryFdjHtml(base: string): Promise<DrawResult | null> {
    const url = `${base}/jeux-de-tirage/loto/resultats/`;
    const html = await this.fetchPage(url, {
      retries: 2,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });
    if (!html) return null;

    const $ = cheerio.load(html);

    // Draw date
    const drawDate = this.parseDateFromHtml($) ?? this.todayUTC();

    // Main numbers (1–49)
    const numbers: number[] = [];
    const mainSelectors = [
      ".draw-number", ".draw-numbers li", ".ball-number",
      ".boule", "[class*='boule']", "[class*='numero']",
      ".lotto-ball", ".ball", "li.number",
      "[data-draw-number]", "[class*='draw-number']",
    ];
    for (const sel of mainSelectors) {
      $(sel).each((_, el) => {
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n >= 1 && n <= 49 && !numbers.includes(n) && numbers.length < 5) {
          numbers.push(n);
        }
      });
      if (numbers.length >= 4) break;
    }

    // Bonus / numéro chance (1–10)
    const bonus: number[] = [];
    const bonusSelectors = [
      ".chance", ".numero-chance", "[class*='chance']",
      ".complementaire", "[class*='complementaire']",
      ".bonus-ball", ".bonus", "[class*='bonus']",
    ];
    for (const sel of bonusSelectors) {
      $(sel).each((_, el) => {
        if (bonus.length > 0) return;
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n >= 1 && n <= 10) bonus.push(n);
      });
      if (bonus.length > 0) break;
    }

    // JSON-LD / embedded script fallback
    if (numbers.length < 4) {
      $("script[type='application/json'], script[type='application/ld+json']").each((_, el) => {
        if (numbers.length >= 4) return;
        try {
          const json = JSON.parse($(el).html() ?? "{}");
          const nums = this.digNumbers(json);
          if (nums.main.length >= 4) {
            numbers.push(...nums.main.slice(0, 5));
            if (nums.bonus.length > 0) bonus.push(nums.bonus[0]!);
          }
        } catch { /* ignore */ }
      });
    }

    if (numbers.length < 4) return null;

    return { drawDate, numbers: numbers.slice(0, 5), bonus: bonus.slice(0, 1), jackpot: 0 };
  }

  // ── Strategy 3: lotto.net fallback ───────────────────────────────────────────

  private async tryLottoNet(): Promise<DrawResult | null> {
    const url = "https://lotto.net/france-loto/results";
    const html = await this.fetchPage(url, { retries: 1 });
    if (!html) return null;

    const $ = cheerio.load(html);

    // Draw date
    const drawDate = this.parseDateFromHtml($) ?? this.todayUTC();

    // Numbers
    const numbers: number[] = [];
    const bonus: number[] = [];

    // lotto.net renders balls in <li> or <span> inside result lists
    const ballSels = [
      ".balls li", ".result-balls li", ".ball", "li.ball",
      "[class*='ball']", ".winning-numbers li", ".lottery-ball",
    ];
    for (const sel of ballSels) {
      $(sel).each((_, el) => {
        const n = parseInt($(el).text().trim(), 10);
        if (!isNaN(n) && n >= 1 && n <= 49 && numbers.length < 5) numbers.push(n);
      });
      if (numbers.length >= 4) break;
    }

    // Bonus ball
    $(".bonus-ball, .bonus, [class*='bonus'], [class*='chance']").each((_, el) => {
      if (bonus.length > 0) return;
      const n = parseInt($(el).text().trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= 10) bonus.push(n);
    });

    if (numbers.length < 4) return null;
    return { drawDate, numbers: numbers.slice(0, 5), bonus: bonus.slice(0, 1), jackpot: 0 };
  }

  // ── Shared helpers ────────────────────────────────────────────────────────────

  private parseDateFromHtml($: cheerio.CheerioAPI): string | null {
    let result: string | null = null;
    const selectors = ["time[datetime]", "[data-draw-date]", ".draw-date", ".date", "time"];
    for (const sel of selectors) {
      $(sel).each((_, el) => {
        if (result) return;
        const raw = $(el).attr("datetime") ?? $(el).attr("data-draw-date") ?? $(el).text().trim();
        const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
        if (iso) { result = iso[0] ?? null; return; }
        const dmy = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) { result = this.parseDMYDate(dmy[0].replace(/-/g, "/")); }
      });
      if (result) break;
    }
    // Scan raw text as last resort
    if (!result) {
      const text = $.root().text();
      const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (iso) result = iso[1] ?? null;
    }
    return result;
  }

  private extractMainNums(raw: FdjRemixDraw): number[] {
    const candidates: unknown[] = [
      raw.numbers, raw.mainNumbers, raw.boules,
      raw.winning_numbers, raw.winningNumbers,
    ];
    for (const c of candidates) {
      if (Array.isArray(c) && c.length >= 4) {
        const nums = (c as unknown[]).map(Number).filter((n) => n >= 1 && n <= 49);
        if (nums.length >= 4) return nums;
      }
      if (typeof c === "string") {
        const nums = this.parseNumbers(c).filter((n) => n >= 1 && n <= 49);
        if (nums.length >= 4) return nums;
      }
    }
    return [];
  }

  private extractBonus(raw: FdjRemixDraw): number[] {
    const candidates: unknown[] = [
      raw.complementaire, raw.bonus, raw.chance,
      raw.numeroChance, raw.luckyNumber, raw.lucky_number,
    ];
    for (const c of candidates) {
      if (typeof c === "number" && c >= 1 && c <= 10) return [c];
      if (Array.isArray(c) && c.length > 0) {
        const n = Number((c as unknown[])[0]);
        if (n >= 1 && n <= 10) return [n];
      }
      if (typeof c === "string") {
        const n = parseInt(c, 10);
        if (n >= 1 && n <= 10) return [n];
      }
    }
    return [];
  }

  private extractDateField(raw: FdjRemixDraw): string | null {
    const candidates = [raw.drawDate, raw.date, raw.dateDeClôture];
    for (const c of candidates) {
      if (typeof c === "string") {
        const iso = c.match(/\d{4}-\d{2}-\d{2}/);
        if (iso) return iso[0] ?? null;
        const dmy = c.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) return this.parseDMYDate(dmy[0].replace(/-/g, "/"));
      }
    }
    return null;
  }

  /** Recursively dig a JSON blob for arrays of integers in the right ranges */
  private digNumbers(obj: unknown, depth = 0): { main: number[]; bonus: number[] } {
    if (depth > 5 || !obj || typeof obj !== "object") return { main: [], bonus: [] };
    if (Array.isArray(obj)) {
      const nums = (obj as unknown[]).map(Number).filter(isFinite);
      const main = nums.filter((n) => n >= 1 && n <= 49);
      const bonus = nums.filter((n) => n >= 1 && n <= 10);
      if (main.length >= 4) return { main: main.slice(0, 5), bonus: bonus.slice(0, 1) };
    }
    const result = { main: [] as number[], bonus: [] as number[] };
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const sub = this.digNumbers(val, depth + 1);
      if (sub.main.length > result.main.length) {
        result.main  = sub.main;
        result.bonus = sub.bonus;
      }
    }
    return result;
  }
}
