/**
 * Shared types for the lottery scraper engine.
 */

/** Normalised result returned by every scraper class. */
export interface DrawResult {
  /** ISO date string: "YYYY-MM-DD" */
  drawDate: string;
  /** Optional human-readable draw number / identifier */
  drawNumber?: string;
  /** Main winning numbers (sorted, integers) */
  numbers: number[];
  /** Bonus / lucky-star numbers */
  bonus: number[];
  /** Jackpot value in the game's native currency (raw number, 0 if unknown) */
  jackpot: number;
}

export type ScraperStatus = "SUCCESS" | "FAILED" | "NO_RESULT" | "DUPLICATE";
