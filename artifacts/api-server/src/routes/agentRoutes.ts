import { Router } from "express";
import { db, usersTable, walletsTable, betsTable, betSelectionsTable, vouchersTable, transactionsTable } from "@workspace/db";
import { eq, count, sum, desc, and, gte, lte } from "drizzle-orm";
import { requireAgent, type AuthRequest } from "../middlewares/auth";
import { randomBytes } from "crypto";

const router = Router();

function generateBetCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

// ── GET /agent/dashboard ──────────────────────────────────────────────────────
router.get("/agent/dashboard", requireAgent, async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.userId!;

  const [agent] = await db.select().from(usersTable).where(eq(usersTable.id, agentId)).limit(1);
  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalBets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
    .where(eq(betsTable.agentId, agentId));

  const [todayBets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
    .where(and(eq(betsTable.agentId, agentId), gte(betsTable.createdAt, todayStart)));

  const [monthBets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
    .where(and(eq(betsTable.agentId, agentId), gte(betsTable.createdAt, monthStart)));

  const [vouchersSold] = await db.select({ count: count(), total: sum(vouchersTable.value) }).from(vouchersTable)
    .where(eq(vouchersTable.agentId, agentId));

  const [pendingPayouts] = await db.select({ total: sum(betsTable.potentialWin) }).from(betsTable)
    .where(and(eq(betsTable.agentId, agentId), eq(betsTable.status, "won")));

  const totalStake = parseFloat(totalBets.total ?? "0");
  const commissionRate = parseFloat(agent.commissionRate ?? "0");

  res.json({
    totalBetsPlaced: totalBets.count,
    totalStake,
    todayBets: todayBets.count,
    todayRevenue: parseFloat(todayBets.total ?? "0"),
    monthBets: monthBets.count,
    monthRevenue: parseFloat(monthBets.total ?? "0"),
    vouchersSold: vouchersSold.count,
    voucherSalesValue: parseFloat(vouchersSold.total ?? "0"),
    pendingPayouts: parseFloat(pendingPayouts.total ?? "0"),
    commissionEarned: totalStake * (commissionRate / 100),
    commissionRate,
  });
});

// ── POST /agent/bets — place bet on behalf of customer ───────────────────────
router.post("/agent/bets", requireAgent, async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.userId!;
  const [agent] = await db.select().from(usersTable).where(eq(usersTable.id, agentId)).limit(1);
  if (!agent || !agent.branchId) { res.status(403).json({ error: "Agent not properly configured" }); return; }

  const { selections, stake } = req.body as {
    selections: Array<{ fixtureId: number; market: string; selection: string; odds: number }>;
    stake: number;
  };

  if (!Array.isArray(selections) || selections.length === 0) {
    res.status(400).json({ error: "Selections required" });
    return;
  }
  if (typeof stake !== "number" || stake <= 0) {
    res.status(400).json({ error: "Valid stake required" });
    return;
  }

  const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, agentId)).limit(1);
  const agentWallet = wallet[0];
  if (!agentWallet || parseFloat(agentWallet.balance) < stake) {
    res.status(400).json({ error: "Insufficient agent wallet balance" });
    return;
  }

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialWin = stake * totalOdds;
  const code = generateBetCode();

  const [bet] = await db.insert(betsTable).values({
    code,
    userId: agentId,
    stake: String(stake),
    totalOdds: String(totalOdds.toFixed(4)),
    potentialWin: String(potentialWin.toFixed(2)),
    status: "pending",
    agentId,
    branchId: agent.branchId,
  }).returning();

  for (const s of selections) {
    await db.insert(betSelectionsTable).values({
      betId: bet.id,
      fixtureId: s.fixtureId,
      market: s.market,
      selection: s.selection,
      odds: String(s.odds),
    });
  }

  const newBalance = parseFloat(agentWallet.balance) - stake;
  await db.update(walletsTable).set({ balance: String(newBalance.toFixed(2)) }).where(eq(walletsTable.id, agentWallet.id));
  await db.insert(transactionsTable).values({
    walletId: agentWallet.id,
    amount: String(stake),
    type: "bet_placed",
    description: `Agent bet placed: ${code}`,
  });

  res.status(201).json({ bet: { ...bet, stake: parseFloat(bet.stake), totalOdds: parseFloat(bet.totalOdds), potentialWin: parseFloat(bet.potentialWin) }, code });
});

// ── GET /agent/bets — agent's bet history ─────────────────────────────────────
router.get("/agent/bets", requireAgent, async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.userId!;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const bets = await db.select().from(betsTable)
    .where(eq(betsTable.agentId, agentId))
    .orderBy(desc(betsTable.createdAt))
    .limit(limit).offset(offset);

  const withSelections = await Promise.all(bets.map(async (bet) => {
    const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, bet.id));
    return { ...bet, stake: parseFloat(bet.stake), totalOdds: parseFloat(bet.totalOdds), potentialWin: parseFloat(bet.potentialWin), selections };
  }));

  res.json({ bets: withSelections });
});

// ── GET /agent/vouchers — agent voucher inventory ────────────────────────────
router.get("/agent/vouchers", requireAgent, async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.userId!;

  const vouchers = await db.select({
    id: vouchersTable.id,
    code: vouchersTable.code,
    value: vouchersTable.value,
    isRedeemed: vouchersTable.isRedeemed,
    soldAt: vouchersTable.soldAt,
    printedAt: vouchersTable.printedAt,
    createdAt: vouchersTable.createdAt,
  }).from(vouchersTable)
    .where(eq(vouchersTable.agentId, agentId))
    .orderBy(desc(vouchersTable.createdAt));

  res.json({ vouchers: vouchers.map((v) => ({ ...v, value: parseFloat(v.value) })) });
});

// ── POST /agent/vouchers/:id/sell ─────────────────────────────────────────────
router.post("/agent/vouchers/:id/sell", requireAgent, async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.userId!;
  const voucherId = parseInt(req.params.id);

  const [voucher] = await db.select().from(vouchersTable)
    .where(and(eq(vouchersTable.id, voucherId), eq(vouchersTable.agentId, agentId)))
    .limit(1);

  if (!voucher) { res.status(404).json({ error: "Voucher not found in your inventory" }); return; }
  if (voucher.isRedeemed) { res.status(409).json({ error: "Voucher already redeemed" }); return; }
  if (voucher.soldAt) { res.status(409).json({ error: "Voucher already sold" }); return; }

  const [updated] = await db.update(vouchersTable)
    .set({ soldAt: new Date() })
    .where(eq(vouchersTable.id, voucherId))
    .returning();

  res.json({ success: true, voucher: { ...updated, value: parseFloat(updated.value) } });
});

// ── POST /agent/vouchers/:id/print ────────────────────────────────────────────
router.post("/agent/vouchers/:id/print", requireAgent, async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.userId!;
  const voucherId = parseInt(req.params.id);

  const [voucher] = await db.select().from(vouchersTable)
    .where(and(eq(vouchersTable.id, voucherId), eq(vouchersTable.agentId, agentId)))
    .limit(1);

  if (!voucher) { res.status(404).json({ error: "Voucher not found in your inventory" }); return; }
  if (voucher.isRedeemed) { res.status(409).json({ error: "Voucher already redeemed" }); return; }

  const [updated] = await db.update(vouchersTable)
    .set({ printedAt: new Date() })
    .where(eq(vouchersTable.id, voucherId))
    .returning();

  res.json({ success: true, voucher: { ...updated, value: parseFloat(updated.value) }, code: updated.code });
});

// ── GET /agent/reports ────────────────────────────────────────────────────────
router.get("/agent/reports", requireAgent, async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.userId!;
  const [agent] = await db.select().from(usersTable).where(eq(usersTable.id, agentId)).limit(1);
  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }

  const now = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dailyActivity = await Promise.all(days.map(async (day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const [bets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
      .where(and(eq(betsTable.agentId, agentId), gte(betsTable.createdAt, day), lte(betsTable.createdAt, nextDay)));

    return {
      date: day.toISOString().split("T")[0],
      bets: bets.count,
      stake: parseFloat(bets.total ?? "0"),
      commission: parseFloat(bets.total ?? "0") * (parseFloat(agent.commissionRate ?? "0") / 100),
    };
  }));

  const [totalVouchers] = await db.select({ count: count(), total: sum(vouchersTable.value) }).from(vouchersTable)
    .where(eq(vouchersTable.agentId, agentId));

  res.json({
    dailyActivity,
    totalVouchers: totalVouchers.count,
    totalVoucherValue: parseFloat(totalVouchers.total ?? "0"),
    commissionRate: parseFloat(agent.commissionRate ?? "0"),
  });
});

export default router;
