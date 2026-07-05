import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

// Per-sport match-window lengths.
// Used for both:
//   upcoming → live  (startTime is within the window, i.e. game recently kicked off)
//   live     → finished  (startTime is older than the window, i.e. game should be done)
// Cricket uses a very large window because formats range from T20 (~3 h) to 5-day Tests;
// the API is expected to send the final "finished" status long before 48 h elapses.
const SPORT_WINDOWS: Record<number, number> = {
  1: 150,   // Football  — 90 min + ET + stoppage
  6: 200,   // Basketball — ~48 min game time + breaks ≈ 3 h 20 min real time
  7: 360,   // Tennis     — up to 5 sets ≈ 5–6 h
  8: 2880,  // Cricket    — T20 ~3 h, ODI ~8 h, Test up to 5 days; cap at 48 h
};
export async function autoExpireFixtures(): Promise<{ toLive: number; toFinished: number }> {
  let toLive = 0;
  let toFinished = 0;

  for (const [sportIdStr, windowMin] of Object.entries(SPORT_WINDOWS)) {
    const sportId = Number(sportIdStr);
    const interval = `${windowMin} minutes`;

    // upcoming → live: kick-off has passed but the match window hasn't elapsed
    const liveRes = await db.execute(sql`
      UPDATE fixtures f
      SET status = 'live'
      FROM leagues l
      WHERE f.league_id = l.id
        AND l.sport_id  = ${sportId}
        AND f.status    = 'upcoming'
        AND f.start_time < NOW()
        AND f.start_time >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    `);
    toLive += (liveRes as any).rowCount ?? 0;

    // live → finished: match window has fully elapsed
    const finRes = await db.execute(sql`
      UPDATE fixtures f
      SET status = 'finished'
      FROM leagues l
      WHERE f.league_id = l.id
        AND l.sport_id  = ${sportId}
        AND f.status    = 'live'
        AND f.start_time < NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    `);
    toFinished += (finRes as any).rowCount ?? 0;

    // upcoming → finished: start_time is older than the window and somehow skipped live
    // (e.g. server was down during the match)
    const skipRes = await db.execute(sql`
      UPDATE fixtures f
      SET status = 'finished'
      FROM leagues l
      WHERE f.league_id = l.id
        AND l.sport_id  = ${sportId}
        AND f.status    = 'upcoming'
        AND f.start_time < NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    `);
    toFinished += (skipRes as any).rowCount ?? 0;
  }

  if (toLive > 0 || toFinished > 0) {
    logger.info({ toLive, toFinished }, "Fixture expiry: statuses updated");
  }

  return { toLive, toFinished };
}
