/**
 * Abstract base class for all lottery scrapers.
 *
 * Subclasses implement `scrape(website)` and return a normalised DrawResult
 * or null if no result is available yet.
 */
import type { DrawResult } from "./types";

export abstract class BaseScraper {
  /** Human-readable name used in logs */
  abstract readonly name: string;

  /**
   * Fetch and parse the latest draw from the given website.
   * Returns null if no new result is available (not yet published).
   * Must not throw — catch all errors internally and return null.
   */
  abstract scrape(website: string): Promise<DrawResult | null>;

  // ── Shared helpers ─────────────────────────────────────────────────────────

  /**
   * Download a page with a timeout and optional retry.
   * Returns null on failure rather than throwing.
   */
  protected async fetchPage(
    url: string,
    opts: { timeoutMs?: number; retries?: number; headers?: Record<string, string> } = {}
  ): Promise<string | null> {
    const { timeoutMs = 15_000, retries = 1, headers = {} } = opts;

    const defaultHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      ...headers,
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          headers: defaultHeaders,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) {
          if (attempt < retries) continue;
          return null;
        }
        return await res.text();
      } catch {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 2_000));
          continue;
        }
        return null;
      }
    }
    return null;
  }

  /**
   * Fetch JSON from a URL. Returns null on failure.
   */
  protected async fetchJson<T>(
    url: string,
    opts: { timeoutMs?: number; headers?: Record<string, string> } = {}
  ): Promise<T | null> {
    const { timeoutMs = 15_000, headers = {} } = opts;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 LotteryBot/1.0",
          ...headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  /** Parse "MM/DD/YYYY" → "YYYY-MM-DD" */
  protected parseUSDate(raw: string): string | null {
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    return `${m[3]}-${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
  }

  /** Parse "DD/MM/YYYY" → "YYYY-MM-DD" */
  protected parseDMYDate(raw: string): string | null {
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }

  /** Today's date string "YYYY-MM-DD" in UTC */
  protected todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Extract integers from a comma/space-separated string */
  protected parseNumbers(raw: string): number[] {
    return raw
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
  }
}
