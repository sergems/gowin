import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, walletsTable } from "@workspace/db";
import { eq, ne, and } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../middlewares/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

async function generatePublicId(): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = Math.floor(Math.random() * 900000) + 100000;
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.publicId, id)).limit(1);
    if (existing.length === 0) return id;
  }
  throw new Error("Could not generate unique user ID");
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, email, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const existingUsername = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existingUsername.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const publicId = await generatePublicId();
  const [user] = await db
    .insert(usersTable)
    .values({ username, email, passwordHash, role: "user", publicId })
    .returning();

  await db.insert(walletsTable).values({ userId: user.id, balance: "0.00" });

  const token = signToken(user.id, user.role);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      publicId: user.publicId,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phoneNumber: user.phoneNumber ?? null,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.disabled) {
    res.status(403).json({ error: "Your account has been disabled. Please contact support." });
    return;
  }

  const token = signToken(user.id, user.role);
  res.json({
    token,
    user: {
      id: user.id,
      publicId: user.publicId,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phoneNumber: user.phoneNumber ?? null,
      createdAt: user.createdAt,
    },
  });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    publicId: user.publicId,
    username: user.username,
    email: user.email,
    role: user.role,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phoneNumber: user.phoneNumber ?? null,
    createdAt: user.createdAt,
  });
});

export default router;
