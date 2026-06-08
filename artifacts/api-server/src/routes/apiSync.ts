import { Router } from "express";
import { db, settingsTable, sportsTable, leaguesTable, teamsTable, fixturesTable, marketsTable, oddsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function dateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function mapStatus(eventStatus: string): "upcoming" | "live" | "finished" | "cancelled" {
  if (!eventStatus || eventStatus === "") return "upcoming";
  const s = eventStatus.toLowerCase();
  if (s === "finished" || s === "ft" || s === "aet" || s === "pen") return "finished";
  if (s === "cancelled" || s === "postponed" || s === "abandoned") return "cancelled";
  if (["1h", "ht", "2h", "et", "p", "live", "inprogress"].some((k) => s.includes(k))) return "live";
  return "upcoming";
}

function parseScore(result: string): { home: number | null; away: number | null } {
  if (!result || result === "-" || result.trim() === "") return { home: null, away: null };
  const parts = result.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { home: parts[0], away: parts[1] };
  }
  return { home: null, away: null };
}

interface CountryInfo {
  name: string;
  logo: string | null;
  iso2: string | null;
}

async function upsertLeague(
  sportId: number,
  name: string,
  externalId: string,
  countryKey: string,
  countryName: string,
  countryLogo: string | null,
  leagueLogo: string | null,
): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO leagues (sport_id, name, external_id, country_key, country_name, country_logo, league_logo)
    VALUES (${sportId}, ${name}, ${externalId}, ${countryKey}, ${countryName}, ${countryLogo}, ${leagueLogo})
    ON CONFLICT (external_id) DO UPDATE SET
      name = EXCLUDED.name,
      country_key = EXCLUDED.country_key,
      country_name = EXCLUDED.country_name,
      country_logo = EXCLUDED.country_logo,
      league_logo = EXCLUDED.league_logo
    RETURNING id
  `);
  return (result.rows[0] as any).id as number;
}

async function upsertTeam(name: string, logo: string | null, externalId: string): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO teams (name, logo, external_id)
    VALUES (${name}, ${logo}, ${externalId})
    ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name, logo = EXCLUDED.logo
    RETURNING id
  `);
  return (result.rows[0] as any).id as number;
}

// ── GET /admin/settings ──────────────────────────────────────────────────────
router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const apiKey = await getSetting("allsports_api_key");
  const lastSync = await getSetting("last_sync");
  const syncStatus = await getSetting("sync_status");
  const syncSummary = await getSetting("sync_summary");
  res.json({
    apiKey: apiKey ?? "",
    lastSync: lastSync ?? "never",
    syncStatus: syncStatus ?? "idle",
    syncSummary: syncSummary ?? "",
  });
});

// ── PUT /admin/settings ──────────────────────────────────────────────────────
router.put("/admin/settings", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    res.status(400).json({ error: "API key is required" });
    return;
  }
  await setSetting("allsports_api_key", apiKey.trim());
  res.json({ ok: true });
});

// ── POST /admin/sync-fixtures ─────────────────────────────────────────────────
router.post("/admin/sync-fixtures", requireAdmin, async (_req, res): Promise<void> => {
  const apiKey = await getSetting("allsports_api_key");
  if (!apiKey) {
    res.status(400).json({ error: "No API key configured. Add one in Settings first." });
    return;
  }

  await setSetting("sync_status", "syncing");

  // 1. Fetch country list (for logo + ISO2 enrichment)
  const countryMap = new Map<string, CountryInfo>();
  try {
    const cResp = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Countries&APIkey=${apiKey}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const cData = await cResp.json();
    if (cData?.success === 1 && Array.isArray(cData.result)) {
      for (const c of cData.result) {
        countryMap.set(String(c.country_key), {
          name: c.country_name,
          logo: c.country_logo ?? null,
          iso2: c.country_iso2 ?? null,
        });
      }
    }
  } catch {
    // non-fatal — country logos will be null
  }

  // 2. Fetch fixtures for next 14 days
  const today = new Date();
  const future = new Date(today);
  future.setDate(future.getDate() + 14);
  const url = `https://apiv2.allsportsapi.com/football/?met=Fixtures&APIkey=${apiKey}&from=${dateStr(today)}&to=${dateStr(future)}`;

  let apiData: any;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    apiData = await response.json();
  } catch (err: any) {
    await setSetting("sync_status", "error");
    res.status(502).json({ error: "Failed to reach AllSportsAPI", detail: err.message });
    return;
  }

  if (apiData?.success !== 1 || !Array.isArray(apiData?.result)) {
    await setSetting("sync_status", "error");
    res.status(502).json({
      error: "AllSportsAPI returned an error",
      detail: apiData?.message ?? `success=${apiData?.success}`,
    });
    return;
  }

  const events: any[] = apiData.result;
  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  // Ensure Football sport exists
  let [footballSport] = await db.select().from(sportsTable).where(eq(sportsTable.name, "Football")).limit(1);
  if (!footballSport) {
    [footballSport] = await db.insert(sportsTable).values({ name: "Football", icon: "⚽" }).returning();
  }

  for (const event of events) {
    try {
      const leagueExtId = String(event.league_key);
      const homeExtId = String(event.home_team_key);
      const awayExtId = String(event.away_team_key);
      const fixtureExtId = String(event.event_key);

      // Country info is directly in the fixture event
      const countryKeyStr = String(event.event_country_key ?? "");
      const countryInfo = countryMap.get(countryKeyStr);
      const countryName = event.country_name ?? countryInfo?.name ?? "Unknown";
      const countryLogo = event.country_logo ?? countryInfo?.logo ?? null;
      const leagueLogo = event.league_logo ?? null;

      const leagueId = await upsertLeague(
        footballSport.id,
        event.league_name ?? "Unknown League",
        leagueExtId,
        countryKeyStr,
        countryName,
        countryLogo,
        leagueLogo,
      );
      const homeTeamId = await upsertTeam(event.event_home_team, event.home_team_logo ?? null, homeExtId);
      const awayTeamId = await upsertTeam(event.event_away_team, event.away_team_logo ?? null, awayExtId);

      const startTime = new Date(`${event.event_date}T${event.event_time ?? "00:00"}:00`);
      const status = mapStatus(event.event_status ?? "");
      const score = parseScore(event.event_final_result ?? "");

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
      } else {
        const [fixture] = await db
          .insert(fixturesTable)
          .values({ leagueId, homeTeamId, awayTeamId, startTime, status, scoreHome: score.home, scoreAway: score.away, externalId: fixtureExtId })
          .returning();

        if (status === "upcoming") {
          const [market] = await db.insert(marketsTable).values({ fixtureId: fixture.id, marketType: "1X2" }).returning();
          const homeOdds = (1.4 + Math.random() * 3.5).toFixed(2);
          const drawOdds = (2.8 + Math.random() * 1.2).toFixed(2);
          const awayOdds = (1.4 + Math.random() * 3.5).toFixed(2);
          await db.insert(oddsTable).values([
            { marketId: market.id, selection: "Home", oddsValue: homeOdds },
            { marketId: market.id, selection: "Draw", oddsValue: drawOdds },
            { marketId: market.id, selection: "Away", oddsValue: awayOdds },
          ]);
        }
        imported++;
      }
    } catch (err: any) {
      errors.push(`Event ${event.event_key}: ${err.message}`);
    }
  }

  const timestamp = new Date().toISOString();
  await setSetting("last_sync", timestamp);
  await setSetting("sync_status", "idle");
  await setSetting("sync_summary", `${imported} imported, ${updated} updated, ${errors.length} errors out of ${events.length} total`);

  res.json({ ok: true, imported, updated, total: events.length, errors: errors.slice(0, 10), lastSync: timestamp });
});

export default router;
