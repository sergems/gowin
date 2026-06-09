import { db, fixturesTable, betsTable, betSelectionsTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { logger } from "./logger";

function getSelectionOutcome(
  selection: string,
  market: string,
  scoreHome: number,
  scoreAway: number,
): boolean | null {
  const total = scoreHome + scoreAway;

  if (market === "1X2" || market === "Match Result") {
    if (scoreHome > scoreAway) return selection === "Home" || selection === "Home Win";
    if (scoreAway > scoreHome) return selection === "Away" || selection === "Away Win";
    return selection === "Draw";
  }

  if (market === "Double Chance") {
    const homeWin = scoreHome > scoreAway;
    const awayWin = scoreAway > scoreHome;
    const draw = scoreHome === scoreAway;
    if (selection === "1X") return homeWin || draw;
    if (selection === "X2") return awayWin || draw;
    if (selection === "12") return homeWin || awayWin;
    return false;
  }

  if (market === "Both Teams To Score") {
    const bothScored = scoreHome > 0 && scoreAway > 0;
    if (selection === "Yes") return bothScored;
    if (selection === "No") return !bothScored;
    return false;
  }

  const ouMatch = market.match(/^Over\/Under (\d+(?:\.\d+)?)$/);
  if (ouMatch) {
    const line = parseFloat(ouMatch[1]!);
    if (selection.startsWith("Over")) return total > line;
    if (selection.startsWith("Under")) return total < line;
    return false;
  }

  return null;
}

export async function autoSettleFinishedFixtures(): Promise<{
  settled: number;
  won: number;
  lost: number;
}> {
  const finishedFixtures = await db
    .select({ id: fixturesTable.id, scoreHome: fixturesTable.scoreHome, scoreAway: fixturesTable.scoreAway })
    .from(fixturesTable)
    .where(and(eq(fixturesTable.status, "finished"), isNotNull(fixturesTable.scoreHome)));

  if (finishedFixtures.length === 0) return { settled: 0, won: 0, lost: 0 };

  const fixtureIds = finishedFixtures.map((f) => f.id);
  const fixtureMap = Object.fromEntries(finishedFixtures.map((f) => [f.id, f]));

  const selectionsForFinished = await db
    .select()
    .from(betSelectionsTable)
    .where(inArray(betSelectionsTable.fixtureId, fixtureIds));

  if (selectionsForFinished.length === 0) return { settled: 0, won: 0, lost: 0 };

  const betIds = [...new Set(selectionsForFinished.map((s) => s.betId))];

  const pendingBets = await db
    .select()
    .from(betsTable)
    .where(and(inArray(betsTable.id, betIds), eq(betsTable.status, "pending")));

  const allSelectionsForBets = await db
    .select()
    .from(betSelectionsTable)
    .where(inArray(betSelectionsTable.betId, betIds));

  let won = 0;
  let lost = 0;

  for (const bet of pendingBets) {
    const allBetSelections = allSelectionsForBets.filter((s) => s.betId === bet.id);

    let hasLoss = false;
    let hasPending = false;

    for (const sel of allBetSelections) {
      const fixture = fixtureMap[sel.fixtureId];
      if (!fixture || fixture.scoreHome === null || fixture.scoreAway === null) {
        hasPending = true;
        continue;
      }
      const outcome = getSelectionOutcome(sel.selection, sel.market, fixture.scoreHome!, fixture.scoreAway!);
      if (outcome === false) {
        hasLoss = true;
        break;
      }
      if (outcome === null) {
        hasPending = true;
      }
    }

    if (hasLoss) {
      await db.update(betsTable).set({ status: "lost" }).where(eq(betsTable.id, bet.id));
      lost++;
      continue;
    }

    if (hasPending) continue;

    await db.update(betsTable).set({ status: "won" }).where(eq(betsTable.id, bet.id));
    const payout = parseFloat(bet.potentialWin);
    won++;

    const [wallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, bet.userId))
      .limit(1);
    if (wallet) {
      const newBalance = parseFloat(wallet.balance) + payout;
      await db.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
      await db.insert(transactionsTable).values({
        walletId: wallet.id,
        amount: payout.toFixed(2),
        type: "bet_won",
        description: `Bet #${bet.id} won`,
      });
    }
  }

  logger.info({ settled: won + lost, won, lost }, "Auto-settle complete");
  return { settled: won + lost, won, lost };
}
