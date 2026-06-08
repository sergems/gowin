import { Router } from "express";
import { db, sportsTable, leaguesTable, teamsTable, fixturesTable, marketsTable, oddsTable } from "@workspace/db";
import { eq, and, desc, count, sql, inArray, gte, lte, asc } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";
import {
  ListLeaguesQueryParams,
  ListFixturesQueryParams,
  GetFixtureParams,
  UpdateFixtureParams,
  UpdateFixtureBody,
  SettleFixtureParams,
  SettleFixtureBody,
  CreateSportBody,
  CreateLeagueBody,
  CreateTeamBody,
  CreateFixtureBody,
  CreateMarketBody,
  UpdateOddsParams,
  UpdateOddsBody,
} from "@workspace/api-zod";

const router = Router();

// ── Football / Countries grouped ─────────────────────────────────────────────
const INTERNATIONAL_COUNTRY_NAMES = new Set([
  "world", "international", "europe", "africa", "asia",
  "south america", "north america", "oceania", "concacaf",
  "uefa", "caf", "afc", "conmebol", "ofc", "fifa",
  "arab world", "caribbean", "central america",
  "intl", "eurocups", "worldcup",
]);

function isInternational(countryName: string | null): boolean {
  if (!countryName) return true;
  const lower = countryName.toLowerCase();
  return INTERNATIONAL_COUNTRY_NAMES.has(lower) ||
    lower.includes("international") ||
    lower.includes("world") ||
    lower.includes("uefa") ||
    lower.includes("caf ") ||
    lower.includes("conmebol") ||
    lower.includes("concacaf");
}

const UEFA_FEATURED_EXTERNAL_IDS = ['3', '4', '683', '1'];

router.get("/football/countries", async (_req, res): Promise<void> => {
  const [rows, featuredRows] = await Promise.all([
    db.execute(sql`
      SELECT
        l.id,
        l.name,
        l.league_logo,
        l.country_name,
        l.country_logo,
        l.country_key,
        COUNT(f.id) AS fixture_count
      FROM leagues l
      LEFT JOIN fixtures f ON f.league_id = l.id AND f.status = 'upcoming'
      WHERE l.external_id NOT IN ('3', '4', '683', '1')
      GROUP BY l.id, l.name, l.league_logo, l.country_name, l.country_logo, l.country_key
      HAVING COUNT(f.id) > 0
      ORDER BY l.country_name ASC, l.name ASC
    `),
    db.execute(sql`
      SELECT
        l.id,
        l.name,
        l.league_logo,
        l.external_id,
        COUNT(f.id) AS fixture_count
      FROM leagues l
      LEFT JOIN fixtures f ON f.league_id = l.id AND f.status = 'upcoming'
      WHERE l.external_id IN ('3', '4', '683', '1')
      GROUP BY l.id, l.name, l.league_logo, l.external_id
      ORDER BY ARRAY_POSITION(ARRAY['3','4','683','1'], l.external_id)
    `),
  ]);

  const featured = (featuredRows.rows as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    logo: row.league_logo,
    externalId: row.external_id,
    fixtureCount: Number(row.fixture_count),
  }));

  const international: any[] = [];
  const countriesMap = new Map<string, { name: string; logo: string | null; leagues: any[] }>();

  for (const row of rows.rows as any[]) {
    const league = {
      id: row.id,
      name: row.name,
      logo: row.league_logo,
      fixtureCount: Number(row.fixture_count),
    };

    if (isInternational(row.country_name)) {
      international.push({ ...league, groupName: row.country_name ?? "International" });
    } else {
      const key = row.country_name ?? "Other";
      if (!countriesMap.has(key)) {
        countriesMap.set(key, { name: key, logo: row.country_logo, leagues: [] });
      }
      countriesMap.get(key)!.leagues.push(league);
    }
  }

  const countries = Array.from(countriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  res.json({ featured, international, countries });
});

// ── Sports ──────────────────────────────────────────────────────────────────
router.get("/sports", async (_req, res): Promise<void> => {
  const sports = await db.select().from(sportsTable);
  res.json(sports);
});

router.post("/sports", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateSportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sport] = await db.insert(sportsTable).values(parsed.data).returning();
  res.status(201).json(sport);
});

// ── Leagues ──────────────────────────────────────────────────────────────────
router.get("/leagues", async (req, res): Promise<void> => {
  const qp = ListLeaguesQueryParams.safeParse(req.query);
  const sportId = qp.success ? qp.data.sportId : undefined;

  let query = db.select({
    id: leaguesTable.id,
    sportId: leaguesTable.sportId,
    name: leaguesTable.name,
    sport: sportsTable,
  }).from(leaguesTable).leftJoin(sportsTable, eq(sportsTable.id, leaguesTable.sportId));

  if (sportId) {
    query = query.where(eq(leaguesTable.sportId, sportId)) as typeof query;
  }

  const leagues = await query;
  res.json(leagues);
});

router.post("/leagues", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateLeagueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [league] = await db.insert(leaguesTable).values(parsed.data).returning();
  const [sport] = await db.select().from(sportsTable).where(eq(sportsTable.id, league.sportId));
  res.status(201).json({ ...league, sport });
});

// ── Teams ──────────────────────────────────────────────────────────────────
router.get("/teams", async (_req, res): Promise<void> => {
  const teams = await db.select().from(teamsTable);
  res.json(teams);
});

router.post("/teams", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [team] = await db.insert(teamsTable).values(parsed.data).returning();
  res.status(201).json(team);
});

// ── Fixtures ──────────────────────────────────────────────────────────────────
router.get("/fixtures", async (req, res): Promise<void> => {
  const qp = ListFixturesQueryParams.safeParse(req.query);
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const limit = qp.success ? (qp.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;
  const sportId = qp.success ? qp.data.sportId : undefined;
  const leagueId = qp.success ? qp.data.leagueId : undefined;
  const status = qp.success ? qp.data.status : undefined;

  const dateStr = req.query.date as string | undefined;
  const dateFromStr = req.query.dateFrom as string | undefined;
  const dateToStr = req.query.dateTo as string | undefined;
  const startAfterStr = req.query.startAfter as string | undefined;
  const withMarkets = req.query.withMarkets === "true";

  const conditions = [];
  if (leagueId) conditions.push(eq(fixturesTable.leagueId, leagueId));
  if (status) conditions.push(eq(fixturesTable.status, status as any));
  if (sportId) conditions.push(eq(leaguesTable.sportId, sportId));
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const dayStart = new Date(dateStr + "T00:00:00.000Z");
    const dayEnd = new Date(dateStr + "T23:59:59.999Z");
    conditions.push(gte(fixturesTable.startTime, dayStart));
    conditions.push(lte(fixturesTable.startTime, dayEnd));
  } else {
    if (dateFromStr && /^\d{4}-\d{2}-\d{2}$/.test(dateFromStr)) {
      conditions.push(gte(fixturesTable.startTime, new Date(dateFromStr + "T00:00:00.000Z")));
    }
    if (dateToStr && /^\d{4}-\d{2}-\d{2}$/.test(dateToStr)) {
      conditions.push(lte(fixturesTable.startTime, new Date(dateToStr + "T23:59:59.999Z")));
    }
    if (startAfterStr) {
      const startAfterDate = new Date(startAfterStr);
      if (!isNaN(startAfterDate.getTime())) {
        conditions.push(gte(fixturesTable.startTime, startAfterDate));
      }
    }
  }

  const homeTeams = db.$with("home_teams").as(db.select().from(teamsTable));
  const awayTeams = db.$with("away_teams").as(db.select().from(teamsTable));

  const baseQuery = db
    .select({
      id: fixturesTable.id,
      leagueId: fixturesTable.leagueId,
      homeTeamId: fixturesTable.homeTeamId,
      awayTeamId: fixturesTable.awayTeamId,
      startTime: fixturesTable.startTime,
      status: fixturesTable.status,
      scoreHome: fixturesTable.scoreHome,
      scoreAway: fixturesTable.scoreAway,
      leagueName: leaguesTable.name,
      leagueLogo: leaguesTable.leagueLogo,
      countryName: leaguesTable.countryName,
      countryLogo: leaguesTable.countryLogo,
      leagueSportId: leaguesTable.sportId,
      sportName: sportsTable.name,
      sportIcon: sportsTable.icon,
    })
    .from(fixturesTable)
    .leftJoin(leaguesTable, eq(leaguesTable.id, fixturesTable.leagueId))
    .leftJoin(sportsTable, eq(sportsTable.id, leaguesTable.sportId));

  const filteredQuery = conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery;

  const [totalResult] = await db
    .select({ count: count() })
    .from(fixturesTable)
    .leftJoin(leaguesTable, eq(leaguesTable.id, fixturesTable.leagueId))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const rows = await (filteredQuery as any).orderBy(asc(fixturesTable.startTime)).limit(limit).offset(offset);

  // Fetch team names for all fixtures
  const homeIds = [...new Set(rows.map((r: any) => r.homeTeamId))];
  const awayIds = [...new Set(rows.map((r: any) => r.awayTeamId))];
  const allTeamIds = [...new Set([...homeIds, ...awayIds])];
  const teamRows = allTeamIds.length > 0
    ? await db.select().from(teamsTable).where(inArray(teamsTable.id, allTeamIds as number[]))
    : [];
  const teamMap = Object.fromEntries(teamRows.map((t) => [t.id, t]));

  const fixtures = rows.map((row: any) => ({
    id: row.id,
    leagueId: row.leagueId,
    homeTeamId: row.homeTeamId,
    awayTeamId: row.awayTeamId,
    startTime: row.startTime,
    status: row.status,
    scoreHome: row.scoreHome,
    scoreAway: row.scoreAway,
    league: {
      id: row.leagueId,
      sportId: row.leagueSportId,
      name: row.leagueName,
      logo: row.leagueLogo ?? null,
      countryName: row.countryName ?? null,
      countryLogo: row.countryLogo ?? null,
      sport: { id: row.leagueSportId, name: row.sportName, icon: row.sportIcon },
    },
    homeTeam: teamMap[row.homeTeamId] || { id: row.homeTeamId, name: "Unknown", logo: null },
    awayTeam: teamMap[row.awayTeamId] || { id: row.awayTeamId, name: "Unknown", logo: null },
  }));

  if (!withMarkets) {
    res.json({ fixtures, total: totalResult.count, page, limit });
    return;
  }

  // Bulk-fetch markets and odds for all fixtures in two queries
  const fixtureIds = fixtures.map((f: any) => f.id);
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

  const marketsMap = new Map<number, any[]>();
  for (const market of allMarkets) {
    if (!marketsMap.has(market.fixtureId)) marketsMap.set(market.fixtureId, []);
    marketsMap.get(market.fixtureId)!.push({
      ...market,
      odds: (oddsMap.get(market.id) ?? []).map((o) => ({
        ...o,
        oddsValue: parseFloat(o.oddsValue),
      })),
    });
  }

  const fixturesWithMarkets = fixtures.map((f: any) => ({
    ...f,
    markets: marketsMap.get(f.id) ?? [],
  }));

  res.json({ fixtures: fixturesWithMarkets, total: totalResult.count, page, limit });
});

router.post("/fixtures", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateFixtureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [fixture] = await db.insert(fixturesTable).values({
    ...parsed.data,
    startTime: new Date(parsed.data.startTime),
  }).returning();
  res.status(201).json(fixture);
});

router.get("/fixtures/:id", async (req, res): Promise<void> => {
  const params = GetFixtureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, params.data.id)).limit(1);
  if (!fixture) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }

  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, fixture.leagueId)).limit(1);
  const [sport] = league ? await db.select().from(sportsTable).where(eq(sportsTable.id, league.sportId)).limit(1) : [null];
  const [homeTeam] = await db.select().from(teamsTable).where(eq(teamsTable.id, fixture.homeTeamId)).limit(1);
  const [awayTeam] = await db.select().from(teamsTable).where(eq(teamsTable.id, fixture.awayTeamId)).limit(1);

  const markets = await db.select().from(marketsTable).where(eq(marketsTable.fixtureId, fixture.id));
  const marketsWithOdds = await Promise.all(
    markets.map(async (market) => {
      const odds = await db.select().from(oddsTable).where(eq(oddsTable.marketId, market.id));
      return {
        ...market,
        odds: odds.map((o) => ({ ...o, oddsValue: parseFloat(o.oddsValue) })),
      };
    })
  );

  res.json({
    ...fixture,
    league: { ...league, sport },
    homeTeam,
    awayTeam,
    markets: marketsWithOdds,
  });
});

router.patch("/fixtures/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateFixtureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFixtureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: any = { ...parsed.data };
  if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);

  const [fixture] = await db
    .update(fixturesTable)
    .set(updateData)
    .where(eq(fixturesTable.id, params.data.id))
    .returning();

  if (!fixture) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }
  res.json(fixture);
});

// ── Markets & Odds ─────────────────────────────────────────────────────────
router.post("/markets", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateMarketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { fixtureId, marketType, selections } = parsed.data;
  const [market] = await db.insert(marketsTable).values({ fixtureId, marketType }).returning();
  const oddsRows = await db.insert(oddsTable).values(
    selections.map((s) => ({ marketId: market.id, selection: s.selection, oddsValue: s.oddsValue.toString() }))
  ).returning();
  res.status(201).json({ ...market, odds: oddsRows.map((o) => ({ ...o, oddsValue: parseFloat(o.oddsValue) })) });
});

router.patch("/odds/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateOddsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOddsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [odds] = await db
    .update(oddsTable)
    .set({ oddsValue: parsed.data.oddsValue.toString() })
    .where(eq(oddsTable.id, params.data.id))
    .returning();
  if (!odds) {
    res.status(404).json({ error: "Odds not found" });
    return;
  }
  res.json({ ...odds, oddsValue: parseFloat(odds.oddsValue) });
});

export default router;
