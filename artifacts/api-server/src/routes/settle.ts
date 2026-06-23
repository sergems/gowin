import { Router } from "express";
import { db, fixturesTable, betsTable, betSelectionsTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAdminOrManager, type AuthRequest } from "../middlewares/auth";
import { SettleFixtureParams, SettleFixtureBody } from "@workspace/api-zod";

const router = Router();

router.post("/fixtures/:id/settle", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const params = SettleFixtureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SettleFixtureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { scoreHome, scoreAway } = parsed.data;

  // Update fixture
  await db.update(fixturesTable).set({
    status: "finished",
    scoreHome,
    scoreAway,
  }).where(eq(fixturesTable.id, params.data.id));

  // Find pending bet selections for this fixture
  const selections = await db
    .select()
    .from(betSelectionsTable)
    .where(eq(betSelectionsTable.fixtureId, params.data.id));

  const betIds = [...new Set(selections.map((s) => s.betId))];
  if (betIds.length === 0) {
    res.json({ betsSettled: 0, betsWon: 0, betsLost: 0, totalPayout: 0 });
    return;
  }

  // Only settle pending bets
  const pendingBets = await db
    .select()
    .from(betsTable)
    .where(and(inArray(betsTable.id, betIds), eq(betsTable.status, "pending")));

  let betsWon = 0;
  let betsLost = 0;
  let totalPayout = 0;

  function selectionWon(sel: string, market: string): boolean {
    const total = scoreHome + scoreAway;
    if (market === "1X2" || market === "Match Result") {
      if (scoreHome > scoreAway) return sel === "Home" || sel === "Home Win";
      if (scoreAway > scoreHome) return sel === "Away" || sel === "Away Win";
      return sel === "Draw";
    }
    if (market === "Double Chance") {
      if (sel === "1X") return scoreHome >= scoreAway;
      if (sel === "X2") return scoreAway >= scoreHome;
      if (sel === "12") return scoreHome !== scoreAway;
      return false;
    }
    if (market === "Both Teams To Score") {
      const both = scoreHome > 0 && scoreAway > 0;
      return sel === "Yes" ? both : !both;
    }
    const ou = market.match(/^Over\/Under (\d+(?:\.\d+)?)$/);
    if (ou) {
      const line = parseFloat(ou[1]!);
      if (sel.startsWith("Over")) return total > line;
      if (sel.startsWith("Under")) return total < line;
    }
    return false;
  }

  for (const bet of pendingBets) {
    const betSelections = selections.filter((s) => s.betId === bet.id);

    // A bet wins only if ALL selections are correct (accumulator logic)
    const allWon = betSelections.every((s) => selectionWon(s.selection, s.market));

    if (allWon) {
      await db.update(betsTable).set({ status: "won" }).where(eq(betsTable.id, bet.id));
      const payout = parseFloat(bet.potentialWin);
      totalPayout += payout;
      betsWon++;

      // Credit wallet
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
    } else {
      await db.update(betsTable).set({ status: "lost" }).where(eq(betsTable.id, bet.id));
      betsLost++;
    }
  }

  res.json({
    betsSettled: pendingBets.length,
    betsWon,
    betsLost,
    totalPayout,
  });
});

export default router;
