import { Router } from "express";
import { db, fixturesTable, marketsTable, oddsTable, leaguesTable, sportsTable, teamsTable } from "@workspace/db";
import { eq, inArray, and, ilike } from "drizzle-orm";
import { liveCache } from "../lib/liveCache";

const router = Router();

const MAIN_MARKET_TYPES = ["1X2", "Double Chance", "Over/Under 2.5"];

function filterMainMarkets(markets: any[]) {
  return markets.filter((m) => MAIN_MARKET_TYPES.includes(m.marketType));
}

// GET /live/fixtures — all live fixtures with main markets (from cache, DB fallback)
router.get("/live/fixtures", async (_req, res): Promise<void> => {
  const dataWarning = liveCache.isRecentWorkerError("fixture")
    ? "Live data temporarily unavailable — showing last known state"
    : undefined;

  if (!liveCache.isEmpty()) {
    liveCache.recordHit();
    const fixtures = liveCache.getFixtures()
      .filter((f) => (f.sportName ?? "Football").toLowerCase() === "football")
      .map((f) => ({
        ...f,
        markets: filterMainMarkets(f.markets),
      }));
    res.json({ fixtures, dataWarning });
    return;
  }

  // Cache cold — read from DB
  liveCache.recordMiss();
  try {
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
      .where(and(eq(fixturesTable.status, "live"), ilike(sportsTable.name, "Football")));

    if (dbFixtures.length === 0) {
      res.json({ fixtures: [], dataWarning });
      return;
    }

    const allTeamIds = [...new Set([...dbFixtures.map((f) => f.homeTeamId), ...dbFixtures.map((f) => f.awayTeamId)])];
    const teamRows = await db.select().from(teamsTable).where(inArray(teamsTable.id, allTeamIds));
    const teamMap = new Map(teamRows.map((t) => [t.id, t]));

    const fixtureIds = dbFixtures.map((f) => f.id);
    const allMarkets = await db.select().from(marketsTable).where(inArray(marketsTable.fixtureId, fixtureIds));

    const mainMarkets = allMarkets.filter((m) => MAIN_MARKET_TYPES.includes(m.marketType));
    const mainMarketIds = mainMarkets.map((m) => m.id);
    const allOdds = mainMarketIds.length > 0
      ? await db.select().from(oddsTable).where(inArray(oddsTable.marketId, mainMarketIds))
      : [];

    const oddsMap = new Map<number, typeof allOdds>();
    for (const odd of allOdds) {
      if (!oddsMap.has(odd.marketId)) oddsMap.set(odd.marketId, []);
      oddsMap.get(odd.marketId)!.push(odd);
    }

    const marketsMap = new Map<number, any[]>();
    for (const market of mainMarkets) {
      if (!marketsMap.has(market.fixtureId)) marketsMap.set(market.fixtureId, []);
      marketsMap.get(market.fixtureId)!.push({
        id: market.id,
        marketType: market.marketType,
        suspended: market.suspended,
        odds: (oddsMap.get(market.id) ?? []).map((o) => ({
          id: o.id,
          selection: o.selection,
          oddsValue: parseFloat(o.oddsValue),
        })),
      });
    }

    const fixtures = dbFixtures.map((f) => {
      const home = teamMap.get(f.homeTeamId) ?? { id: f.homeTeamId, name: "Unknown", logo: null };
      const away = teamMap.get(f.awayTeamId) ?? { id: f.awayTeamId, name: "Unknown", logo: null };
      return {
        id: f.id,
        externalId: f.externalId,
        homeTeam: { id: home.id, name: home.name, logo: home.logo },
        awayTeam: { id: away.id, name: away.name, logo: away.logo },
        leagueId: f.leagueId,
        leagueName: f.leagueName ?? "Unknown",
        leagueLogo: f.leagueLogo ?? null,
        countryName: f.countryName ?? null,
        sportId: f.sportId ?? 0,
        sportName: f.sportName ?? "Football",
        scoreHome: f.scoreHome,
        scoreAway: f.scoreAway,
        matchMinute: null,
        status: f.status,
        startTime: f.startTime.toISOString(),
        markets: marketsMap.get(f.id) ?? [],
        stats: null,
        lastUpdated: Date.now(),
      };
    });

    res.json({ fixtures, dataWarning });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load live fixtures" });
  }
});

// GET /live/fixtures/:id/markets — full market list for on-demand expansion
router.get("/live/fixtures/:id/markets", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid fixture id" });
    return;
  }

  // Try cache first for full market data
  const cached = liveCache.getFixture(id);
  if (cached && cached.markets.length > 0) {
    res.json({ markets: cached.markets, stats: cached.stats });
    return;
  }

  // Fallback to DB
  try {
    const markets = await db.select().from(marketsTable).where(eq(marketsTable.fixtureId, id));
    const marketIds = markets.map((m) => m.id);
    const allOdds = marketIds.length > 0
      ? await db.select().from(oddsTable).where(inArray(oddsTable.marketId, marketIds))
      : [];

    const oddsMap = new Map<number, typeof allOdds>();
    for (const odd of allOdds) {
      if (!oddsMap.has(odd.marketId)) oddsMap.set(odd.marketId, []);
      oddsMap.get(odd.marketId)!.push(odd);
    }

    const result = markets.map((m) => ({
      id: m.id,
      marketType: m.marketType,
      suspended: m.suspended,
      odds: (oddsMap.get(m.id) ?? []).map((o) => ({
        id: o.id,
        selection: o.selection,
        oddsValue: parseFloat(o.oddsValue),
      })),
    }));

    res.json({ markets: result, stats: cached?.stats ?? null });
  } catch {
    res.status(500).json({ error: "Failed to load markets" });
  }
});

export default router;
