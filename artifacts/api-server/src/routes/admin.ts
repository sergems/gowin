import { Router } from "express";
import { db, usersTable, betsTable, fixturesTable, walletsTable, betSelectionsTable, branchesTable, vouchersTable } from "@workspace/db";
import { eq, count, sum, desc, sql, and, inArray, gte, lte, or } from "drizzle-orm";
import { requireAdmin, requireAdminOrManager, type AuthRequest } from "../middlewares/auth";
import { liveCache } from "../lib/liveCache";
import { getWsClientCount } from "../lib/wsServer";

const router = Router();

router.get("/admin/stats", requireAdminOrManager, async (_req, res): Promise<void> => {
  const [totalUsers] = await db.select({ count: count() }).from(usersTable);
  const [totalBranches] = await db.select({ count: count() }).from(branchesTable);
  const [totalBranchAdmins] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "branch_admin"));
  const [totalAgents] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "agent"));
  const [totalBets] = await db.select({ count: count() }).from(betsTable);
  const [pendingBets] = await db.select({ count: count() }).from(betsTable).where(eq(betsTable.status, "pending"));
  const [wonBets] = await db.select({ count: count() }).from(betsTable).where(eq(betsTable.status, "won"));
  const [lostBets] = await db.select({ count: count() }).from(betsTable).where(eq(betsTable.status, "lost"));
  const [voidBets] = await db.select({ count: count() }).from(betsTable).where(eq(betsTable.status, "void"));
  const [turnover] = await db.select({ total: sum(betsTable.stake) }).from(betsTable);
  const [payout] = await db.select({ total: sum(betsTable.potentialWin) }).from(betsTable).where(eq(betsTable.status, "won"));
  const [liveFixtures] = await db.select({ count: count() }).from(fixturesTable).where(eq(fixturesTable.status, "live"));
  const [activeFixtures] = await db.select({ count: count() }).from(fixturesTable).where(eq(fixturesTable.status, "upcoming"));

  res.json({
    totalUsers: totalUsers.count,
    totalBranches: totalBranches.count,
    totalBranchAdmins: totalBranchAdmins.count,
    totalAgents: totalAgents.count,
    totalBets: totalBets.count,
    pendingBets: pendingBets.count,
    wonBets: wonBets.count,
    lostBets: lostBets.count,
    voidBets: voidBets.count,
    totalTurnover: parseFloat(turnover.total ?? "0"),
    totalPayout: parseFloat(payout.total ?? "0"),
    totalActiveFixtures: activeFixtures.count,
    totalLiveFixtures: liveFixtures.count,
  });
});

router.get("/admin/recent-bets", requireAdminOrManager, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      bet: betsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      },
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(usersTable.id, betsTable.userId))
    .orderBy(desc(betsTable.createdAt))
    .limit(10);

  res.json(rows.map((r) => ({
    id: r.bet.id,
    code: r.bet.code,
    userId: r.bet.userId,
    stake: parseFloat(r.bet.stake),
    totalOdds: parseFloat(r.bet.totalOdds),
    potentialWin: parseFloat(r.bet.potentialWin),
    status: r.bet.status,
    createdAt: r.bet.createdAt,
    user: r.user,
  })));
});

router.get("/admin/top-fixtures", requireAdminOrManager, async (_req, res): Promise<void> => {
  const topFixtureData = await db
    .select({
      fixtureId: betSelectionsTable.fixtureId,
      totalBets: count(),
      totalStake: sum(betsTable.stake),
    })
    .from(betSelectionsTable)
    .leftJoin(betsTable, eq(betsTable.id, betSelectionsTable.betId))
    .groupBy(betSelectionsTable.fixtureId)
    .orderBy(desc(count()))
    .limit(5);

  if (topFixtureData.length === 0) {
    res.json([]);
    return;
  }

  const fixtureIds = topFixtureData.map((d) => d.fixtureId);
  const fixtures = await db.select().from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds));
  const fixtureMap = Object.fromEntries(fixtures.map((f) => [f.id, f]));

  res.json(topFixtureData.map((d) => ({
    fixture: fixtureMap[d.fixtureId] || null,
    totalBets: d.totalBets,
    totalStake: parseFloat(d.totalStake ?? "0"),
  })));
});

router.get("/admin/api-monitor", requireAdmin, async (_req, res): Promise<void> => {
  const stats = liveCache.getStats();
  const wsConnections = getWsClientCount();
  res.json({ ...stats, wsConnections });
});

// ── GET /admin/branches/:id/performance ──────────────────────────────────────
router.get("/admin/branches/:id/performance", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const branchId = parseInt(req.params.id as string);
  if (isNaN(branchId)) { res.status(400).json({ error: "Invalid branch id" }); return; }

  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // KPI stats
  const [totalAgents] = await db.select({ count: count() }).from(usersTable)
    .where(and(eq(usersTable.branchId, branchId), eq(usersTable.role, "agent")));
  const [activeAgents] = await db.select({ count: count() }).from(usersTable)
    .where(and(eq(usersTable.branchId, branchId), eq(usersTable.role, "agent"), eq(usersTable.disabled, false)));
  const [totalBets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
    .where(eq(betsTable.branchId, branchId));
  const [dailyBets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
    .where(and(eq(betsTable.branchId, branchId), gte(betsTable.createdAt, todayStart)));
  const [monthlyBets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
    .where(and(eq(betsTable.branchId, branchId), gte(betsTable.createdAt, monthStart)));
  const [pendingPayouts] = await db.select({ total: sum(betsTable.potentialWin) }).from(betsTable)
    .where(and(eq(betsTable.branchId, branchId), eq(betsTable.status, "won")));
  const [wonBets] = await db.select({ count: count() }).from(betsTable)
    .where(and(eq(betsTable.branchId, branchId), eq(betsTable.status, "won")));
  const [voucherStats] = await db.select({ count: count(), total: sum(vouchersTable.value) }).from(vouchersTable)
    .where(and(eq(vouchersTable.branchId, branchId), eq(vouchersTable.isRedeemed, true)));

  // Daily sales — last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dailySales = await Promise.all(days.map(async (day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const [bets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
      .where(and(eq(betsTable.branchId, branchId), gte(betsTable.createdAt, day), lte(betsTable.createdAt, nextDay)));
    return { date: day.toISOString().split("T")[0], bets: bets.count, revenue: parseFloat(bets.total ?? "0") };
  }));

  // Agent performance
  const agents = await db.select().from(usersTable)
    .where(and(eq(usersTable.branchId, branchId), eq(usersTable.role, "agent")));

  const agentPerformance = await Promise.all(agents.map(async (agent) => {
    const [bets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
      .where(or(eq(betsTable.agentId, agent.id), eq(betsTable.userId, agent.id)));
    const [vouchers] = await db.select({ count: count() }).from(vouchersTable)
      .where(eq(vouchersTable.agentId, agent.id));
    return {
      agentId: agent.id,
      agentName: [agent.firstName, agent.lastName].filter(Boolean).join(" ") || agent.username,
      username: agent.username,
      disabled: agent.disabled,
      betsPlaced: bets.count,
      totalStake: parseFloat(bets.total ?? "0"),
      vouchersSold: vouchers.count,
      commissionRate: parseFloat(agent.commissionRate ?? "0"),
      commission: parseFloat(bets.total ?? "0") * (parseFloat(agent.commissionRate ?? "0") / 100),
    };
  }));

  res.json({
    branch: { id: branch.id, name: branch.name, code: branch.code, city: branch.city, country: branch.country, status: branch.status, balance: parseFloat(branch.balance as any) },
    kpis: {
      totalAgents: totalAgents.count,
      activeAgents: activeAgents.count,
      totalBets: totalBets.count,
      totalStake: parseFloat(totalBets.total ?? "0"),
      dailyRevenue: parseFloat(dailyBets.total ?? "0"),
      dailyBets: dailyBets.count,
      monthlyRevenue: parseFloat(monthlyBets.total ?? "0"),
      monthlyBets: monthlyBets.count,
      pendingPayouts: parseFloat(pendingPayouts.total ?? "0"),
      wonBets: wonBets.count,
      voucherSales: voucherStats.count,
      voucherSalesValue: parseFloat(voucherStats.total ?? "0"),
    },
    dailySales,
    agentPerformance,
  });
});

export default router;
