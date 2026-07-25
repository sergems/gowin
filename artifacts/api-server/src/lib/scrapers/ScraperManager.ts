/**
 * ScraperManager — orchestrates the full scraping → settlement pipeline.
 *
 * Flow for each active game with a configured scraper:
 *   1. Load game from DB
 *   2. Instantiate the scraper class from the registry
 *   3. Call scraper.scrapeMany(website) → DrawResult[]  (oldest-first)
 *      - GosLoto scrapers return ALL draws from the last 24 h from game-specific
 *        pages, enabling catch-up after downtime gaps.
 *      - Other scrapers fall back to a single result via scrape().
 *   4. For each DrawResult:
 *        a. Duplicate check using ±90-min window when drawDatetime is set,
 *           or full calendar day otherwise.
 *        b. If not a duplicate: settle the nearest pending draw (or create one).
 *   5. After all results processed: ensure at least one future pending draw exists.
 *   6. Write to scraper_logs and settlement_logs.
 *
 * A mutex flag prevents concurrent runs (cron overlap protection).
 */
import {
  db,
  lotteryGamesTable,
  lotteryDrawsTable,
  scraperLogsTable,
  settlementLogsTable,
} from "@workspace/db";
import { eq, and, isNotNull, lte, gte } from "drizzle-orm";
import { logger } from "../logger";
import { settleLotteryDraw } from "../lotterySettle";
import { getScraperByClass } from "./ScraperRegistry";
import type { DrawResult, ScraperStatus } from "./types";

export interface ScraperRunResult {
  gameId: number;
  gameName: string;
  scraperClass: string;
  status: ScraperStatus;
  message: string;
  executionTimeMs: number;
  drawDate?: string;
  numbers?: number[];
  bonus?: number[];
}

let _running = false;

/**
 * Run all active scrapers. Skips if a run is already in progress.
 * Safe to call from a cron job at any interval.
 */
export async function runAllScrapers(): Promise<ScraperRunResult[]> {
  if (_running) {
    logger.warn("Scraper run skipped — previous run still in progress");
    return [];
  }

  _running = true;
  const results: ScraperRunResult[] = [];

  try {
    const games = await db
      .select()
      .from(lotteryGamesTable)
      .where(and(eq(lotteryGamesTable.isActive, true), isNotNull(lotteryGamesTable.scraperClass)));

    for (const game of games) {
      const result = await runScraper(game.id);
      results.push(result);
      // Small stagger between scrapers to be polite to upstream sites
      await sleep(1_500);
    }
  } finally {
    _running = false;
  }

  logger.info(
    {
      total: results.length,
      success: results.filter((r) => r.status === "SUCCESS").length,
      failed: results.filter((r) => r.status === "FAILED").length,
      duplicate: results.filter((r) => r.status === "DUPLICATE").length,
      noResult: results.filter((r) => r.status === "NO_RESULT").length,
    },
    "Scraper batch complete"
  );

  return results;
}

/**
 * Run the scraper for a single game by gameId.
 * Always resolves (never throws) — errors become FAILED status.
 */
export async function runScraper(gameId: number): Promise<ScraperRunResult> {
  const start = Date.now();

  // Load game
  const [game] = await db
    .select()
    .from(lotteryGamesTable)
    .where(eq(lotteryGamesTable.id, gameId))
    .limit(1);

  if (!game) {
    return makeResult(gameId, "Unknown", "Unknown", "FAILED", "Game not found", Date.now() - start);
  }

  const scraperClass = game.scraperClass ?? "";
  const website = game.website ?? "";

  if (!scraperClass || !website) {
    return makeResult(
      gameId,
      game.name,
      scraperClass || "(none)",
      "FAILED",
      "No scraper_class or website configured for this game",
      Date.now() - start
    );
  }

  const scraper = getScraperByClass(scraperClass);
  if (!scraper) {
    const msg = `Scraper class "${scraperClass}" is not registered`;
    await writeScraperLog(gameId, website, "FAILED", msg, Date.now() - start);
    return makeResult(gameId, game.name, scraperClass, "FAILED", msg, Date.now() - start);
  }

  // Run the scraper — get ALL recent draws (oldest first)
  let drawResults: DrawResult[];
  try {
    drawResults = await scraper.scrapeMany(website);
  } catch (err) {
    const msg = `Scraper threw: ${err instanceof Error ? err.message : String(err)}`;
    logger.error({ err, gameId, scraperClass }, "Scraper threw unexpectedly");
    await writeScraperLog(gameId, website, "FAILED", msg, Date.now() - start);
    return makeResult(gameId, game.name, scraperClass, "FAILED", msg, Date.now() - start);
  }

  if (drawResults.length === 0) {
    const msg = "No result available yet (site returned no data)";
    await writeScraperLog(gameId, website, "NO_RESULT", msg, Date.now() - start);
    return makeResult(gameId, game.name, scraperClass, "NO_RESULT", msg, Date.now() - start);
  }

  // Process each draw result independently (oldest-first order)
  let settledCount = 0;
  let duplicateCount = 0;

  for (const result of drawResults) {
    const outcome = await processDrawResult(gameId, result);
    if (outcome === "settled") {
      settledCount++;
    } else if (outcome === "duplicate") {
      duplicateCount++;
    } else {
      // outcome is an Error — log and continue to next draw
      logger.warn(
        { gameId, drawDatetime: result.drawDatetime, err: outcome.message },
        "Settlement failed for one draw; continuing"
      );
    }
  }

  // Ensure at least one future pending draw exists (run once after all settlements)
  const [stillPending] = await db
    .select({ id: lotteryDrawsTable.id })
    .from(lotteryDrawsTable)
    .where(and(eq(lotteryDrawsTable.gameId, gameId), eq(lotteryDrawsTable.status, "pending")))
    .limit(1);

  if (!stillPending) {
    const nextDate = new Date();
    nextDate.setUTCDate(nextDate.getUTCDate() + 7);
    await db.insert(lotteryDrawsTable).values({
      gameId,
      drawDate: nextDate,
      jackpot: game.jackpot,
      winningNumbers: [],
      bonusNumbers: [],
      status: "pending",
    });
  }

  const execMs = Date.now() - start;

  // Build summary message and determine overall status
  let status: ScraperStatus;
  let msg: string;

  if (settledCount > 0) {
    const lastResult = drawResults[drawResults.length - 1]!;
    const numsStr = lastResult.numbers.join(",");
    const bonusStr = lastResult.bonus.length ? `+[${lastResult.bonus.join(",")}]` : "";
    msg = `Settled ${settledCount} draw(s) ${numsStr}${bonusStr}`;
    if (duplicateCount > 0) msg += ` (${duplicateCount} duplicate(s) skipped)`;
    if (drawResults.length > 1) msg += ` — ${drawResults.length} draws checked`;
    status = "SUCCESS";
    logger.info({ gameId, gameName: game.name, settledCount, duplicateCount }, "Scraper settled draws");
  } else if (duplicateCount > 0) {
    const result = drawResults[drawResults.length - 1]!;
    const windowDesc = result.drawDatetime
      ? `±90 min around ${result.drawDatetime}`
      : `calendar day ${result.drawDate}`;
    msg = `All ${duplicateCount} draw(s) already settled (${windowDesc})`;
    status = "DUPLICATE";
  } else {
    msg = "No draws could be settled";
    status = "FAILED";
  }

  await writeScraperLog(gameId, website, status, msg, execMs);

  const lastResult = drawResults[drawResults.length - 1]!;
  return makeResult(
    gameId, game.name, scraperClass, status, msg, execMs,
    lastResult.drawDate, lastResult.numbers, lastResult.bonus
  );
}

// ── Per-draw settlement ────────────────────────────────────────────────────────

/**
 * Process a single DrawResult for a game.
 * Returns "settled", "duplicate", or an Error.
 */
async function processDrawResult(
  gameId: number,
  result: DrawResult
): Promise<"settled" | "duplicate" | Error> {
  // Determine time window for duplicate check and pending-draw lookup.
  //
  // When drawDatetime is set (full UTC timestamp), use a ±90-minute window so
  // games that draw multiple times per day (4/20 draws many times/day, 6/45 draws
  // 7×/day) can settle each draw independently. Without a precise time we fall
  // back to the full calendar-day window so single-draw-per-day scrapers are
  // unaffected.
  let drawDateStart: Date;
  let drawDateEnd: Date;
  const NARROW_WINDOW_MS = 90 * 60_000; // ±90 minutes

  if (result.drawDatetime) {
    const dt = new Date(result.drawDatetime);
    drawDateStart = new Date(dt.getTime() - NARROW_WINDOW_MS);
    drawDateEnd   = new Date(dt.getTime() + NARROW_WINDOW_MS);
  } else {
    drawDateStart = new Date(result.drawDate + "T00:00:00Z");
    drawDateEnd   = new Date(result.drawDate + "T23:59:59Z");
  }

  // Duplicate check
  const [existing] = await db
    .select({ id: lotteryDrawsTable.id })
    .from(lotteryDrawsTable)
    .where(
      and(
        eq(lotteryDrawsTable.gameId, gameId),
        eq(lotteryDrawsTable.status, "settled"),
        gte(lotteryDrawsTable.drawDate, drawDateStart),
        lte(lotteryDrawsTable.drawDate, drawDateEnd)
      )
    )
    .limit(1);

  if (existing) {
    return "duplicate";
  }

  // Find a pending draw within the same time window
  const [pendingDraw] = await db
    .select()
    .from(lotteryDrawsTable)
    .where(
      and(
        eq(lotteryDrawsTable.gameId, gameId),
        eq(lotteryDrawsTable.status, "pending"),
        gte(lotteryDrawsTable.drawDate, drawDateStart),
        lte(lotteryDrawsTable.drawDate, drawDateEnd),
      ),
    )
    .orderBy(lotteryDrawsTable.drawDate)
    .limit(1);

  let drawId: number;

  if (pendingDraw) {
    drawId = pendingDraw.id;
  } else {
    // No matching pending draw — create a settled-placeholder at the draw time
    const drawTimestamp = result.drawDatetime
      ? new Date(result.drawDatetime)
      : new Date(result.drawDate + "T20:00:00Z");

    const jackpot = (result.jackpot ?? 0).toFixed(2);
    const [newDraw] = await db
      .insert(lotteryDrawsTable)
      .values({
        gameId,
        drawDate: drawTimestamp,
        jackpot,
        winningNumbers: result.numbers,
        bonusNumbers: result.bonus,
        status: "pending",
      })
      .returning();
    drawId = newDraw!.id;
  }

  // Settle the draw
  const settleStart = Date.now();
  let settleResult;
  try {
    settleResult = await settleLotteryDraw(drawId, result.numbers, result.bonus);
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
  const settleMs = Date.now() - settleStart;

  // Write settlement log
  await db.insert(settlementLogsTable).values({
    drawId,
    gameId,
    ticketsChecked: settleResult.settled,
    winningTickets: settleResult.winners,
    totalPaid: "0.00",
    executionTime: settleMs,
  });

  return "settled";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function writeScraperLog(
  gameId: number,
  website: string,
  status: ScraperStatus,
  message: string,
  executionTime: number
): Promise<void> {
  try {
    await db.insert(scraperLogsTable).values({ gameId, website, status, message, executionTime });
  } catch (err) {
    logger.error({ err }, "Failed to write scraper log");
  }
}

function makeResult(
  gameId: number,
  gameName: string,
  scraperClass: string,
  status: ScraperStatus,
  message: string,
  executionTimeMs: number,
  drawDate?: string,
  numbers?: number[],
  bonus?: number[]
): ScraperRunResult {
  return { gameId, gameName, scraperClass, status, message, executionTimeMs, drawDate, numbers, bonus };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
