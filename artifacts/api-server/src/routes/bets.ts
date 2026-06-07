import { Router } from "express";
import { db, betsTable, betSelectionsTable, walletsTable, transactionsTable, oddsTable, fixturesTable, usersTable } from "@workspace/db";
import { eq, desc, and, count, inArray, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";
import {
  PlaceBetBody,
  ListAllBetsQueryParams,
  GetMyBetsQueryParams,
  GetBetParams,
  VoidBetParams,
} from "@workspace/api-zod";

const router = Router();

router.post("/bets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = PlaceBetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { stake, selections } = parsed.data;

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!)).limit(1);
  if (!wallet || parseFloat(wallet.balance) < stake) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialWin = stake * totalOdds;

  const newBalance = parseFloat(wallet.balance) - stake;
  await db.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, wallet.id));

  const [bet] = await db.insert(betsTable).values({
    userId: req.userId!,
    stake: stake.toFixed(2),
    totalOdds: totalOdds.toFixed(4),
    potentialWin: potentialWin.toFixed(2),
    status: "pending",
  }).returning();

  await db.insert(betSelectionsTable).values(
    selections.map((s) => ({
      betId: bet.id,
      fixtureId: s.fixtureId,
      market: s.market,
      selection: s.selection,
      odds: s.odds.toFixed(4),
    }))
  );

  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: stake.toFixed(2),
    type: "bet_placed",
    description: `Bet #${bet.id} placed`,
  });

  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  res.status(201).json({
    ...bet,
    stake: parseFloat(bet.stake),
    totalOdds: parseFloat(bet.totalOdds),
    potentialWin: parseFloat(bet.potentialWin),
    user,
  });
});

function formatBet(bet: any, user?: any) {
  return {
    id: bet.id,
    userId: bet.userId,
    stake: parseFloat(bet.stake),
    totalOdds: parseFloat(bet.totalOdds),
    potentialWin: parseFloat(bet.potentialWin),
    status: bet.status,
    createdAt: bet.createdAt,
    user: user || undefined,
  };
}

router.get("/bets/my", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const qp = GetMyBetsQueryParams.safeParse(req.query);
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const limit = qp.success ? (qp.data.limit ?? 20) : 20;
  const status = qp.success ? qp.data.status : undefined;
  const offset = (page - 1) * limit;

  const conditions = [eq(betsTable.userId, req.userId!)];
  if (status) conditions.push(eq(betsTable.status, status as any));

  const [totalResult] = await db.select({ count: count() }).from(betsTable).where(and(...conditions));
  const bets = await db.select().from(betsTable).where(and(...conditions)).orderBy(desc(betsTable.createdAt)).limit(limit).offset(offset);

  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  res.json({
    bets: bets.map((b) => formatBet(b, user)),
    total: totalResult.count,
    page,
    limit,
  });
});

router.get("/bets", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const qp = ListAllBetsQueryParams.safeParse(req.query);
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const limit = qp.success ? (qp.data.limit ?? 20) : 20;
  const status = qp.success ? qp.data.status : undefined;
  const userId = qp.success ? qp.data.userId : undefined;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) conditions.push(eq(betsTable.status, status as any));
  if (userId) conditions.push(eq(betsTable.userId, userId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(betsTable).where(whereClause);
  const rows = await db
    .select({
      bet: betsTable,
      user: { id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt },
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(usersTable.id, betsTable.userId))
    .where(whereClause)
    .orderBy(desc(betsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    bets: rows.map((r) => formatBet(r.bet, r.user)),
    total: totalResult.count,
    page,
    limit,
  });
});

router.get("/bets/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetBetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, params.data.id)).limit(1);
  if (!bet) {
    res.status(404).json({ error: "Bet not found" });
    return;
  }

  const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, bet.id));
  const fixtureIds = [...new Set(selections.map((s) => s.fixtureId))];
  const fixtures = fixtureIds.length > 0 ? await db.select().from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds)) : [];
  const fixtureMap = Object.fromEntries(fixtures.map((f) => [f.id, f]));

  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, bet.userId)).limit(1);

  res.json({
    ...formatBet(bet, user),
    selections: selections.map((s) => ({
      id: s.id,
      betId: s.betId,
      fixtureId: s.fixtureId,
      market: s.market,
      selection: s.selection,
      odds: parseFloat(s.odds),
      fixture: fixtureMap[s.fixtureId] || null,
    })),
  });
});

router.patch("/bets/:id/void", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = VoidBetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, params.data.id)).limit(1);
  if (!bet) {
    res.status(404).json({ error: "Bet not found" });
    return;
  }
  if (bet.status !== "pending") {
    res.status(400).json({ error: "Only pending bets can be voided" });
    return;
  }

  const [updated] = await db.update(betsTable).set({ status: "void" }).where(eq(betsTable.id, bet.id)).returning();

  // Refund stake
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, bet.userId)).limit(1);
  if (wallet) {
    const refunded = parseFloat(wallet.balance) + parseFloat(bet.stake);
    await db.update(walletsTable).set({ balance: refunded.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      amount: bet.stake,
      type: "bet_refund",
      description: `Bet #${bet.id} voided - stake refunded`,
    });
  }

  res.json(formatBet(updated));
});

export default router;
