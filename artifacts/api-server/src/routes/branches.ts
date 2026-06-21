import { Router } from "express";
import { db, branchesTable, usersTable, walletsTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";
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
router.get("/admin/branches", requireAdmin, async (_req, res): Promise<void> => {
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
  const id = parseInt(req.params.id);
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
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(branchesTable).where(eq(branchesTable.id, id));
  res.json({ success: true });
});

// ── POST /admin/branches/:id/admins — create branch admin account ─────────────
router.post("/admin/branches/:id/admins", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const branchId = parseInt(req.params.id);
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

export default router;
