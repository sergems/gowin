import { db, settingsTable, fixturesTable, marketsTable, oddsTable, leaguesTable, sportsTable } from "@workspace/db";
import { eq, and, sql, lte } from "drizzle-orm";
import { logger } from "./logger";
import { getUpMarketsConfig, injectUpMarkets } from "./upMarkets";

const CONCURRENCY = 8;
const REFRESH_WINDOW_DAYS = 60;

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

// Map sport name → AllSportsAPI base path
function sportApiBase(sportName: string): string {
  const n = sportName.toLowerCase();
  if (n === "basketball") return "basketball";
  if (n === "tennis") return "tennis";
  if (n === "cricket") return "cricket";
  return "football";
}

async function fetchApiOdds(apiKey: string, externalId: string, apiBase: string): Promise<any | null> {
  // Strip sport prefix from externalId (e.g. "bball_123" → "123")
  const rawId = externalId.replace(/^(bball_|tennis_|cricket_)/, "");
  try {
    const resp = await fetch(
      `https://apiv2.allsportsapi.com/${apiBase}/?met=Odds&APIkey=${apiKey}&matchId=${rawId}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const data: any = await resp.json();
    if (data?.success === 1 && data?.result?.[rawId]) {
      const bks: any[] = data.result[rawId];
      const bk =
        bks.find((b) => b.odd_bookmakers === "bet365") ??
        bks.find((b) => b.odd_bookmakers === "1xBet") ??
        bks.find((b) => b.odd_bookmakers === "WilliamHill") ??
        bks[0] ??
        null;
      if (bk && (valid(bk.odd_1) || valid(bk.odd_2))) return bk;
    }
  } catch { /* timeout / network error */ }
  return null;
}

// Basketball/Tennis/Cricket odds come back from AllSportsAPI as a nested
// per-market object keyed by outcome → bookmaker → value, e.g.
// { "Home/Away": { "Home": { "bet365": "1.80", ... }, "Away": { ... } }, ... }
// This is a different shape than football's flat bookmaker-array format.
const PREFERRED_BOOKMAKERS = [
  "bet365", "1xBet", "WilliamHill", "Marathon", "Betano",
  "Unibet", "Betfair", "BetVictor", "10Bet", "Pncl", "Sbo",
];

function pickOdd(map?: Record<string, string> | null): number | null {
  if (!map) return null;
  for (const bk of PREFERRED_BOOKMAKERS) {
    const raw = map[bk];
    if (raw != null) {
      const v = Number(raw);
      if (isFinite(v) && v > 1) return v;
    }
  }
  for (const key of Object.keys(map)) {
    const v = Number(map[key]);
    if (isFinite(v) && v > 1) return v;
  }
  return null;
}

async function fetchNestedOdds(apiKey: string, externalId: string, apiBase: string): Promise<Record<string, any> | null> {
  const rawId = externalId.replace(/^(bball_|tennis_|cricket_)/, "");
  try {
    const resp = await fetch(
      `https://apiv2.allsportsapi.com/${apiBase}/?met=Odds&APIkey=${apiKey}&matchId=${rawId}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const data: any = await resp.json();
    const result = data?.result?.[rawId];
    if (data?.success === 1 && result && typeof result === "object" && !Array.isArray(result)) {
      return result;
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

// ── Football odds refresh ──────────────────────────────────────────────────────

async function refreshFootballFixture(
  apiKey: string,
  fixtureId: number,
  externalId: string,
): Promise<boolean> {
  const bk = await fetchApiOdds(apiKey, externalId, "football");

  await db.execute(sql`
    DELETE FROM odds
    WHERE market_id IN (SELECT id FROM markets WHERE fixture_id = ${fixtureId})
  `);

  if (!bk) return false;

  const markets = await db.select().from(marketsTable).where(eq(marketsTable.fixtureId, fixtureId));
  const byType = new Map(markets.map((m) => [m.marketType, m]));
  const rows: Array<{ marketId: number; selection: string; oddsValue: string }> = [];

  // 1X2
  if (valid(bk.odd_1) && valid(bk.odd_x) && valid(bk.odd_2)) {
    const m = await getOrCreateMarket(fixtureId, "1X2", byType);
    rows.push(
      { marketId: m.id, selection: "Home", oddsValue: Number(bk.odd_1).toFixed(2) },
      { marketId: m.id, selection: "Draw", oddsValue: Number(bk.odd_x).toFixed(2) },
      { marketId: m.id, selection: "Away", oddsValue: Number(bk.odd_2).toFixed(2) },
    );
  }

  // Double Chance
  if (valid(bk.odd_1x) && valid(bk.odd_12) && valid(bk.odd_x2)) {
    const m = await getOrCreateMarket(fixtureId, "Double Chance", byType);
    rows.push(
      { marketId: m.id, selection: "1X", oddsValue: Number(bk.odd_1x).toFixed(2) },
      { marketId: m.id, selection: "12", oddsValue: Number(bk.odd_12).toFixed(2) },
      { marketId: m.id, selection: "X2", oddsValue: Number(bk.odd_x2).toFixed(2) },
    );
  }

  // Both Teams To Score
  if (valid(bk.bts_yes) && valid(bk.bts_no)) {
    const m = await getOrCreateMarket(fixtureId, "Both Teams To Score", byType);
    rows.push(
      { marketId: m.id, selection: "Yes", oddsValue: Number(bk.bts_yes).toFixed(2) },
      { marketId: m.id, selection: "No", oddsValue: Number(bk.bts_no).toFixed(2) },
    );
  }

  // Draw No Bet
  if (valid(bk.odd_1) && valid(bk.odd_x) && valid(bk.odd_2)) {
    const o1 = Number(bk.odd_1), ox = Number(bk.odd_x), o2 = Number(bk.odd_2);
    const dnbHome = o1 * (ox - 1) / ox;
    const dnbAway = o2 * (ox - 1) / ox;
    if (dnbHome > 1 && dnbAway > 1) {
      const m = await getOrCreateMarket(fixtureId, "Draw No Bet", byType);
      rows.push(
        { marketId: m.id, selection: "Home", oddsValue: dnbHome.toFixed(2) },
        { marketId: m.id, selection: "Away", oddsValue: dnbAway.toFixed(2) },
      );
    }
  }

  // Over/Under
  for (const line of ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5"]) {
    const overKey = `o+${line}`, underKey = `u+${line}`;
    if (valid(bk[overKey]) && valid(bk[underKey])) {
      const m = await getOrCreateMarket(fixtureId, `Over/Under ${line}`, byType);
      rows.push(
        { marketId: m.id, selection: `Over ${line}`, oddsValue: Number(bk[overKey]).toFixed(2) },
        { marketId: m.id, selection: `Under ${line}`, oddsValue: Number(bk[underKey]).toFixed(2) },
      );
    }
  }

  // Asian Handicap
  const ahPairs: [string, string, string, string][] = [
    ["ah-4.5_1","ah-4.5_2","-4.5","+4.5"],["ah-4_1","ah-4_2","-4","+4"],
    ["ah-3.5_1","ah-3.5_2","-3.5","+3.5"],["ah-3_1","ah-3_2","-3","+3"],
    ["ah-2.5_1","ah-2.5_2","-2.5","+2.5"],["ah-2_1","ah-2_2","-2","+2"],
    ["ah-1.5_1","ah-1.5_2","-1.5","+1.5"],["ah-1_1","ah-1_2","-1","+1"],
    ["ah0_1","ah0_2","0","0"],
    ["ah+0.5_1","ah+0.5_2","+0.5","-0.5"],["ah+1_1","ah+1_2","+1","-1"],
    ["ah+1.5_1","ah+1.5_2","+1.5","-1.5"],["ah+2_1","ah+2_2","+2","-2"],
    ["ah+2.5_1","ah+2.5_2","+2.5","-2.5"],["ah+3_1","ah+3_2","+3","-3"],
    ["ah+3.5_1","ah+3.5_2","+3.5","-3.5"],["ah+4_1","ah+4_2","+4","-4"],
    ["ah+4.5_1","ah+4.5_2","+4.5","-4.5"],
  ];
  for (const [k1, k2, l1, l2] of ahPairs) {
    if (valid(bk[k1]) && valid(bk[k2])) {
      const m = await getOrCreateMarket(fixtureId, `Asian Handicap ${l1}`, byType);
      rows.push(
        { marketId: m.id, selection: `Home (${l1})`, oddsValue: Number(bk[k1]).toFixed(2) },
        { marketId: m.id, selection: `Away (${l2})`, oddsValue: Number(bk[k2]).toFixed(2) },
      );
    }
  }

  if (rows.length > 0) await db.insert(oddsTable).values(rows);
  return rows.length > 0;
}

// ── Basketball odds refresh ────────────────────────────────────────────────────

async function refreshBasketballFixture(
  apiKey: string,
  fixtureId: number,
  externalId: string,
): Promise<boolean> {
  const nested = await fetchNestedOdds(apiKey, externalId, "basketball");

  await db.execute(sql`
    DELETE FROM odds WHERE market_id IN (SELECT id FROM markets WHERE fixture_id = ${fixtureId})
  `);
  if (!nested) return false;

  const markets = await db.select().from(marketsTable).where(eq(marketsTable.fixtureId, fixtureId));
  const byType = new Map(markets.map((m) => [m.marketType, m]));
  const rows: Array<{ marketId: number; selection: string; oddsValue: string }> = [];

  // Moneyline
  const ha = nested["Home/Away"];
  if (ha) {
    const home = pickOdd(ha.Home);
    const away = pickOdd(ha.Away);
    if (home && away) {
      const m = await getOrCreateMarket(fixtureId, "Moneyline", byType);
      rows.push(
        { marketId: m.id, selection: "Home", oddsValue: home.toFixed(2) },
        { marketId: m.id, selection: "Away", oddsValue: away.toFixed(2) },
      );
    }
  }

  // Point Spread
  const spreadLines = ["-1.5","+1.5","-3.5","+3.5","-5.5","+5.5","-7.5","+7.5","-9.5","+9.5"];
  for (const line of spreadLines) {
    const mkt = nested[`Asian Handicap ${line}`];
    if (mkt) {
      const home = pickOdd(mkt.Home);
      const away = pickOdd(mkt.Away);
      if (home && away) {
        const oppLine = line.startsWith("-") ? `+${line.slice(1)}` : `-${line.slice(1)}`;
        const m = await getOrCreateMarket(fixtureId, `Point Spread ${line}`, byType);
        rows.push(
          { marketId: m.id, selection: `Home (${line})`, oddsValue: home.toFixed(2) },
          { marketId: m.id, selection: `Away (${oppLine})`, oddsValue: away.toFixed(2) },
        );
        break;
      }
    }
  }

  // Total Points O/U — pick a middle line from whatever the API offers for this match
  const ouLines = Object.keys(nested)
    .filter((k) => /^Over\/Under \d/.test(k))
    .map((k) => ({ key: k, line: parseFloat(k.replace("Over/Under ", "")) }))
    .filter((x) => isFinite(x.line))
    .sort((a, b) => a.line - b.line);
  if (ouLines.length > 0) {
    const pick = ouLines[Math.floor(ouLines.length / 2)];
    const mkt = nested[pick.key];
    const over = pickOdd(mkt.Over);
    const under = pickOdd(mkt.Under);
    if (over && under) {
      const m = await getOrCreateMarket(fixtureId, `Total Points ${pick.line}`, byType);
      rows.push(
        { marketId: m.id, selection: `Over ${pick.line}`, oddsValue: over.toFixed(2) },
        { marketId: m.id, selection: `Under ${pick.line}`, oddsValue: under.toFixed(2) },
      );
    }
  }

  if (rows.length > 0) await db.insert(oddsTable).values(rows);
  return rows.length > 0;
}

// ── Tennis odds refresh ────────────────────────────────────────────────────────

async function refreshTennisFixture(
  apiKey: string,
  fixtureId: number,
  externalId: string,
): Promise<boolean> {
  const nested = await fetchNestedOdds(apiKey, externalId, "tennis");

  await db.execute(sql`
    DELETE FROM odds WHERE market_id IN (SELECT id FROM markets WHERE fixture_id = ${fixtureId})
  `);
  if (!nested) return false;

  const markets = await db.select().from(marketsTable).where(eq(marketsTable.fixtureId, fixtureId));
  const byType = new Map(markets.map((m) => [m.marketType, m]));
  const rows: Array<{ marketId: number; selection: string; oddsValue: string }> = [];

  // Match Winner
  const ha = nested["Home/Away"];
  if (ha) {
    const p1 = pickOdd(ha.Home);
    const p2 = pickOdd(ha.Away);
    if (p1 && p2) {
      const m = await getOrCreateMarket(fixtureId, "Match Winner", byType);
      rows.push(
        { marketId: m.id, selection: "Player 1", oddsValue: p1.toFixed(2) },
        { marketId: m.id, selection: "Player 2", oddsValue: p2.toFixed(2) },
      );
    }
  }

  // Over/Under Games — pick a middle line common to both Over and Under sides
  const overMkt = nested["Over/Under by Games in Match Over"];
  const underMkt = nested["Over/Under by Games in Match Under"];
  if (overMkt && underMkt) {
    const commonLines = Object.keys(overMkt)
      .filter((l) => underMkt[l] != null && isFinite(Number(l)))
      .map(Number)
      .sort((a, b) => a - b);
    if (commonLines.length > 0) {
      const line = commonLines[Math.floor(commonLines.length / 2)];
      const lineKey = String(line);
      const over = pickOdd(overMkt[lineKey]);
      const under = pickOdd(underMkt[lineKey]);
      if (over && under) {
        const m = await getOrCreateMarket(fixtureId, `Over/Under Games ${line}`, byType);
        rows.push(
          { marketId: m.id, selection: `Over ${line}`, oddsValue: over.toFixed(2) },
          { marketId: m.id, selection: `Under ${line}`, oddsValue: under.toFixed(2) },
        );
      }
    }
  }

  // First Set Winner
  const fs = nested["Home/Away (1st Set)"];
  if (fs) {
    const p1 = pickOdd(fs.Home);
    const p2 = pickOdd(fs.Away);
    if (p1 && p2) {
      const m = await getOrCreateMarket(fixtureId, "First Set Winner", byType);
      rows.push(
        { marketId: m.id, selection: "Player 1", oddsValue: p1.toFixed(2) },
        { marketId: m.id, selection: "Player 2", oddsValue: p2.toFixed(2) },
      );
    }
  }

  if (rows.length > 0) await db.insert(oddsTable).values(rows);
  return rows.length > 0;
}

// ── Cricket odds refresh ───────────────────────────────────────────────────────

async function refreshCricketFixture(
  apiKey: string,
  fixtureId: number,
  externalId: string,
): Promise<boolean> {
  const nested = await fetchNestedOdds(apiKey, externalId, "cricket");

  await db.execute(sql`
    DELETE FROM odds WHERE market_id IN (SELECT id FROM markets WHERE fixture_id = ${fixtureId})
  `);
  if (!nested) return false;

  const markets = await db.select().from(marketsTable).where(eq(marketsTable.fixtureId, fixtureId));
  const byType = new Map(markets.map((m) => [m.marketType, m]));
  const rows: Array<{ marketId: number; selection: string; oddsValue: string }> = [];

  // Match Winner
  const ha = nested["Home/Away"];
  const threeWay = nested["3Way Result"];
  if (ha) {
    const home = pickOdd(ha.Home);
    const away = pickOdd(ha.Away);
    if (home && away) {
      const m = await getOrCreateMarket(fixtureId, "Match Winner", byType);
      rows.push(
        { marketId: m.id, selection: "Home", oddsValue: home.toFixed(2) },
        { marketId: m.id, selection: "Away", oddsValue: away.toFixed(2) },
      );
      // Draw (test matches)
      if (threeWay) {
        const draw = pickOdd(threeWay.Draw);
        if (draw) rows.push({ marketId: m.id, selection: "Draw", oddsValue: draw.toFixed(2) });
      }
    }
  }

  // Total Runs O/U — pick a middle line from whatever the API offers for this match
  const ouLines = Object.keys(nested)
    .filter((k) => /^Over\/Under \d/.test(k))
    .map((k) => ({ key: k, line: parseFloat(k.replace("Over/Under ", "")) }))
    .filter((x) => isFinite(x.line))
    .sort((a, b) => a.line - b.line);
  if (ouLines.length > 0) {
    const pick = ouLines[Math.floor(ouLines.length / 2)];
    const mkt = nested[pick.key];
    const over = pickOdd(mkt.Over);
    const under = pickOdd(mkt.Under);
    if (over && under) {
      const m = await getOrCreateMarket(fixtureId, `Total Runs ${pick.line}`, byType);
      rows.push(
        { marketId: m.id, selection: `Over ${pick.line}`, oddsValue: over.toFixed(2) },
        { marketId: m.id, selection: `Under ${pick.line}`, oddsValue: under.toFixed(2) },
      );
    }
  }

  if (rows.length > 0) await db.insert(oddsTable).values(rows);
  return rows.length > 0;
}

// ── Main refresh dispatcher ────────────────────────────────────────────────────

async function refreshFixture(
  apiKey: string,
  fixtureId: number,
  externalId: string,
  sportName: string,
  upConfig: Awaited<ReturnType<typeof getUpMarketsConfig>>,
): Promise<boolean> {
  const base = sportApiBase(sportName);
  let ok: boolean;
  switch (base) {
    case "basketball": ok = await refreshBasketballFixture(apiKey, fixtureId, externalId); break;
    case "tennis":     ok = await refreshTennisFixture(apiKey, fixtureId, externalId); break;
    case "cricket":    ok = await refreshCricketFixture(apiKey, fixtureId, externalId); break;
    default:           ok = await refreshFootballFixture(apiKey, fixtureId, externalId); break;
  }
  // Inject 1UP/2UP markets for football fixtures after base odds are written
  if (ok && base === "football") {
    await injectUpMarkets(fixtureId, upConfig).catch(() => {});
  }
  return ok;
}

export async function refreshAllUpcomingOdds(): Promise<{ total: number; fromApi: number; noData: number }> {
  const apiKey = await getSetting("allsports_api_key");
  if (!apiKey) {
    logger.warn("Odds refresh skipped — no API key configured");
    return { total: 0, fromApi: 0, noData: 0 };
  }

  const upConfig = await getUpMarketsConfig();
  const cutoff = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Join through leagues → sports to get sport name per fixture
  const fixtures = await db.execute(sql`
    SELECT f.id, f.external_id, COALESCE(s.name, 'Football') as sport_name
    FROM fixtures f
    LEFT JOIN leagues l ON l.id = f.league_id
    LEFT JOIN sports s ON s.id = l.sport_id
    WHERE f.status = 'upcoming'
      AND f.external_id IS NOT NULL
      AND f.start_time <= ${cutoff}
  `);

  const fixtureRows = fixtures.rows as Array<{ id: number; external_id: string; sport_name: string }>;

  let fromApi = 0;
  let noData = 0;

  for (let i = 0; i < fixtureRows.length; i += CONCURRENCY) {
    const batch = fixtureRows.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (f) => {
        const ok = await refreshFixture(apiKey, f.id, f.external_id, f.sport_name, upConfig);
        if (ok) fromApi++;
        else noData++;
      }),
    );
  }

  await setSetting("last_odds_refresh", new Date().toISOString());
  logger.info({ total: fixtureRows.length, fromApi, noData }, "Odds refresh complete");
  return { total: fixtureRows.length, fromApi, noData };
}
