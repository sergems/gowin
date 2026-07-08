import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, walletsTable, passwordResetOtpsTable } from "@workspace/db";
import { eq, and, gt, isNull, or, inArray } from "drizzle-orm";
import { signToken, requireAuth, getJwtSecret, type AuthRequest } from "../middlewares/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { sendOtpEmail, sendAccountLockedEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { getReferralConfig, generateUniqueReferralCode, creditBonusWallet } from "../lib/referral";

const router = Router();

const MAX_LOGIN_ATTEMPTS = 3;

/**
 * Given a phone input, return every storage variant that could represent the
 * same DRC (+243) number.  Handles all formats seen in the wild:
 *   +243XXXXXXXXX  →  canonical E.164
 *   243XXXXXXXXX   →  E.164 without leading +
 *   0XXXXXXXXX     →  local 10-digit (leading 0 replaces +243)
 *   XXXXXXXXX      →  bare 9-digit national number
 * Spaces, dashes, dots and parentheses are stripped before parsing.
 */
function drcPhoneVariants(raw: string): string[] {
  const cleaned = raw.replace(/[\s\-\.()\u00a0]/g, "");
  const seen = new Set<string>([cleaned]); // always include exact input

  let national: string | null = null;

  if (cleaned.startsWith("+243") && cleaned.length >= 12) {
    national = cleaned.slice(4);
  } else if (cleaned.startsWith("243") && cleaned.length >= 12) {
    national = cleaned.slice(3);
  } else if (cleaned.startsWith("0") && cleaned.length >= 9) {
    national = cleaned.slice(1);
  } else if (/^\d{9}$/.test(cleaned)) {
    national = cleaned;
  }

  if (national) {
    seen.add(`+243${national}`);
    seen.add(`243${national}`);
    seen.add(`0${national}`);
  }

  return [...seen];
}

function formatUser(user: any) {
  return {
    id: user.id,
    publicId: user.publicId,
    username: user.username,
    email: user.email,
    role: user.role,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phoneNumber: user.phoneNumber ?? null,
    disabled: user.disabled,
    mustChangePassword: user.mustChangePassword ?? false,
    createdAt: user.createdAt,
    branchId: user.branchId ?? null,
    commissionRate: user.commissionRate ? parseFloat(user.commissionRate) : 0,
  };
}

async function generatePublicId(): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = Math.floor(Math.random() * 900000) + 100000;
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.publicId, id)).limit(1);
    if (existing.length === 0) return id;
  }
  throw new Error("Could not generate unique user ID");
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ── Register ──────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, email, password } = parsed.data;
  const referralCodeInput = typeof req.body.referralCode === "string" ? req.body.referralCode.trim().toUpperCase() : null;

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

  // Resolve referrer
  let referredBy: number | null = null;
  if (referralCodeInput) {
    const [referrer] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCodeInput))
      .limit(1);
    if (referrer) referredBy = referrer.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const publicId = await generatePublicId();
  const myReferralCode = await generateUniqueReferralCode();

  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      email,
      passwordHash,
      role: "user",
      publicId,
      referralCode: myReferralCode,
      ...(referredBy ? { referredBy } : {}),
    })
    .returning();

  await db.insert(walletsTable).values({ userId: user.id, balance: "0.00" });

  // Credit signup bonus to new user if referral is active
  if (referredBy) {
    try {
      const config = await getReferralConfig();
      if (config.enabled && config.signupBonus > 0) {
        await creditBonusWallet(user.id, config.signupBonus, "Welcome bonus for signing up via referral link", config.rolloverMultiplier);
      }
    } catch (err) {
      logger.error({ err }, "Failed to credit referral signup bonus");
    }
  }

  const token = signToken(user.id, user.role, null);
  res.status(201).json({ token, user: formatUser(user) });
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { identifier: rawIdentifier, password } = parsed.data;
  const identifier = rawIdentifier.trim();

  // Resolve by phone (priority) or email.
  // Email path: normalise to lowercase for case-insensitive match.
  // Phone path: expand the input into all DRC storage variants (+243X, 243X, 0X)
  // so any common format the user types matches whatever is stored in the DB.
  const isEmail = identifier.includes("@");

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      isEmail
        ? eq(usersTable.email, identifier.toLowerCase())
        : or(
            inArray(usersTable.phoneNumber, drcPhoneVariants(identifier)),
            eq(usersTable.email, identifier.toLowerCase()),
          ),
    )
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.disabled && user.disabledReason === "admin") {
    res.status(403).json({ error: "Your account has been disabled by an administrator. Please contact support.", code: "account_disabled_admin" });
    return;
  }

  let usedTempPassword = false;
  if (user.tempPasswordHash && user.tempPasswordExpiry) {
    const tempExpired = new Date() > new Date(user.tempPasswordExpiry);
    if (!tempExpired) {
      const tempMatch = await bcrypt.compare(password, user.tempPasswordHash);
      if (tempMatch) usedTempPassword = true;
    }
  }

  const mainMatch = !usedTempPassword ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!usedTempPassword && !mainMatch) {
    const newAttempts = (user.loginAttempts ?? 0) + 1;
    const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS && !user.disabled;

    await db.update(usersTable)
      .set({ loginAttempts: newAttempts, ...(shouldLock ? { disabled: true, disabledReason: "system" } : {}) })
      .where(eq(usersTable.id, user.id));

    if (shouldLock) {
      sendAccountLockedEmail(user.email ?? "", user.username).catch(() => {});
      res.status(403).json({ error: "Your account has been locked after too many failed attempts. Please reset your password to regain access.", code: "account_locked" });
      return;
    }

    const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
    res.status(401).json({ error: remaining > 0 ? `Invalid credentials. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.` : "Invalid credentials" });
    return;
  }

  if (mainMatch && user.disabled && user.disabledReason === "system") {
    res.status(403).json({ error: "Your account is locked due to failed login attempts. Please reset your password to regain access.", code: "account_locked" });
    return;
  }

  if (usedTempPassword) {
    await db.update(usersTable)
      .set({ tempPasswordHash: null, tempPasswordExpiry: null, mustChangePassword: true, loginAttempts: 0, ...(user.disabled && user.disabledReason === "system" ? { disabled: false, disabledReason: null } : {}) })
      .where(eq(usersTable.id, user.id));

    const token = signToken(user.id, user.role, user.branchId);
    res.json({ token, user: { ...formatUser(user), mustChangePassword: true, disabled: false }, mustChangePassword: true });
    return;
  }

  await db.update(usersTable).set({ loginAttempts: 0 }).where(eq(usersTable.id, user.id));

  const token = signToken(user.id, user.role, user.branchId);
  res.json({ token, user: formatUser(user), mustChangePassword: user.mustChangePassword ?? false });
});

// ── Get current user ──────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

// ── Forgot password ────────────────────────────────────────────────────────────
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.json({ message: "If an account with that email exists, an OTP has been sent." });
    return;
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(passwordResetOtpsTable).values({ userId: user.id, otpHash, expiresAt });
  sendOtpEmail(user.email, user.username, otp).catch(() => {});

  logger.info({ userId: user.id }, "Password reset OTP generated");
  res.json({ message: "If an account with that email exists, an OTP has been sent." });
});

// ── OTP rate limiting — max 5 failed attempts per email per 10-minute window ──
const otpAttempts = new Map<string, { count: number; resetAt: number }>();
const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_MS = 10 * 60 * 1000;

function checkOtpRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = otpAttempts.get(email);
  if (!entry || entry.resetAt <= now) {
    otpAttempts.set(email, { count: 1, resetAt: now + OTP_WINDOW_MS });
    return true;
  }
  if (entry.count >= OTP_MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function clearOtpRateLimit(email: string): void {
  otpAttempts.delete(email);
}

// ── Verify OTP ────────────────────────────────────────────────────────────────
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { email, otp } = req.body as { email?: string; otp?: string };
  if (!email || typeof email !== "string" || !email.includes("@") || !otp || typeof otp !== "string" || otp.length !== 6) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  if (!checkOtpRateLimit(email)) {
    res.status(429).json({ error: "Too many attempts. Please request a new OTP and try again." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) { res.status(400).json({ error: "Invalid OTP or email" }); return; }

  const now = new Date();
  const otpRecords = await db.select()
    .from(passwordResetOtpsTable)
    .where(and(eq(passwordResetOtpsTable.userId, user.id), gt(passwordResetOtpsTable.expiresAt, now), isNull(passwordResetOtpsTable.usedAt)))
    .orderBy(passwordResetOtpsTable.id);

  let matchedRecord = null;
  for (const record of otpRecords) {
    const match = await bcrypt.compare(otp, record.otpHash);
    if (match) { matchedRecord = record; break; }
  }

  if (!matchedRecord) { res.status(400).json({ error: "Invalid or expired OTP" }); return; }

  // OTP matched — clear the rate limit counter
  clearOtpRateLimit(email);
  await db.update(passwordResetOtpsTable).set({ usedAt: now }).where(eq(passwordResetOtpsTable.id, matchedRecord.id));

  const resetToken = jwt.sign({ userId: user.id, type: "password_reset" }, getJwtSecret(), { expiresIn: "15m" });
  res.json({ resetToken });
});

// ── Reset password ────────────────────────────────────────────────────────────
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { resetToken, newPassword } = req.body as { resetToken?: string; newPassword?: string };
  if (!resetToken || typeof resetToken !== "string" || !newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "Invalid input. Password must be at least 6 characters." });
    return;
  }

  let payload: any;
  try { payload = jwt.verify(resetToken, getJwtSecret()); }
  catch { res.status(400).json({ error: "Invalid or expired reset token" }); return; }

  if (payload.type !== "password_reset") { res.status(400).json({ error: "Invalid reset token" }); return; }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable)
    .set({ passwordHash, disabled: false, disabledReason: null, loginAttempts: 0, mustChangePassword: false, tempPasswordHash: null, tempPasswordExpiry: null })
    .where(eq(usersTable.id, payload.userId));

  res.json({ message: "Password reset successfully. You can now log in." });
});

// ── Change password ────────────────────────────────────────────────────────────
router.post("/auth/change-password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { newPassword } = req.body as { newPassword?: string };
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const [updated] = await db.update(usersTable)
    .set({ passwordHash, mustChangePassword: false, tempPasswordHash: null, tempPasswordExpiry: null, ...(user.disabledReason === "system" ? { disabled: false, disabledReason: null, loginAttempts: 0 } : {}) })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  const token = signToken(updated.id, updated.role, updated.branchId);
  res.json({ message: "Password changed successfully.", token, user: formatUser(updated) });
});

export default router;
