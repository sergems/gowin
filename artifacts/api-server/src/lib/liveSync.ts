import { db, settingsTable, fixturesTable, marketsTable, oddsTable, leaguesTable, sportsTable, teamsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger";
import { liveCache, type LiveFixture, type LiveMarket, type LiveStats } from "./liveCache";
import { broadcast } from "./wsServer";
import { settleUpMarketBets, getUpMarketsConfig, injectUpMarkets } from "./upMarkets";
import { triggerCashOutRecalcForFixtures } from "./cashOutEngine";

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

function validOdd(v: any): boolean {
  return v != null && isFinite(Number(v)) && Number(v) > 1;
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

  const allTeamIds = [...new Set([...dbFixtures.map((f) => f.homeTeamId), ...dbFixtures.map((f) => f.awayTeamId)])];
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
      suspended: market.suspended,
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
async function fetchLiveScoreData(apiKey: string): Promise<{ minuteMap: Map<string, string>; scoreMap: Map<string, { home: number; away: number }>; ok: boolean }> {
  const minuteMap = new Map<string, string>();
  const scoreMap = new Map<string, { home: number; away: number }>();
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
        const home = parseInt(event.event_final_result?.split(" - ")?.[0] ?? "", 10);
        const away = parseInt(event.event_final_result?.split(" - ")?.[1] ?? "", 10);
        if (!isNaN(home) && !isNaN(away)) scoreMap.set(extId, { home, away });
      }
      return { minuteMap, scoreMap, ok: true };
    }
    return { minuteMap, scoreMap, ok: false };
  } catch (err) {
    logger.warn({ err }, "LiveSync: livescore fetch failed");
    return { minuteMap, scoreMap, ok: false };
  }
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

// ── Fetch odds from AllSports API for a single fixture and update DB in-place ─
// Updates existing odds rows by selection name — preserves IDs for client
// direction tracking. Only updates 1X2 / Double Chance / Over-Under markets.
async function fetchAndUpdateLiveOdds(apiKey: string, fixtureId: number, externalId: string): Promise<boolean> {
  try {
    liveCache.recordApiRequest();
    const resp = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Odds&APIkey=${apiKey}&matchId=${externalId}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    const data = await resp.json() as any;
    if (data?.success !== 1 || !data?.result?.[externalId]) return false;

    const bks: any[] = data.result[externalId];
    const bk =
      bks.find((b: any) => b.odd_bookmakers === "bet365") ??
      bks.find((b: any) => b.odd_bookmakers === "1xBet") ??
      bks[0] ??
      null;
    if (!bk) return false;

    // Fetch existing markets + odds for this fixture
    const markets = await db.select().from(marketsTable).where(eq(marketsTable.fixtureId, fixtureId));
    if (markets.length === 0) return false;

    const marketIds = markets.map((m) => m.id);
    const allOdds = await db.select().from(oddsTable).where(inArray(oddsTable.marketId, marketIds));

    // Build lookup: marketId → array of odds rows
    const oddsForMarket = new Map<number, typeof allOdds>();
    for (const o of allOdds) {
      if (!oddsForMarket.has(o.marketId)) oddsForMarket.set(o.marketId, []);
      oddsForMarket.get(o.marketId)!.push(o);
    }

    // Selection → new value mapping per market type
    const selectionValue = (market: typeof markets[number]): Map<string, string> => {
      const m = new Map<string, string>();
      switch (market.marketType) {
        case "1X2":
          if (validOdd(bk.odd_1)) m.set("Home", Number(bk.odd_1).toFixed(2));
          if (validOdd(bk.odd_x)) m.set("Draw", Number(bk.odd_x).toFixed(2));
          if (validOdd(bk.odd_2)) m.set("Away", Number(bk.odd_2).toFixed(2));
          break;
        case "Double Chance":
          if (validOdd(bk.odd_1x)) m.set("1X", Number(bk.odd_1x).toFixed(2));
          if (validOdd(bk.odd_12)) m.set("12", Number(bk.odd_12).toFixed(2));
          if (validOdd(bk.odd_x2)) m.set("X2", Number(bk.odd_x2).toFixed(2));
          break;
        case "Both Teams To Score":
          if (validOdd(bk.bts_yes)) m.set("Yes", Number(bk.bts_yes).toFixed(2));
          if (validOdd(bk.bts_no))  m.set("No",  Number(bk.bts_no).toFixed(2));
          break;
        default:
          if (market.marketType.startsWith("Over/Under ")) {
            const line = market.marketType.replace("Over/Under ", "");
            const overKey = `o+${line}`;
            const underKey = `u+${line}`;
            if (validOdd(bk[overKey])) m.set(`Over ${line}`, Number(bk[overKey]).toFixed(2));
            if (validOdd(bk[underKey])) m.set(`Under ${line}`, Number(bk[underKey]).toFixed(2));
          }
          break;
      }
      return m;
    };

    // Update each existing odds row in-place (preserving IDs)
    let updated = false;
    for (const market of markets) {
      const newValues = selectionValue(market);
      if (newValues.size === 0) continue;
      const rows = oddsForMarket.get(market.id) ?? [];
      for (const o of rows) {
        const newVal = newValues.get(o.selection);
        if (newVal && newVal !== o.oddsValue) {
          await db.update(oddsTable).set({ oddsValue: newVal }).where(eq(oddsTable.id, o.id));
          updated = true;
        }
      }
    }
    return updated;
  } catch (err) {
    logger.warn({ err, fixtureId }, "LiveSync: live odds API fetch failed for fixture");
    return false;
  }
}

// ── Sync worker: Live fixtures (every 15 s) ────────────────────────────────
// Detects goals and halftime — triggers immediate odds refresh on those events
export async function syncLiveFixtures(): Promise<void> {
  try {
    // Snapshot previous state for event detection BEFORE rebuilding
    const prevMap = new Map(liveCache.getFixtures().map((f) => [f.id, f]));

    const fixtures = await buildLiveFixturesFromDb();
    // DB read succeeded — clear this worker's error only (not other workers')
    liveCache.clearWorkerError("fixture");

    const apiKey = await getApiKey();
    if (apiKey) {
      const { minuteMap, scoreMap, ok } = await fetchLiveScoreData(apiKey);
      if (!ok) {
        liveCache.recordWorkerError("fixture", "AllSports livescore API temporarily unavailable");
      }
      for (const f of fixtures) {
        if (f.externalId) {
          if (minuteMap.has(f.externalId)) {
            f.matchMinute = minuteMap.get(f.externalId)!;
          }
          // Use authoritative scores from livescore API when available
          if (scoreMap.has(f.externalId)) {
            const s = scoreMap.get(f.externalId)!;
            f.scoreHome = s.home;
            f.scoreAway = s.away;
          }
        }
      }
    }

    // ── Event detection: goal or halftime → immediate odds refresh ──────────
    let significantEvent = false;
    for (const f of fixtures) {
      const prev = prevMap.get(f.id);
      if (!prev) continue;

      // Goal scored
      if (
        (f.scoreHome !== null && f.scoreHome !== (prev.scoreHome ?? 0)) ||
        (f.scoreAway !== null && f.scoreAway !== (prev.scoreAway ?? 0))
      ) {
        logger.info(
          { fixtureId: f.id, score: `${f.scoreHome}-${f.scoreAway}`, prev: `${prev.scoreHome}-${prev.scoreAway}` },
          "LiveSync: goal detected — triggering immediate odds refresh",
        );
        significantEvent = true;

        // 1UP/2UP live settlement: run asynchronously so it doesn't block sync
        if (f.scoreHome !== null && f.scoreAway !== null && (f.sportName ?? "Football").toLowerCase() === "football") {
          const sh = f.scoreHome, sa = f.scoreAway;
          settleUpMarketBets(f.id, sh, sa).catch((err) => {
            logger.warn({ err, fixtureId: f.id }, "LiveSync: 1UP/2UP settlement failed");
          });
        }
      }

      // Halftime kick-off
      if (f.matchMinute !== prev.matchMinute) {
        if (f.matchMinute === "HT" || f.matchMinute === "2H") {
          logger.info({ fixtureId: f.id, minute: f.matchMinute }, "LiveSync: period change — triggering immediate odds refresh");
          significantEvent = true;
        }
      }
    }

    liveCache.setFixtures(fixtures);
    broadcast("LIVE_FIXTURE_UPDATE", { fixtures });

    // Push cash-out recalculation for all live fixtures — fire-and-forget
    if (fixtures.length > 0) {
      triggerCashOutRecalcForFixtures(fixtures.map((f) => f.id)).catch(() => {});
    }

    // Fire-and-forget immediate odds + stats refresh on significant events
    if (significantEvent) {
      syncLiveOdds().catch(() => {});
      syncLiveStats().catch(() => {});
    }
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    logger.error({ err }, "LiveSync: fixture sync failed");
    liveCache.recordWorkerError("fixture", msg);
  }
}

// ── Sync worker: Live odds — DB read + AllSports API refresh (every 10 s) ──
export async function syncLiveOdds(): Promise<void> {
  try {
    const currentFixtures = liveCache.getFixtures();
    if (currentFixtures.length === 0) return;

    const apiKey = await getApiKey();

    // Phase 1: fetch fresh odds from AllSports API and update DB in-place
    if (apiKey) {
      const liveWithExtId = currentFixtures.filter((f) => f.externalId);
      let anyApiSuccess = false;
      const upConfig = await getUpMarketsConfig().catch(() => null);
      for (const fixture of liveWithExtId) {
        const ok = await fetchAndUpdateLiveOdds(apiKey, fixture.id, fixture.externalId!);
        if (ok) {
          anyApiSuccess = true;
          // Refresh 1UP/2UP odds in-place after base 1X2 odds are updated
          if (upConfig && (fixture.sportName ?? "Football").toLowerCase() === "football") {
            await injectUpMarkets(fixture.id, upConfig).catch(() => {});
          }
        }
      }
      if (!anyApiSuccess && liveWithExtId.length > 0) {
        liveCache.recordWorkerError("odds", "AllSports odds API returned no data for live fixtures");
      } else {
        liveCache.clearWorkerError("odds");
      }
    }

    // Phase 2: read (now-fresh) odds from DB and push to cache + clients
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
        suspended: market.suspended,
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
    if (updates.length > 0) {
      broadcast("LIVE_ODDS_UPDATE", { updates });
      // Odds changed — immediately push cash-out recalc for affected fixtures
      triggerCashOutRecalcForFixtures(updates.map((u) => u.fixtureId)).catch(() => {});
    }
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    logger.error({ err }, "LiveSync: odds sync failed");
    liveCache.recordWorkerError("odds", msg);
  }
}

// ── Sync worker: Live stats from API (every 30 s) ─────────────────────────
// Detects red cards → triggers immediate odds refresh
export async function syncLiveStats(): Promise<void> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return;

    const fixtures = liveCache.getFixtures().filter((f) => f.externalId);
    if (fixtures.length === 0) return;

    const statsUpdates: Array<{ fixtureId: number; stats: LiveStats }> = [];
    let fetchOk = false;
    let redCardEvent = false;

    for (const fixture of fixtures) {
      const stats = await fetchFixtureStats(apiKey, fixture.externalId!);
      if (stats) {
        // Detect red card events by comparing with cached stats
        const prevStats = fixture.stats;
        if (prevStats) {
          const prevRed = (prevStats.redCardsHome ?? 0) + (prevStats.redCardsAway ?? 0);
          const newRed = (stats.redCardsHome ?? 0) + (stats.redCardsAway ?? 0);
          if (newRed > prevRed) {
            logger.info(
              { fixtureId: fixture.id, prevRed, newRed },
              "LiveSync: red card detected — triggering immediate odds refresh",
            );
            redCardEvent = true;
          }
        }

        const updated: LiveFixture = { ...fixture, stats };
        liveCache.updateFixture(updated);
        statsUpdates.push({ fixtureId: fixture.id, stats });
        fetchOk = true;
      }
    }

    if (!fetchOk && fixtures.length > 0) {
      liveCache.recordWorkerError("stats", "AllSports statistics API returned no data");
    } else {
      liveCache.clearWorkerError("stats");
    }

    liveCache.setLastStatsSync(new Date().toISOString());
    if (statsUpdates.length > 0) {
      broadcast("LIVE_STATS_UPDATE", { updates: statsUpdates });
      // Stats changed (may include red cards) — push cash-out recalc
      triggerCashOutRecalcForFixtures(statsUpdates.map((u) => u.fixtureId)).catch(() => {});
    }

    // Immediate odds refresh on red card
    if (redCardEvent) {
      syncLiveOdds().catch(() => {});
    }
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    logger.error({ err }, "LiveSync: stats sync failed");
    liveCache.recordWorkerError("stats", msg);
  }
}

// ── Sync worker: Settled results — remove finished fixtures (every 60 s) ───
export async function syncSettledFixtures(): Promise<void> {
  try {
    const cached = liveCache.getFixtures();
    if (cached.length === 0) return;

    const fixtureIds = cached.map((f) => f.id);
    const dbRows = await db
      .select({ id: fixturesTable.id, status: fixturesTable.status })
      .from(fixturesTable)
      .where(inArray(fixturesTable.id, fixtureIds));

    const dbStatusMap = new Map(dbRows.map((r) => [r.id, r.status]));

    let changed = false;
    for (const f of cached) {
      const dbStatus = dbStatusMap.get(f.id);
      if (dbStatus && dbStatus !== "live") {
        liveCache.removeFixture(f.id);
        logger.info({ fixtureId: f.id, dbStatus }, "LiveSync: fixture settled, removed from cache");
        changed = true;
      }
    }

    liveCache.clearWorkerError("results");
    liveCache.setLastResultsSync(new Date().toISOString());

    if (changed) {
      broadcast("LIVE_FIXTURE_UPDATE", { fixtures: liveCache.getFixtures() });
    }
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    logger.warn({ err }, "LiveSync: settled results sync failed");
    liveCache.recordWorkerError("results", msg);
  }
}

// ── Start all live sync intervals ─────────────────────────────────────────
export function startLiveSyncWorkers(): void {
  // Initial sync
  syncLiveFixtures().catch(() => {});

  // Fixtures from DB + AllSports livescore (match minutes) every 15 s
  setInterval(() => { syncLiveFixtures().catch(() => {}); }, 15_000);

  // Odds: AllSports API update + DB read + broadcast every 10 s
  setInterval(() => { syncLiveOdds().catch(() => {}); }, 10_000);

  // Stats from AllSports statistics API every 30 s
  setInterval(() => { syncLiveStats().catch(() => {}); }, 30_000);

  // Settled results: remove finished fixtures from cache every 60 s
  setInterval(() => { syncSettledFixtures().catch(() => {}); }, 60_000);

  logger.info("Live sync workers started (fixture:15s, odds:10s API+DB, stats:30s, settled:60s)");
}
