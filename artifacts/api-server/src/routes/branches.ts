import { Router } from "express";
import { db, branchesTable, usersTable, walletsTable, betsTable } from "@workspace/db";
import { eq, count, desc, sum, inArray, or, sql } from "drizzle-orm";
import { requireAdmin, requireAdminOrManager, type AuthRequest } from "../middlewares/auth";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

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

// ── GET /admin/branches ───────────────────────────────────────────────────────
router.get("/admin/branches", requireAdminOrManager, async (_req, res): Promise<void> => {
  const branches = await db.select().from(branchesTable).orderBy(desc(branchesTable.createdAt));

  const withCounts = await Promise.all(branches.map(async (branch) => {
    const [agentCount] = await db.select({ count: count() }).from(usersTable)
      .where(eq(usersTable.branchId, branch.id));
    return { ...branch, agentCount: agentCount.count };
  }));

  res.json({ branches: withCounts });
});

// ── POST /admin/branches ──────────────────────────────────────────────────────
router.post("/admin/branches", requireAdmin, async (req, res): Promise<void> => {
  const { name, code, country, city, address, phone, email } = req.body;

  if (!name || !code || !country || !city || !address || !phone || !email) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const existing = await db.select().from(branchesTable).where(eq(branchesTable.code, code.toUpperCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Branch code already exists" });
    return;
  }

  const [branch] = await db.insert(branchesTable).values({
    name: name.trim(),
    code: code.toUpperCase().trim(),
    country: country.trim(),
    city: city.trim(),
    address: address.trim(),
    phone: phone.trim(),
    email: email.trim(),
    status: "active",
  }).returning();

  res.status(201).json({ branch });
});

// ── PATCH /admin/branches/:id ─────────────────────────────────────────────────
router.patch("/admin/branches/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { name, country, city, address, phone, email, status } = req.body;
  const updates: Record<string, any> = {};
  if (name) updates.name = name.trim();
  if (country) updates.country = country.trim();
  if (city) updates.city = city.trim();
  if (address) updates.address = address.trim();
  if (phone) updates.phone = phone.trim();
  if (email) updates.email = email.trim();
  if (status && ["active", "suspended"].includes(status)) updates.status = status;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db.update(branchesTable).set(updates).where(eq(branchesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Branch not found" }); return; }

  res.json({ branch: updated });
});

// ── DELETE /admin/branches/:id ────────────────────────────────────────────────
router.delete("/admin/branches/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(branchesTable).where(eq(branchesTable.id, id));
  res.json({ success: true });
});

// ── POST /admin/branches/:id/admins — create branch admin account ─────────────
router.post("/admin/branches/:id/admins", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = parseInt(req.params.id as string);
  if (isNaN(branchId)) { res.status(400).json({ error: "Invalid branch ID" }); return; }

  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }

  const { username, email, firstName, lastName, phoneNumber } = req.body;
  if (!username || !email) {
    res.status(400).json({ error: "Username and email are required" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Email already in use" }); return; }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const publicId = await generatePublicId();

  const [user] = await db.insert(usersTable).values({
    username: username.trim(),
    email: email.trim(),
    passwordHash,
    role: "branch_admin",
    publicId,
    firstName: firstName?.trim() || null,
    lastName: lastName?.trim() || null,
    phoneNumber: phoneNumber?.trim() || null,
    branchId,
    mustChangePassword: true,
  }).returning();

  await db.insert(walletsTable).values({ userId: user.id, balance: "0.00" });

  res.status(201).json({ user: { ...user, tempPassword }, tempPassword });
});

// ── GET /admin/branches/:id/members ──────────────────────────────────────────
router.get("/admin/branches/:id/members", requireAdminOrManager, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid branch ID" }); return; }

  const members = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    role: usersTable.role,
    commissionRate: usersTable.commissionRate,
    disabled: usersTable.disabled,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.branchId, id));

  const memberIds = members.map((m) => m.id);
  let statsMap: Record<number, { betsPlaced: number; turnover: number }> = {};

  if (memberIds.length > 0) {
    const betStats = await db.select({
      memberId: sql<number>`COALESCE(${betsTable.agentId}, ${betsTable.userId})`,
      betsPlaced: count(),
      turnover: sum(betsTable.stake),
    }).from(betsTable)
      .where(or(inArray(betsTable.agentId, memberIds), inArray(betsTable.userId, memberIds)))
      .groupBy(sql`COALESCE(${betsTable.agentId}, ${betsTable.userId})`);

    for (const s of betStats) {
      if (s.memberId != null) {
        const existing = statsMap[s.memberId];
        statsMap[s.memberId] = {
          betsPlaced: (existing?.betsPlaced ?? 0) + s.betsPlaced,
          turnover: (existing?.turnover ?? 0) + parseFloat(s.turnover ?? "0"),
        };
      }
    }
  }

  res.json({
    members: members.map((m) => ({
      ...m,
      commissionRate: parseFloat(m.commissionRate ?? "0"),
      betsPlaced: statsMap[m.id]?.betsPlaced ?? 0,
      turnover: statsMap[m.id]?.turnover ?? 0,
    })),
  });
});

// ── POST /admin/branches/:id/credit — add funds to branch balance ────────────
router.post("/admin/branches/:id/credit", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid branch ID" }); return; }

  const amount = parseFloat(req.body.amount);
  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({ error: "Amount must be a positive number" });
    return;
  }

  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id)).limit(1);
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }

  const newBalance = (parseFloat(branch.balance) + amount).toFixed(2);
  const [updated] = await db.update(branchesTable)
    .set({ balance: newBalance })
    .where(eq(branchesTable.id, id))
    .returning();

  res.json({ branch: updated, credited: amount });
});

// ── POST /admin/branches/:id/debit — remove funds from branch balance ────────
router.post("/admin/branches/:id/debit", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid branch ID" }); return; }

  const amount = parseFloat(req.body.amount);
  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({ error: "Amount must be a positive number" });
    return;
  }

  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id)).limit(1);
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }

  const currentBalance = parseFloat(branch.balance);
  if (amount > currentBalance) {
    res.status(400).json({ error: "Insufficient branch balance" });
    return;
  }

  const newBalance = (currentBalance - amount).toFixed(2);
  const [updated] = await db.update(branchesTable)
    .set({ balance: newBalance })
    .where(eq(branchesTable.id, id))
    .returning();

  res.json({ branch: updated, debited: amount });
});

// ── PATCH /admin/users/:id/assign-branch — assign/update user branch & role ──
router.patch("/admin/users/:id/assign-branch", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const { branchId, role, commissionRate } = req.body;
  const updates: Record<string, any> = {};

  if ("branchId" in req.body) {
    if (branchId === null || branchId === "") {
      updates.branchId = null;
    } else {
      const bid = parseInt(String(branchId));
      if (isNaN(bid)) { res.status(400).json({ error: "Invalid branch ID" }); return; }
      const [branch] = await db.select({ id: branchesTable.id }).from(branchesTable).where(eq(branchesTable.id, bid)).limit(1);
      if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }
      updates.branchId = bid;
    }
  }

  if (role && ["admin", "manager", "branch_admin", "agent", "payout", "user"].includes(role)) {
    updates.role = role;
  }

  if ("commissionRate" in req.body) {
    const rate = parseFloat(String(commissionRate));
    updates.commissionRate = isNaN(rate) ? "0.00" : Math.min(100, Math.max(0, rate)).toFixed(2);
  }

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No updates provided" }); return; }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  res.json({ user: updated });
});

export default router;
