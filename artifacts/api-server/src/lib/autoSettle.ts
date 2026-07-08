import { db, fixturesTable, betsTable, betSelectionsTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import { notifyBetWon, notifyBetLost } from "./notifications";
import { UP_SELECTIONS } from "./upMarkets";

function getSelectionOutcome(
  selection: string,
  market: string,
  scoreHome: number,
  scoreAway: number,
): boolean | null {
  const total = scoreHome + scoreAway;
  const m = market.trim().toLowerCase();
  const s = selection.trim().toLowerCase();

  if (m === "1x2" || m === "match result") {
    // 1UP/2UP selections are handled separately via upWon flag — treat as null (void) here
    if (s === "home 1up" || s === "home 2up" || s === "away 1up" || s === "away 2up") return null;
    if (scoreHome > scoreAway) return s === "home" || s === "home win" || s === "1";
    if (scoreAway > scoreHome) return s === "away" || s === "away win" || s === "2";
    return s === "draw" || s === "x";
  }

  if (m === "double chance") {
    const homeWin = scoreHome > scoreAway;
    const awayWin = scoreAway > scoreHome;
    const draw = scoreHome === scoreAway;
    if (s === "1x") return homeWin || draw;
    if (s === "x2") return awayWin || draw;
    if (s === "12") return homeWin || awayWin;
    return false;
  }

  if (m === "both teams to score" || m === "btts") {
    const bothScored = scoreHome > 0 && scoreAway > 0;
    if (s === "yes") return bothScored;
    if (s === "no") return !bothScored;
    return false;
  }

  const ouMatch = market.match(/^Over\/Under\s+(\d+(?:\.\d+)?)$/i);
  if (ouMatch) {
    const line = parseFloat(ouMatch[1]!);
    if (s.startsWith("over")) return total > line;
    if (s.startsWith("under")) return total < line;
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

      // ── 1UP / 2UP selections ──────────────────────────────────────────────
      // These are settled in real-time by the live worker (up_won = true).
      // At final settlement: if up_won is true → won; if fixture finished but
      // up_won is false → lost (condition was never met during the match).
      if (UP_SELECTIONS.has(sel.selection)) {
        if (sel.upWon) {
          continue; // Live worker already settled this leg as won
        }
        if (!fixture) {
          hasPending = true; // Fixture not finished yet — wait
          continue;
        }
        // Fixture finished and condition was never met → lost
        hasLoss = true;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────

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
      await db.transaction(async (tx) => {
        const [wallet] = await tx
          .select()
          .from(walletsTable)
          .where(eq(walletsTable.userId, bet.userId))
          .limit(1);
        if (wallet) {
          const newBalance = parseFloat(wallet.balance) + payout;
          await tx
            .update(walletsTable)
            .set({ balance: newBalance.toFixed(2) })
            .where(eq(walletsTable.id, wallet.id));
          await tx.insert(transactionsTable).values({
            walletId: wallet.id,
            amount: payout.toFixed(2),
            type: "bet_won",
            description: `Bet #${bet.id} won`,
          });
          notifyBetWon(bet.userId, payout.toFixed(2), wallet.currency ?? "USD", bet.id).catch(() => {});
        }
      });
    }
  }

  logger.info({ settled: won + lost, won, lost }, "Auto-settle complete");
  return { settled: won + lost, won, lost };
}
