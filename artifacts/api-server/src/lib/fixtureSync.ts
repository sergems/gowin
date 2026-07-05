import { db, settingsTable, fixturesTable } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";
import { logger } from "./logger";

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db
    .insert(settingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function mapStatus(s: string): "upcoming" | "live" | "finished" | "cancelled" {
  if (!s) return "upcoming";
  const lower = s.toLowerCase();
  if (lower === "finished" || lower === "ft" || lower === "aet" || lower === "pen") return "finished";
  if (lower === "cancelled" || lower === "postponed" || lower === "abandoned") return "cancelled";
  // "p" alone = penalty shootout; other live statuses matched by substring.
  // NOTE: Do NOT use includes("p") — it would match "Suspended", "Interrupted", etc.
  if (lower === "p" || ["1h", "ht", "2h", "et", "live", "inprogress"].some((k) => lower.includes(k))) return "live";
  return "upcoming";
}

function parseScore(result: string): { home: number | null; away: number | null } {
  if (!result || result === "-" || result.trim() === "") return { home: null, away: null };
  const parts = result.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
    return { home: parts[0]!, away: parts[1]! };
  }
  return { home: null, away: null };
}

export async function syncFixtureResults(): Promise<{ updated: number; errors: number }> {
  const apiKey = await getSetting("allsports_api_key");
  if (!apiKey) {
    logger.warn("Fixture sync skipped — no AllSports API key configured");
    return { updated: 0, errors: 0 };
  }

  // API enforces a max 15-day window; use 3 days back + 7 days ahead = 10 days
  const past = new Date();
  past.setDate(past.getDate() - 3);
  const future = new Date();
  future.setDate(future.getDate() + 7);

  const url = `https://apiv2.allsportsapi.com/football/?met=Fixtures&APIkey=${apiKey}&from=${dateStr(past)}&to=${dateStr(future)}`;

  let apiData: any;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    apiData = await response.json();
  } catch (err: any) {
    logger.error({ err }, "Fixture sync: failed to reach AllSportsAPI");
    return { updated: 0, errors: 1 };
  }

  if (apiData?.success !== 1 || !Array.isArray(apiData?.result)) {
    logger.error({ detail: apiData?.message }, "Fixture sync: AllSportsAPI returned error");
    return { updated: 0, errors: 1 };
  }

  const events: any[] = apiData.result;
  let updated = 0;
  let errors = 0;

  for (const event of events) {
    try {
      const fixtureExtId = String(event.event_key);
      // Prefer event_ft_result (full-time) over event_final_result (half-time/incomplete)
      const score = parseScore(event.event_ft_result || event.event_final_result || "");
      // The AllSports API sends event_time as local time (UTC+2) but labels it as UTC.
      // We subtract 2 hours to convert to true UTC.
      // NOTE: apiStartTime is ONLY used when inserting new fixtures. For existing fixtures we
      // always use the DB-stored startTime for time-based checks, because:
      //   a) we never overwrite startTime on existing records, and
      //   b) if the API now reports a different date (e.g. rescheduled game), using the API
      //      date for checks while the DB date remains the old one creates "future_but_live"
      //      records (status=live, startTime=future).
      const rawApiStartTime = new Date(`${event.event_date}T${event.event_time ?? "00:00"}:00Z`);
      const apiStartTime = new Date(rawApiStartTime.getTime() - 2 * 60 * 60 * 1000);

      const rawStatus = mapStatus(event.event_status ?? "");
      const now = new Date();
      // 2h 30m — enough for 90 min + ET + shootout + stoppage
      const finishedCutoff = new Date(now.getTime() - 150 * 60 * 1000);
      // Minimum real time before a match can legitimately finish:
      // 45 min (1H) + stoppage + 15 min (HT break) + 45 min (2H) + stoppage ≈ 115 min.
      const tooEarlyToFinish = new Date(now.getTime() - 115 * 60 * 1000);
      // Buffer: API can say "live" up to this far before stored kick-off (e.g. pre-match warmup)
      const tenMinFromNow = new Date(now.getTime() + 10 * 60 * 1000);

      const [existing] = await db
        .select({ id: fixturesTable.id, status: fixturesTable.status, startTime: fixturesTable.startTime })
        .from(fixturesTable)
        .where(eq(fixturesTable.externalId, fixtureExtId))
        .limit(1);

      if (existing) {
        // Use the DB-stored startTime for all time-based decisions.
        // The stored value was set once (correctly, with -2h correction) at import/insert time
        // and is never overwritten. The API-computed startTime may differ if the game was
        // rescheduled, which would otherwise cause false live/finished promotions.
        const t = existing.startTime;

        let apiStatus: "upcoming" | "live" | "finished" | "cancelled" = rawStatus;

        // API says "finished" but not enough real time has elapsed since stored kick-off.
        if (apiStatus === "finished" && t >= tooEarlyToFinish && t < now) {
          apiStatus = "live";
        }
        // API says "upcoming" but a score is present and kick-off has already passed.
        if (apiStatus === "upcoming" && score.home !== null && score.away !== null && t < now) {
          apiStatus = t < finishedCutoff ? "finished" : "live";
        }
        // API still shows "live" for a game well past the match window → finished.
        if (apiStatus === "live" && t < finishedCutoff) {
          apiStatus = "finished";
        }
        // API hasn't updated status yet but kick-off has passed within the match window → live.
        if (apiStatus === "upcoming" && t < now && t >= finishedCutoff) {
          apiStatus = "live";
        }
        // API explicitly says "live" and stored kick-off is not far in the future → trust it.
        // (Handles slight clock skew or pre-match "live" feeds starting a few minutes early.)
        if (rawStatus === "live" && apiStatus !== "finished" && t < tenMinFromNow) {
          apiStatus = "live";
        }

        // ── Status merge rules ───────────────────────────────────────────────
        // 1. Never let API "upcoming" demote a game we've already marked "live" UNLESS
        //    the stored kick-off is clearly in the future — that would mean the game was
        //    incorrectly marked live (e.g. from a stale backup) and the API is correcting it.
        // 2. Never let API "live" or "upcoming" demote a game already marked "finished".
        let finalStatus = apiStatus;
        if (existing.status === "live" && apiStatus === "upcoming" && t < tenMinFromNow) {
          finalStatus = "live";
        }
        if (existing.status === "finished" && (apiStatus === "upcoming" || apiStatus === "live")) {
          finalStatus = "finished";
        }

        // If the game is going live but the DB startTime is still in the future, the game was
        // rescheduled to an earlier date. Update startTime to the API-computed value so the
        // record reflects when the game is actually being played. We do this ONLY on live
        // transitions to avoid overwriting otherwise-accurate upcoming startTimes.
        const updateSet: Record<string, unknown> = { status: finalStatus, scoreHome: score.home, scoreAway: score.away };
        if (finalStatus === "live" && t > now) {
          updateSet.startTime = apiStartTime;
        }

        // Race-safe write: if another worker (e.g. fixtureExpiry) has already moved this
        // fixture to "finished" between our SELECT and this UPDATE, do not regress it back
        // to "live" or "upcoming". We achieve this by adding `status != 'finished'` to the
        // WHERE clause whenever finalStatus is not "finished".
        await db
          .update(fixturesTable)
          .set(updateSet)
          .where(
            finalStatus === "finished"
              ? eq(fixturesTable.id, existing.id)
              : and(eq(fixturesTable.id, existing.id), ne(fixturesTable.status, "finished")),
          );
        updated++;
      } else {
        // This football sync only updates existing records (all fixtures are pre-loaded from
        // the initial import / daily apiSync). Skip new event_keys rather than inserting with
        // placeholder FK values (leagueId/homeTeamId/awayTeamId = 0) which would violate
        // NOT NULL foreign-key constraints. New football fixtures are picked up by the daily
        // full apiSync run instead.
        logger.debug({ fixtureExtId }, "Fixture sync: event_key not in DB, skipping (will be picked up by daily sync)");
      }
    } catch (err: any) {
      logger.error({ err, key: event.event_key }, "Fixture sync: error processing event");
      errors++;
    }
  }

  await setSetting("last_auto_sync", new Date().toISOString());
  logger.info({ updated, errors, total: events.length }, "Fixture sync complete");
  return { updated, errors };
}
