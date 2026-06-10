import { db, fixturesTable } from "@workspace/db";
import { and, eq, lt, gte } from "drizzle-orm";
import { logger } from "./logger";

const MATCH_DURATION_MS = 150 * 60 * 1000; // 2h 30m — enough for 90 min + ET + stoppage

export async function autoExpireFixtures(): Promise<{ toLive: number; toFinished: number }> {
  const now = new Date();
  const finishedCutoff = new Date(now.getTime() - MATCH_DURATION_MS);

  // upcoming → live: kick-off has passed but match window hasn't elapsed
  const liveResult = await db
    .update(fixturesTable)
    .set({ status: "live" })
    .where(
      and(
        eq(fixturesTable.status, "upcoming"),
        lt(fixturesTable.startTime, now),
        gte(fixturesTable.startTime, finishedCutoff),
      ),
    );

  // upcoming/live → finished: match window has fully elapsed
  const finishedResult = await db
    .update(fixturesTable)
    .set({ status: "finished" })
    .where(
      and(
        eq(fixturesTable.status, "live"),
        lt(fixturesTable.startTime, finishedCutoff),
      ),
    );

  // Also catch any upcoming that somehow skipped live (e.g. server was down)
  const finishedResult2 = await db
    .update(fixturesTable)
    .set({ status: "finished" })
    .where(
      and(
        eq(fixturesTable.status, "upcoming"),
        lt(fixturesTable.startTime, finishedCutoff),
      ),
    );

  const toLive = (liveResult as any).rowCount ?? 0;
  const toFinished = ((finishedResult as any).rowCount ?? 0) + ((finishedResult2 as any).rowCount ?? 0);

  if (toLive > 0 || toFinished > 0) {
    logger.info({ toLive, toFinished }, "Fixture expiry: statuses updated");
  }

  return { toLive, toFinished };
}
