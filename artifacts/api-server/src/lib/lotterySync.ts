/**
 * APIVerve lottery sync.
 *
 * Runs on a schedule to:
 *  1. Fetch the latest draw result for each supported game from APIVerve.
 *  2. Settle any pending draw whose date has passed using the real winning numbers.
 *  3. Update the game's jackpot and next draw date from the API response.
 *  4. Create a new pending draw for the next scheduled date when none exists.
 *
 * Supported games (APIVerve free tier): Powerball, Mega Millions, EuroMillions.
 * The remaining seeded games (EuroJackpot, UK Lotto, SA Lotto, etc.) remain on
 * manual admin settlement until a wider API subscription is added.
 */
import { db, lotteryGamesTable, lotteryDrawsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { settleLotteryDraw } from "./lotterySettle";

// Maps our game slug → APIVerve `numbers` query value
const APIVERVE_GAMES: Record<string, string> = {
  "powerball": "powerball",
  "mega-millions": "megamillions",
  "euromillions": "euromillions",
};

interface ApiVerveData {
  lotteryType: string;
  drawDate: string;           // "YYYY-MM-DD"
  numbers: number[];          // main + bonus concatenated
  jackpotValue?: number;
  nextDraw?: {
    drawDate: string;         // "YYYY-MM-DD"
    jackpotValue?: number;
  };
}

async function fetchLatestDraw(apiKey: string, apiType: string): Promise<ApiVerveData | null> {
  try {
    const res = await fetch(`https://api.apiverve.com/v1/lottery?numbers=${apiType}`, {
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      logger.warn({ apiType, status: res.status }, "APIVerve returned non-OK status");
      return null;
    }
    const json = (await res.json()) as { status: string; data: ApiVerveData };
    if (json.status !== "ok" || !json.data) {
      logger.warn({ apiType, json }, "APIVerve returned unexpected payload");
      return null;
    }
    return json.data;
  } catch (err) {
    logger.warn({ err, apiType }, "APIVerve fetch error");
    return null;
  }
}

export async function syncLotteryDraws(): Promise<void> {
  const apiKey = process.env["APIVERVE_KEY"];
  if (!apiKey) {
    logger.warn("APIVERVE_KEY not set — skipping lottery sync");
    return;
  }

  const now = new Date();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const [slug, apiType] of Object.entries(APIVERVE_GAMES)) {
    try {
      // ── Load game ─────────────────────────────────────────────────────────
      const [game] = await db
        .select()
        .from(lotteryGamesTable)
        .where(eq(lotteryGamesTable.slug, slug))
        .limit(1);
      if (!game) continue;

      // ── Fetch from APIVerve ────────────────────────────────────────────────
      const draw = await fetchLatestDraw(apiKey, apiType);
      if (!draw || !Array.isArray(draw.numbers) || draw.numbers.length === 0) continue;

      // Split flat numbers array into main + bonus using game config
      const mainNumbers = draw.numbers.slice(0, game.mainNumbersCount);
      const bonusNumbers = draw.numbers.slice(game.mainNumbersCount);

      const apiDrawDate = new Date(draw.drawDate + "T00:00:00Z");

      // ── Find pending draw ──────────────────────────────────────────────────
      const [pendingDraw] = await db
        .select()
        .from(lotteryDrawsTable)
        .where(
          and(
            eq(lotteryDrawsTable.gameId, game.id),
            eq(lotteryDrawsTable.status, "pending")
          )
        )
        .orderBy(lotteryDrawsTable.drawDate)
        .limit(1);

      // ── Settle if the draw date has passed ────────────────────────────────
      // We settle when: there's a pending draw AND the API's latest drawDate
      // is on or after that pending draw's date (i.e. results are available).
      if (pendingDraw) {
        const pendingDate = new Date(pendingDraw.drawDate);
        pendingDate.setUTCHours(0, 0, 0, 0);

        const drawDatePassed = now > pendingDate;
        const apiHasResult = apiDrawDate >= pendingDate;

        if (drawDatePassed && apiHasResult && mainNumbers.length > 0) {
          logger.info(
            { slug, drawId: pendingDraw.id, mainNumbers, bonusNumbers },
            "Auto-settling lottery draw from API"
          );
          await settleLotteryDraw(pendingDraw.id, mainNumbers, bonusNumbers);
        }
      }

      // ── Update game jackpot + nextDrawAt ───────────────────────────────────
      const nextDrawDate = draw.nextDraw?.drawDate
        ? new Date(draw.nextDraw.drawDate + "T20:00:00Z")
        : null;
      const nextJackpot = draw.nextDraw?.jackpotValue ?? draw.jackpotValue ?? 0;

      await db
        .update(lotteryGamesTable)
        .set({
          jackpot: nextJackpot.toFixed(2),
          ...(nextDrawDate ? { nextDrawAt: nextDrawDate } : {}),
        })
        .where(eq(lotteryGamesTable.id, game.id));

      // ── Ensure there is always a pending draw ──────────────────────────────
      const [existingPending] = await db
        .select({ id: lotteryDrawsTable.id })
        .from(lotteryDrawsTable)
        .where(
          and(
            eq(lotteryDrawsTable.gameId, game.id),
            eq(lotteryDrawsTable.status, "pending")
          )
        )
        .limit(1);

      if (!existingPending && nextDrawDate) {
        await db.insert(lotteryDrawsTable).values({
          gameId: game.id,
          drawDate: nextDrawDate,
          jackpot: nextJackpot.toFixed(2),
          winningNumbers: [],
          bonusNumbers: [],
          status: "pending",
        });
        logger.info({ slug, nextDrawDate }, "Created pending draw for next date");
      }

      logger.info(
        { slug, apiDrawDate: draw.drawDate, nextDraw: draw.nextDraw?.drawDate },
        "Lottery sync complete"
      );
    } catch (err) {
      logger.error({ err, slug }, "Lottery sync failed for game");
    }

    // Stagger calls to stay within APIVerve free-tier rate limits
    await sleep(3_000);
  }
}
