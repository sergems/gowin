import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, pawapayDepositsTable, walletsTable, transactionsTable, webhookLogsTable, withdrawalsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import {
  getPawapayConfig,
  initiateDeposit,
  getDepositStatus,
  DRC_OPERATORS,
} from "../lib/pawapay";
import { getUsdToCdfRate, getCacheInfo } from "../lib/exchangeRate";
import { logger } from "../lib/logger";
import crypto from "crypto";

const router = Router();

// ── GET /pawapay/operators — list supported operators ──────────────────────
router.get("/pawapay/operators", async (_req, res): Promise<void> => {
  res.json({ operators: DRC_OPERATORS });
});

// ── GET /pawapay/exchange-rate — live USD→CDF rate (1h cache) ──────────────
router.get("/pawapay/exchange-rate", async (_req, res): Promise<void> => {
  const rate = await getUsdToCdfRate();
  const info = getCacheInfo();
  res.json({ rate, cachedAt: info.cachedAt, isFallback: info.isFallback });
});

// ── GET /pawapay/config — public config (enabled, limits) ──────────────────
router.get("/pawapay/config", async (_req, res): Promise<void> => {
  const config = await getPawapayConfig();
  if (!config) {
    res.json({ enabled: false, depositsEnabled: false, withdrawalsEnabled: false });
    return;
  }
  res.json({
    enabled: true,
    isSandbox: config.isSandbox,
    depositsEnabled: config.depositsEnabled,
    withdrawalsEnabled: config.withdrawalsEnabled,
    minDeposit: config.minDeposit,
    maxDeposit: config.maxDeposit,
    minWithdrawal: config.minWithdrawal,
    maxWithdrawal: config.maxWithdrawal,
    operators: DRC_OPERATORS,
  });
});

// ── POST /pawapay/deposits — initiate a deposit ────────────────────────────
router.post("/pawapay/deposits", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (["agent", "branch_admin", "payout", "manager", "payment_clerk"].includes(req.userRole!)) {
    res.status(403).json({ error: "Staff accounts cannot deposit funds" });
    return;
  }

  const { amount, currency, phoneNumber, operator } = req.body;
  const parsedAmount = parseFloat(amount);

  if (!parsedAmount || parsedAmount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }
  if (!currency || !["CDF", "USD"].includes(currency)) {
    res.status(400).json({ error: "Currency must be CDF or USD" });
    return;
  }
  if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim().length < 9) {
    res.status(400).json({ error: "Valid phone number required" });
    return;
  }
  if (!operator || typeof operator !== "string") {
    res.status(400).json({ error: "Operator required" });
    return;
  }

  const config = await getPawapayConfig();
  if (!config || !config.enabled || !config.depositsEnabled) {
    res.status(503).json({ error: "Mobile money deposits are not currently available" });
    return;
  }

  // Currency-aware limit check: CDF limits are USD limits × live exchange rate
  const rate = await getUsdToCdfRate();
  const minForCurrency = currency === "CDF" ? config.minDeposit * rate : config.minDeposit;
  const maxForCurrency = currency === "CDF" ? config.maxDeposit * rate : config.maxDeposit;

  if (parsedAmount < minForCurrency || parsedAmount > maxForCurrency) {
    const fmt = (n: number) => currency === "CDF"
      ? `${Math.round(n).toLocaleString()} CDF`
      : `${n} USD`;
    res.status(400).json({ error: `Amount must be between ${fmt(minForCurrency)} and ${fmt(maxForCurrency)}` });
    return;
  }

  // Find or create the correct currency wallet
  let [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, req.userId!))
    .then((rows) => rows.filter((w) => w.currency === currency));

  if (!wallet) {
    // Create a wallet for this currency
    const [newWallet] = await db
      .insert(walletsTable)
      .values({ userId: req.userId!, balance: "0.00", currency })
      .returning();
    wallet = newWallet;
  }

  const depositId = crypto.randomUUID();

  // Store deposit record first (idempotency)
  const [deposit] = await db
    .insert(pawapayDepositsTable)
    .values({
      depositId,
      userId: req.userId!,
      walletId: wallet.id,
      amount: parsedAmount.toFixed(2),
      currency,
      phoneNumber: phoneNumber.trim(),
      operator,
      status: "PENDING",
    })
    .returning();

  // Call PawaPay API
  try {
    const result = await initiateDeposit(
      config,
      depositId,
      parsedAmount,
      currency,
      phoneNumber.trim(),
      operator,
      `GoWin Deposit`
    );

    const pawapayStatus = result.data?.status ?? (result.ok ? "ACCEPTED" : "FAILED");
    await db
      .update(pawapayDepositsTable)
      .set({
        status: result.ok ? "ACCEPTED" : "FAILED",
        pawapayStatus,
        pawapayResponse: result.data as any,
        updatedAt: new Date(),
      })
      .where(eq(pawapayDepositsTable.id, deposit.id));

    if (!result.ok) {
      const errMsg = result.data?.message ?? result.data?.errorMessage ?? "PawaPay rejected the request";
      res.status(400).json({ error: errMsg, details: result.data });
      return;
    }

    res.status(201).json({
      depositId,
      status: pawapayStatus,
      amount: parsedAmount,
      currency,
      phoneNumber: phoneNumber.trim(),
      operator,
    });
  } catch (err: any) {
    await db
      .update(pawapayDepositsTable)
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(eq(pawapayDepositsTable.id, deposit.id));
    logger.error({ err }, "PawaPay deposit initiation failed");
    res.status(502).json({ error: "Payment provider unavailable. Please try again." });
  }
});

// ── GET /pawapay/deposits/:depositId — poll deposit status ─────────────────
router.get("/pawapay/deposits/:depositId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const depositId = req.params.depositId as string;

  const [deposit] = await db
    .select()
    .from(pawapayDepositsTable)
    .where(eq(pawapayDepositsTable.depositId, depositId))
    .limit(1);

  if (!deposit) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }
  if (deposit.userId !== req.userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // If already credited, return final status
  if (deposit.walletCredited) {
    res.json({
      depositId,
      status: "COMPLETED",
      amount: parseFloat(deposit.amount),
      currency: deposit.currency,
    });
    return;
  }

  // Poll PawaPay for live status
  const config = await getPawapayConfig();
  if (!config) {
    res.json({ depositId, status: deposit.status, amount: parseFloat(deposit.amount), currency: deposit.currency });
    return;
  }

  try {
    const result = await getDepositStatus(config, depositId);
    // v2 status check returns { status: "FOUND", data: { status: "COMPLETED", ... } }
    const apiStatus: string = result.data?.data?.status ?? deposit.status;

    // Update local record
    await db
      .update(pawapayDepositsTable)
      .set({ pawapayStatus: apiStatus, pawapayResponse: result.data as any, updatedAt: new Date() })
      .where(eq(pawapayDepositsTable.id, deposit.id));

    // Credit wallet on completion
    if (apiStatus === "COMPLETED" && !deposit.walletCredited) {
      const [wallet] = await db
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.id, deposit.walletId))
        .limit(1);

      if (wallet) {
        const newBalance = parseFloat(wallet.balance) + parseFloat(deposit.amount);
        await db
          .update(walletsTable)
          .set({ balance: newBalance.toFixed(2) })
          .where(eq(walletsTable.id, wallet.id));
        await db.insert(transactionsTable).values({
          walletId: wallet.id,
          amount: parseFloat(deposit.amount).toFixed(2),
          type: "credit",
          description: `Mobile Money Deposit (${deposit.currency}) — ${deposit.phoneNumber}`,
        });
        await db
          .update(pawapayDepositsTable)
          .set({ walletCredited: true, status: "COMPLETED" })
          .where(eq(pawapayDepositsTable.id, deposit.id));
      }
    }

    res.json({
      depositId,
      status: apiStatus,
      amount: parseFloat(deposit.amount),
      currency: deposit.currency,
      phoneNumber: deposit.phoneNumber,
      operator: deposit.operator,
    });
  } catch (err: any) {
    logger.error({ err }, "PawaPay deposit status check failed");
    res.json({ depositId, status: deposit.status, amount: parseFloat(deposit.amount), currency: deposit.currency });
  }
});

// ── POST /pawapay/webhook — receive PawaPay events ─────────────────────────
router.post("/pawapay/webhook", async (req, res): Promise<void> => {
  const payload = req.body;

  // v2 callbacks have no "type" field — detect by depositId vs payoutId presence
  const eventType = payload?.depositId ? "DEPOSIT" : payload?.payoutId ? "PAYOUT" : "UNKNOWN";

  // Log all webhook events
  await db.insert(webhookLogsTable).values({
    eventType,
    payload: payload as any,
    processed: false,
  });

  try {
    if (eventType === "DEPOSIT") {
      const { depositId, status } = payload;
      if (depositId && status) {
        const [deposit] = await db
          .select()
          .from(pawapayDepositsTable)
          .where(eq(pawapayDepositsTable.depositId, depositId))
          .limit(1);

        if (deposit && !deposit.walletCredited && status === "COMPLETED") {
          const [wallet] = await db
            .select()
            .from(walletsTable)
            .where(eq(walletsTable.id, deposit.walletId))
            .limit(1);

          if (wallet) {
            const newBalance = parseFloat(wallet.balance) + parseFloat(deposit.amount);
            await db
              .update(walletsTable)
              .set({ balance: newBalance.toFixed(2) })
              .where(eq(walletsTable.id, wallet.id));
            await db.insert(transactionsTable).values({
              walletId: wallet.id,
              amount: parseFloat(deposit.amount).toFixed(2),
              type: "credit",
              description: `Mobile Money Deposit (${deposit.currency}) — ${deposit.phoneNumber}`,
            });
            await db
              .update(pawapayDepositsTable)
              .set({ walletCredited: true, status: "COMPLETED", pawapayStatus: status, updatedAt: new Date() })
              .where(eq(pawapayDepositsTable.id, deposit.id));
          }
        } else if (deposit && status === "FAILED") {
          await db
            .update(pawapayDepositsTable)
            .set({ status: "FAILED", pawapayStatus: status, updatedAt: new Date() })
            .where(eq(pawapayDepositsTable.id, deposit.id));
        }
      }
    }

    if (eventType === "PAYOUT") {
      const { payoutId, status } = payload;
      if (payoutId && status) {
        const [withdrawal] = await db
          .select()
          .from(withdrawalsTable)
          .where(eq(withdrawalsTable.pawapayPayoutId, payoutId))
          .limit(1);

        if (withdrawal) {
          if (status === "COMPLETED") {
            await db
              .update(withdrawalsTable)
              .set({ status: "completed", pawapayStatus: status, pawapayResponse: payload as any, updatedAt: new Date() })
              .where(eq(withdrawalsTable.id, withdrawal.id));
          } else if (status === "FAILED" || status === "DUPLICATE_IGNORED") {
            // Refund the wallet if payout failed
            const [wallet] = await db
              .select()
              .from(walletsTable)
              .where(eq(walletsTable.userId, withdrawal.userId))
              .limit(1);
            if (wallet) {
              const refundAmount = parseFloat(withdrawal.amount as string);
              const newBalance = parseFloat(wallet.balance) + refundAmount;
              await db
                .update(walletsTable)
                .set({ balance: newBalance.toFixed(2) })
                .where(eq(walletsTable.id, wallet.id));
              await db.insert(transactionsTable).values({
                walletId: wallet.id,
                amount: refundAmount.toFixed(2),
                type: "credit",
                description: `Payout Failed — Refund for withdrawal #${withdrawal.id}`,
              });
            }
            await db
              .update(withdrawalsTable)
              .set({ status: "failed", pawapayStatus: status, pawapayResponse: payload as any, updatedAt: new Date() })
              .where(eq(withdrawalsTable.id, withdrawal.id));
          }
        }
      }
    }

    // Mark webhook as processed
    await db
      .update(webhookLogsTable)
      .set({ processed: true })
      .where(eq(webhookLogsTable.eventType, eventType));
  } catch (err: any) {
    logger.error({ err }, "Webhook processing error");
  }

  res.status(200).json({ received: true });
});

export default router;
