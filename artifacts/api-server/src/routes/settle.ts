import { Router } from "express";
import { db, fixturesTable, betsTable, betSelectionsTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";
import { SettleFixtureParams, SettleFixtureBody } from "@workspace/api-zod";

const router = Router();

router.post("/fixtures/:id/settle", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
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

  // Determine result
  let winningSelection: string;
  if (scoreHome > scoreAway) winningSelection = "Home Win";
  else if (scoreAway > scoreHome) winningSelection = "Away Win";
  else winningSelection = "Draw";

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

  for (const bet of pendingBets) {
    const betSelections = selections.filter((s) => s.betId === bet.id);
    
    // A bet wins if ALL selections are correct (accumulator logic)
    const allWon = betSelections.every((s) => {
      if (s.market === "Match Result" || s.market === "1X2") {
        return s.selection === winningSelection;
      }
      // For other markets, check exact selection match
      return s.selection === winningSelection;
    });

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
