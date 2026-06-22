import { db, settingsTable, fixturesTable, marketsTable, oddsTable, leaguesTable, sportsTable, teamsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger";
import { liveCache, type LiveFixture, type LiveMarket, type LiveStats } from "./liveCache";
import { broadcast } from "./wsServer";

async function getApiKey(): Promise<string | null> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "allsports_api_key")).limit(1);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function parseMatchMinute(eventStatus: string | null | undefined): string | null {
  if (!eventStatus) return null;
  const s = eventStatus.trim();
  if (s === "HT") return "HT";
  if (s === "FT" || s === "AET" || s === "PEN") return "FT";
  if (s === "1H" || s === "2H" || s === "ET") return s;
  const minuteMatch = s.match(/^(\d+)(\+\d+)?'?$/);
  if (minuteMatch) return `${minuteMatch[1]}${minuteMatch[2] ?? ""}'`;
  return s || null;
}

async function buildLiveFixturesFromDb(): Promise<LiveFixture[]> {
  const dbFixtures = await db
    .select({
      id: fixturesTable.id,
      externalId: fixturesTable.externalId,
      homeTeamId: fixturesTable.homeTeamId,
      awayTeamId: fixturesTable.awayTeamId,
      leagueId: fixturesTable.leagueId,
      scoreHome: fixturesTable.scoreHome,
      scoreAway: fixturesTable.scoreAway,
      startTime: fixturesTable.startTime,
      status: fixturesTable.status,
      leagueName: leaguesTable.name,
      leagueLogo: leaguesTable.leagueLogo,
      countryName: leaguesTable.countryName,
      sportId: sportsTable.id,
      sportName: sportsTable.name,
    })
    .from(fixturesTable)
    .leftJoin(leaguesTable, eq(leaguesTable.id, fixturesTable.leagueId))
    .leftJoin(sportsTable, eq(sportsTable.id, leaguesTable.sportId))
    .where(eq(fixturesTable.status, "live"));

  if (dbFixtures.length === 0) return [];

  const allTeamIds = [
    ...new Set([
      ...dbFixtures.map((f) => f.homeTeamId),
      ...dbFixtures.map((f) => f.awayTeamId),
    ]),
  ];
  const teamRows = allTeamIds.length > 0
    ? await db.select().from(teamsTable).where(inArray(teamsTable.id, allTeamIds))
    : [];
  const teamMap = new Map(teamRows.map((t) => [t.id, t]));

  const fixtureIds = dbFixtures.map((f) => f.id);
  const allMarkets = fixtureIds.length > 0
    ? await db.select().from(marketsTable).where(inArray(marketsTable.fixtureId, fixtureIds))
    : [];
  const marketIds = allMarkets.map((m) => m.id);
  const allOdds = marketIds.length > 0
    ? await db.select().from(oddsTable).where(inArray(oddsTable.marketId, marketIds))
    : [];

  const oddsMap = new Map<number, typeof allOdds>();
  for (const odd of allOdds) {
    if (!oddsMap.has(odd.marketId)) oddsMap.set(odd.marketId, []);
    oddsMap.get(odd.marketId)!.push(odd);
  }

  const marketsMap = new Map<number, LiveMarket[]>();
  for (const market of allMarkets) {
    if (!marketsMap.has(market.fixtureId)) marketsMap.set(market.fixtureId, []);
    marketsMap.get(market.fixtureId)!.push({
      id: market.id,
      marketType: market.marketType,
      suspended: false,
      odds: (oddsMap.get(market.id) ?? []).map((o) => ({
        id: o.id,
        selection: o.selection,
        oddsValue: parseFloat(o.oddsValue),
      })),
    });
  }

  const prevMap = new Map(liveCache.getFixtures().map((f) => [f.id, f]));

  return dbFixtures.map((f): LiveFixture => {
    const prev = prevMap.get(f.id);
    const home = teamMap.get(f.homeTeamId) ?? { id: f.homeTeamId, name: "Unknown", logo: null };
    const away = teamMap.get(f.awayTeamId) ?? { id: f.awayTeamId, name: "Unknown", logo: null };
    return {
      id: f.id,
      externalId: f.externalId,
      homeTeam: { id: home.id, name: home.name, logo: home.logo ?? null },
      awayTeam: { id: away.id, name: away.name, logo: away.logo ?? null },
      leagueId: f.leagueId,
      leagueName: f.leagueName ?? "Unknown League",
      leagueLogo: f.leagueLogo ?? null,
      countryName: f.countryName ?? null,
      sportId: f.sportId ?? 0,
      sportName: f.sportName ?? "Football",
      scoreHome: f.scoreHome,
      scoreAway: f.scoreAway,
      matchMinute: prev?.matchMinute ?? null,
      status: f.status,
      startTime: f.startTime.toISOString(),
      markets: marketsMap.get(f.id) ?? [],
      stats: prev?.stats ?? null,
      lastUpdated: Date.now(),
    };
  });
}

// ── Fetch match minutes from AllSports livescore ──────────────────────────────
async function fetchLiveScoreData(apiKey: string): Promise<Map<string, string>> {
  const minuteMap = new Map<string, string>();
  try {
    liveCache.recordApiRequest();
    const resp = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Livescore&APIkey=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    const data = await resp.json() as any;
    if (data?.success === 1 && Array.isArray(data.result)) {
      for (const event of data.result as any[]) {
        const extId = String(event.event_key);
        const minute = parseMatchMinute(event.event_status);
        if (minute) minuteMap.set(extId, minute);
      }
    }
  } catch (err) {
    logger.warn({ err }, "LiveSync: livescore fetch failed");
  }
  return minuteMap;
}

// ── Fetch stats for a single fixture ─────────────────────────────────────────
async function fetchFixtureStats(apiKey: string, externalId: string): Promise<LiveStats | null> {
  try {
    liveCache.recordApiRequest();
    const resp = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Statistics&APIkey=${apiKey}&matchId=${externalId}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    const data = await resp.json() as any;
    if (data?.success !== 1 || !Array.isArray(data.result)) return null;
    const stats = data.result[0]?.statistics ?? [];
    const find = (type: string): string | undefined =>
      (stats as any[]).find((s: any) => s.type?.toLowerCase().includes(type.toLowerCase()))?.home;
    const findAway = (type: string): string | undefined =>
      (stats as any[]).find((s: any) => s.type?.toLowerCase().includes(type.toLowerCase()))?.away;
    const toNum = (v: string | undefined): number | undefined => {
      const n = parseInt(v ?? "", 10);
      return isNaN(n) ? undefined : n;
    };
    return {
      possessionHome: find("possession"),
      possessionAway: findAway("possession"),
      shotsHome: toNum(find("shots total")),
      shotsAway: toNum(findAway("shots total")),
      shotsOnTargetHome: toNum(find("shots on goal")),
      shotsOnTargetAway: toNum(findAway("shots on goal")),
      cornersHome: toNum(find("corner")),
      cornersAway: toNum(findAway("corner")),
      yellowCardsHome: toNum(find("yellow")),
      yellowCardsAway: toNum(findAway("yellow")),
      redCardsHome: toNum(find("red")),
      redCardsAway: toNum(findAway("red")),
    };
  } catch {
    return null;
  }
}

// ── Sync worker: Live fixtures (every 15 s) ────────────────────────────────
export async function syncLiveFixtures(): Promise<void> {
  try {
    const apiKey = await getApiKey();
    const fixtures = await buildLiveFixturesFromDb();

    // Augment with match minutes from livescore API if key is available
    if (apiKey) {
      const minuteMap = await fetchLiveScoreData(apiKey);
      for (const f of fixtures) {
        if (f.externalId && minuteMap.has(f.externalId)) {
          f.matchMinute = minuteMap.get(f.externalId)!;
        }
      }
    }

    liveCache.setFixtures(fixtures);
    broadcast("LIVE_FIXTURE_UPDATE", { fixtures });
    liveCache.clearError();
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    logger.error({ err }, "LiveSync: fixture sync failed");
    liveCache.recordError(msg);
  }
}

// ── Sync worker: Live odds from DB (every 10 s) ────────────────────────────
export async function syncLiveOdds(): Promise<void> {
  try {
    const currentFixtures = liveCache.getFixtures();
    if (currentFixtures.length === 0) return;

    const fixtureIds = currentFixtures.map((f) => f.id);
    const allMarkets = await db.select().from(marketsTable).where(inArray(marketsTable.fixtureId, fixtureIds));
    const marketIds = allMarkets.map((m) => m.id);
    const allOdds = marketIds.length > 0
      ? await db.select().from(oddsTable).where(inArray(oddsTable.marketId, marketIds))
      : [];

    const oddsMap = new Map<number, typeof allOdds>();
    for (const odd of allOdds) {
      if (!oddsMap.has(odd.marketId)) oddsMap.set(odd.marketId, []);
      oddsMap.get(odd.marketId)!.push(odd);
    }

    const marketsMap = new Map<number, LiveMarket[]>();
    for (const market of allMarkets) {
      if (!marketsMap.has(market.fixtureId)) marketsMap.set(market.fixtureId, []);
      marketsMap.get(market.fixtureId)!.push({
        id: market.id,
        marketType: market.marketType,
        suspended: false,
        odds: (oddsMap.get(market.id) ?? []).map((o) => ({
          id: o.id,
          selection: o.selection,
          oddsValue: parseFloat(o.oddsValue),
        })),
      });
    }

    const updates: Array<{ fixtureId: number; markets: LiveMarket[] }> = [];
    for (const fixture of currentFixtures) {
      const markets = marketsMap.get(fixture.id) ?? [];
      const updated: LiveFixture = { ...fixture, markets };
      liveCache.updateFixture(updated);
      updates.push({ fixtureId: fixture.id, markets });
    }

    liveCache.setLastOddsSync(new Date().toISOString());
    if (updates.length > 0) broadcast("LIVE_ODDS_UPDATE", { updates });
  } catch (err) {
    logger.warn({ err }, "LiveSync: odds sync failed");
  }
}

// ── Sync worker: Live stats from API (every 30 s) ─────────────────────────
export async function syncLiveStats(): Promise<void> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return;

    const fixtures = liveCache.getFixtures().filter((f) => f.externalId);
    if (fixtures.length === 0) return;

    const statsUpdates: Array<{ fixtureId: number; stats: LiveStats }> = [];

    for (const fixture of fixtures) {
      const stats = await fetchFixtureStats(apiKey, fixture.externalId!);
      if (stats) {
        const updated: LiveFixture = { ...fixture, stats };
        liveCache.updateFixture(updated);
        statsUpdates.push({ fixtureId: fixture.id, stats });
      }
    }

    liveCache.setLastStatsSync(new Date().toISOString());
    if (statsUpdates.length > 0) broadcast("LIVE_STATS_UPDATE", { updates: statsUpdates });
  } catch (err) {
    logger.warn({ err }, "LiveSync: stats sync failed");
  }
}

// ── Start all live sync intervals ─────────────────────────────────────────
export function startLiveSyncWorkers(): void {
  // Initial sync
  syncLiveFixtures().catch(() => {});

  // Live fixtures every 15 s
  setInterval(() => {
    syncLiveFixtures().catch(() => {});
  }, 15_000);

  // Live odds from DB every 10 s
  setInterval(() => {
    syncLiveOdds().catch(() => {});
  }, 10_000);

  // Live stats from API every 30 s
  setInterval(() => {
    syncLiveStats().catch(() => {});
  }, 30_000);

  logger.info("Live sync workers started");
}
