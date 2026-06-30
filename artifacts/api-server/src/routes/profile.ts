import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

function safeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    publicId: u.publicId,
    username: u.username,
    email: u.email,
    role: u.role,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    phoneNumber: u.phoneNumber ?? null,
    mobileOperator: (u as any).mobileOperator ?? null,
    secondaryPhoneNumber: (u as any).secondaryPhoneNumber ?? null,
    secondaryMobileOperator: (u as any).secondaryMobileOperator ?? null,
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

  const { firstName, lastName, phoneNumber, mobileOperator, secondaryPhoneNumber, secondaryMobileOperator } = req.body;
  const updates: Record<string, any> = {};

  if (typeof firstName === "string") {
    if (user.firstName !== null) {
      res.status(403).json({ error: "First name can only be set once. Contact support to change it." });
      return;
    }
    const trimmed = firstName.trim();
    if (!trimmed) { res.status(400).json({ error: "First name cannot be empty" }); return; }
    updates.firstName = trimmed;
  }

  if (typeof lastName === "string") {
    if (user.lastName !== null) {
      res.status(403).json({ error: "Last name can only be set once. Contact support to change it." });
      return;
    }
    const trimmed = lastName.trim();
    if (!trimmed) { res.status(400).json({ error: "Last name cannot be empty" }); return; }
    updates.lastName = trimmed;
  }

  // Phone number and mobile operator must be set together and are locked once set
  if (typeof phoneNumber === "string" || typeof mobileOperator === "string") {
    if (user.phoneNumber !== null) {
      res.status(403).json({ error: "Primary payment account can only be set once. Contact support to change it." });
      return;
    }
    // Both must be provided together
    if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
      res.status(400).json({ error: "Phone number is required when setting your payment account" });
      return;
    }
    if (typeof mobileOperator !== "string" || !mobileOperator.trim()) {
      res.status(400).json({ error: "Mobile operator is required when setting your payment account" });
      return;
    }
    const trimmedPhone = phoneNumber.trim();
    if (!/^\+?[\d\s\-().]{7,20}$/.test(trimmedPhone)) {
      res.status(400).json({ error: "Invalid phone number format" });
      return;
    }
    const validOperators = ["VODACOM_MPESA_COD", "AIRTEL_COD", "ORANGE_COD"];
    if (!validOperators.includes(mobileOperator.trim())) {
      res.status(400).json({ error: "Invalid mobile operator" });
      return;
    }
    updates.phoneNumber = trimmedPhone;
    updates.mobileOperator = mobileOperator.trim();
  }

  // Secondary account — can be set or updated anytime
  if (typeof secondaryPhoneNumber === "string" || typeof secondaryMobileOperator === "string") {
    const trimmedSecPhone = typeof secondaryPhoneNumber === "string" ? secondaryPhoneNumber.trim() : "";
    const trimmedSecOp = typeof secondaryMobileOperator === "string" ? secondaryMobileOperator.trim() : "";

    // Clearing both is allowed
    if (!trimmedSecPhone && !trimmedSecOp) {
      updates.secondaryPhoneNumber = null;
      updates.secondaryMobileOperator = null;
    } else {
      if (!trimmedSecPhone) {
        res.status(400).json({ error: "Secondary phone number is required when setting a secondary account" });
        return;
      }
      if (!trimmedSecOp) {
        res.status(400).json({ error: "Secondary mobile operator is required when setting a secondary account" });
        return;
      }
      if (!/^\+?[\d\s\-().]{7,20}$/.test(trimmedSecPhone)) {
        res.status(400).json({ error: "Invalid secondary phone number format" });
        return;
      }
      const validOperators = ["VODACOM_MPESA_COD", "AIRTEL_COD", "ORANGE_COD"];
      if (!validOperators.includes(trimmedSecOp)) {
        res.status(400).json({ error: "Invalid secondary mobile operator" });
        return;
      }
      updates.secondaryPhoneNumber = trimmedSecPhone;
      updates.secondaryMobileOperator = trimmedSecOp;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!)).returning();
  res.json(safeUser(updated));
});

export default router;
