import { db, fixturesTable, betsTable, betSelectionsTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import { notifyBetWon, notifyBetLost } from "./notifications";

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
    // Product of odds for void (unrecognised) legs — used to reduce potentialWin
    // so that voided selections contribute odds=1.0 rather than their stored value.
    let voidOddsDivisor = 1.0;

    for (const sel of allBetSelections) {
      const fixture = fixtureMap[sel.fixtureId];
      if (!fixture || fixture.scoreHome === null || fixture.scoreAway === null) {
        // Fixture not yet finished — keep waiting
        hasPending = true;
        continue;
      }
      const outcome = getSelectionOutcome(sel.selection, sel.market, fixture.scoreHome!, fixture.scoreAway!);
      if (outcome === false) {
        hasLoss = true;
        break;
      }
      if (outcome === null) {
        // Fixture IS finished but market type is unrecognised — treat as void.
        // Track the stored odds so we can divide them out of potentialWin below.
        // Do NOT set hasPending here, or the bet will be stuck forever.
        voidOddsDivisor *= parseFloat(sel.odds as string);
      }
    }

    if (hasLoss) {
      await db.update(betsTable).set({ status: "lost" }).where(eq(betsTable.id, bet.id));
      lost++;
      if (!bet.branchId) {
        notifyBetLost(bet.userId, bet.id).catch(() => {});
      }
      continue;
    }

    if (hasPending) continue;

    await db.update(betsTable).set({ status: "won" }).where(eq(betsTable.id, bet.id));
    won++;

    // Branch bets (placed by agents on behalf of walk-in customers) are NOT
    // auto-credited — the winner claims cash at the payout desk instead.
    // Regular online-user bets are credited to their wallet as before.
    if (!bet.branchId) {
      const storedPotentialWin = parseFloat(bet.potentialWin as any);
      const stake = parseFloat(bet.stake as any);
      // Divide out void-leg odds contributions; if all legs are void this equals stake (full refund).
      const payout = voidOddsDivisor > 1.0
        ? Math.max(stake, storedPotentialWin / voidOddsDivisor)
        : storedPotentialWin;
      const [wallet] = await db
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, bet.userId))
        .limit(1);
      if (wallet) {
        const newBalance = parseFloat(wallet.balance) + payout;
        await db
          .update(walletsTable)
          .set({ balance: newBalance.toFixed(2) })
          .where(eq(walletsTable.id, wallet.id));
        await db.insert(transactionsTable).values({
          walletId: wallet.id,
          amount: payout.toFixed(2),
          type: "bet_won",
          description: `Bet #${bet.id} won`,
        });
        notifyBetWon(bet.userId, payout.toFixed(2), wallet.currency ?? "USD", bet.id).catch(() => {});
      }
    }
  }

  logger.info({ settled: won + lost, won, lost }, "Auto-settle complete");
  return { settled: won + lost, won, lost };
}
