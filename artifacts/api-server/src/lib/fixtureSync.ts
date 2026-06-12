import { db, settingsTable, fixturesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
  if (["1h", "ht", "2h", "et", "p", "live", "inprogress"].some((k) => lower.includes(k))) return "live";
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
      // We subtract 2 hours to convert to true UTC so live/upcoming detection is accurate.
      // NOTE: startTime is only used when inserting NEW fixtures. For existing fixtures we
      // never overwrite startTime.
      const rawStartTime = new Date(`${event.event_date}T${event.event_time ?? "00:00"}:00Z`);
      const startTime = new Date(rawStartTime.getTime() - 2 * 60 * 60 * 1000);
      const rawStatus = mapStatus(event.event_status ?? "");
      const now = new Date();
      // 2h 30m window — enough for 90 min + ET + shootout + stoppage
      const finishedCutoff = new Date(now.getTime() - 150 * 60 * 1000);
      // Minimum real time before a match can legitimately finish:
      // 45 min (1H) + 15 min (HT break) + 35 min (minimum 2H) = 95 min.
      // Anything shorter means the API is reporting FT prematurely.
      const tooEarlyToFinish = new Date(now.getTime() - 95 * 60 * 1000);

      let apiStatus: "upcoming" | "live" | "finished" | "cancelled" = rawStatus;

      // API says "finished" but not enough real time has elapsed (e.g. FT at 70' game-clock).
      // HT break is not counted in game clock — 70' game-clock ≈ 85-90 min real time, so
      // we must not trust "finished" until at least 95 min have passed since kick-off.
      if (apiStatus === "finished" && startTime >= tooEarlyToFinish && startTime < now) {
        apiStatus = "live";
      }
      // API says "upcoming" but score is present and kick-off is past.
      // Only mark finished if the match window has elapsed — a score during play
      // (e.g. 0-1 at 62') must not be treated as FT.
      if (apiStatus === "upcoming" && score.home !== null && score.away !== null && startTime < now) {
        apiStatus = startTime < finishedCutoff ? "finished" : "live";
      }
      // API returns stale "live" for games well past the match window → finished
      if (apiStatus === "live" && startTime < finishedCutoff) {
        apiStatus = "finished";
      }
      // API hasn't updated status yet for a game inside the match window → live
      if (apiStatus === "upcoming" && startTime < now && startTime >= finishedCutoff) {
        apiStatus = "live";
      }
      // API returns live but startTime is in the future (timezone mismatch) → trust API: live
      if (rawStatus === "live" && apiStatus !== "finished") {
        apiStatus = "live";
      }

      const [existing] = await db
        .select({ id: fixturesTable.id, status: fixturesTable.status })
        .from(fixturesTable)
        .where(eq(fixturesTable.externalId, fixtureExtId))
        .limit(1);

      if (existing) {
        // Status merge rules — API data can be delayed or use wrong timezones:
        // 1. Never let API "upcoming" demote a game we've already marked "live" or "finished".
        // 2. Never let API "live" or "upcoming" demote a game we've already marked "finished".
        // 3. startTime is NEVER updated for existing fixtures.
        let finalStatus = apiStatus;
        if (existing.status === "live" && (apiStatus === "upcoming")) {
          finalStatus = "live";
        }
        if (existing.status === "finished" && (apiStatus === "upcoming" || apiStatus === "live")) {
          finalStatus = "finished";
        }

        await db
          .update(fixturesTable)
          .set({ status: finalStatus, scoreHome: score.home, scoreAway: score.away })
          .where(eq(fixturesTable.id, existing.id));
        updated++;
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
