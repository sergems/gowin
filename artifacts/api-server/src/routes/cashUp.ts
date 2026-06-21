import { Router } from "express";
import { db, branchesTable, usersTable, betsTable, walletsTable, transactionsTable } from "@workspace/db";
import { branchFloatAllocationsTable, cashUpSessionsTable } from "@workspace/db";
import { eq, and, gte, lte, sum, desc, or } from "drizzle-orm";
import { requireAdmin, requireBranchAdmin, type AuthRequest } from "../middlewares/auth";

const router = Router();

// ── GET /api/branch/floats — list floats for a given date ─────────────────────
router.get("/branch/floats", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = req.userBranchId;
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  const floats = await db
    .select({
      id: branchFloatAllocationsTable.id,
      agentId: branchFloatAllocationsTable.agentId,
      agentUsername: usersTable.username,
      agentFirstName: usersTable.firstName,
      agentLastName: usersTable.lastName,
      amount: branchFloatAllocationsTable.amount,
      shiftDate: branchFloatAllocationsTable.shiftDate,
      shiftLabel: branchFloatAllocationsTable.shiftLabel,
      status: branchFloatAllocationsTable.status,
      notes: branchFloatAllocationsTable.notes,
      createdAt: branchFloatAllocationsTable.createdAt,
    })
    .from(branchFloatAllocationsTable)
    .leftJoin(usersTable, eq(branchFloatAllocationsTable.agentId, usersTable.id))
    .where(and(
      eq(branchFloatAllocationsTable.branchId, branchId),
      eq(branchFloatAllocationsTable.shiftDate, dateStr),
    ))
    .orderBy(desc(branchFloatAllocationsTable.createdAt));

  res.json({
    floats: floats.map(f => ({
      id: f.id,
      agentId: f.agentId,
      agentUsername: f.agentUsername ?? "",
      agentName: [f.agentFirstName, f.agentLastName].filter(Boolean).join(" ") || null,
      amount: parseFloat(f.amount as any ?? "0"),
      shiftDate: f.shiftDate,
      shiftLabel: f.shiftLabel,
      status: f.status,
      notes: f.notes,
      createdAt: f.createdAt,
    })),
  });
});

// ── POST /api/branch/floats — allocate float to agent ────────────────────────
router.post("/branch/floats", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = req.userBranchId;
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const { agentId, amount, shiftDate, shiftLabel = "Day", notes } = req.body as {
    agentId: number; amount: number; shiftDate: string; shiftLabel?: string; notes?: string;
  };

  if (!agentId || !amount || amount <= 0 || !shiftDate) {
    res.status(400).json({ error: "agentId, amount, and shiftDate are required" });
    return;
  }

  // Verify agent belongs to this branch
  const [agent] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, agentId), eq(usersTable.branchId, branchId), eq(usersTable.role, "agent")))
    .limit(1);
  if (!agent) { res.status(400).json({ error: "Agent not found in this branch" }); return; }

  // Check branch balance
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
  const currentBalance = parseFloat(branch?.balance as any ?? "0");
  if (amount > currentBalance) {
    res.status(400).json({ error: `Insufficient branch balance ($${currentBalance.toFixed(2)} available)` });
    return;
  }

  // Deduct from branch
  await db.update(branchesTable)
    .set({ balance: String(currentBalance - amount) } as any)
    .where(eq(branchesTable.id, branchId));

  // Check for an existing open allocation for this agent on the same shift date
  const [existing] = await db.select().from(branchFloatAllocationsTable)
    .where(and(
      eq(branchFloatAllocationsTable.branchId, branchId),
      eq(branchFloatAllocationsTable.agentId, agentId),
      eq(branchFloatAllocationsTable.shiftDate, shiftDate),
      eq(branchFloatAllocationsTable.status, "open"),
    ))
    .limit(1);

  let alloc;
  if (existing) {
    // Accumulate into existing allocation — no new record needed
    const newAmount = parseFloat(existing.amount as any) + amount;
    [alloc] = await db.update(branchFloatAllocationsTable)
      .set({ amount: String(newAmount.toFixed(2)) })
      .where(eq(branchFloatAllocationsTable.id, existing.id))
      .returning();
  } else {
    // First allocation for this agent on this shift
    [alloc] = await db.insert(branchFloatAllocationsTable).values({
      branchId,
      agentId,
      allocatedBy: req.userId!,
      amount: String(amount),
      shiftDate,
      shiftLabel,
      notes: notes ?? null,
      status: "open",
    }).returning();
  }

  // Credit agent's wallet so they can place bets
  const [agentWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, agentId)).limit(1);
  if (agentWallet) {
    const newAgentBalance = parseFloat(agentWallet.balance) + amount;
    await db.update(walletsTable)
      .set({ balance: String(newAgentBalance.toFixed(2)) })
      .where(eq(walletsTable.userId, agentId));
    await db.insert(transactionsTable).values({
      walletId: agentWallet.id,
      amount: String(amount),
      type: "credit",
      description: `Float top-up – ${shiftLabel} shift (${shiftDate})`,
    });
  }

  res.status(201).json({ allocation: { ...alloc, amount: parseFloat(alloc.amount as any) }, accumulated: !!existing });
});

// ── GET /api/branch/floats/:id/preview — compute expected figures ─────────────
router.get("/branch/floats/:id/preview", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = req.userBranchId;
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const id = parseInt(req.params.id);
  const [alloc] = await db.select().from(branchFloatAllocationsTable)
    .where(and(eq(branchFloatAllocationsTable.id, id), eq(branchFloatAllocationsTable.branchId, branchId)))
    .limit(1);
  if (!alloc) { res.status(404).json({ error: "Allocation not found" }); return; }
  if (alloc.status === "cashed_up") { res.status(400).json({ error: "Already cashed up" }); return; }

  const openingFloat = parseFloat(alloc.amount as any);
  const shiftStart = alloc.createdAt;
  const now = new Date();

  // Sum all bets placed by this agent since float was allocated (via agent interface OR regular UI)
  const agentBetFilter = or(eq(betsTable.agentId, alloc.agentId), eq(betsTable.userId, alloc.agentId));
  const [betStats] = await db
    .select({ total: sum(betsTable.stake) })
    .from(betsTable)
    .where(and(agentBetFilter, gte(betsTable.createdAt, shiftStart), lte(betsTable.createdAt, now)));

  const totalBets = parseFloat(betStats?.total as any ?? "0") || 0;
  const expectedReturn = openingFloat - totalBets;

  res.json({ openingFloat, totalBets, expectedReturn: Math.max(0, expectedReturn) });
});

// ── POST /api/branch/floats/:id/cashup — perform cash up ─────────────────────
router.post("/branch/floats/:id/cashup", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = req.userBranchId;
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const id = parseInt(req.params.id);
  const { cashReturned, notes } = req.body as { cashReturned: number; notes?: string };

  if (typeof cashReturned !== "number" || cashReturned < 0) {
    res.status(400).json({ error: "cashReturned must be a non-negative number" });
    return;
  }

  const [alloc] = await db.select().from(branchFloatAllocationsTable)
    .where(and(eq(branchFloatAllocationsTable.id, id), eq(branchFloatAllocationsTable.branchId, branchId)))
    .limit(1);
  if (!alloc) { res.status(404).json({ error: "Allocation not found" }); return; }
  if (alloc.status === "cashed_up") { res.status(400).json({ error: "Already cashed up" }); return; }

  const openingFloat = parseFloat(alloc.amount as any);
  const shiftStart = alloc.createdAt;
  const now = new Date();

  const cashUpBetFilter = or(eq(betsTable.agentId, alloc.agentId), eq(betsTable.userId, alloc.agentId));
  const [betStats] = await db
    .select({ total: sum(betsTable.stake) })
    .from(betsTable)
    .where(and(cashUpBetFilter, gte(betsTable.createdAt, shiftStart), lte(betsTable.createdAt, now)));

  const totalBets = parseFloat(betStats?.total as any ?? "0") || 0;
  const expectedReturn = Math.max(0, openingFloat - totalBets);
  const variance = cashReturned - expectedReturn;

  // Save session
  await db.insert(cashUpSessionsTable).values({
    allocationId: id,
    branchId,
    agentId: alloc.agentId,
    performedBy: req.userId!,
    openingFloat: String(openingFloat),
    totalBets: String(totalBets),
    totalPayouts: "0",
    expectedReturn: String(expectedReturn),
    cashReturned: String(cashReturned),
    variance: String(variance),
    notes: notes ?? null,
  });

  // Mark allocation as cashed up
  await db.update(branchFloatAllocationsTable)
    .set({ status: "cashed_up" })
    .where(eq(branchFloatAllocationsTable.id, id));

  // Return cash to branch balance
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
  const currentBalance = parseFloat(branch?.balance as any ?? "0");
  await db.update(branchesTable)
    .set({ balance: String(currentBalance + cashReturned) } as any)
    .where(eq(branchesTable.id, branchId));

  // Debit agent's wallet for the cash they're physically returning
  const [agentWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, alloc.agentId)).limit(1);
  if (agentWallet && cashReturned > 0) {
    const remaining = Math.max(0, parseFloat(agentWallet.balance) - cashReturned);
    await db.update(walletsTable)
      .set({ balance: String(remaining.toFixed(2)) })
      .where(eq(walletsTable.userId, alloc.agentId));
    await db.insert(transactionsTable).values({
      walletId: agentWallet.id,
      amount: String(cashReturned),
      type: "debit",
      description: `Float return – cash up (shift ${alloc.shiftDate})`,
    });
  }

  res.json({ ok: true, variance, expectedReturn, cashReturned });
});

// ── GET /api/branch/cashups — history ─────────────────────────────────────────
router.get("/branch/cashups", requireBranchAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = req.userBranchId;
  if (!branchId) { res.status(403).json({ error: "No branch assigned" }); return; }

  const agentAlias = { id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName, lastName: usersTable.lastName };
  const sessions = await db
    .select({
      id: cashUpSessionsTable.id,
      agentId: cashUpSessionsTable.agentId,
      agentUsername: usersTable.username,
      agentFirstName: usersTable.firstName,
      agentLastName: usersTable.lastName,
      openingFloat: cashUpSessionsTable.openingFloat,
      totalBets: cashUpSessionsTable.totalBets,
      totalPayouts: cashUpSessionsTable.totalPayouts,
      expectedReturn: cashUpSessionsTable.expectedReturn,
      cashReturned: cashUpSessionsTable.cashReturned,
      variance: cashUpSessionsTable.variance,
      shiftDate: branchFloatAllocationsTable.shiftDate,
      shiftLabel: branchFloatAllocationsTable.shiftLabel,
      notes: cashUpSessionsTable.notes,
      createdAt: cashUpSessionsTable.createdAt,
    })
    .from(cashUpSessionsTable)
    .leftJoin(usersTable, eq(cashUpSessionsTable.agentId, usersTable.id))
    .leftJoin(branchFloatAllocationsTable, eq(cashUpSessionsTable.allocationId, branchFloatAllocationsTable.id))
    .where(eq(cashUpSessionsTable.branchId, branchId))
    .orderBy(desc(cashUpSessionsTable.createdAt))
    .limit(100);

  res.json({
    sessions: sessions.map(s => ({
      ...s,
      agentName: [s.agentFirstName, s.agentLastName].filter(Boolean).join(" ") || null,
      openingFloat: parseFloat(s.openingFloat as any),
      totalBets: parseFloat(s.totalBets as any),
      totalPayouts: parseFloat(s.totalPayouts as any),
      expectedReturn: parseFloat(s.expectedReturn as any),
      cashReturned: parseFloat(s.cashReturned as any),
      variance: parseFloat(s.variance as any),
    })),
  });
});

// ── GET /api/agent/float — agent sees their current open float ────────────────
router.get("/agent/float", async (req: AuthRequest, res): Promise<void> => {
  // requireAuth inline
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const jwt = await import("jsonwebtoken");
  try {
    const payload = jwt.default.verify(authHeader.slice(7), process.env.JWT_SECRET!) as any;
    if (payload.role !== "agent") { res.status(403).json({ error: "Agent access required" }); return; }
    req.userId = payload.userId;
    req.userRole = payload.role;
    req.userBranchId = payload.branchId;
  } catch { res.status(401).json({ error: "Invalid token" }); return; }

  const today = new Date().toISOString().slice(0, 10);
  const [alloc] = await db.select().from(branchFloatAllocationsTable)
    .where(and(
      eq(branchFloatAllocationsTable.agentId, req.userId!),
      eq(branchFloatAllocationsTable.shiftDate, today),
      eq(branchFloatAllocationsTable.status, "open"),
    ))
    .orderBy(desc(branchFloatAllocationsTable.createdAt))
    .limit(1);

  if (!alloc) { res.json({ float: null }); return; }
  res.json({
    float: {
      id: alloc.id,
      amount: parseFloat(alloc.amount as any),
      shiftLabel: alloc.shiftLabel,
      createdAt: alloc.createdAt,
    },
  });
});

// ── GET /api/admin/branches/:id/cashup-summary ── super admin overview ────────
router.get("/admin/branches/:id/cashup-summary", requireAdmin, async (req, res): Promise<void> => {
  const branchId = parseInt(req.params.id);
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }

  const today = new Date().toISOString().slice(0, 10);
  const todayFloats = await db.select().from(branchFloatAllocationsTable)
    .where(and(eq(branchFloatAllocationsTable.branchId, branchId), eq(branchFloatAllocationsTable.shiftDate, today)));

  const recentSessions = await db.select({
    id: cashUpSessionsTable.id,
    variance: cashUpSessionsTable.variance,
    createdAt: cashUpSessionsTable.createdAt,
  })
  .from(cashUpSessionsTable)
  .where(eq(cashUpSessionsTable.branchId, branchId))
  .orderBy(desc(cashUpSessionsTable.createdAt))
  .limit(10);

  res.json({
    balance: parseFloat(branch.balance as any ?? "0"),
    todayAllocated: todayFloats.reduce((s, f) => s + parseFloat(f.amount as any), 0),
    openShifts: todayFloats.filter(f => f.status === "open").length,
    recentVariances: recentSessions.map(s => parseFloat(s.variance as any)),
  });
});

export default router;
