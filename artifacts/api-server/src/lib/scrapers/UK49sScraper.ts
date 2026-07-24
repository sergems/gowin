/**
 * UK 49s Lunchtime & Teatime scraper.
 *
 * The 49s.co.uk results page embeds JSON-LD structured data for each draw,
 * so we don't need Firebase auth — just parse the <script type="application/ld+json">
 * tags from the SSR-rendered HTML (accessible with a Googlebot user-agent).
 *
 * JSON-LD shape:
 *   { "@type": "Event", "name": "Lunchtime Draw Results",
 *     "startDate": "2026-07-24T12:49:00.000Z",
 *     "resultNumbers": [3, 12, 22, 37, 41, 47],
 *     "bonusNumbers": [8] }
 *
 * We create two separate scraper classes (Lunchtime / Teatime) so each maps
 * to its own DB game entry — the existing single-result pipeline is unchanged.
 */
import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";

interface UK49sJsonLD {
  "@type"?: string;
  name?: string;
  startDate?: string;
  resultNumbers?: number[];
  bonusNumbers?: number[];
}

/**
 * Fetch and parse all UK 49s draws from the results page,
 * then filter to a specific draw type keyword (e.g. "Lunchtime").
 */
async function fetchDraw(
  website: string,
  drawKeyword: string,
  base: BaseScraper
): Promise<DrawResult | null> {
  // The site renders JSON-LD for Googlebot / structured-data crawlers
  const html = await (base as any).fetchPage(website, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      Accept: "text/html",
    },
    retries: 2,
  });
  if (!html) return null;

  // Extract every <script type="application/ld+json"> block
  const scriptRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const draws: UK49sJsonLD[] = [];
  let m: RegExpExecArray | null;

  while ((m = scriptRegex.exec(html)) !== null) {
    try {
      const json: UK49sJsonLD | UK49sJsonLD[] = JSON.parse(m[1]!);
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (
          item["@type"] === "Event" &&
          item.name &&
          item.resultNumbers &&
          item.resultNumbers.length >= 5
        ) {
          draws.push(item);
        }
      }
    } catch {
      // ignore malformed blocks
    }
  }

  if (draws.length === 0) return null;

  // Find the most recent draw matching our keyword (Lunchtime / Teatime)
  const keyword = drawKeyword.toLowerCase();
  const matching = draws.filter((d) => d.name?.toLowerCase().includes(keyword));
  if (matching.length === 0) return null;

  // Sort by startDate descending and pick the latest
  matching.sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return db - da;
  });

  const latest = matching[0]!;
  const numbers = (latest.resultNumbers ?? []).filter(
    (n): n is number => typeof n === "number" && n > 0
  );
  const bonus = (latest.bonusNumbers ?? []).filter(
    (n): n is number => typeof n === "number" && n > 0
  );

  if (numbers.length < 5) return null;

  // Derive draw date from startDate (ISO → "YYYY-MM-DD")
  const drawDate = latest.startDate
    ? latest.startDate.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return { drawDate, numbers: numbers.slice(0, 6), bonus: bonus.slice(0, 1), jackpot: 0 };
}

// ── Lunchtime ──────────────────────────────────────────────────────────────

export class UK49sLunchtimeScraper extends BaseScraper {
  readonly name = "UK49sLunchtimeScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    return fetchDraw(website, "lunchtime", this);
  }
}

// ── Teatime ────────────────────────────────────────────────────────────────

export class UK49sTeatimeScraper extends BaseScraper {
  readonly name = "UK49sTeatimeScraper";

  async scrape(website: string): Promise<DrawResult | null> {
    // Also try "Teatime" and "Drivetime" (the site uses both names)
    const result =
      (await fetchDraw(website, "teatime", this)) ??
      (await fetchDraw(website, "drivetime", this));
    return result;
  }
}
