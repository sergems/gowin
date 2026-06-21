import { Router } from "express";
import { db, betsTable, betSelectionsTable, usersTable, walletsTable, withdrawalsTable, branchesTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requirePayout, type AuthRequest } from "../middlewares/auth";

const router = Router();

// ── GET /api/payout/ticket/:code — verify ticket ─────────────────────────────
router.get("/payout/ticket/:code", requirePayout, async (req: AuthRequest, res): Promise<void> => {
  const { code } = req.params;

  const [bet] = await db
    .select({
      id: betsTable.id,
      code: betsTable.code,
      stake: betsTable.stake,
      totalOdds: betsTable.totalOdds,
      potentialWin: betsTable.potentialWin,
      status: betsTable.status,
      createdAt: betsTable.createdAt,
      branchId: betsTable.branchId,
      userId: betsTable.userId,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(betsTable.userId, usersTable.id))
    .where(eq(betsTable.code, code))
    .limit(1);

  if (!bet) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const selections = await db
    .select()
    .from(betSelectionsTable)
    .where(eq(betSelectionsTable.betId, bet.id));

  // Check if there is already a pending/approved/paid claim for this bet
  const [existingClaim] = await db
    .select({ id: withdrawalsTable.id, status: withdrawalsTable.status })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.betId, bet.id))
    .limit(1);

  res.json({
    bet: {
      ...bet,
      stake: parseFloat(bet.stake as any),
      totalOdds: parseFloat(bet.totalOdds as any),
      potentialWin: parseFloat(bet.potentialWin as any),
      selections,
    },
    claim: existingClaim ?? null,
  });
});

// ── POST /api/payout/ticket/:code/claim — initiate payout for won ticket ─────
router.post("/payout/ticket/:code/claim", requirePayout, async (req: AuthRequest, res): Promise<void> => {
  const { code } = req.params;

  const [bet] = await db
    .select()
    .from(betsTable)
    .where(eq(betsTable.code, code))
    .limit(1);

  if (!bet) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (bet.status !== "won") {
    res.status(400).json({ error: `Ticket is not a winner (status: ${bet.status})` });
    return;
  }

  // Prevent duplicate claims
  const [existing] = await db
    .select({ id: withdrawalsTable.id, status: withdrawalsTable.status })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.betId, bet.id))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: `Ticket already claimed (status: ${existing.status})` });
    return;
  }

  // Resolve branch — prefer bet's branchId, fall back to payout agent's branchId
  const branchId: number | null = bet.branchId ?? req.userBranchId ?? null;

  // Resolve a valid phone/bank detail from the bet owner
  const [betOwner] = await db
    .select({ phoneNumber: usersTable.phoneNumber, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, bet.userId))
    .limit(1);

  const amount = parseFloat(bet.potentialWin as any);

  const [claim] = await db
    .insert(withdrawalsTable)
    .values({
      userId: bet.userId,
      amount: amount.toFixed(2),
      bankDetails: betOwner?.phoneNumber ?? betOwner?.username ?? "walk-in",
      status: "pending",
      betId: bet.id,
      branchId: branchId ?? undefined,
    } as any)
    .returning();

  res.status(201).json({ claim: { ...claim, amount: parseFloat(claim.amount) } });
});

export default router;
