import { Router } from "express";
import { requireAdmin } from "../middlewares/auth";
import { getMetaSetting, setMetaSetting } from "../lib/metaDb";
import { getPawapayConfig } from "../lib/pawapay";

const router = Router();

// ── GET /admin/pawapay/settings ──────────────────────────────────────────────
router.get("/admin/pawapay/settings", requireAdmin, async (_req, res): Promise<void> => {
  const [token, sandbox, depositsEnabled, withdrawalsEnabled, minDep, maxDep, minWith, maxWith] = await Promise.all([
    getMetaSetting("pawapay_api_token"),
    getMetaSetting("pawapay_sandbox"),
    getMetaSetting("pawapay_deposits_enabled"),
    getMetaSetting("pawapay_withdrawals_enabled"),
    getMetaSetting("pawapay_min_deposit"),
    getMetaSetting("pawapay_max_deposit"),
    getMetaSetting("pawapay_min_withdrawal"),
    getMetaSetting("pawapay_max_withdrawal"),
  ]);

  res.json({
    hasToken: !!token,
    isSandbox: sandbox !== "false",
    depositsEnabled: depositsEnabled !== "false",
    withdrawalsEnabled: withdrawalsEnabled !== "false",
    minDeposit: minDep ?? "1",
    maxDeposit: maxDep ?? "10000",
    minWithdrawal: minWith ?? "1",
    maxWithdrawal: maxWith ?? "10000",
  });
});

// ── PUT /admin/pawapay/settings ──────────────────────────────────────────────
router.put("/admin/pawapay/settings", requireAdmin, async (req, res): Promise<void> => {
  const {
    apiToken,
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

export default router;
