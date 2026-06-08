import { db, settingsTable, fixturesTable, marketsTable, oddsTable } from "@workspace/db";
import { eq, and, sql, lte } from "drizzle-orm";
import { logger } from "./logger";

const CONCURRENCY = 8;
const REFRESH_WINDOW_DAYS = 14;

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

function valid(v: any): boolean {
  return v != null && isFinite(Number(v)) && Number(v) > 1;
}

async function fetchApiOdds(apiKey: string, externalId: string): Promise<any | null> {
  try {
    const resp = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Odds&APIkey=${apiKey}&matchId=${externalId}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const data = await resp.json();
    if (data?.success === 1 && data?.result?.[externalId]) {
      const bks: any[] = data.result[externalId];
      const bk =
        bks.find((b) => b.odd_bookmakers === "bet365") ??
        bks.find((b) => b.odd_bookmakers === "WilliamHill") ??
        bks[0] ??
        null;
      if (bk && valid(bk.odd_1) && valid(bk.odd_x) && valid(bk.odd_2)) return bk;
    }
  } catch { /* timeout / network error */ }
  return null;
}

async function getOrCreateMarket(fixtureId: number, marketType: string, byType: Map<string, any>): Promise<any> {
  const existing = byType.get(marketType);
  if (existing) return existing;
  const [created] = await db.insert(marketsTable).values({ fixtureId, marketType }).returning();
  byType.set(marketType, created);
  return created;
}

async function refreshFixture(apiKey: string, fixtureId: number, externalId: string): Promise<boolean> {
  const bk = await fetchApiOdds(apiKey, externalId);

  // Wipe ALL existing odds for this fixture — real data only going forward
  await db.execute(sql`
    DELETE FROM odds
    WHERE market_id IN (SELECT id FROM markets WHERE fixture_id = ${fixtureId})
  `);

  if (!bk) return false;

  // Load all market records for this fixture (or create them below as needed)
  const markets = await db.select().from(marketsTable).where(eq(marketsTable.fixtureId, fixtureId));
  const byType = new Map(markets.map((m) => [m.marketType, m]));

  const rows: Array<{ marketId: number; selection: string; oddsValue: string }> = [];

  // ── 1X2 ──────────────────────────────────────────────────────────────────
  if (valid(bk.odd_1) && valid(bk.odd_x) && valid(bk.odd_2)) {
    const m = await getOrCreateMarket(fixtureId, "1X2", byType);
    rows.push(
      { marketId: m.id, selection: "Home", oddsValue: Number(bk.odd_1).toFixed(2) },
      { marketId: m.id, selection: "Draw", oddsValue: Number(bk.odd_x).toFixed(2) },
      { marketId: m.id, selection: "Away", oddsValue: Number(bk.odd_2).toFixed(2) },
    );
  }

  // ── Double Chance ─────────────────────────────────────────────────────────
  if (valid(bk.odd_1x) && valid(bk.odd_12) && valid(bk.odd_x2)) {
    const m = await getOrCreateMarket(fixtureId, "Double Chance", byType);
    rows.push(
      { marketId: m.id, selection: "1X", oddsValue: Number(bk.odd_1x).toFixed(2) },
      { marketId: m.id, selection: "12", oddsValue: Number(bk.odd_12).toFixed(2) },
      { marketId: m.id, selection: "X2", oddsValue: Number(bk.odd_x2).toFixed(2) },
    );
  }

  // ── Both Teams To Score ───────────────────────────────────────────────────
  if (valid(bk.bts_yes) && valid(bk.bts_no)) {
    const m = await getOrCreateMarket(fixtureId, "Both Teams To Score", byType);
    rows.push(
      { marketId: m.id, selection: "Yes", oddsValue: Number(bk.bts_yes).toFixed(2) },
      { marketId: m.id, selection: "No", oddsValue: Number(bk.bts_no).toFixed(2) },
    );
  }

  // ── Over/Under (5 lines) ──────────────────────────────────────────────────
  for (const line of ["0.5", "1.5", "2.5", "3.5", "4.5"]) {
    const overKey = `o+${line}`;
    const underKey = `u+${line}`;
    if (valid(bk[overKey]) && valid(bk[underKey])) {
      const m = await getOrCreateMarket(fixtureId, `Over/Under ${line}`, byType);
      rows.push(
        { marketId: m.id, selection: `Over ${line}`, oddsValue: Number(bk[overKey]).toFixed(2) },
        { marketId: m.id, selection: `Under ${line}`, oddsValue: Number(bk[underKey]).toFixed(2) },
      );
    }
  }

  // ── Asian Handicap — first valid line from API ─────────────────────────────
  const ahPairs: [string, string, string, string][] = [
    ["ah-1_1", "ah-1_2", "-1", "+1"],
    ["ah-1.5_1", "ah-1.5_2", "-1.5", "+1.5"],
    ["ah0_1", "ah0_2", "0", "0"],
    ["ah+1_1", "ah+1_2", "+1", "-1"],
    ["ah+1.5_1", "ah+1.5_2", "+1.5", "-1.5"],
  ];
  for (const [k1, k2, l1, l2] of ahPairs) {
    if (valid(bk[k1]) && valid(bk[k2])) {
      // Re-use any existing AH market or create a new one
      const existingAH = [...byType.entries()].find(([t]) => t.startsWith("Asian Handicap"));
      let m: any;
      if (existingAH) {
        m = existingAH[1];
      } else {
        [m] = await db.insert(marketsTable).values({ fixtureId, marketType: `Asian Handicap ${l1}` }).returning();
      }
      rows.push(
        { marketId: m.id, selection: `Home (${l1})`, oddsValue: Number(bk[k1]).toFixed(2) },
        { marketId: m.id, selection: `Away (${l2})`, oddsValue: Number(bk[k2]).toFixed(2) },
      );
      break;
    }
  }

  if (rows.length > 0) {
    await db.insert(oddsTable).values(rows);
  }

  return rows.length > 0;
}

export async function refreshAllUpcomingOdds(): Promise<{ total: number; fromApi: number; noData: number }> {
  const apiKey = await getSetting("allsports_api_key");
  if (!apiKey) {
    logger.warn("Odds refresh skipped — no API key configured");
    return { total: 0, fromApi: 0, noData: 0 };
  }

  const cutoff = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const fixtures = await db
    .select({ id: fixturesTable.id, externalId: fixturesTable.externalId })
    .from(fixturesTable)
    .where(
      and(
        eq(fixturesTable.status, "upcoming"),
        sql`external_id IS NOT NULL`,
        lte(fixturesTable.startTime, cutoff),
      ),
    );

  let fromApi = 0;
  let noData = 0;

  for (let i = 0; i < fixtures.length; i += CONCURRENCY) {
    const batch = fixtures.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (f) => {
        const ok = await refreshFixture(apiKey, f.id, f.externalId!);
        if (ok) fromApi++;
        else noData++;
      }),
    );
  }

  await setSetting("last_odds_refresh", new Date().toISOString());
  logger.info({ total: fixtures.length, fromApi, noData }, "Odds refresh complete");
  return { total: fixtures.length, fromApi, noData };
}
