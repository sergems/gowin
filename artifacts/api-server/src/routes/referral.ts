import { Router } from "express";
import { db, usersTable, referralRewardsTable } from "@workspace/db";
import { eq, sum, count } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";
import { getReferralConfig, saveReferralConfig } from "../lib/referral";

const router = Router();

// ── GET /api/user/referral — user's referral info & stats ─────────────────────
router.get("/user/referral", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [user] = await db
    .select({ referralCode: usersTable.referralCode, publicId: usersTable.publicId })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Count all users who signed up via this referral code (regardless of deposits)
  const [{ signupCount }] = await db
    .select({ signupCount: count() })
    .from(usersTable)
    .where(eq(usersTable.referredBy, userId));

  // Aggregate reward totals
  const [totals] = await db
    .select({ totalRewards: sum(referralRewardsTable.rewardAmount), totalDeposits: count() })
    .from(referralRewardsTable)
    .where(eq(referralRewardsTable.referrerId, userId));

  res.json({
    referralCode: user.referralCode,
    referredCount: Number(signupCount),
    totalRewards: parseFloat(totals?.totalRewards ?? "0"),
    totalDepositsRewarded: totals?.totalDeposits ?? 0,
  });
});

// ── GET /api/referral-config — public, no auth required ──────────────────────
router.get("/referral-config", async (_req, res): Promise<void> => {
  const config = await getReferralConfig();
  // Only expose fields users need to see; never expose internal admin-only settings
  res.json({
    enabled: config.enabled,
    signupBonus: config.signupBonus,
    referrerRewardPercent: config.referrerRewardPercent,
    maxReferralDeposits: config.maxReferralDeposits,
    rolloverMultiplier: config.rolloverMultiplier,
  });
});

// ── GET /api/admin/referral-settings ─────────────────────────────────────────
router.get("/admin/referral-settings", requireAdmin, async (_req, res): Promise<void> => {
  const config = await getReferralConfig();
  res.json(config);
});

// ── PUT /api/admin/referral-settings ─────────────────────────────────────────
router.put("/admin/referral-settings", requireAdmin, async (req, res): Promise<void> => {
  const { enabled, signupBonus, referrerRewardPercent, maxReferralDeposits, rolloverMultiplier } = req.body as {
    enabled?: boolean;
    signupBonus?: number;
    referrerRewardPercent?: number;
    maxReferralDeposits?: number;
    rolloverMultiplier?: number;
  };

  const current = await getReferralConfig();
  const updated = {
    ...current,
    ...(enabled !== undefined ? { enabled } : {}),
    ...(signupBonus !== undefined && signupBonus >= 0 ? { signupBonus } : {}),
    ...(referrerRewardPercent !== undefined && referrerRewardPercent >= 0 && referrerRewardPercent <= 100
      ? { referrerRewardPercent }
      : {}),
    ...(maxReferralDeposits !== undefined && maxReferralDeposits >= 1 ? { maxReferralDeposits } : {}),
    ...(rolloverMultiplier !== undefined && rolloverMultiplier >= 1 ? { rolloverMultiplier } : {}),
  };

  await saveReferralConfig(updated);
  res.json(updated);
});

export default router;
