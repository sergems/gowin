import { Router } from "express";
import { db, usersTable, walletsTable, withdrawalsTable, branchesTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";

const router = Router();

// ── User: request a withdrawal ──────────────────────────────────────────────
router.post("/wallet/withdrawal-request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { amount } = req.body;
  const parsedAmount = parseFloat(amount);

  if (!parsedAmount || parsedAmount <= 0) {
    res.status(400).json({ error: "Invalid withdrawal amount" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user?.phoneNumber) {
    res.status(403).json({ error: "You must set your phone number in your profile before requesting a withdrawal." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const currentBalance = parseFloat(wallet.balance);
  if (parsedAmount > currentBalance) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  // Deduct balance immediately and create a pending withdrawal request
  const newBalance = currentBalance - parsedAmount;
  await db.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, wallet.id));

  const [withdrawal] = await db
    .insert(withdrawalsTable)
    .values({
      userId: req.userId!,
      amount: parsedAmount.toFixed(2),
      bankDetails: user.phoneNumber,
      status: "pending",
    })
    .returning();

  res.status(201).json({ ...withdrawal, amount: parseFloat(withdrawal.amount) });
});

// ── User: list own withdrawals ───────────────────────────────────────────────
router.get("/wallet/withdrawals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, req.userId!))
    .orderBy(desc(withdrawalsTable.createdAt));

  res.json(withdrawals.map((w) => ({ ...w, amount: parseFloat(w.amount) })));
});

// ── Admin: list all withdrawals (optional ?status= filter) ──────────────────
router.get("/admin/withdrawals", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const statusFilter = req.query.status as string | undefined;

  const rows = await db
    .select({
      withdrawal: withdrawalsTable,
      user: {
        id: usersTable.id,
        publicId: usersTable.publicId,
        username: usersTable.username,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
      },
    })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(usersTable.id, withdrawalsTable.userId))
    .where(statusFilter ? eq(withdrawalsTable.status, statusFilter as any) : undefined)
    .orderBy(desc(withdrawalsTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...r.withdrawal,
      amount: parseFloat(r.withdrawal.amount),
      user: r.user,
    }))
  );
});

// ── Admin: update withdrawal status ─────────────────────────────────────────
router.patch("/admin/withdrawals/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const { status, adminNote } = req.body;
  const validTransitions: Record<string, string[]> = {
    pending: ["approved", "rejected"],
    approved: ["paid"],
  };

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const allowed = validTransitions[withdrawal.status] ?? [];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: `Cannot transition from '${withdrawal.status}' to '${status}'` });
    return;
  }

  // If rejected, refund the balance (only for regular withdrawals, not payout claims)
  if (status === "rejected" && !withdrawal.betId) {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, withdrawal.userId)).limit(1);
    if (wallet) {
      const refunded = parseFloat(wallet.balance) + parseFloat(withdrawal.amount);
      await db.update(walletsTable).set({ balance: refunded.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
    }
  }

  // If a payout claim is marked paid, credit the branch balance
  if (status === "paid" && withdrawal.branchId) {
    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, withdrawal.branchId)).limit(1);
    if (branch) {
      const newBranchBalance = parseFloat(branch.balance as any) + parseFloat(withdrawal.amount);
      await db.update(branchesTable)
        .set({ balance: String(newBranchBalance.toFixed(2)) } as any)
        .where(eq(branchesTable.id, withdrawal.branchId));
    }
  }

  const [updated] = await db
    .update(withdrawalsTable)
    .set({
      status: status as any,
      adminNote: adminNote ?? withdrawal.adminNote,
      updatedAt: new Date(),
    })
    .where(eq(withdrawalsTable.id, id))
    .returning();

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

export default router;
