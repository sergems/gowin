/**
 * TheLotter scrapers — unified scraping engine for https://www.thelotter.com/lottery-results/
 *
 * TheLotter embeds draw results as a JSON blob inside each result page.
 * The relevant fields are:
 *   "winningNumbersRegular"   → semicolon-separated main balls  e.g. "3;4;24;36;47"
 *   "winningNumbersAdditional"→ semicolon-separated bonus balls e.g. "17"
 *   "drawDateTime"            → ISO-8601 datetime               e.g. "2026-07-26T02:59:00"
 *
 * Each subclass only needs to declare:
 *   readonly name            — human-readable scraper name
 *   readonly thelotterSlug   — the path segment in the TheLotter URL
 *   readonly expectedMain    — how many main numbers to expect
 *   readonly expectedBonus   — how many bonus numbers to expect (0 = none)
 */

import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";

// ── Base ─────────────────────────────────────────────────────────────────────

abstract class TheLotterBaseScraper extends BaseScraper {
  /** URL slug used in https://www.thelotter.com/lottery-results/{slug}/ */
  abstract readonly thelotterSlug: string;
  abstract readonly expectedMain: number;
  abstract readonly expectedBonus: number;

  // scrape() ignores the `website` arg — URL is derived from thelotterSlug
  async scrape(_website: string): Promise<DrawResult | null> {
    const url = `https://www.thelotter.com/lottery-results/${this.thelotterSlug}/`;
    const html = await this.fetchPage(url, {
      timeoutMs: 25_000,
      retries: 2,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: "https://www.thelotter.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Upgrade-Insecure-Requests": "1",
      },
    });
    if (!html) return null;

    return this.parseTheLotterHtml(html);
  }

  protected parseTheLotterHtml(html: string): DrawResult | null {
    // Extract the first occurrence of each key from the embedded JSON blob
    const regularMatch = /"winningNumbersRegular"\s*:\s*"([^"]+)"/.exec(html);
    const additionalMatch = /"winningNumbersAdditional"\s*:\s*"([^"]*)"/.exec(html);
    const dateMatch = /"drawDateTime"\s*:\s*"([^"]+)"/.exec(html);

    if (!regularMatch?.[1] || !dateMatch?.[1]) return null;

    const regular = regularMatch[1]!;
    const additional = additionalMatch?.[1] ?? "";
    const drawDateTime = dateMatch[1]!;

    const numbers = regular
      .split(";")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const bonus = additional
      ? additional
          .split(";")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n) && n > 0)
      : [];

    if (numbers.length < this.expectedMain) return null;

    // drawDateTime is "YYYY-MM-DDTHH:mm:ss" — take the date portion
    const drawDate = drawDateTime.slice(0, 10);

    return {
      drawDate,
      numbers: numbers.slice(0, this.expectedMain),
      bonus: bonus.slice(0, this.expectedBonus),
      jackpot: 0,
    };
  }
}

// ── USA ───────────────────────────────────────────────────────────────────────

/** US Powerball — 5 main (1–69) + 1 Powerball (1–26). Draws Mon/Wed/Sat. */
export class TheLotterPowerballScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterPowerballScraper";
  readonly thelotterSlug = "usa-powerball";
  readonly expectedMain = 5;
  readonly expectedBonus = 1;
}

/** US Mega Millions — 5 main (1–70) + 1 Mega Ball (1–25). Draws Tue/Fri. */
export class TheLotterMegaMillionsScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterMegaMillionsScraper";
  readonly thelotterSlug = "usa-megamillions";
  readonly expectedMain = 5;
  readonly expectedBonus = 1;
}

// ── Australia ─────────────────────────────────────────────────────────────────

/** Australia OZ Lotto — 7 main (1–47) + 2 supplementary (1–47). Draws Tuesdays. */
export class TheLotterAusOzLottoScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterAusOzLottoScraper";
  readonly thelotterSlug = "australia-oz-lotto";
  readonly expectedMain = 7;
  readonly expectedBonus = 2;
}

/** Australia Powerball — 7 main (1–35) + 1 Powerball (1–20). Draws Thursdays. */
export class TheLotterAusPowerballScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterAusPowerballScraper";
  readonly thelotterSlug = "australia-powerball-lotto";
  readonly expectedMain = 7;
  readonly expectedBonus = 1;
}

/** Australia Saturday Lotto — 6 main (1–45) + 2 supplementary (1–45). Draws Saturdays. */
export class TheLotterAusSaturdayLottoScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterAusSaturdayLottoScraper";
  readonly thelotterSlug = "australia-saturday-lotto";
  readonly expectedMain = 6;
  readonly expectedBonus = 2;
}

/** Australia Weekday Windfall — 6 main (1–45) + 2 supplementary. Draws Wed/Sat. */
export class TheLotterAusWeekdayWindfallScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterAusWeekdayWindfallScraper";
  readonly thelotterSlug = "australia-weekday-windfall";
  readonly expectedMain = 6;
  readonly expectedBonus = 2;
}

// ── Europe ────────────────────────────────────────────────────────────────────

/** Austria Lotto — 6 main (1–45) + 1 bonus (1–45). Draws Wed/Sun. */
export class TheLotterAustriaLottoScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterAustriaLottoScraper";
  readonly thelotterSlug = "austria-lotto";
  readonly expectedMain = 6;
  readonly expectedBonus = 1;
}

/** EuroDreams — 6 main (1–40) + 1 Dream Number (1–5). Draws Mon/Thu. */
export class TheLotterEuroDreamsScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterEuroDreamsScraper";
  readonly thelotterSlug = "eurodreams";
  readonly expectedMain = 6;
  readonly expectedBonus = 1;
}

/** Spain El Gordo de la Primitiva — 5 main (1–54) + 1 key number (1–10). Draws Sundays. */
export class TheLotterSpainElGordoScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterSpainElGordoScraper";
  readonly thelotterSlug = "spain-el-gordo";
  readonly expectedMain = 5;
  readonly expectedBonus = 1;
}

/** Germany Lotto 6/49 — 6 main (1–49) + 1 Superzahl (1–9). Draws Wed/Sat. */
export class TheLotterGermanyLottoScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterGermanyLottoScraper";
  readonly thelotterSlug = "germany-lotto";
  readonly expectedMain = 6;
  readonly expectedBonus = 1;
}

/** Italy SuperEnalotto — 6 main (1–90) + 1 Superstar (1–90). Draws Tue/Thu/Sat. */
export class TheLotterItalySuperEnalottoScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterItalySuperEnalottoScraper";
  readonly thelotterSlug = "italy-superenalotto";
  readonly expectedMain = 6;
  readonly expectedBonus = 1;
}

// ── Canada ────────────────────────────────────────────────────────────────────

/** Canada Lotto 6/49 — 6 main (1–49) + 1 bonus (1–49). Draws Wed/Sat. */
export class TheLotterCanadaLotto649Scraper extends TheLotterBaseScraper {
  readonly name = "TheLotterCanadaLotto649Scraper";
  readonly thelotterSlug = "canada-lotto-649";
  readonly expectedMain = 6;
  readonly expectedBonus = 1;
}

/** Canada Ontario 49 — 6 main (1–49) + 1 bonus (1–49). Draws daily. */
export class TheLotterCanadaOntario49Scraper extends TheLotterBaseScraper {
  readonly name = "TheLotterCanadaOntario49Scraper";
  readonly thelotterSlug = "canada-ontario-49";
  readonly expectedMain = 6;
  readonly expectedBonus = 1;
}

// ── New Zealand ───────────────────────────────────────────────────────────────

/** New Zealand Powerball — 6 main (1–40) + 1 Powerball (1–10). Draws Saturdays. */
export class TheLotterNZPowerballScraper extends TheLotterBaseScraper {
  readonly name = "TheLotterNZPowerballScraper";
  readonly thelotterSlug = "new-zealand-powerball";
  readonly expectedMain = 6;
  readonly expectedBonus = 1;
}
