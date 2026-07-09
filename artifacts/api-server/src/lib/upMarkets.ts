import {
  db, settingsTable, marketsTable, oddsTable,
  betsTable, betSelectionsTable, walletsTable, transactionsTable,
  fixturesTable, leaguesTable, sportsTable,
} from "@workspace/db";
import { eq, and, inArray, sql, or, isNull, ilike } from "drizzle-orm";
import { logger } from "./logger";
import { notifyBetWon } from "./notifications";
import { broadcast } from "./wsServer";

async function getFootballSportId(): Promise<number | null> {
  const [row] = await db.select({ id: sportsTable.id }).from(sportsTable)
    .where(ilike(sportsTable.name, "football")).limit(1);
  return row?.id ?? null;
}

// ── Config ─────────────────────────────────────────────────────────────────────

export interface UpMarketsConfig {
  enabled1UP: boolean;
  enabled2UP: boolean;
  percentage1UP: number;
  percentage2UP: number;
}

export const DEFAULT_UP_MARKETS_CONFIG: UpMarketsConfig = {
  enabled1UP: true,
  enabled2UP: true,
  percentage1UP: 45,
  percentage2UP: 75,
};

export async function getUpMarketsConfig(): Promise<UpMarketsConfig> {
  try {
    const [row] = await db.select().from(settingsTable)
      .where(eq(settingsTable.key, "up_markets_config")).limit(1);
    if (!row?.value) return DEFAULT_UP_MARKETS_CONFIG;
    return { ...DEFAULT_UP_MARKETS_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_UP_MARKETS_CONFIG;
  }
}

export async function saveUpMarketsConfig(config: UpMarketsConfig): Promise<void> {
  await db.insert(settingsTable)
    .values({ key: "up_markets_config", value: JSON.stringify(config) })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: JSON.stringify(config), updatedAt: new Date() },
    });
}

// ── Odds injection ─────────────────────────────────────────────────────────────

/**
 * Inject / refresh 1UP and 2UP odds into the 1X2 market for a football fixture.
 * Call this after the base 1X2 Home/Away odds are written or updated.
 * Uses upsert-by-selection-name to preserve row IDs so live clients track
 * direction movement correctly.
 */
export async function injectUpMarkets(fixtureId: number, config: UpMarketsConfig): Promise<boolean> {
  if (!config.enabled1UP && !config.enabled2UP) return false;

  const markets = await db.select().from(marketsTable)
    .where(eq(marketsTable.fixtureId, fixtureId));
  const market1X2 = markets.find((m) => m.marketType === "1X2");
  if (!market1X2) return false;

  const existingOdds = await db.select().from(oddsTable)
    .where(eq(oddsTable.marketId, market1X2.id));

  const homeOdd = existingOdds.find((o) => o.selection === "Home");
  const awayOdd = existingOdds.find((o) => o.selection === "Away");
  if (!homeOdd || !awayOdd) return false;

  const homeBase = parseFloat(homeOdd.oddsValue);
  const awayBase = parseFloat(awayOdd.oddsValue);
  if (!isFinite(homeBase) || !isFinite(awayBase)) return false;

  const toUpsert: Array<{ selection: string; oddsValue: string }> = [];

  if (config.enabled1UP) {
    const home1UP = homeBase * config.percentage1UP / 100;
    const away1UP = awayBase * config.percentage1UP / 100;
    if (home1UP > 1.01) toUpsert.push({ selection: "Home 1UP", oddsValue: home1UP.toFixed(2) });
    if (away1UP > 1.01) toUpsert.push({ selection: "Away 1UP", oddsValue: away1UP.toFixed(2) });
  }

  if (config.enabled2UP) {
    const home2UP = homeBase * config.percentage2UP / 100;
    const away2UP = awayBase * config.percentage2UP / 100;
    if (home2UP > 1.01) toUpsert.push({ selection: "Home 2UP", oddsValue: home2UP.toFixed(2) });
    if (away2UP > 1.01) toUpsert.push({ selection: "Away 2UP", oddsValue: away2UP.toFixed(2) });
  }

  let changed = false;
  for (const { selection, oddsValue } of toUpsert) {
    const existing = existingOdds.find((o) => o.selection === selection);
    if (existing) {
      if (existing.oddsValue !== oddsValue) {
        await db.update(oddsTable).set({ oddsValue }).where(eq(oddsTable.id, existing.id));
        changed = true;
      }
    } else {
      await db.insert(oddsTable).values({ marketId: market1X2.id, selection, oddsValue });
      changed = true;
    }
  }
  return changed;
}

/**
 * Recalculate 1UP/2UP odds for every upcoming/live football fixture using the
 * given config, and broadcast the refreshed odds over the websocket so
 * connected clients see the new prices immediately (no page reload needed).
 * Call this right after an admin updates the 1UP/2UP percentages/toggles.
 */
const RECALC_CONCURRENCY = 25;

export async function recalculateAllUpMarkets(
  config: UpMarketsConfig,
): Promise<{ fixturesUpdated: number }> {
  const footballSportId = await getFootballSportId();
  if (footballSportId === null) {
    logger.warn("1UP/2UP recalculation skipped: no 'Football' sport row found");
    return { fixturesUpdated: 0 };
  }

  const rows = await db
    .select({ fixtureId: fixturesTable.id })
    .from(fixturesTable)
    .innerJoin(leaguesTable, eq(leaguesTable.id, fixturesTable.leagueId))
    .where(
      and(
        eq(leaguesTable.sportId, footballSportId),
        inArray(fixturesTable.status, ["upcoming", "live"]),
      ),
    );

  const fixtureIds = [...new Set(rows.map((r) => r.fixtureId))];
  if (fixtureIds.length === 0) return { fixturesUpdated: 0 };

  let fixturesUpdated = 0;
  const updates: Array<{ fixtureId: number; markets: Array<{
    id: number; marketType: string; suspended: boolean;
    odds: Array<{ id: number; selection: string; oddsValue: number }>;
  }> }> = [];

  async function processOne(fixtureId: number): Promise<void> {
    try {
      const changed = await injectUpMarkets(fixtureId, config);
      if (!changed) return;
      fixturesUpdated++;

      // Broadcast the fixture's FULL market set (not just 1X2) so the live
      // socket reducer — which replaces a fixture's entire markets array on
      // ODDS_UPDATE — doesn't drop other markets (O/U, BTTS, etc.) mid-match.
      const markets = await db.select().from(marketsTable)
        .where(eq(marketsTable.fixtureId, fixtureId));
      if (markets.length === 0) return;

      const marketIds = markets.map((m) => m.id);
      const odds = await db.select().from(oddsTable)
        .where(inArray(oddsTable.marketId, marketIds));
      const oddsByMarket = new Map<number, typeof odds>();
      for (const o of odds) {
        if (!oddsByMarket.has(o.marketId)) oddsByMarket.set(o.marketId, []);
        oddsByMarket.get(o.marketId)!.push(o);
      }

      updates.push({
        fixtureId,
        markets: markets.map((m) => ({
          id: m.id,
          marketType: m.marketType,
          suspended: m.suspended,
          odds: (oddsByMarket.get(m.id) ?? []).map((o) => ({
            id: o.id,
            selection: o.selection,
            oddsValue: parseFloat(o.oddsValue),
          })),
        })),
      });
    } catch (err) {
      logger.warn({ err, fixtureId }, "Failed to recalculate 1UP/2UP odds for fixture");
    }
  }

  // Bounded-concurrency batches keep DB load reasonable across thousands of fixtures
  // while still finishing well within a normal HTTP request timeout.
  for (let i = 0; i < fixtureIds.length; i += RECALC_CONCURRENCY) {
    const batch = fixtureIds.slice(i, i + RECALC_CONCURRENCY);
    await Promise.all(batch.map(processOne));
  }

  if (updates.length > 0) broadcast("LIVE_ODDS_UPDATE", { updates });

  logger.info(
    { fixturesUpdated, total: fixtureIds.length },
    "1UP/2UP odds recalculated after admin config change",
  );
  return { fixturesUpdated };
}

// ── Outcome evaluation ─────────────────────────────────────────────────────────

export const UP_SELECTIONS = new Set(["Home 1UP", "Home 2UP", "Away 1UP", "Away 2UP"]);

export function evaluateUpCondition(
  selection: string,
  scoreHome: number,
  scoreAway: number,
): boolean {
  const diff = scoreHome - scoreAway;
  switch (selection) {
    case "Home 1UP": return diff >= 1;
    case "Home 2UP": return diff >= 2;
    case "Away 1UP": return diff <= -1;
    case "Away 2UP": return diff <= -2;
    default: return false;
  }
}

// ── Live settlement ────────────────────────────────────────────────────────────

/**
 * Called after every goal in a live football fixture.
 * 1. Marks up_won = true for any 1UP/2UP selections whose condition is now met.
 * 2. Immediately settles and credits bets that consist ENTIRELY of 1UP/2UP
 *    selections (single-leg bets) once all their conditions are satisfied.
 *    Multi-leg accumulators are handled by autoSettle at match end.
 */
export async function settleUpMarketBets(
  fixtureId: number,
  scoreHome: number,
  scoreAway: number,
): Promise<{ marked: number; settledBets: number }> {
  // Find pending (not yet won) 1UP/2UP selections for this fixture
  const pending = await db.execute(sql`
    SELECT bs.*
    FROM bet_selections bs
    JOIN bets b ON b.id = bs.bet_id
    WHERE bs.fixture_id = ${fixtureId}
      AND bs.selection IN ('Home 1UP', 'Home 2UP', 'Away 1UP', 'Away 2UP')
      AND (bs.up_won IS NULL OR bs.up_won = FALSE)
      AND b.status = 'pending'
  `);

  const pendingRows = pending.rows as Array<{
    id: number; bet_id: number; fixture_id: number;
    market: string; selection: string; odds: string; up_won: boolean | null;
  }>;

  if (pendingRows.length === 0) return { marked: 0, settledBets: 0 };

  const qualifying = pendingRows.filter(
    (s) => evaluateUpCondition(s.selection, scoreHome, scoreAway),
  );
  if (qualifying.length === 0) return { marked: 0, settledBets: 0 };

  const qualifyingIds = qualifying.map((s) => s.id);

  // Mark qualifying selections as won
  await db.execute(sql`
    UPDATE bet_selections SET up_won = TRUE
    WHERE id = ANY(${sql.raw(`ARRAY[${qualifyingIds.join(",")}]::int[]`)})
  `);

  // Check if any pure-1UP/2UP single-selection bets can now be immediately settled
  const betIds = [...new Set(qualifying.map((s) => s.bet_id))];
  const pendingBets = await db.select().from(betsTable)
    .where(and(inArray(betsTable.id, betIds), eq(betsTable.status, "pending")));

  const allSelectionsForBets = await db.select().from(betSelectionsTable)
    .where(inArray(betSelectionsTable.betId, betIds));

  let settledBets = 0;

  for (const bet of pendingBets) {
    const betSels = allSelectionsForBets.filter((s) => s.betId === bet.id);

    // Only immediately settle if EVERY selection is a 1UP/2UP type
    const allAreUp = betSels.every((s) => UP_SELECTIONS.has(s.selection));
    if (!allAreUp) continue;

    // Check all are now won (either just marked or already marked from a previous goal)
    const allWon = betSels.every((s) => {
      if (qualifyingIds.includes(s.id)) return true;
      return s.upWon === true;
    });
    if (!allWon) continue;

    await db.update(betsTable).set({ status: "won" }).where(eq(betsTable.id, bet.id));
    settledBets++;

    if (!bet.branchId) {
      const payout = parseFloat(bet.potentialWin as any);
      await db.transaction(async (tx) => {
        const [wallet] = await tx.select().from(walletsTable)
          .where(eq(walletsTable.userId, bet.userId)).limit(1);
        if (wallet) {
          const newBalance = parseFloat(wallet.balance) + payout;
          await tx.update(walletsTable)
            .set({ balance: newBalance.toFixed(2) })
            .where(eq(walletsTable.id, wallet.id));
          await tx.insert(transactionsTable).values({
            walletId: wallet.id,
            amount: payout.toFixed(2),
            type: "bet_won",
            description: `Bet #${bet.id} won (1UP/2UP live)`,
          });
          notifyBetWon(
            bet.userId, payout.toFixed(2), (wallet as any).currency ?? "USD", bet.id,
          ).catch(() => {});
        }
      });
    }
  }

  logger.info(
    { fixtureId, score: `${scoreHome}-${scoreAway}`, marked: qualifying.length, settledBets },
    "1UP/2UP live settlement complete",
  );
  return { marked: qualifying.length, settledBets };
}
