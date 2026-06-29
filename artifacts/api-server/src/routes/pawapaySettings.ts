import { Router } from "express";
import crypto from "crypto";
import { requireAdmin } from "../middlewares/auth";
import { getMetaSetting, setMetaSetting } from "../lib/metaDb";
import { getPawapayConfig, initiateDeposit, DRC_TEST_NUMBERS } from "../lib/pawapay";

const router = Router();

// ── GET /admin/pawapay/settings ──────────────────────────────────────────────
router.get("/admin/pawapay/settings", requireAdmin, async (_req, res): Promise<void> => {
  const [token, enabled, sandbox, depositsEnabled, withdrawalsEnabled, minDep, maxDep, minWith, maxWith, appUrl] = await Promise.all([
    getMetaSetting("pawapay_api_token"),
    getMetaSetting("pawapay_enabled"),
    getMetaSetting("pawapay_sandbox"),
    getMetaSetting("pawapay_deposits_enabled"),
    getMetaSetting("pawapay_withdrawals_enabled"),
    getMetaSetting("pawapay_min_deposit"),
    getMetaSetting("pawapay_max_deposit"),
    getMetaSetting("pawapay_min_withdrawal"),
    getMetaSetting("pawapay_max_withdrawal"),
    getMetaSetting("app_url"),
  ]);

  res.json({
    hasToken: !!token,
    enabled: enabled !== "false",
    isSandbox: sandbox !== "false",
    depositsEnabled: depositsEnabled !== "false",
    withdrawalsEnabled: withdrawalsEnabled !== "false",
    minDeposit: minDep ?? "1",
    maxDeposit: maxDep ?? "10000",
    minWithdrawal: minWith ?? "1",
    maxWithdrawal: maxWith ?? "10000",
    appUrl: appUrl ?? "",
  });
});

// ── PUT /admin/pawapay/settings ──────────────────────────────────────────────
router.put("/admin/pawapay/settings", requireAdmin, async (req, res): Promise<void> => {
  const {
    apiToken,
    enabled,
    isSandbox,
    depositsEnabled,
    withdrawalsEnabled,
    minDeposit,
    maxDeposit,
    minWithdrawal,
    maxWithdrawal,
  } = req.body;

  const updates: Promise<void>[] = [];

  if (typeof apiToken === "string" && apiToken.trim()) {
    updates.push(setMetaSetting("pawapay_api_token", apiToken.trim()));
  }
  if (typeof enabled === "boolean") {
    updates.push(setMetaSetting("pawapay_enabled", String(enabled)));
  }
  if (typeof isSandbox === "boolean") {
    updates.push(setMetaSetting("pawapay_sandbox", String(isSandbox)));
  }
  if (typeof depositsEnabled === "boolean") {
    updates.push(setMetaSetting("pawapay_deposits_enabled", String(depositsEnabled)));
  }
  if (typeof withdrawalsEnabled === "boolean") {
    updates.push(setMetaSetting("pawapay_withdrawals_enabled", String(withdrawalsEnabled)));
  }
  if (minDeposit !== undefined) {
    updates.push(setMetaSetting("pawapay_min_deposit", String(minDeposit)));
  }
  if (maxDeposit !== undefined) {
    updates.push(setMetaSetting("pawapay_max_deposit", String(maxDeposit)));
  }
  if (minWithdrawal !== undefined) {
    updates.push(setMetaSetting("pawapay_min_withdrawal", String(minWithdrawal)));
  }
  if (maxWithdrawal !== undefined) {
    updates.push(setMetaSetting("pawapay_max_withdrawal", String(maxWithdrawal)));
  }

  await Promise.all(updates);
  res.json({ ok: true });
});

// ── POST /admin/pawapay/test — fire a sandbox test deposit ───────────────────
router.post("/admin/pawapay/test", requireAdmin, async (req, res): Promise<void> => {
  const { phone, operator, amount, currency } = req.body;

  if (!phone || !operator) {
    res.status(400).json({ error: "phone and operator are required" });
    return;
  }

  const config = await getPawapayConfig();
  if (!config) {
    res.status(503).json({ error: "PawaPay is not configured — add an API token first" });
    return;
  }

  if (!config.isSandbox) {
    res.status(400).json({ error: "Test deposits can only be fired in sandbox mode" });
    return;
  }

  const depositId = crypto.randomUUID();
  const testAmount = parseFloat(amount ?? "5");
  const testCurrency = currency ?? "USD";

  try {
    const result = await initiateDeposit(
      config,
      depositId,
      testAmount,
      testCurrency,
      phone,
      operator,
      "GoWin Sandbox Test"
    );

    res.json({
      depositId,
      phone,
      operator,
      amount: testAmount,
      currency: testCurrency,
      httpStatus: result.status,
      ok: result.ok,
      pawapayStatus: result.data?.status ?? null,
      response: result.data,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// ── GET /admin/pawapay/test/:depositId — poll final status ───────────────────
router.get("/admin/pawapay/test/:depositId", requireAdmin, async (req, res): Promise<void> => {
  const { depositId } = req.params;
  const config = await getPawapayConfig();
  if (!config) {
    res.status(503).json({ error: "PawaPay not configured" });
    return;
  }
  try {
    const { getDepositStatus } = await import("../lib/pawapay.js");
    const result = await getDepositStatus(config, depositId);
    res.json({ httpStatus: result.status, ok: result.ok, response: result.data });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// ── GET /admin/pawapay/test-numbers — return sandbox test MSISDNs ────────────
router.get("/admin/pawapay/test-numbers", requireAdmin, (_req, res): void => {
  res.json(DRC_TEST_NUMBERS);
});

export default router;
