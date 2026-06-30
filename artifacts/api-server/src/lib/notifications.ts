import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendPayoutCompletedEmail, sendPayoutFailedEmail, sendWithdrawalApprovedEmail } from "./email";
import { logger } from "./logger";

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      userId,
      type,
      title,
      message,
      data: data ?? null,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to create notification (non-critical)");
  }
}

export async function notifyPayoutCompleted(
  userId: number,
  amount: string,
  currency: string,
  withdrawalId: number
): Promise<void> {
  const fmt = `${parseFloat(amount).toFixed(2)} ${currency}`;
  await createNotification(
    userId,
    "payout_completed",
    "Payout Successful",
    `Your withdrawal of ${fmt} has been processed and sent to your mobile money account.`,
    { withdrawalId, amount: parseFloat(amount), currency }
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendPayoutCompletedEmail(user.email, user.username, amount, currency);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send payout completed email");
  }
}

export async function notifyPayoutFailed(
  userId: number,
  amount: string,
  currency: string,
  withdrawalId: number
): Promise<void> {
  const fmt = `${parseFloat(amount).toFixed(2)} ${currency}`;
  await createNotification(
    userId,
    "payout_failed",
    "Payout Failed",
    `Your withdrawal of ${fmt} could not be processed. Your balance has been refunded automatically.`,
    { withdrawalId, amount: parseFloat(amount), currency }
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendPayoutFailedEmail(user.email, user.username, amount, currency);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send payout failed email");
  }
}

export async function notifyWithdrawalApproved(
  userId: number,
  amount: string,
  currency: string,
  withdrawalId: number
): Promise<void> {
  const fmt = `${parseFloat(amount).toFixed(2)} ${currency}`;
  await createNotification(
    userId,
    "withdrawal_approved",
    "Withdrawal Approved",
    `Your withdrawal request of ${fmt} has been approved and is queued for payout.`,
    { withdrawalId, amount: parseFloat(amount), currency }
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendWithdrawalApprovedEmail(user.email, user.username, amount, currency);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send withdrawal approved email");
  }
}
