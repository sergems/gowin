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

// ── Fetch real odds from AllSportsAPI for a single match ────────────────────

async function fetchRealOdds(apiKey: string, matchId: string): Promise<any | null> {
  try {
    const resp = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Odds&APIkey=${apiKey}&matchId=${matchId}`,
      { signal: AbortSignal.timeout(10000) },
    );
    const data = await resp.json();
    if (data?.success === 1 && data?.result?.[matchId]) {
      const bookmakers: any[] = data.result[matchId];
      return (
        bookmakers.find((b) => b.odd_bookmakers === "bet365") ??
        bookmakers.find((b) => b.odd_bookmakers === "WilliamHill") ??
        bookmakers[0] ??
        null
      );
    }
  } catch {
    // non-fatal — fall back to generated odds
  }
  return null;
}

function v(n: number | null | undefined, fallback: number): number {
  return n != null && isFinite(n) && n > 1 ? n : fallback;
}

// ── Build all markets for a new upcoming fixture ────────────────────────────

async function insertAllMarkets(fixtureId: number, real: any | null, seed: number) {
  const s = seed % 1; // 0..1 flavour

  // ── 1. 1X2 ────────────────────────────────────────────────────────────────
  const rawH = v(real?.odd_1, 1.4 + s * 3.5);
  const rawD = v(real?.odd_x, 2.8 + s * 1.2);
  const rawA = v(real?.odd_2, 1.4 + (1 - s) * 3.5);

  const [m1x2] = await db.insert(marketsTable).values({ fixtureId, marketType: "1X2" }).returning();
  await db.insert(oddsTable).values([
    { marketId: m1x2.id, selection: "Home",  oddsValue: rawH.toFixed(2) },
    { marketId: m1x2.id, selection: "Draw",  oddsValue: rawD.toFixed(2) },
    { marketId: m1x2.id, selection: "Away",  oddsValue: rawA.toFixed(2) },
  ]);

  // Derived probabilities (normalised)
  const pH = 1 / rawH, pD = 1 / rawD, pA = 1 / rawA;
  const tot = pH + pD + pA;
  const nH = pH / tot, nD = pD / tot, nA = pA / tot;
  const mg = 1.06; // book margin

  // ── 2. Double Chance ──────────────────────────────────────────────────────
  const [mDC] = await db.insert(marketsTable).values({ fixtureId, marketType: "Double Chance" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mDC.id, selection: "1X", oddsValue: v(real?.odd_1x, 1 / ((nH + nD) * mg)).toFixed(2) },
    { marketId: mDC.id, selection: "12", oddsValue: v(real?.odd_12, 1 / ((nH + nA) * mg)).toFixed(2) },
    { marketId: mDC.id, selection: "X2", oddsValue: v(real?.odd_x2, 1 / ((nD + nA) * mg)).toFixed(2) },
  ]);

  // ── 3. Draw No Bet ────────────────────────────────────────────────────────
  const [mDNB] = await db.insert(marketsTable).values({ fixtureId, marketType: "Draw No Bet" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mDNB.id, selection: "Home", oddsValue: (1 / (nH / (nH + nA) * mg)).toFixed(2) },
    { marketId: mDNB.id, selection: "Away", oddsValue: (1 / (nA / (nH + nA) * mg)).toFixed(2) },
  ]);

  // ── 4. Both Teams To Score ────────────────────────────────────────────────
  const [mBTTS] = await db.insert(marketsTable).values({ fixtureId, marketType: "Both Teams To Score" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mBTTS.id, selection: "Yes", oddsValue: v(real?.bts_yes, 1.50 + s * 0.90).toFixed(2) },
    { marketId: mBTTS.id, selection: "No",  oddsValue: v(real?.bts_no,  1.70 + (1 - s) * 0.70).toFixed(2) },
  ]);

  // ── 5. Over/Under 0.5 ─────────────────────────────────────────────────────
  const [mOU05] = await db.insert(marketsTable).values({ fixtureId, marketType: "Over/Under 0.5" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mOU05.id, selection: "Over 0.5",  oddsValue: v(real?.["o+0.5"], 1.05 + s * 0.10).toFixed(2) },
    { marketId: mOU05.id, selection: "Under 0.5", oddsValue: v(real?.["u+0.5"], 8.00 + s * 3.00).toFixed(2) },
  ]);

  // ── 6. Over/Under 1.5 ─────────────────────────────────────────────────────
  const [mOU15] = await db.insert(marketsTable).values({ fixtureId, marketType: "Over/Under 1.5" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mOU15.id, selection: "Over 1.5",  oddsValue: v(real?.["o+1.5"], 1.25 + s * 0.40).toFixed(2) },
    { marketId: mOU15.id, selection: "Under 1.5", oddsValue: v(real?.["u+1.5"], 2.50 + s * 1.00).toFixed(2) },
  ]);

  // ── 7. Over/Under 2.5 ─────────────────────────────────────────────────────
  const [mOU25] = await db.insert(marketsTable).values({ fixtureId, marketType: "Over/Under 2.5" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mOU25.id, selection: "Over 2.5",  oddsValue: v(real?.["o+2.5"], 1.65 + s * 0.60).toFixed(2) },
    { marketId: mOU25.id, selection: "Under 2.5", oddsValue: v(real?.["u+2.5"], 1.75 + (1 - s) * 0.50).toFixed(2) },
  ]);

  // ── 8. Over/Under 3.5 ─────────────────────────────────────────────────────
  const [mOU35] = await db.insert(marketsTable).values({ fixtureId, marketType: "Over/Under 3.5" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mOU35.id, selection: "Over 3.5",  oddsValue: v(real?.["o+3.5"], 2.80 + s * 0.80).toFixed(2) },
    { marketId: mOU35.id, selection: "Under 3.5", oddsValue: v(real?.["u+3.5"], 1.30 + (1 - s) * 0.20).toFixed(2) },
  ]);

  // ── 9. Over/Under 4.5 ─────────────────────────────────────────────────────
  const [mOU45] = await db.insert(marketsTable).values({ fixtureId, marketType: "Over/Under 4.5" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mOU45.id, selection: "Over 4.5",  oddsValue: v(real?.["o+4.5"], 5.00 + s * 2.00).toFixed(2) },
    { marketId: mOU45.id, selection: "Under 4.5", oddsValue: v(real?.["u+4.5"], 1.10 + (1 - s) * 0.10).toFixed(2) },
  ]);

  // ── 10. Asian Handicap (pick best available line from API) ────────────────
  const ahPairs: Array<[string, string, string, string]> = [
    ["ah-1_1", "ah-1_2", "-1", "+1"],
    ["ah-1.5_1", "ah-1.5_2", "-1.5", "+1.5"],
    ["ah0_1", "ah0_2", "0", "0"],
    ["ah+1_1", "ah+1_2", "+1", "-1"],
    ["ah+1.5_1", "ah+1.5_2", "+1.5", "-1.5"],
  ];
  let ahInserted = false;
  if (real) {
    for (const [k1, k2, label1, label2] of ahPairs) {
      const a1 = real[k1], a2 = real[k2];
      if (a1 != null && a2 != null && isFinite(a1) && isFinite(a2) && a1 > 1 && a2 > 1) {
        const [mAH] = await db.insert(marketsTable).values({ fixtureId, marketType: `Asian Handicap ${label1}` }).returning();
        await db.insert(oddsTable).values([
          { marketId: mAH.id, selection: `Home (${label1})`, oddsValue: a1.toFixed(2) },
          { marketId: mAH.id, selection: `Away (${label2})`, oddsValue: a2.toFixed(2) },
        ]);
        ahInserted = true;
        if (ahInserted) break;
      }
    }
  }
  if (!ahInserted) {
    const [mAH] = await db.insert(marketsTable).values({ fixtureId, marketType: "Asian Handicap 0" }).returning();
    await db.insert(oddsTable).values([
      { marketId: mAH.id, selection: "Home (0)", oddsValue: (1 / (nH / (nH + nA) * mg)).toFixed(2) },
      { marketId: mAH.id, selection: "Away (0)", oddsValue: (1 / (nA / (nH + nA) * mg)).toFixed(2) },
    ]);
  }

  // ── 11. European Handicap ─────────────────────────────────────────────────
  const [mEH] = await db.insert(marketsTable).values({ fixtureId, marketType: "European Handicap" }).returning();
  const ehH = Math.max(1.01, rawH * 0.65);
  const ehD = Math.max(1.01, rawD * 0.85);
  const ehA = Math.max(1.01, rawA * 1.45);
  await db.insert(oddsTable).values([
    { marketId: mEH.id, selection: "Home -1", oddsValue: ehH.toFixed(2) },
    { marketId: mEH.id, selection: "Draw",    oddsValue: ehD.toFixed(2) },
    { marketId: mEH.id, selection: "Away +1", oddsValue: ehA.toFixed(2) },
  ]);

  // ── 12. Half-Time Result ──────────────────────────────────────────────────
  const [mHT] = await db.insert(marketsTable).values({ fixtureId, marketType: "Half-Time Result" }).returning();
  const htH = Math.max(1.01, rawH * 1.25);
  const htD = Math.max(1.01, rawD * 0.70);
  const htA = Math.max(1.01, rawA * 1.25);
  await db.insert(oddsTable).values([
    { marketId: mHT.id, selection: "Home", oddsValue: htH.toFixed(2) },
    { marketId: mHT.id, selection: "Draw", oddsValue: htD.toFixed(2) },
    { marketId: mHT.id, selection: "Away", oddsValue: htA.toFixed(2) },
  ]);

  // ── 13. Home Win Either Half ─────────────────────────────────────────────
  const [mHWEH] = await db.insert(marketsTable).values({ fixtureId, marketType: "Home Win Either Half" }).returning();
  const hWehYes = Math.max(1.10, rawH * 0.80);
  await db.insert(oddsTable).values([
    { marketId: mHWEH.id, selection: "Yes", oddsValue: hWehYes.toFixed(2) },
    { marketId: mHWEH.id, selection: "No",  oddsValue: Math.max(1.10, (1 / (1 - 1 / hWehYes)) * mg).toFixed(2) },
  ]);

  // ── 14. Away Win Either Half ─────────────────────────────────────────────
  const [mAWEH] = await db.insert(marketsTable).values({ fixtureId, marketType: "Away Win Either Half" }).returning();
  const aWehYes = Math.max(1.10, rawA * 0.80);
  await db.insert(oddsTable).values([
    { marketId: mAWEH.id, selection: "Yes", oddsValue: aWehYes.toFixed(2) },
    { marketId: mAWEH.id, selection: "No",  oddsValue: Math.max(1.10, (1 / (1 - 1 / aWehYes)) * mg).toFixed(2) },
  ]);

  // ── 15. Correct Score (top 10 most common scores) ────────────────────────
  const scores = [
    ["1-0", 6.5], ["2-0", 8.0], ["2-1", 7.5], ["1-1", 5.5], ["0-0", 9.0],
    ["3-0", 14.0], ["3-1", 13.0], ["0-1", 8.5], ["0-2", 10.0], ["1-2", 9.5],
  ];
  const [mCS] = await db.insert(marketsTable).values({ fixtureId, marketType: "Correct Score" }).returning();
  await db.insert(oddsTable).values(scores.map(([sc, base]) => ({
    marketId: mCS.id,
    selection: String(sc),
    oddsValue: (Number(base) * (0.85 + s * 0.30)).toFixed(2),
  })));

  // ── 16. HT Total Goals ────────────────────────────────────────────────────
  for (const [line, over, under] of [
    ["0.5", 1.55 + s * 0.20, 2.30 + (1 - s) * 0.40],
    ["1.5", 2.50 + s * 0.50, 1.45 + (1 - s) * 0.20],
    ["2.5", 5.50 + s * 1.50, 1.12 + (1 - s) * 0.08],
  ] as [string, number, number][]) {
    const [mHTG] = await db.insert(marketsTable).values({ fixtureId, marketType: `HT Total Goals ${line}` }).returning();
    await db.insert(oddsTable).values([
      { marketId: mHTG.id, selection: `Over ${line}`,  oddsValue: over.toFixed(2) },
      { marketId: mHTG.id, selection: `Under ${line}`, oddsValue: under.toFixed(2) },
    ]);
  }

  // ── 17. Over/Under Corners (6 lines) ─────────────────────────────────────
  for (const [line, oBase, uBase] of [
    ["7.5",  1.25 + s * 0.20, 3.40 + (1 - s) * 0.50],
    ["8.5",  1.45 + s * 0.20, 2.55 + (1 - s) * 0.40],
    ["9.5",  1.75 + s * 0.30, 1.95 + (1 - s) * 0.30],
    ["10.5", 2.20 + s * 0.30, 1.60 + (1 - s) * 0.25],
    ["11.5", 3.00 + s * 0.50, 1.35 + (1 - s) * 0.20],
    ["12.5", 4.20 + s * 0.80, 1.18 + (1 - s) * 0.12],
  ] as [string, number, number][]) {
    const [mC] = await db.insert(marketsTable).values({ fixtureId, marketType: `Over/Under Corners ${line}` }).returning();
    await db.insert(oddsTable).values([
      { marketId: mC.id, selection: `Over ${line}`,  oddsValue: oBase.toFixed(2) },
      { marketId: mC.id, selection: `Under ${line}`, oddsValue: uBase.toFixed(2) },
    ]);
  }

  // ── 18. Over/Under Yellow Cards ───────────────────────────────────────────
  const [mCards] = await db.insert(marketsTable).values({ fixtureId, marketType: "Over/Under Yellow Cards" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mCards.id, selection: "Over 3.5",  oddsValue: (1.80 + s * 0.25).toFixed(2) },
    { marketId: mCards.id, selection: "Under 3.5", oddsValue: (1.90 + (1 - s) * 0.25).toFixed(2) },
  ]);

  // ── 19. Half-Time / Full-Time ─────────────────────────────────────────────
  const [mHTFT] = await db.insert(marketsTable).values({ fixtureId, marketType: "Half-Time/Full-Time" }).returning();
  await db.insert(oddsTable).values([
    { marketId: mHTFT.id, selection: "Home/Home", oddsValue: Math.max(1.01, rawH * 1.10).toFixed(2) },
    { marketId: mHTFT.id, selection: "Home/Draw", oddsValue: (rawH * 2.8 + s).toFixed(2) },
    { marketId: mHTFT.id, selection: "Draw/Home", oddsValue: (rawH * 1.5 + s).toFixed(2) },
    { marketId: mHTFT.id, selection: "Draw/Draw", oddsValue: (rawD * 1.1 + s * 0.5).toFixed(2) },
    { marketId: mHTFT.id, selection: "Draw/Away", oddsValue: (rawA * 1.5 + s).toFixed(2) },
    { marketId: mHTFT.id, selection: "Away/Away", oddsValue: Math.max(1.01, rawA * 1.10).toFixed(2) },
  ]);
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

  // 1. Fetch country list
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
  } catch { /* non-fatal */ }

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

      const countryKeyStr = String(event.event_country_key ?? "");
      const countryInfo = countryMap.get(countryKeyStr);
      const countryName = event.country_name ?? countryInfo?.name ?? "Unknown";
      const countryLogo = event.country_logo ?? countryInfo?.logo ?? null;
      const leagueLogo = event.league_logo ?? null;

      const leagueId = await upsertLeague(footballSport.id, event.league_name ?? "Unknown League", leagueExtId, countryKeyStr, countryName, countryLogo, leagueLogo);
      const homeTeamId = await upsertTeam(event.event_home_team, event.home_team_logo ?? null, homeExtId);
      const awayTeamId = await upsertTeam(event.event_away_team, event.away_team_logo ?? null, awayExtId);

      const startTime = new Date(`${event.event_date}T${event.event_time ?? "00:00"}:00`);
      const status = mapStatus(event.event_status ?? "");
      const score = parseScore(event.event_final_result ?? "");

      const [existing] = await db.select({ id: fixturesTable.id }).from(fixturesTable).where(eq(fixturesTable.externalId, fixtureExtId)).limit(1);

      if (existing) {
        await db.update(fixturesTable).set({ status, scoreHome: score.home, scoreAway: score.away, startTime }).where(eq(fixturesTable.id, existing.id));
        updated++;
      } else {
        const [fixture] = await db.insert(fixturesTable).values({ leagueId, homeTeamId, awayTeamId, startTime, status, scoreHome: score.home, scoreAway: score.away, externalId: fixtureExtId }).returning();

        if (status === "upcoming") {
          // Try to fetch real odds from AllSportsAPI
          const realOdds = await fetchRealOdds(apiKey, fixtureExtId);
          const seed = (parseInt(fixtureExtId, 10) % 1000) / 1000;
          await insertAllMarkets(fixture.id, realOdds, seed);
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
