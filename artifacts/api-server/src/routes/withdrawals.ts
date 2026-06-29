import { Router } from "express";
import { db, usersTable, walletsTable, withdrawalsTable, branchesTable, transactionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireAdmin, requireAdminOrManager, requirePaymentClerk, type AuthRequest } from "../middlewares/auth";
import { getPawapayConfig, initiatePayout, getPayoutStatus } from "../lib/pawapay";
import { logger } from "../lib/logger";
import crypto from "crypto";

const router = Router();

// ── User: request a withdrawal ──────────────────────────────────────────────
router.post("/wallet/withdrawal-request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (["agent", "branch_admin", "payout", "payment_clerk"].includes(req.userRole!)) {
    res.status(403).json({ error: "Staff accounts cannot request withdrawals" });
    return;
  }
  const { amount, currency, phoneNumber, operator } = req.body;
  const parsedAmount = parseFloat(amount);
  const walletCurrency: string = currency && ["CDF", "USD"].includes(currency) ? currency : "USD";

  if (!parsedAmount || parsedAmount <= 0) {
    res.status(400).json({ error: "Invalid withdrawal amount" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const withdrawPhone = (phoneNumber && typeof phoneNumber === "string" && phoneNumber.trim()) || user?.phoneNumber;
  if (!withdrawPhone) {
    res.status(403).json({ error: "You must provide a phone number or set one in your profile." });
    return;
  }

  // Find the wallet for the requested currency
  const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  const wallet = wallets.find((w) => w.currency === walletCurrency) ?? wallets[0];
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const currentBalance = parseFloat(wallet.balance);
  if (parsedAmount > currentBalance) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  // Deduct balance immediately and create pending withdrawal
  const newBalance = currentBalance - parsedAmount;
  await db.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, wallet.id));

  const [withdrawal] = await db
    .insert(withdrawalsTable)
    .values({
      userId: req.userId!,
      amount: parsedAmount.toFixed(2),
      bankDetails: withdrawPhone,
      status: "pending",
      currency: walletCurrency,
      phoneNumber: withdrawPhone,
      operator: operator ?? null,
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
router.get("/admin/withdrawals", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
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
router.patch("/admin/withdrawals/:id", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const { status, adminNote } = req.body;
  const validTransitions: Record<string, string[]> = {
    pending: ["approved", "rejected"],
    approved: ["paid", "clerk_review"],
    clerk_review: ["processing"],
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

  // If rejected, refund the balance
  if (status === "rejected" && !withdrawal.betId) {
    const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, withdrawal.userId));
    const wallet = wallets.find((w) => w.currency === (withdrawal.currency ?? "USD")) ?? wallets[0];
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
      await db
        .update(branchesTable)
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

// ── Payment Clerk: list approved withdrawals ────────────────────────────────
router.get("/clerk/withdrawals", requirePaymentClerk, async (req: AuthRequest, res): Promise<void> => {
  const statusFilter = (req.query.status as string) || "approved";

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
        phoneNumber: usersTable.phoneNumber,
      },
    })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(usersTable.id, withdrawalsTable.userId))
    .where(eq(withdrawalsTable.status, statusFilter as any))
    .orderBy(desc(withdrawalsTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...r.withdrawal,
      amount: parseFloat(r.withdrawal.amount),
      user: r.user,
    }))
  );
});

// ── Payment Clerk: authorise payout ─────────────────────────────────────────
router.post("/clerk/withdrawals/:id/authorize", requirePaymentClerk, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  if (withdrawal.status !== "approved") {
    res.status(400).json({ error: "Only approved withdrawals can be authorised" });
    return;
  }

  const phoneNumber = withdrawal.phoneNumber ?? withdrawal.bankDetails;
  const operator = withdrawal.operator ?? req.body.operator;

  if (!operator) {
    res.status(400).json({ error: "Operator required to process payout" });
    return;
  }

  const config = await getPawapayConfig();
  if (!config || !config.withdrawalsEnabled) {
    res.status(503).json({ error: "Mobile money payouts are not currently available" });
    return;
  }

  const payoutId = crypto.randomUUID();

  // Mark as processing
  await db
    .update(withdrawalsTable)
    .set({
      status: "processing",
      pawapayPayoutId: payoutId,
      clerkId: req.userId!,
      clerkNote: req.body.note ?? null,
      clerkActionedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(withdrawalsTable.id, id));

  try {
    const result = await initiatePayout(
      config,
      payoutId,
      parseFloat(withdrawal.amount),
      withdrawal.currency ?? "USD",
      phoneNumber,
      operator,
      "GoWin Payout"
    );

    const pawapayStatus = result.data?.status ?? (result.ok ? "ACCEPTED" : "FAILED");

    if (!result.ok) {
      // Restore wallet balance on failure
      const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, withdrawal.userId));
      const wallet = wallets.find((w) => w.currency === (withdrawal.currency ?? "USD")) ?? wallets[0];
      if (wallet) {
        const restored = parseFloat(wallet.balance) + parseFloat(withdrawal.amount);
        await db.update(walletsTable).set({ balance: restored.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
      }
      await db
        .update(withdrawalsTable)
        .set({ status: "failed", pawapayStatus, pawapayResponse: result.data as any, updatedAt: new Date() })
        .where(eq(withdrawalsTable.id, id));

      res.status(400).json({ error: result.data?.message ?? "PawaPay rejected the payout", details: result.data });
      return;
    }

    await db
      .update(withdrawalsTable)
      .set({ pawapayStatus, pawapayResponse: result.data as any, operator, updatedAt: new Date() })
      .where(eq(withdrawalsTable.id, id));

    const [updated] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
    res.json({ ...updated, amount: parseFloat(updated.amount) });
  } catch (err: any) {
    logger.error({ err }, "PawaPay payout initiation failed");
    // Restore wallet balance on error
    const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, withdrawal.userId));
    const wallet = wallets.find((w) => w.currency === (withdrawal.currency ?? "USD")) ?? wallets[0];
    if (wallet) {
      const restored = parseFloat(wallet.balance) + parseFloat(withdrawal.amount);
      await db.update(walletsTable).set({ balance: restored.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
    }
    await db
      .update(withdrawalsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(withdrawalsTable.id, id));
    res.status(502).json({ error: "Payment provider unavailable. Payout cancelled, balance restored." });
  }
});

// ── Payment Clerk: reject payout ─────────────────────────────────────────────
router.post("/clerk/withdrawals/:id/reject", requirePaymentClerk, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  if (withdrawal.status !== "approved") {
    res.status(400).json({ error: "Only approved withdrawals can be rejected by the clerk" });
    return;
  }

  // Restore wallet balance
  const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, withdrawal.userId));
  const wallet = wallets.find((w) => w.currency === (withdrawal.currency ?? "USD")) ?? wallets[0];
  if (wallet) {
    const restored = parseFloat(wallet.balance) + parseFloat(withdrawal.amount);
    await db.update(walletsTable).set({ balance: restored.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      amount: parseFloat(withdrawal.amount).toFixed(2),
      type: "credit",
      description: `Withdrawal rejected by payment clerk — refunded`,
    });
  }

  await db
    .update(withdrawalsTable)
    .set({
      status: "rejected",
      clerkId: req.userId!,
      clerkNote: req.body.reason ?? null,
      clerkActionedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(withdrawalsTable.id, id));

  res.json({ ok: true, message: "Withdrawal rejected and balance restored" });
});

// ── Payment Clerk: check payout status from PawaPay ─────────────────────────
router.get("/clerk/withdrawals/:id/payout-status", requirePaymentClerk, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal || !withdrawal.pawapayPayoutId) {
    res.status(404).json({ error: "No PawaPay payout found for this withdrawal" });
    return;
  }

  const config = await getPawapayConfig();
  if (!config) {
    res.json({ status: withdrawal.status, pawapayStatus: withdrawal.pawapayStatus });
    return;
  }

  try {
    const result = await getPayoutStatus(config, withdrawal.pawapayPayoutId);
    const apiStatus: string = result.data?.status ?? withdrawal.pawapayStatus;

    let newStatus = withdrawal.status;
    if (apiStatus === "COMPLETED") newStatus = "completed";
    else if (apiStatus === "FAILED" || apiStatus === "TIMED_OUT") newStatus = "failed";

    await db
      .update(withdrawalsTable)
      .set({ status: newStatus as any, pawapayStatus: apiStatus, pawapayResponse: result.data as any, updatedAt: new Date() })
      .where(eq(withdrawalsTable.id, id));

    // Restore balance if payout failed
    if ((apiStatus === "FAILED" || apiStatus === "TIMED_OUT") && withdrawal.status === "processing") {
      const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, withdrawal.userId));
      const wallet = wallets.find((w) => w.currency === (withdrawal.currency ?? "USD")) ?? wallets[0];
      if (wallet) {
        const restored = parseFloat(wallet.balance) + parseFloat(withdrawal.amount);
        await db.update(walletsTable).set({ balance: restored.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
      }
    }

    res.json({ status: newStatus, pawapayStatus: apiStatus, details: result.data });
  } catch (err: any) {
    logger.error({ err }, "PawaPay payout status check failed");
    res.json({ status: withdrawal.status, pawapayStatus: withdrawal.pawapayStatus });
  }
});

export default router;
