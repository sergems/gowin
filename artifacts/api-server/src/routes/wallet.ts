import { Router } from "express";
import { db, walletsTable, transactionsTable, usersTable } from "@workspace/db";
import { eq, desc, count, sql, and, ilike, or } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";
import { CreditWalletBody, DebitWalletBody, GetMyTransactionsQueryParams, GetUserWalletParams } from "@workspace/api-zod";

const router = Router();

router.get("/wallet", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }
  res.json({ id: wallet.id, userId: wallet.userId, balance: parseFloat(wallet.balance) });
});

router.get("/wallet/transactions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const qp = GetMyTransactionsQueryParams.safeParse(req.query);
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const limit = qp.success ? (qp.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const [totalResult] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(eq(transactionsTable.walletId, wallet.id));

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.walletId, wallet.id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    transactions: transactions.map((t) => ({ ...t, amount: parseFloat(t.amount) })),
    total: totalResult.count,
    page,
    limit,
  });
});

router.post("/wallet/deposit", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (["agent", "branch_admin", "payout"].includes(req.userRole!)) {
    res.status(403).json({ error: "Staff accounts cannot deposit funds" });
    return;
  }
  const { amount } = req.body;
  const parsedAmount = parseFloat(amount);
  if (!parsedAmount || parsedAmount <= 0 || parsedAmount > 10000) {
    res.status(400).json({ error: "Invalid deposit amount (max $10,000 per transaction)" });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const newBalance = parseFloat(wallet.balance) + parsedAmount;
  await db.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: parsedAmount.toFixed(2),
    type: "credit",
    description: `Deposit — $${parsedAmount.toFixed(2)}`,
  });

  res.json({ id: wallet.id, userId: wallet.userId, balance: newBalance });
});

router.post("/wallet/withdraw", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (["agent", "branch_admin", "payout"].includes(req.userRole!)) {
    res.status(403).json({ error: "Staff accounts cannot withdraw funds" });
    return;
  }
  const { amount } = req.body;
  const parsedAmount = parseFloat(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    res.status(400).json({ error: "Invalid withdrawal amount" });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const newBalance = parseFloat(wallet.balance) - parsedAmount;
  if (newBalance < 0) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  await db.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: parsedAmount.toFixed(2),
    type: "debit",
    description: `Withdrawal — $${parsedAmount.toFixed(2)}`,
  });

  res.json({ id: wallet.id, userId: wallet.userId, balance: newBalance });
});

router.post("/wallet/credit", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreditWalletBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, amount, description } = parsed.data;

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const newBalance = parseFloat(wallet.balance) + amount;
  await db.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: amount.toFixed(2),
    type: "credit",
    description,
  });

  res.json({ id: wallet.id, userId: wallet.userId, balance: newBalance });
});

router.post("/wallet/debit", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = DebitWalletBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, amount, description } = parsed.data;

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const newBalance = parseFloat(wallet.balance) - amount;
  if (newBalance < 0) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  await db.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: amount.toFixed(2),
    type: "debit",
    description,
  });

  res.json({ id: wallet.id, userId: wallet.userId, balance: newBalance });
});

router.get("/wallet/user/:userId", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = GetUserWalletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, params.data.userId))
    .limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }
  res.json({ id: wallet.id, userId: wallet.userId, balance: parseFloat(wallet.balance) });
});

router.get("/admin/transactions", requireAdmin, async (_req, res): Promise<void> => {
  const req = _req as AuthRequest;
  const page = parseInt(String(req.query.page ?? "1"));
  const limit = 25;
  const offset = (page - 1) * limit;
  const typeFilter = req.query.type as string | undefined;
  const search = req.query.search as string | undefined;

  // Build where clause joining transactions → wallets → users
  const rows = await db
    .select({
      tx: transactionsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
      },
    })
    .from(transactionsTable)
    .leftJoin(walletsTable, eq(walletsTable.id, transactionsTable.walletId))
    .leftJoin(usersTable, eq(usersTable.id, walletsTable.userId))
    .where(
      and(
        typeFilter ? eq(transactionsTable.type as any, typeFilter) : undefined,
        search
          ? or(
              ilike(usersTable.username, `%${search}%`),
              ilike(usersTable.email, `%${search}%`),
              ilike(transactionsTable.description, `%${search}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .leftJoin(walletsTable, eq(walletsTable.id, transactionsTable.walletId))
    .leftJoin(usersTable, eq(usersTable.id, walletsTable.userId))
    .where(
      and(
        typeFilter ? eq(transactionsTable.type as any, typeFilter) : undefined,
        search
          ? or(
              ilike(usersTable.username, `%${search}%`),
              ilike(usersTable.email, `%${search}%`),
              ilike(transactionsTable.description, `%${search}%`)
            )
          : undefined
      )
    );

  // Quick summary counts (unfiltered)
  const [deposits] = await db.select({ count: count() }).from(transactionsTable).where(eq(transactionsTable.type as any, "credit"));
  const [withdrawals] = await db.select({ count: count() }).from(transactionsTable).where(eq(transactionsTable.type as any, "debit"));
  const [betsPlaced] = await db.select({ count: count() }).from(transactionsTable).where(eq(transactionsTable.type as any, "bet_placed"));

  res.json({
    transactions: rows.map((r) => ({
      id: r.tx.id,
      walletId: r.tx.walletId,
      amount: parseFloat(r.tx.amount),
      type: r.tx.type,
      description: r.tx.description,
      createdAt: r.tx.createdAt,
      user: r.user,
    })),
    total: totalResult.count,
    page,
    limit,
    summary: {
      deposits: deposits.count,
      withdrawals: withdrawals.count,
      betsPlaced: betsPlaced.count,
    },
  });
});

export default router;
