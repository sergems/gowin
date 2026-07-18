import { Router } from "express";
import { db, usersTable, betsTable, fixturesTable, walletsTable, betSelectionsTable, branchesTable } from "@workspace/db";
import { eq, count, sum, desc, sql, and, inArray } from "drizzle-orm";
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

export default router;
