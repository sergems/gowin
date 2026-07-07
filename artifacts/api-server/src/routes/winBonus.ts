import { Router } from "express";
import { db, settingsTable, oddsTable, marketsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";
import {
  getWinBonusConfig,
  saveWinBonusConfig,
  calculateWinBonus,
  DEFAULT_WIN_BONUS_CONFIG,
  type WinBonusConfig,
} from "../lib/winBonus";

const router = Router();

// ── GET /win-bonus — public, returns current config (no secrets) ───────────────
router.get("/win-bonus", async (_req, res): Promise<void> => {
  const config = await getWinBonusConfig();
  res.json(config);
});

// ── GET /admin/win-bonus — admin, same but explicit ────────────────────────────
router.get("/admin/win-bonus", requireAdmin, async (_req, res): Promise<void> => {
  const config = await getWinBonusConfig();
  res.json(config);
});

// ── PUT /admin/win-bonus — save config ─────────────────────────────────────────
router.put("/admin/win-bonus", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body as Partial<WinBonusConfig>;

  // Basic validation
  if (typeof body.enabled !== "undefined" && typeof body.enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be a boolean" });
    return;
  }
  if (body.minQualifyingSelections !== undefined && (typeof body.minQualifyingSelections !== "number" || body.minQualifyingSelections < 1)) {
    res.status(400).json({ error: "minQualifyingSelections must be a positive integer" });
    return;
  }
  if (body.maxSelections !== undefined && (typeof body.maxSelections !== "number" || body.maxSelections < 1 || body.maxSelections > 200)) {
    res.status(400).json({ error: "maxSelections must be between 1 and 200" });
    return;
  }
  if (body.minQualifyingOdds !== undefined && (typeof body.minQualifyingOdds !== "number" || body.minQualifyingOdds < 1)) {
    res.status(400).json({ error: "minQualifyingOdds must be >= 1.0" });
    return;
  }
  if (body.maxPayout !== undefined && (typeof body.maxPayout !== "number" || body.maxPayout < 1)) {
    res.status(400).json({ error: "maxPayout must be a positive number" });
    return;
  }
  if (body.bonusTable !== undefined) {
    if (!Array.isArray(body.bonusTable)) {
      res.status(400).json({ error: "bonusTable must be an array" });
      return;
    }
    for (const tier of body.bonusTable) {
      if (typeof tier.selections !== "number" || typeof tier.bonusPercent !== "number" || tier.selections < 1 || tier.bonusPercent < 0) {
        res.status(400).json({ error: "Each bonusTable entry must have positive selections and non-negative bonusPercent" });
        return;
      }
    }
  }

  const current = await getWinBonusConfig();
  const updated: WinBonusConfig = {
    ...current,
    ...body,
    // Always ensure bonusTable is sorted by selections ascending
    bonusTable: (body.bonusTable ?? current.bonusTable).sort((a, b) => a.selections - b.selections),
  };

  await saveWinBonusConfig(updated);
  res.json(updated);
});

// ── POST /bets/calculate — real-time betslip calculation (auth not required) ──
router.post("/bets/calculate", async (req, res): Promise<void> => {
  const { stake, selections } = req.body as { stake: number; selections: Array<{ oddsId: number; odds?: number }> };

  if (!Array.isArray(selections) || selections.length === 0) {
    res.status(400).json({ error: "selections must be a non-empty array" });
    return;
  }
  if (typeof stake !== "number" || stake <= 0) {
    res.status(400).json({ error: "stake must be a positive number" });
    return;
  }

  // Fetch server-side odds values — never trust client-supplied odds for calculation
  const oddsIds = [...new Set(selections.map((s) => s.oddsId))];
  const dbOddsRows =
    oddsIds.length > 0
      ? await db
          .select({ id: oddsTable.id, oddsValue: oddsTable.oddsValue, suspended: marketsTable.suspended })
          .from(oddsTable)
          .innerJoin(marketsTable, eq(marketsTable.id, oddsTable.marketId))
          .where(inArray(oddsTable.id, oddsIds))
      : [];

  const oddsMap = new Map(dbOddsRows.map((o) => [o.id, parseFloat(o.oddsValue)]));

  // Use server odds; fall back to client-provided odds if oddsId not found (graceful for preview)
  const oddsValues = selections.map((s) => oddsMap.get(s.oddsId) ?? (typeof s.odds === "number" ? s.odds : 1));

  const config = await getWinBonusConfig();
  const result = calculateWinBonus(oddsValues, stake, config);

  res.json(result);
});

export default router;
