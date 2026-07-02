import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  sendPayoutCompletedEmail, sendPayoutFailedEmail, sendWithdrawalApprovedEmail,
  sendDepositCompletedEmail, sendWithdrawalRejectedEmail, sendBetWonEmail,
  sendWalletCreditEmail, sendWalletDebitEmail, sendAccountBlockedEmail, sendAccountUnblockedEmail,
} from "./email";
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

export async function notifyWithdrawalRejected(
  userId: number,
  amount: string,
  currency: string,
  withdrawalId: number
): Promise<void> {
  const fmt = `${parseFloat(amount).toFixed(2)} ${currency}`;
  await createNotification(
    userId,
    "withdrawal_rejected",
    "Withdrawal Rejected",
    `Your withdrawal request of ${fmt} was rejected and the amount has been refunded to your wallet.`,
    { withdrawalId, amount: parseFloat(amount), currency }
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendWithdrawalRejectedEmail(user.email, user.username, amount, currency);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send withdrawal rejected email");
  }
}

export async function notifyDepositCompleted(
  userId: number,
  amount: string,
  currency: string,
  depositId: number
): Promise<void> {
  const fmt = `${parseFloat(amount).toFixed(2)} ${currency}`;
  await createNotification(
    userId,
    "deposit_completed",
    "Deposit Successful",
    `Your deposit of ${fmt} has been received and credited to your wallet.`,
    { depositId, amount: parseFloat(amount), currency }
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendDepositCompletedEmail(user.email, user.username, amount, currency);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send deposit completed email");
  }
}

export async function notifyBetWon(
  userId: number,
  amount: string,
  currency: string,
  betId: number
): Promise<void> {
  const fmt = `${parseFloat(amount).toFixed(2)} ${currency}`;
  await createNotification(
    userId,
    "bet_won",
    "You Won! 🎉",
    `Your bet #${betId} won. ${fmt} has been credited to your wallet.`,
    { betId, amount: parseFloat(amount), currency }
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendBetWonEmail(user.email, user.username, amount, currency, betId);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send bet won email");
  }
}

export async function notifyBetLost(
  userId: number,
  betId: number
): Promise<void> {
  await createNotification(
    userId,
    "bet_lost",
    "Bet Settled",
    `Your bet #${betId} did not win this time. Better luck next time!`,
    { betId }
  );
}

export async function notifyWalletCredit(
  userId: number,
  amount: string,
  currency: string,
  description: string
): Promise<void> {
  const fmt = `${parseFloat(amount).toFixed(2)} ${currency}`;
  await createNotification(
    userId,
    "wallet_credit",
    "Wallet Credited",
    `Your wallet has been credited with ${fmt}. ${description}`,
    { amount: parseFloat(amount), currency, description }
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendWalletCreditEmail(user.email, user.username, amount, currency, description);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send wallet credit email");
  }
}

export async function notifyWalletDebit(
  userId: number,
  amount: string,
  currency: string,
  description: string
): Promise<void> {
  const fmt = `${parseFloat(amount).toFixed(2)} ${currency}`;
  await createNotification(
    userId,
    "wallet_debit",
    "Wallet Debited",
    `Your wallet was debited ${fmt}. ${description}`,
    { amount: parseFloat(amount), currency, description }
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendWalletDebitEmail(user.email, user.username, amount, currency, description);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send wallet debit email");
  }
}

export async function notifyAccountBlocked(userId: number): Promise<void> {
  await createNotification(
    userId,
    "account_blocked",
    "Account Blocked",
    "Your account has been blocked by an administrator. Contact support if you believe this is a mistake.",
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendAccountBlockedEmail(user.email, user.username);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send account blocked email");
  }
}

export async function notifyAccountUnblocked(userId: number): Promise<void> {
  await createNotification(
    userId,
    "account_unblocked",
    "Account Reactivated",
    "Your account has been reactivated. You can now log in as usual.",
  );
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      await sendAccountUnblockedEmail(user.email, user.username);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send account unblocked email");
  }
}
