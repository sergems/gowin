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

  const past = new Date();
  past.setDate(past.getDate() - 7);
  const future = new Date();
  future.setDate(future.getDate() + 14);

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
      const status = mapStatus(event.event_status ?? "");
      const score = parseScore(event.event_final_result ?? "");
      const startTime = new Date(`${event.event_date}T${event.event_time ?? "00:00"}:00Z`);

      const [existing] = await db
        .select({ id: fixturesTable.id })
        .from(fixturesTable)
        .where(eq(fixturesTable.externalId, fixtureExtId))
        .limit(1);

      if (existing) {
        await db
          .update(fixturesTable)
          .set({ status, scoreHome: score.home, scoreAway: score.away, startTime })
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
