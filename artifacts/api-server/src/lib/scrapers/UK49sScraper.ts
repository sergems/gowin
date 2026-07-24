/**
 * UK 49s scrapers — Brunchtime, Lunchtime, Drivetime, Teatime.
 *
 * Data source: https://api.49s.co.uk/results/latest
 *
 * The official 49s API returns the most-recently completed draw.
 * Each scraper class knows its own event_number (1–4) and only
 * records a result when the latest draw matches that number.
 * The cron (every 5 min) captures each draw within its window;
 * ScraperManager's duplicate check prevents double-recording.
 *
 * API response shape:
 *   { "meta": { "status": 200 },
 *     "events": [
 *       { "type": "numbers", "code": "49",
 *         "event_number": 4,
 *         "scheduled_time": "2026-07-24T17:49:00.000+01:00",
 *         "drawn_time":     "2026-07-24T17:49:26.000+01:00",
 *         "drawns": [
 *           { "order": 0, "number": 9,  "bonus": true  },
 *           { "order": 1, "number": 16, "bonus": false },
 *           ...
 *         ]
 *       }
 *     ]
 *   }
 *
 * event_number mapping:
 *   1 = Brunchtime (~12:49 BST)
 *   2 = Lunchtime  (~13:49 BST)
 *   3 = Drivetime  (~16:49 BST)
 *   4 = Teatime    (~17:49 BST)
 */

import { BaseScraper } from "./BaseScraper";
import type { DrawResult } from "./types";

const API_URL = "https://api.49s.co.uk/results/latest";

/** Headers required by the 49s API — mirrors what the browser SPA sends. */
const API_HEADERS: Record<string, string> = {
  "Accept":           "application/json",
  "X-Requested-With": "sis-web/1.0.0",
  "X-Country-Code":   "GB",
  "Origin":           "https://49s.co.uk",
  "Referer":          "https://49s.co.uk/49s/results",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

interface UK49sDrawn {
  order: number;
  number: number;
  bonus: boolean;
}

interface UK49sEvent {
  type: string;
  code: string;
  event_number: number;
  scheduled_time: string;
  drawn_time?: string;
  status?: string;
  drawns: UK49sDrawn[];
}

interface UK49sResponse {
  meta: { status: number; code: string };
  events: UK49sEvent[];
}

/**
 * Fetch the latest UK 49s draw result for the given event_number.
 * Returns null when the API is unreachable, when no 49s draw has
 * completed yet, or when the current result is for a different draw.
 */
async function fetchUK49sDraw(
  eventNumber: number
): Promise<DrawResult | null> {
  let data: UK49sResponse;
  try {
    const res = await fetch(API_URL, {
      headers: API_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    data = (await res.json()) as UK49sResponse;
  } catch {
    return null;
  }

  if (data?.meta?.status !== 200 || !Array.isArray(data.events)) return null;

  // Find the 49s numbers event matching our draw slot
  const event = data.events.find(
    (e) => e.type === "numbers" && e.code === "49" && e.event_number === eventNumber
  );
  if (!event) return null;

  // Validate the draw happened today (in UTC date terms)
  const todayUTC = new Date().toISOString().slice(0, 10);
  const drawDateStr = event.scheduled_time.slice(0, 10); // "YYYY-MM-DD" (local BST date)

  // BST is UTC+1; the scheduled_time string includes the offset so we parse it
  // correctly to get the UTC calendar date for storage.
  let drawDate: string;
  try {
    drawDate = new Date(event.scheduled_time).toISOString().slice(0, 10);
  } catch {
    drawDate = drawDateStr;
  }

  // Only accept draws from today (UTC). If the date is yesterday (e.g. just
  // after midnight BST before the first draw), accept yesterday's Teatime too
  // so late-settling still works.
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (drawDate !== todayUTC && drawDate !== yesterdayStr) return null;

  // Extract numbers
  const mainNumbers = event.drawns
    .filter((d) => !d.bonus && typeof d.number === "number")
    .map((d) => d.number)
    .sort((a, b) => a - b);

  const bonusNumbers = event.drawns
    .filter((d) => d.bonus && typeof d.number === "number")
    .map((d) => d.number);

  if (mainNumbers.length < 5) return null;

  return {
    drawDate,
    numbers: mainNumbers.slice(0, 6),
    bonus: bonusNumbers.slice(0, 1),
    jackpot: 0,
  };
}

// ── Brunchtime (event_number = 1, ~12:49 BST) ──────────────────────────────

export class UK49sBrunchtimeScraper extends BaseScraper {
  readonly name = "UK49sBrunchtimeScraper";

  async scrape(_website: string): Promise<DrawResult | null> {
    return fetchUK49sDraw(1);
  }
}

// ── Lunchtime (event_number = 2, ~13:49 BST) ───────────────────────────────

export class UK49sLunchtimeScraper extends BaseScraper {
  readonly name = "UK49sLunchtimeScraper";

  async scrape(_website: string): Promise<DrawResult | null> {
    return fetchUK49sDraw(2);
  }
}

// ── Drivetime (event_number = 3, ~16:49 BST) ───────────────────────────────

export class UK49sDrivetimeScraper extends BaseScraper {
  readonly name = "UK49sDrivetimeScraper";

  async scrape(_website: string): Promise<DrawResult | null> {
    return fetchUK49sDraw(3);
  }
}

// ── Teatime (event_number = 4, ~17:49 BST) ─────────────────────────────────

export class UK49sTeatimeScraper extends BaseScraper {
  readonly name = "UK49sTeatimeScraper";

  async scrape(_website: string): Promise<DrawResult | null> {
    return fetchUK49sDraw(4);
  }
}
