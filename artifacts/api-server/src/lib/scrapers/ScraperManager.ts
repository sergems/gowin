/**
 * ScraperManager — orchestrates the full scraping → settlement pipeline.
 *
 * Flow for each active game with a configured scraper:
 *   1. Load game from DB
 *   2. Instantiate the scraper class from the registry
 *   3. Call scraper.scrape(website) → DrawResult | null
 *   4. Duplicate check: if a settled draw already exists for this (game, drawDate) → log DUPLICATE
 *   5. If new result: settle the nearest pending draw (or create a settled record)
 *   6. Write to settlement_logs
 *   7. Write to scraper_logs
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
import type { ScraperStatus } from "./types";

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

  // Run the scraper
  let result;
  try {
    result = await scraper.scrape(website);
  } catch (err) {
    const msg = `Scraper threw: ${err instanceof Error ? err.message : String(err)}`;
    logger.error({ err, gameId, scraperClass }, "Scraper threw unexpectedly");
    await writeScraperLog(gameId, website, "FAILED", msg, Date.now() - start);
    return makeResult(gameId, game.name, scraperClass, "FAILED", msg, Date.now() - start);
  }

  if (!result) {
    const msg = "No result available yet (site returned no data)";
    await writeScraperLog(gameId, website, "NO_RESULT", msg, Date.now() - start);
    return makeResult(gameId, game.name, scraperClass, "NO_RESULT", msg, Date.now() - start);
  }

  // Duplicate check: is there already a settled draw for this game on this date?
  const drawDateStart = new Date(result.drawDate + "T00:00:00Z");
  const drawDateEnd = new Date(result.drawDate + "T23:59:59Z");

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
    const msg = `Duplicate: draw for ${result.drawDate} already settled (draw #${existing.id})`;
    await writeScraperLog(gameId, website, "DUPLICATE", msg, Date.now() - start);
    return makeResult(
      gameId, game.name, scraperClass, "DUPLICATE", msg, Date.now() - start,
      result.drawDate, result.numbers, result.bonus
    );
  }

  // Find the nearest pending draw for this game
  const [pendingDraw] = await db
    .select()
    .from(lotteryDrawsTable)
    .where(and(eq(lotteryDrawsTable.gameId, gameId), eq(lotteryDrawsTable.status, "pending")))
    .orderBy(lotteryDrawsTable.drawDate)
    .limit(1);

  let drawId: number;

  if (pendingDraw) {
    // Settle the existing pending draw with the scraped numbers
    drawId = pendingDraw.id;
  } else {
    // No pending draw — create a settled record to store the result
    const jackpot = (result.jackpot ?? 0).toFixed(2);
    const [newDraw] = await db
      .insert(lotteryDrawsTable)
      .values({
        gameId,
        drawDate: new Date(result.drawDate + "T20:00:00Z"),
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
    const msg = `Settlement failed: ${err instanceof Error ? err.message : String(err)}`;
    logger.error({ err, drawId, gameId }, "Settlement failed during scraper run");
    await writeScraperLog(gameId, website, "FAILED", msg, Date.now() - start);
    return makeResult(gameId, game.name, scraperClass, "FAILED", msg, Date.now() - start,
      result.drawDate, result.numbers, result.bonus);
  }
  const settleMs = Date.now() - settleStart;

  // Write settlement log
  const totalPaid = 0; // settleLotteryDraw credits individually; we track count only
  await db.insert(settlementLogsTable).values({
    drawId,
    gameId,
    ticketsChecked: settleResult.settled,
    winningTickets: settleResult.winners,
    totalPaid: totalPaid.toFixed(2),
    executionTime: settleMs,
  });

  // Ensure next pending draw exists for this game
  const [stillPending] = await db
    .select({ id: lotteryDrawsTable.id })
    .from(lotteryDrawsTable)
    .where(and(eq(lotteryDrawsTable.gameId, gameId), eq(lotteryDrawsTable.status, "pending")))
    .limit(1);

  if (!stillPending) {
    // Create a placeholder pending draw 7 days out so users can keep placing tickets
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
  const msg =
    `Settled draw #${drawId}: ${result.numbers.join(",")}` +
    (result.bonus.length ? `+[${result.bonus.join(",")}]` : "") +
    ` — ${settleResult.settled} tickets checked, ${settleResult.winners} winners`;

  await writeScraperLog(gameId, website, "SUCCESS", msg, execMs);

  logger.info({ gameId, gameName: game.name, drawId, ...settleResult }, "Scraper settled draw");

  return makeResult(
    gameId, game.name, scraperClass, "SUCCESS", msg, execMs,
    result.drawDate, result.numbers, result.bonus
  );
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
