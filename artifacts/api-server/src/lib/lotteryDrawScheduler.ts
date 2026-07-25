/**
 * Generates pending lottery draws for all active games that have a
 * draw_days + draw_time schedule configured.
 *
 * generateScheduledDraws(daysAhead)  — creates draws for the next N days,
 * skipping any slot that already has a draw within ±10 minutes.
 *
 * Called on server startup (daysAhead=8) and then every 7 days so the
 * schedule always stays at least one week ahead.
 */

import { db, lotteryGamesTable, lotteryDrawsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { logger } from "./logger";
import { getDrawTimes } from "./lotterySchedule";

// ── Local timezone helpers (mirrors lotterySchedule.ts) ──────────────────────

const DAY_OF_WEEK: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: DAY_OF_WEEK[get("weekday")] ?? -1,
  };
}

function localTimeToUtc(
  year: number, month: number, day: number,
  hour: number, minute: number, timezone: string,
): Date {
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(naive);
  const get = (type: string) =>
    Number(localParts.find((p) => p.type === type)?.value ?? 0);
  const localAsUtc = new Date(Date.UTC(
    get("year"), get("month") - 1, get("day"),
    get("hour") % 24, get("minute"), get("second"),
  ));
  return new Date(naive.getTime() + (naive.getTime() - localAsUtc.getTime()));
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateScheduledDraws(
  daysAhead = 8,
): Promise<{ created: number; skipped: number; games: number }> {
  const now = new Date();

  // Fetch all active games
  const games = await db
    .select()
    .from(lotteryGamesTable)
    .where(eq(lotteryGamesTable.isActive, true));

  let created = 0;
  let skipped = 0;
  let gamesProcessed = 0;

  for (const game of games) {
    // Only games with a real weekly schedule
    if (
      !game.drawTime ||
      !Array.isArray(game.drawDays) ||
      game.drawDays.length === 0
    ) continue;

    const times = getDrawTimes(game.drawTime);
    if (times.length === 0) continue;

    const tz = game.timezone || "UTC";
    gamesProcessed++;

    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      // Start from beginning of current day to catch today's remaining draws
      const trialDate = new Date(now.getTime() + dayOffset * 86_400_000);
      const local = localDateParts(trialDate, tz);

      if (!(game.drawDays as number[]).includes(local.weekday)) continue;

      for (const time of times) {
        const [hour, minute] = time.split(":").map(Number);
        const drawDate = localTimeToUtc(
          local.year, local.month, local.day, hour, minute, tz,
        );

        // Skip draws already in the past
        if (drawDate <= now) continue;

        // Check for an existing draw within ±10 minutes of this slot
        const windowMs = 10 * 60 * 1000;
        const existing = await db
          .select({ id: lotteryDrawsTable.id })
          .from(lotteryDrawsTable)
          .where(and(
            eq(lotteryDrawsTable.gameId, game.id),
            gte(lotteryDrawsTable.drawDate, new Date(drawDate.getTime() - windowMs)),
            lte(lotteryDrawsTable.drawDate, new Date(drawDate.getTime() + windowMs)),
          ))
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        await db.insert(lotteryDrawsTable).values({
          gameId: game.id,
          drawDate,
          jackpot: "0.00",
          winningNumbers: [],
          bonusNumbers: [],
          status: "pending",
        });
        created++;
      }
    }
  }

  return { created, skipped, games: gamesProcessed };
}
