import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, walletsTable } from "@workspace/db";
import { eq, ilike, count, or } from "drizzle-orm";
import { requireAdmin, requireAdminOrManager, requireAuth, type AuthRequest } from "../middlewares/auth";
import { ListUsersQueryParams, GetUserParams } from "@workspace/api-zod";
import { sendTempPasswordEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

function formatUser(u: any, wallet?: any) {
  return {
    id: u.id,
    publicId: u.publicId ?? null,
    username: u.username,
    email: u.email,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    phoneNumber: u.phoneNumber ?? null,
    role: u.role,
    branchId: u.branchId ?? null,
    commissionRate: parseFloat(u.commissionRate ?? "0"),
    disabled: u.disabled ?? false,
    disabledReason: u.disabledReason ?? null,
    mustChangePassword: u.mustChangePassword ?? false,
    loginAttempts: u.loginAttempts ?? 0,
    createdAt: u.createdAt,
    wallet: wallet
      ? { id: wallet.id, userId: wallet.userId, balance: parseFloat(wallet.balance) }
      : { id: 0, userId: u.id, balance: 0 },
  };
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

router.get("/users", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const qp = ListUsersQueryParams.safeParse(req.query);
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const limit = qp.success ? (qp.data.limit ?? 20) : 20;
  const search = qp.success ? qp.data.search : undefined;
  const offset = (page - 1) * limit;

  let query = db.select().from(usersTable).leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id));
  let countQuery = db.select({ count: count() }).from(usersTable);

  if (search) {
    const condition = or(
      ilike(usersTable.username, `%${search}%`),
      ilike(usersTable.email, `%${search}%`),
      ilike(usersTable.phoneNumber, `%${search}%`)
    );
    query = query.where(condition) as typeof query;
    countQuery = countQuery.where(condition) as typeof countQuery;
  }

  const [totalResult] = await countQuery;
  const rows = await (query as any).limit(limit).offset(offset);

  res.json({
    users: rows.map((row: any) => formatUser(row.users, row.wallets)),
    total: totalResult.count,
    page,
    limit,
  });
});

router.get("/users/:id", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const row = rows[0]!;
  res.json(formatUser(row.users, row.wallets));
});

// ── PATCH /users/:id — edit user details ─────────────────────────────────────
router.patch("/users/:id", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const { firstName, lastName, email, phoneNumber, username } = req.body as Record<string, string | undefined>;

  const updates: Record<string, any> = {};
  if (firstName !== undefined) updates.firstName = firstName.trim() || null;
  if (lastName !== undefined) updates.lastName = lastName.trim() || null;
  if (email !== undefined) {
    const trimmed = email.trim();
    if (!trimmed) { res.status(400).json({ error: "Email cannot be empty" }); return; }
    updates.email = trimmed;
  }
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber.trim() || null;
  if (username !== undefined) {
    const trimmed = username.trim();
    if (!trimmed) { res.status(400).json({ error: "Username cannot be empty" }); return; }
    updates.username = trimmed;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  try {
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(updated));
  } catch (err: any) {
    if (err.code === "23505") {
      const detail: string = err.detail ?? "";
      if (detail.includes("email")) {
        res.status(409).json({ error: "Email already in use" });
      } else if (detail.includes("username")) {
        res.status(409).json({ error: "Username already taken" });
      } else if (detail.includes("phone")) {
        res.status(409).json({ error: "Phone number already in use" });
      } else {
        res.status(409).json({ error: "Duplicate value" });
      }
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

// ── PATCH /users/:id/role ─────────────────────────────────────────────────────
router.patch("/users/:id/role", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const { role } = req.body;
  if (!role || !["admin", "user", "branch_admin", "agent", "payout"].includes(role)) {
    res.status(400).json({ error: "Role must be 'admin', 'user', 'branch_admin', or 'agent'" });
    return;
  }

  if (id === req.userId && role === "user") {
    res.status(400).json({ error: "You cannot remove your own admin role" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(updated));
});

// ── PATCH /users/:id/disable — block / unblock ────────────────────────────────
router.patch("/users/:id/disable", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  if (id === req.userId) {
    res.status(400).json({ error: "You cannot disable your own account" });
    return;
  }

  const { disabled } = req.body as { disabled: boolean };
  if (typeof disabled !== "boolean") {
    res.status(400).json({ error: "disabled must be a boolean" });
    return;
  }

  const updates: Record<string, any> = { disabled };
  if (disabled) {
    updates.disabledReason = "admin";
  } else {
    updates.disabledReason = null;
    updates.loginAttempts = 0;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(updated));
});

// ── POST /users/:id/reset-password — admin-initiated temp password ─────────────
router.post("/users/:id/reset-password", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const tempPassword = generateTempPassword();
  const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
  const tempPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(usersTable)
    .set({
      tempPasswordHash,
      tempPasswordExpiry,
      mustChangePassword: true,
    })
    .where(eq(usersTable.id, id));

  const emailSent = await sendTempPasswordEmail(user.email, user.username, tempPassword);
  logger.info({ userId: id, adminId: req.userId, emailSent }, "Admin reset user password");

  res.json({
    message: "Temporary password generated.",
    tempPassword,
    expiresAt: tempPasswordExpiry.toISOString(),
    emailSent,
  });
});

export default router;
