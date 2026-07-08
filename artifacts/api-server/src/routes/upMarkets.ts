import { Router } from "express";
import { db, betsTable, betSelectionsTable, fixturesTable } from "@workspace/db";
import { eq, and, inArray, sql, count } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import {
  getUpMarketsConfig,
  saveUpMarketsConfig,
  DEFAULT_UP_MARKETS_CONFIG,
  type UpMarketsConfig,
} from "../lib/upMarkets";

const router = Router();

// ── GET /admin/up-markets ──────────────────────────────────────────────────────
router.get("/admin/up-markets", requireAdmin, async (_req, res): Promise<void> => {
  const config = await getUpMarketsConfig();
  res.json(config);
});

// ── PUT /admin/up-markets ──────────────────────────────────────────────────────
router.put("/admin/up-markets", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body as Partial<UpMarketsConfig>;

  if (body.enabled1UP !== undefined && typeof body.enabled1UP !== "boolean") {
    res.status(400).json({ error: "enabled1UP must be a boolean" });
    return;
  }
  if (body.enabled2UP !== undefined && typeof body.enabled2UP !== "boolean") {
    res.status(400).json({ error: "enabled2UP must be a boolean" });
    return;
  }
  if (body.percentage1UP !== undefined && (typeof body.percentage1UP !== "number" || body.percentage1UP <= 0 || body.percentage1UP > 100)) {
    res.status(400).json({ error: "percentage1UP must be between 1 and 100" });
    return;
  }
  if (body.percentage2UP !== undefined && (typeof body.percentage2UP !== "number" || body.percentage2UP <= 0 || body.percentage2UP > 100)) {
    res.status(400).json({ error: "percentage2UP must be between 1 and 100" });
    return;
  }

  const current = await getUpMarketsConfig();
  const updated: UpMarketsConfig = { ...current, ...body };
  await saveUpMarketsConfig(updated);
  res.json(updated);
});

// ── GET /admin/up-markets/stats ────────────────────────────────────────────────
router.get("/admin/up-markets/stats", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const statsResult = await db.execute(sql`
      SELECT
        bs.selection,
        COUNT(DISTINCT b.id)::int                                    AS bet_count,
        COALESCE(SUM(b.stake::numeric), 0)                          AS total_stake,
        COALESCE(SUM(CASE WHEN b.status = 'won' THEN b.potential_win::numeric ELSE 0 END), 0) AS total_payout,
        COALESCE(SUM(b.stake::numeric), 0)
          - COALESCE(SUM(CASE WHEN b.status = 'won' THEN b.potential_win::numeric ELSE 0 END), 0) AS profit_loss
      FROM bet_selections bs
      JOIN bets b ON b.id = bs.bet_id
      WHERE bs.selection IN ('Home 1UP', 'Home 2UP', 'Away 1UP', 'Away 2UP')
      GROUP BY bs.selection
      ORDER BY bs.selection
    `);

    const totalResult = await db.execute(sql`
      SELECT
        COUNT(DISTINCT b.id)::int                                    AS total_bets,
        COALESCE(SUM(b.stake::numeric), 0)                          AS total_stake,
        COALESCE(SUM(CASE WHEN b.status = 'won' THEN b.potential_win::numeric ELSE 0 END), 0) AS total_payout,
        COALESCE(SUM(b.stake::numeric), 0)
          - COALESCE(SUM(CASE WHEN b.status = 'won' THEN b.potential_win::numeric ELSE 0 END), 0) AS profit_loss,
        COUNT(DISTINCT CASE WHEN bs.selection IN ('Home 1UP', 'Away 1UP') THEN b.id END)::int AS bets_1up,
        COUNT(DISTINCT CASE WHEN bs.selection IN ('Home 2UP', 'Away 2UP') THEN b.id END)::int AS bets_2up
      FROM bet_selections bs
      JOIN bets b ON b.id = bs.bet_id
      WHERE bs.selection IN ('Home 1UP', 'Home 2UP', 'Away 1UP', 'Away 2UP')
    `);

    res.json({
      bySelection: statsResult.rows,
      totals: totalResult.rows[0] ?? {
        total_bets: 0, total_stake: "0", total_payout: "0", profit_loss: "0", bets_1up: 0, bets_2up: 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
