/**
 * Admin routes for the Lottery Scraper Engine.
 *
 *  GET  /admin/lottery/scrapers            — list all games with scraper config + last log
 *  POST /admin/lottery/scrapers/run-all    — trigger all scrapers immediately
 *  POST /admin/lottery/scrapers/:gameId/run — trigger a single scraper
 *  GET  /admin/lottery/scraper-logs        — paginated scraper execution logs
 *  GET  /admin/lottery/settlement-logs     — paginated settlement logs
 */
import { Router } from "express";
import {
  db,
  lotteryGamesTable,
  scraperLogsTable,
  settlementLogsTable,
  lotteryDrawsTable,
} from "@workspace/db";
import { eq, desc, count, isNotNull, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { runAllScrapers, runScraper } from "../lib/scrapers/ScraperManager";
import { listRegisteredScrapers } from "../lib/scrapers/ScraperRegistry";

const router = Router();

// ── GET /admin/lottery/scrapers ───────────────────────────────────────────────

router.get("/admin/lottery/scrapers", requireAdmin, async (_req, res): Promise<void> => {
  // All games (active or not) that have a scraper_class configured
  const games = await db
    .select()
    .from(lotteryGamesTable)
    .orderBy(lotteryGamesTable.name);

  // Last scraper log per game
  const lastLogs = await db
    .select()
    .from(scraperLogsTable)
    .orderBy(desc(scraperLogsTable.createdAt))
    .limit(200);

  const lastLogByGame: Record<number, typeof lastLogs[0]> = {};
  for (const log of lastLogs) {
    if (log.gameId !== null && !lastLogByGame[log.gameId]) {
      lastLogByGame[log.gameId] = log;
    }
  }

  res.json({
    games: games.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      emoji: g.emoji,
      isActive: g.isActive,
      website: g.website ?? null,
      scraperClass: g.scraperClass ?? null,
      drawDays: (g.drawDays as number[] | null) ?? [],
      drawTime: g.drawTime ?? null,
      timezone: g.timezone ?? "UTC",
      lastLog: lastLogByGame[g.id] ?? null,
    })),
    registeredScrapers: listRegisteredScrapers(),
  });
});

// ── POST /admin/lottery/scrapers/run-all ──────────────────────────────────────

router.post("/admin/lottery/scrapers/run-all", requireAdmin, async (_req, res): Promise<void> => {
  // Fire-and-forget; respond immediately with accepted status
  runAllScrapers().catch(() => {});
  res.json({ message: "Scraper run triggered for all active games" });
});

// ── POST /admin/lottery/scrapers/:gameId/run ──────────────────────────────────

router.post("/admin/lottery/scrapers/:gameId/run", requireAdmin, async (req, res): Promise<void> => {
  const gameId = parseInt(req.params.gameId, 10);
  if (isNaN(gameId)) {
    res.status(400).json({ error: "Invalid gameId" });
    return;
  }

  const result = await runScraper(gameId);
  res.json(result);
});

// ── PATCH /admin/lottery/scrapers/:gameId — update scraper config ─────────────

router.patch("/admin/lottery/scrapers/:gameId", requireAdmin, async (req, res): Promise<void> => {
  const gameId = parseInt(req.params.gameId, 10);
  if (isNaN(gameId)) {
    res.status(400).json({ error: "Invalid gameId" });
    return;
  }

  const { website, scraperClass, drawDays, drawTime, timezone } = req.body;
  const updates: Record<string, unknown> = {};
  if (website !== undefined) updates.website = website || null;
  if (scraperClass !== undefined) updates.scraperClass = scraperClass || null;
  if (drawDays !== undefined) updates.drawDays = Array.isArray(drawDays) ? drawDays : [];
  if (drawTime !== undefined) updates.drawTime = drawTime || null;
  if (timezone !== undefined) updates.timezone = timezone || "UTC";

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [game] = await db
    .update(lotteryGamesTable)
    .set(updates as any)
    .where(eq(lotteryGamesTable.id, gameId))
    .returning();

  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  res.json({
    id: game.id,
    website: game.website,
    scraperClass: game.scraperClass,
    drawDays: game.drawDays,
    drawTime: game.drawTime,
    timezone: game.timezone,
  });
});

// ── GET /admin/lottery/scraper-logs ──────────────────────────────────────────

router.get("/admin/lottery/scraper-logs", requireAdmin, async (req, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status as string | undefined;
  const gameIdFilter = req.query.gameId ? parseInt(req.query.gameId as string, 10) : undefined;

  const where =
    statusFilter && gameIdFilter
      ? and(eq(scraperLogsTable.status, statusFilter), eq(scraperLogsTable.gameId, gameIdFilter))
      : statusFilter
      ? eq(scraperLogsTable.status, statusFilter)
      : gameIdFilter
      ? eq(scraperLogsTable.gameId, gameIdFilter)
      : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(scraperLogsTable)
    .where(where);

  const logs = await db
    .select({
      log: scraperLogsTable,
      game: {
        id: lotteryGamesTable.id,
        name: lotteryGamesTable.name,
        emoji: lotteryGamesTable.emoji,
      },
    })
    .from(scraperLogsTable)
    .leftJoin(lotteryGamesTable, eq(lotteryGamesTable.id, scraperLogsTable.gameId))
    .where(where)
    .orderBy(desc(scraperLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    logs: logs.map(({ log, game }) => ({ ...log, game })),
    total: totalResult.count,
    page,
    limit,
  });
});

// ── GET /admin/lottery/settlement-logs ───────────────────────────────────────

router.get("/admin/lottery/settlement-logs", requireAdmin, async (req, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const offset = (page - 1) * limit;

  const [totalResult] = await db.select({ count: count() }).from(settlementLogsTable);

  const logs = await db
    .select({
      log: settlementLogsTable,
      game: {
        id: lotteryGamesTable.id,
        name: lotteryGamesTable.name,
        emoji: lotteryGamesTable.emoji,
      },
      draw: {
        id: lotteryDrawsTable.id,
        drawDate: lotteryDrawsTable.drawDate,
        winningNumbers: lotteryDrawsTable.winningNumbers,
        bonusNumbers: lotteryDrawsTable.bonusNumbers,
      },
    })
    .from(settlementLogsTable)
    .leftJoin(lotteryGamesTable, eq(lotteryGamesTable.id, settlementLogsTable.gameId))
    .leftJoin(lotteryDrawsTable, eq(lotteryDrawsTable.id, settlementLogsTable.drawId))
    .orderBy(desc(settlementLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    logs: logs.map(({ log, game, draw }) => ({
      ...log,
      totalPaid: parseFloat(log.totalPaid),
      game,
      draw,
    })),
    total: totalResult.count,
    page,
    limit,
  });
});

export default router;
