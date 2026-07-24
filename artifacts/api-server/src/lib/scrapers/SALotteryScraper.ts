/**
 * South African National Lottery results scraper.
 *
 * The National Lottery results screen is a JavaScript SPA and is protected by
 * a CDN in some hosting regions. We try the configured National Lottery URL
 * first, then use the server-rendered lottery.co.za results page as a
 * public fallback. Every parser is game-specific so a result from one game
 * can never be silently applied to another game's draw.
 *
 * Supported games:
 *   - Daily Lotto: 5/36, no bonus
 *   - Lotto: 6/52 + bonus
 *   - Lotto Plus 1: 6/52 + bonus
 *   - Lotto 5 Max: 6/52 + bonus
 *   - PowerBall: 5/50 + PowerBall 1/20
 *   - PowerBall XTRA: 5/50 + PowerBall 1/20
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";
import * as cheerio from "cheerio";

type SALotteryKind =
  | "daily-lotto"
  | "lotto"
  | "lotto-plus-1"
  | "lotto-5-max"
  | "powerball"
  | "powerball-xtra";

type GameSpec = {
  kind: SALotteryKind;
  fallbackPath: string;
  mainSelector: string;
  bonusSelector: string | null;
  mainCount: number;
  mainMax: number;
  bonusCount: number;
  bonusMax: number;
};

const GAME_SPECS: Record<SALotteryKind, GameSpec> = {
  "daily-lotto": {
    kind: "daily-lotto",
    fallbackPath: "/daily-lotto/results",
    mainSelector: ".daily-lotto-ball",
    bonusSelector: null,
    mainCount: 5,
    mainMax: 36,
    bonusCount: 0,
    bonusMax: 0,
  },
  lotto: {
    kind: "lotto",
    fallbackPath: "/lotto/results",
    mainSelector: ".lotto-ball",
    bonusSelector: ".lotto-bonus-ball",
    mainCount: 6,
    mainMax: 52,
    bonusCount: 1,
    bonusMax: 52,
  },
  "lotto-plus-1": {
    kind: "lotto-plus-1",
    fallbackPath: "/lotto-plus-1/results",
    mainSelector: ".lotto-ball",
    bonusSelector: ".lotto-bonus-ball",
    mainCount: 6,
    mainMax: 52,
    bonusCount: 1,
    bonusMax: 52,
  },
  "lotto-5-max": {
    kind: "lotto-5-max",
    fallbackPath: "/lotto-5-max/results",
    mainSelector: ".lotto-ball",
    bonusSelector: ".lotto-bonus-ball",
    mainCount: 6,
    mainMax: 52,
    bonusCount: 1,
    bonusMax: 52,
  },
  powerball: {
    kind: "powerball",
    fallbackPath: "/powerball/results",
    mainSelector: ".powerball-ball",
    bonusSelector: ".powerball-powerball",
    mainCount: 5,
    mainMax: 50,
    bonusCount: 1,
    bonusMax: 20,
  },
  "powerball-xtra": {
    kind: "powerball-xtra",
    fallbackPath: "/powerball-xtra/results",
    mainSelector: ".powerball-ball",
    bonusSelector: ".powerball-powerball",
    mainCount: 5,
    mainMax: 50,
    bonusCount: 1,
    bonusMax: 20,
  },
};

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

export class SALotteryScraper extends BaseScraper {
  readonly name = "SALotteryScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    const kind = this.getKind(website);
    const spec = GAME_SPECS[kind];
    const configuredUrl = website.split("#", 1)[0]?.replace(/\/$/, "") || "";

    // The requested National Lottery results screen is tried first. In
    // regions where its CDN blocks server requests, this returns null.
    if (configuredUrl) {
      const officialHtml = await this.fetchPage(configuredUrl, {
        retries: 2,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          Referer: "https://www.nationallottery.co.za/",
        },
      });
      const officialResult = officialHtml
        ? this.parseHtml(officialHtml, spec)
        : null;
      if (officialResult) return officialResult;
    }

    // lottery.co.za publishes the same National Lottery result feed as
    // server-rendered HTML and is used only when the official SPA is blocked.
    const fallbackHtml = await this.fetchPage(
      `https://www.lottery.co.za${spec.fallbackPath}`,
      {
        retries: 2,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-ZA,en;q=0.8",
        },
      },
    );
    return fallbackHtml ? this.parseHtml(fallbackHtml, spec) : null;
  }

  private getKind(website: string): SALotteryKind {
    const value = website.toLowerCase();
    // Match the most specific slugs first: "lotto" is also contained in
    // "lotto-plus-1" and "lotto-5-max".
    const kinds = (Object.keys(GAME_SPECS) as SALotteryKind[]).sort(
      (a, b) => b.length - a.length,
    );
    for (const kind of kinds) {
      if (value.includes(kind)) return kind;
    }
    return "lotto";
  }

  private parseHtml(html: string, spec: GameSpec): DrawResult | null {
    const $ = cheerio.load(html);
    const box = $(".resultBox.latest").first().length
      ? $(".resultBox.latest").first()
      : $(".resultBox").first();
    if (!box.length) return null;

    const drawDate = this.parseDate(
      box.find(".latestHeader, .sideHeader").first().text(),
    );
    if (!drawDate) return null;

    // The pages contain both ascending and drawn-order copies of the balls.
    // Only read the visible ascending block to avoid duplicate values.
    const numberScope = box.find("span[id^='ascending']").first().length
      ? box.find("span[id^='ascending']").first()
      : box;
    const numbers = this.readNumbers(
      numberScope,
      spec.mainSelector,
      spec.mainCount,
      spec.mainMax,
      $,
    );
    const bonus = spec.bonusSelector
      ? this.readNumbers(
          numberScope,
          spec.bonusSelector,
          spec.bonusCount,
          spec.bonusMax,
          $,
        )
      : [];

    if (
      numbers.length !== spec.mainCount ||
      bonus.length !== spec.bonusCount ||
      new Set(numbers).size !== numbers.length
    ) {
      return null;
    }

    return {
      drawDate,
      numbers,
      bonus,
      jackpot: this.parseJackpot(box.find(".jBox, .resultJackpot").first().text()),
    };
  }

  private readNumbers(
    scope: cheerio.Cheerio<cheerio.Element>,
    selector: string,
    count: number,
    max: number,
    $: cheerio.CheerioAPI,
  ): number[] {
    const numbers: number[] = [];
    scope.find(selector).each((_, el) => {
      if (numbers.length >= count) return;
      const value = parseInt($(el).text().trim(), 10);
      if (Number.isInteger(value) && value >= 1 && value <= max) {
        numbers.push(value);
      }
    });
    return numbers;
  }

  private parseDate(raw: string): string | null {
    const iso = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso?.[1]) return iso[1];

    const dmy = raw.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
    if (dmy) return this.parseDMYDate(dmy[0].replace(/-/g, "/"));

    const named = raw.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/);
    if (!named) return null;
    const month = MONTHS[named[2]!.toLowerCase()];
    if (!month) return null;
    return `${named[3]}-${month}-${named[1]!.padStart(2, "0")}`;
  }

  private parseJackpot(raw: string): number {
    const value = raw.replace(/,/g, "").match(/R\s*([\d.]+)/i);
    return value?.[1] ? Number(value[1]) || 0 : 0;
  }
}