import { Router } from "express";
import { db, vouchersTable, walletsTable, transactionsTable, usersTable, branchesTable } from "@workspace/db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { requireAuth, requireAdmin, requireAdminOrManager, requireBranchAdmin, type AuthRequest } from "../middlewares/auth";
import { randomBytes } from "crypto";

const router = Router();

const ALLOWED_VALUES = [1, 5, 10, 50, 100];

function generateVoucherCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(12);
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// ── POST /admin/vouchers — create batch (super admin) ────────────────────────
router.post("/admin/vouchers", requireAdminOrManager, async (req, res): Promise<void> => {
  const { value, quantity = 1 } = req.body;

  if (typeof value !== "number" || !ALLOWED_VALUES.includes(value)) {
    res.status(400).json({ error: "Value must be one of: 1, 5, 10, 50, 100" });
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    res.status(400).json({ error: "Quantity must be between 1 and 50" });
    return;
  }

  const created = [];
  for (let i = 0; i < quantity; i++) {
    let code = "";
    let attempts = 0;
    while (true) {
      code = generateVoucherCode();
      attempts++;
      if (attempts > 20) {
        res.status(500).json({ error: "Failed to generate unique code" });
        return;
      }
      const existing = await db.select().from(vouchersTable).where(eq(vouchersTable.code, code)).limit(1);
      if (existing.length === 0) break;
    }
    const [voucher] = await db.insert(vouchersTable).values({ code, value: String(value) }).returning();
    created.push(voucher);
  }

  res.status(201).json({ vouchers: created.map((v) => ({ ...v, value: parseFloat(v.value) })) });
});

// ── GET /admin/vouchers — list all (super admin) ──────────────────────────────
router.get("/admin/vouchers", requireAdminOrManager, async (_req, res): Promise<void> => {
  const vouchers = await db
    .select({
      id: vouchersTable.id,
      code: vouchersTable.code,
      value: vouchersTable.value,
      isRedeemed: vouchersTable.isRedeemed,
      redeemedBy: vouchersTable.redeemedBy,
      redeemedAt: vouchersTable.redeemedAt,
      createdAt: vouchersTable.createdAt,
      branchId: vouchersTable.branchId,
      allocatedToBranch: vouchersTable.allocatedToBranch,
      allocatedToBranchAt: vouchersTable.allocatedToBranchAt,
      agentId: vouchersTable.agentId,
      soldAt: vouchersTable.soldAt,
      printedAt: vouchersTable.printedAt,
      redeemedByUsername: usersTable.username,
    })
    .from(vouchersTable)
    .leftJoin(usersTable, eq(vouchersTable.redeemedBy, usersTable.id))
    .orderBy(desc(vouchersTable.createdAt));

  // Load branch names separately
  const branches = await db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable);
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));

  res.json({
    vouchers: vouchers.map((v) => ({
      ...v,
      value: parseFloat(v.value),
      branchName: v.branchId ? branchMap[v.branchId] ?? null : null,
    })),
  });
});

// ── POST /admin/vouchers/allocate-to-branch ───────────────────────────────────
router.post("/admin/vouchers/allocate-to-branch", requireAdminOrManager, async (req, res): Promise<void> => {
  const { voucherIds, branchId } = req.body as { voucherIds: number[]; branchId: number };

  if (!Array.isArray(voucherIds) || voucherIds.length === 0) {
    res.status(400).json({ error: "voucherIds must be a non-empty array" });
    return;
  }
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }

  let allocated = 0;
  for (const vid of voucherIds) {
    const [v] = await db.select().from(vouchersTable).where(eq(vouchersTable.id, vid)).limit(1);
    if (!v || v.isRedeemed || v.allocatedToBranch) continue;

    await db.update(vouchersTable).set({
      branchId,
      allocatedToBranch: true,
      allocatedToBranchAt: new Date(),
    }).where(eq(vouchersTable.id, vid));
    allocated++;
  }

  res.json({ success: true, allocated });
});

// ── POST /wallet/redeem-voucher — user redeems voucher ───────────────────────
router.post("/wallet/redeem-voucher", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (["agent", "branch_admin", "payout"].includes(req.userRole!)) {
    res.status(403).json({ error: "Staff accounts cannot redeem vouchers" });
    return;
  }
  const rawCode = req.body?.code;
  if (!rawCode || typeof rawCode !== "string") {
    res.status(400).json({ error: "Invalid voucher code" });
    return;
  }
  const code = rawCode.trim().toUpperCase();

  const [voucher] = await db.select().from(vouchersTable).where(eq(vouchersTable.code, code)).limit(1);
  if (!voucher) {
    res.status(404).json({ error: "Voucher not found" });
    return;
  }
  if (voucher.isRedeemed) {
    res.status(409).json({ error: "This voucher has already been redeemed" });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const value = parseFloat(voucher.value);
  const newBalance = parseFloat(wallet.balance) + value;

  await db.update(walletsTable).set({ balance: String(newBalance) }).where(eq(walletsTable.id, wallet.id));
  await db.update(vouchersTable).set({
    isRedeemed: true,
    redeemedBy: req.userId!,
    redeemedAt: new Date(),
  }).where(eq(vouchersTable.id, voucher.id));
  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: String(value),
    type: "voucher_redeem",
    description: `Voucher redeemed: ${code}`,
  });

  res.json({ success: true, amount: value, newBalance });
});

export default router;
