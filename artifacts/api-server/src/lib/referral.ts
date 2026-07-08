import { db, settingsTable, usersTable, walletsTable, transactionsTable, referralRewardsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReferralConfig {
  enabled: boolean;
  signupBonus: number;           // USD credited to new user's bonus wallet on signup
  referrerRewardPercent: number; // % of deposit credited to referrer's bonus wallet
  maxReferralDeposits: number;   // max deposits that earn a reward (default 5)
  rolloverMultiplier: number;    // how many times bonus must be wagered before withdrawal
}

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  enabled: true,
  signupBonus: 2,
  referrerRewardPercent: 5,
  maxReferralDeposits: 5,
  rolloverMultiplier: 5,
};

// ── Settings helpers ──────────────────────────────────────────────────────────

export async function getReferralConfig(): Promise<ReferralConfig> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "referral_config"))
    .limit(1);
  if (!row?.value) return DEFAULT_REFERRAL_CONFIG;
  try {
    return { ...DEFAULT_REFERRAL_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_REFERRAL_CONFIG;
  }
}

export async function saveReferralConfig(config: ReferralConfig): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key: "referral_config", value: JSON.stringify(config) })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: JSON.stringify(config), updatedAt: new Date() },
    });
}

// ── Referral code generation ──────────────────────────────────────────────────

export function makeReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = makeReferralCode();
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, code))
      .limit(1);
    if (existing.length === 0) return code;
  }
  throw new Error("Could not generate unique referral code");
}

// ── Bonus wallet credit (atomic) ──────────────────────────────────────────────

/**
 * Atomically credit `amount` to a user's bonus wallet and add the required rollover.
 * Uses a single UPDATE with SQL arithmetic to avoid lost-update races.
 * Also inserts a bonus_credit transaction row.
 */
export async function creditBonusWallet(
  userId: number,
  amount: number,
  description: string,
  rolloverMultiplier: number,
): Promise<void> {
  const rolloverRequired = amount * rolloverMultiplier;

  // Atomic increment — no read-modify-write
  const updated = await db
    .update(walletsTable)
    .set({
      bonusBalance: sql`${walletsTable.bonusBalance} + ${amount.toFixed(2)}::numeric`,
      bonusRolloverRemaining: sql`${walletsTable.bonusRolloverRemaining} + ${rolloverRequired.toFixed(2)}::numeric`,
    })
    .where(eq(walletsTable.userId, userId))
    .returning({ id: walletsTable.id });

  if (updated.length === 0) throw new Error(`Wallet not found for user ${userId}`);

  await db.insert(transactionsTable).values({
    walletId: updated[0].id,
    amount: amount.toFixed(2),
    type: "bonus_credit",
    description,
  });
}

// ── Referral deposit reward (idempotent) ─────────────────────────────────────

/**
 * Called after a successful deposit is credited.
 * If the depositing user was referred, and the referrer has not yet received
 * rewards for `maxReferralDeposits`, credit 5% to the referrer's bonus wallet.
 *
 * Idempotency: the unique constraint on (referrer_id, referred_user_id, deposit_number)
 * plus INSERT ... ON CONFLICT DO NOTHING ensures only one reward is ever issued
 * per deposit slot, even under concurrent webhook/polling delivery.
 */
export async function processReferralReward(
  referredUserId: number,
  depositAmountUsd: number,
): Promise<void> {
  const config = await getReferralConfig();
  if (!config.enabled) return;

  const [user] = await db
    .select({ referredBy: usersTable.referredBy })
    .from(usersTable)
    .where(eq(usersTable.id, referredUserId))
    .limit(1);

  if (!user?.referredBy) return; // not referred

  const referrerId = user.referredBy;

  // Count how many deposit rewards have already been given for this relationship
  const [{ total }] = await db
    .select({ total: count() })
    .from(referralRewardsTable)
    .where(
      and(
        eq(referralRewardsTable.referrerId, referrerId),
        eq(referralRewardsTable.referredUserId, referredUserId),
      ),
    );

  const depositNumber = Number(total) + 1;
  if (depositNumber > config.maxReferralDeposits) return; // limit reached

  const rewardAmount = parseFloat((depositAmountUsd * (config.referrerRewardPercent / 100)).toFixed(2));
  if (rewardAmount <= 0) return;

  // Insert reward record with ON CONFLICT DO NOTHING (unique constraint guards against duplicates).
  // rawQuery because drizzle's insert().onConflictDoNothing() can check affected rows.
  const inserted = await db
    .insert(referralRewardsTable)
    .values({
      referrerId,
      referredUserId,
      depositNumber,
      depositAmount: depositAmountUsd.toFixed(2),
      rewardAmount: rewardAmount.toFixed(2),
      status: "credited",
    })
    .onConflictDoNothing()
    .returning({ id: referralRewardsTable.id });

  // Only credit the wallet if the row was actually inserted (no duplicate)
  if (inserted.length === 0) return;

  await creditBonusWallet(
    referrerId,
    rewardAmount,
    `Referral reward: ${config.referrerRewardPercent}% of deposit #${depositNumber} from referred user`,
    config.rolloverMultiplier,
  );
}
