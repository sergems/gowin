import { Router } from "express";
import { db, usersTable, walletsTable, betsTable, betSelectionsTable, vouchersTable, transactionsTable } from "@workspace/db";
import { eq, count, sum, desc, and, gte, lte, or } from "drizzle-orm";
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

  const agentBetFilter = or(eq(betsTable.agentId, agentId), eq(betsTable.userId, agentId))!;

  const [totalBets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
    .where(agentBetFilter);

  const [todayBets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
    .where(and(agentBetFilter, gte(betsTable.createdAt, todayStart)));

  const [monthBets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
    .where(and(agentBetFilter, gte(betsTable.createdAt, monthStart)));

  const [vouchersSold] = await db.select({ count: count(), total: sum(vouchersTable.value) }).from(vouchersTable)
    .where(eq(vouchersTable.agentId, agentId));

  const [pendingPayouts] = await db.select({ total: sum(betsTable.potentialWin) }).from(betsTable)
    .where(and(agentBetFilter, eq(betsTable.status, "won")));

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


// ── GET /agent/bets — agent's bet history ─────────────────────────────────────
router.get("/agent/bets", requireAgent, async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.userId!;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const bets = await db.select().from(betsTable)
    .where(or(eq(betsTable.agentId, agentId), eq(betsTable.userId, agentId)))
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

    const agentBetFilter = or(eq(betsTable.agentId, agentId), eq(betsTable.userId, agentId))!;
    const [bets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
      .where(and(agentBetFilter, gte(betsTable.createdAt, day), lte(betsTable.createdAt, nextDay)));

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
