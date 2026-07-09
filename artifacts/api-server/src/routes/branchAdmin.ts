import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, walletsTable, betsTable, vouchersTable, transactionsTable, branchesTable } from "@workspace/db";
import { eq, count, sum, desc, and, gte, lte, sql, or, inArray, asc } from "drizzle-orm";
import { betSelectionsTable } from "@workspace/db";
import { requireBranchAdmin, requireAdmin, type AuthRequest } from "../middlewares/auth";

const router = Router();

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

async function generatePublicId(): Promise<number> {
  for (let i = 0; i < 20; i++) {
    const id = Math.floor(Math.random() * 900000) + 100000;
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.publicId, id)).limit(1);
    if (existing.length === 0) return id;
  }
  throw new Error("Could not generate unique user ID");
}

function getBranchId(req: AuthRequest): number | null {
  return req.userBranchId ?? null;
}

// ── GET /branch/info ──────────────────────────────────────────────────────────
router.get("/branch/info", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json({ branch });
});

// ── GET /branch/dashboard ─────────────────────────────────────────────────────
router.get("/branch/dashboard", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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

  const [voucherStats] = await db.select({ count: count(), total: sum(vouchersTable.value) }).from(vouchersTable)
    .where(and(eq(vouchersTable.branchId, branchId), eq(vouchersTable.isRedeemed, true)));

  const [allocatedVouchers] = await db.select({ count: count() }).from(vouchersTable)
    .where(and(eq(vouchersTable.branchId, branchId), eq(vouchersTable.allocatedToBranch, true)));

  const [pendingPayouts] = await db.select({ total: sum(betsTable.potentialWin) }).from(betsTable)
    .where(and(eq(betsTable.branchId, branchId), eq(betsTable.status, "won")));

  res.json({
    totalAgents: totalAgents.count,
    activeAgents: activeAgents.count,
    totalBets: totalBets.count,
    totalStake: parseFloat(totalBets.total ?? "0"),
    dailyRevenue: parseFloat(dailyBets.total ?? "0"),
    monthlyRevenue: parseFloat(monthlyBets.total ?? "0"),
    voucherSales: voucherStats.count,
    voucherSalesValue: parseFloat(voucherStats.total ?? "0"),
    allocatedVouchers: allocatedVouchers.count,
    pendingPayouts: parseFloat(pendingPayouts.total ?? "0"),
  });
});

// ── GET /branch/agents ────────────────────────────────────────────────────────
router.get("/branch/agents", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const agents = await db.select().from(usersTable)
    .where(and(eq(usersTable.branchId, branchId), inArray(usersTable.role, ["agent", "payout"])))
    .orderBy(desc(usersTable.createdAt));

  const withStats = await Promise.all(agents.map(async (agent) => {
    const [betsPlaced] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
      .where(eq(betsTable.agentId, agent.id));
    const [vouchersSold] = await db.select({ count: count() }).from(vouchersTable)
      .where(eq(vouchersTable.agentId, agent.id));
    return {
      id: agent.id, username: agent.username, email: agent.email,
      firstName: agent.firstName, lastName: agent.lastName,
      phoneNumber: agent.phoneNumber, disabled: agent.disabled,
      role: agent.role,
      commissionRate: parseFloat(agent.commissionRate ?? "0"),
      createdAt: agent.createdAt,
      betsPlaced: betsPlaced.count,
      totalStake: parseFloat(betsPlaced.total ?? "0"),
      vouchersSold: vouchersSold.count,
    };
  }));

  res.json({ agents: withStats });
});

// ── POST /branch/agents — create agent or payout user ────────────────────────
router.post("/branch/agents", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const { username, email, firstName, lastName, phoneNumber, commissionRate, role } = req.body;
  if (!username || !email) {
    res.status(400).json({ error: "Username and email are required" });
    return;
  }

  const assignedRole = role === "payout" ? "payout" : "agent";

  const existingEmail = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.trim())).limit(1);
  if (existingEmail.length > 0) { res.status(409).json({ error: "Email already in use" }); return; }

  const existingUsername = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username.trim())).limit(1);
  if (existingUsername.length > 0) { res.status(409).json({ error: "Username already taken" }); return; }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const publicId = await generatePublicId();

  const [agent] = await db.insert(usersTable).values({
    username: username.trim(),
    email: email.trim(),
    passwordHash,
    role: assignedRole,
    publicId,
    firstName: firstName?.trim() || null,
    lastName: lastName?.trim() || null,
    phoneNumber: phoneNumber?.trim() || null,
    branchId,
    commissionRate: commissionRate ? String(commissionRate) : "0.00",
    mustChangePassword: true,
  }).returning();

  await db.insert(walletsTable).values({ userId: agent.id, balance: "0.00" });

  res.status(201).json({
    agent: { id: agent.id, username: agent.username, email: agent.email, firstName: agent.firstName, lastName: agent.lastName, role: agent.role },
    tempPassword,
  });
});

// ── PATCH /branch/agents/:id/suspend ─────────────────────────────────────────
router.patch("/branch/agents/:id/suspend", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const agentId = parseInt(req.params.id as string);
  if (isNaN(agentId)) { res.status(400).json({ error: "Invalid agent id" }); return; }
  const { disabled } = req.body as { disabled: boolean };

  const [agent] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, agentId), eq(usersTable.branchId, branchId), inArray(usersTable.role, ["agent", "payout"])))
    .limit(1);

  if (!agent) { res.status(404).json({ error: "Staff not found in your branch" }); return; }

  const [updated] = await db.update(usersTable).set({
    disabled: !!disabled,
    disabledReason: disabled ? "admin" : null,
  }).where(eq(usersTable.id, agentId)).returning();

  res.json({ success: true, agent: { id: updated.id, disabled: updated.disabled } });
});

// ── GET /branch/vouchers — branch voucher inventory ──────────────────────────
router.get("/branch/vouchers", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const vouchers = await db
    .select({
      id: vouchersTable.id,
      code: vouchersTable.code,
      value: vouchersTable.value,
      isRedeemed: vouchersTable.isRedeemed,
      allocatedToBranch: vouchersTable.allocatedToBranch,
      allocatedToBranchAt: vouchersTable.allocatedToBranchAt,
      agentId: vouchersTable.agentId,
      soldAt: vouchersTable.soldAt,
      printedAt: vouchersTable.printedAt,
      createdAt: vouchersTable.createdAt,
      redeemedAt: vouchersTable.redeemedAt,
      agentUsername: usersTable.username,
      agentFirstName: usersTable.firstName,
      agentLastName: usersTable.lastName,
    })
    .from(vouchersTable)
    .leftJoin(usersTable, eq(vouchersTable.agentId, usersTable.id))
    .where(eq(vouchersTable.branchId, branchId))
    .orderBy(desc(vouchersTable.createdAt));

  res.json({ vouchers: vouchers.map((v) => ({ ...v, value: parseFloat(v.value) })) });
});

// ── POST /branch/vouchers/allocate-to-agent ───────────────────────────────────
router.post("/branch/vouchers/allocate-to-agent", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const { voucherIds, agentId } = req.body as { voucherIds: number[]; agentId: number };
  if (!Array.isArray(voucherIds) || voucherIds.length === 0) {
    res.status(400).json({ error: "voucherIds must be a non-empty array" });
    return;
  }

  const [agent] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, agentId), eq(usersTable.branchId, branchId), eq(usersTable.role, "agent")))
    .limit(1);
  if (!agent) { res.status(404).json({ error: "Agent not found in your branch" }); return; }

  let allocated = 0;
  for (const vid of voucherIds) {
    const [v] = await db.select().from(vouchersTable)
      .where(and(eq(vouchersTable.id, vid), eq(vouchersTable.branchId, branchId)))
      .limit(1);
    if (!v || v.isRedeemed || v.agentId) continue;

    await db.update(vouchersTable).set({ agentId }).where(eq(vouchersTable.id, vid));
    allocated++;
  }

  res.json({ success: true, allocated });
});

// ── GET /branch/reports ───────────────────────────────────────────────────────
router.get("/branch/reports", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const now = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const branchMembers = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.branchId, branchId));
  const memberIds = branchMembers.map(m => m.id);

  const dailySales = await Promise.all(days.map(async (day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const timeFilter = and(gte(betsTable.createdAt, day), lte(betsTable.createdAt, nextDay));
    const branchFilter = memberIds.length > 0
      ? or(eq(betsTable.branchId, branchId), inArray(betsTable.userId, memberIds))
      : eq(betsTable.branchId, branchId);

    const [bets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
      .where(and(branchFilter, timeFilter));

    return {
      date: day.toISOString().split("T")[0],
      bets: bets.count,
      revenue: parseFloat(bets.total ?? "0"),
    };
  }));

  const agents = await db.select().from(usersTable)
    .where(and(eq(usersTable.branchId, branchId), eq(usersTable.role, "agent")));

  const agentPerformance = await Promise.all(agents.map(async (agent) => {
    const [bets] = await db.select({ count: count(), total: sum(betsTable.stake) }).from(betsTable)
      .where(or(eq(betsTable.agentId, agent.id), eq(betsTable.userId, agent.id)));
    const [vouchers] = await db.select({ count: count() }).from(vouchersTable)
      .where(eq(vouchersTable.agentId, agent.id));
    return {
      agentId: agent.id,
      agentName: agent.firstName ? `${agent.firstName} ${agent.lastName}` : agent.username,
      betsPlaced: bets.count,
      totalStake: parseFloat(bets.total ?? "0"),
      vouchersSold: vouchers.count,
      commission: parseFloat(bets.total ?? "0") * (parseFloat(agent.commissionRate ?? "0") / 100),
    };
  }));

  res.json({ dailySales, agentPerformance });
});

// ── GET /branch/bets/lookup/:code — verify a ticket (branch-scoped) ──────────
router.get("/branch/bets/lookup/:code", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const code = req.params.code as string;

  const [bet] = await db
    .select()
    .from(betsTable)
    .where(and(eq(betsTable.code, code.toUpperCase()), eq(betsTable.branchId, branchId)))
    .limit(1);

  if (!bet) { res.status(404).json({ error: "Bet not found" }); return; }

  const selections = await db
    .select({
      id: betSelectionsTable.id,
      betId: betSelectionsTable.betId,
      fixtureId: betSelectionsTable.fixtureId,
      market: betSelectionsTable.market,
      selection: betSelectionsTable.selection,
      odds: betSelectionsTable.odds,
      fixture: {
        id: sql`f.id`,
        status: sql`f.status`,
        scoreHome: sql`f.score_home`,
        scoreAway: sql`f.score_away`,
        homeTeam: sql`jsonb_build_object('name', ht.name)`,
        awayTeam: sql`jsonb_build_object('name', at.name)`,
      },
    })
    .from(betSelectionsTable)
    .leftJoin(sql`fixtures f`, sql`f.id = ${betSelectionsTable.fixtureId}`)
    .leftJoin(sql`teams ht`, sql`ht.id = f.home_team_id`)
    .leftJoin(sql`teams at`, sql`at.id = f.away_team_id`)
    .where(eq(betSelectionsTable.betId, bet.id));

  res.json({
    ...bet,
    stake: parseFloat(bet.stake as any),
    totalOdds: parseFloat(bet.totalOdds as any),
    potentialWin: parseFloat(bet.potentialWin as any),
    selections,
  });
});

// ── PATCH /branch/bets/:id/void — branch-admin void a pending bet ────────────
router.patch("/branch/bets/:id/void", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const betId = parseInt(req.params.id as string);
  if (isNaN(betId)) { res.status(400).json({ error: "Invalid bet id" }); return; }

  const [bet] = await db.select().from(betsTable)
    .where(and(eq(betsTable.id, betId), eq(betsTable.branchId, branchId)))
    .limit(1);

  if (!bet) { res.status(404).json({ error: "Bet not found at this branch" }); return; }
  if (bet.status !== "pending") { res.status(400).json({ error: "Only pending bets can be voided" }); return; }

  await db.update(betsTable).set({ status: "void" }).where(eq(betsTable.id, betId));

  // Refund the stake to the agent's wallet (or the user's wallet if placed directly)
  const targetUserId = bet.agentId ?? bet.userId;
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, targetUserId)).limit(1);
  if (wallet) {
    const newBalance = parseFloat(wallet.balance) + parseFloat(bet.stake as any);
    await db.update(walletsTable)
      .set({ balance: String(newBalance.toFixed(2)) })
      .where(eq(walletsTable.userId, targetUserId));
    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      amount: String(bet.stake),
      type: "credit",
      description: `Bet ${bet.code ?? "#" + bet.id} voided — stake refunded`,
    });
  }

  res.json({ ok: true, betId });
});

// ── GET /branch/bets — list all bets for this branch ─────────────────────────
router.get("/branch/bets", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = getBranchId(req);
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const limit = Math.min(parseInt(String(req.query.limit ?? "200")), 500);
  const status = req.query.status as string | undefined;

  const where = status && status !== "all"
    ? and(eq(betsTable.branchId, branchId), eq(betsTable.status, status as any))
    : eq(betsTable.branchId, branchId);

  const bets = await db
    .select({
      id: betsTable.id,
      code: betsTable.code,
      stake: betsTable.stake,
      totalOdds: betsTable.totalOdds,
      potentialWin: betsTable.potentialWin,
      status: betsTable.status,
      createdAt: betsTable.createdAt,
      agentId: betsTable.agentId,
      agentUsername: usersTable.username,
      agentFirstName: usersTable.firstName,
      agentLastName: usersTable.lastName,
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(betsTable.agentId, usersTable.id))
    .where(where)
    .orderBy(desc(betsTable.createdAt))
    .limit(limit);

  // Fetch selections for all bets
  const betIds = bets.map(b => b.id);
  const selections = betIds.length > 0
    ? await db.select().from(betSelectionsTable).where(inArray(betSelectionsTable.betId, betIds))
    : [];

  const selectionsByBet = selections.reduce<Record<number, typeof selections>>((acc, s) => {
    (acc[s.betId] ??= []).push(s);
    return acc;
  }, {});

  res.json({
    bets: bets.map(b => ({
      ...b,
      stake: parseFloat(b.stake as any),
      totalOdds: parseFloat(b.totalOdds as any),
      potentialWin: parseFloat(b.potentialWin as any),
      selections: selectionsByBet[b.id] ?? [],
    })),
  });
});

export default router;
