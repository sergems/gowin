import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

function safeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    phoneNumber: u.phoneNumber ?? null,
    createdAt: u.createdAt,
  };
}

router.get("/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(safeUser(user));
});

router.patch("/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { firstName, lastName, phoneNumber } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (typeof firstName === "string") {
    const trimmed = firstName.trim();
    if (!trimmed) { res.status(400).json({ error: "First name cannot be empty" }); return; }
    updates.firstName = trimmed;
  }

  if (typeof lastName === "string") {
    const trimmed = lastName.trim();
    if (!trimmed) { res.status(400).json({ error: "Last name cannot be empty" }); return; }
    updates.lastName = trimmed;
  }

  if (typeof phoneNumber === "string") {
    if (user.phoneNumber !== null) {
      res.status(403).json({ error: "Phone number can only be set once. Contact support to change it." });
      return;
    }
    const trimmed = phoneNumber.trim();
    if (!trimmed) { res.status(400).json({ error: "Phone number cannot be empty" }); return; }
    if (!/^\+?[\d\s\-().]{7,20}$/.test(trimmed)) {
      res.status(400).json({ error: "Invalid phone number format" });
      return;
    }
    updates.phoneNumber = trimmed;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!)).returning();
  res.json(safeUser(updated));
});

export default router;
