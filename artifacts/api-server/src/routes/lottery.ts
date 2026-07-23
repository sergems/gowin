import { Router } from "express";
import { db, lotteryGamesTable, lotteryDrawsTable, lotteryTicketsTable, walletsTable, transactionsTable } from "@workspace/db";
import { DEFAULT_PAYOUT_CONFIG } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";
import type { PayoutConfig } from "@workspace/db";

const router = Router();

/** Parse fractional UK odds "11/2" → total return multiplier 6.5 (stake × 6.5 = total payout incl. stake) */
function parseOdds(odds: string): number {
  const parts = odds.split("/");
  const num = parseFloat(parts[0] ?? "0");
  const den = parseFloat(parts[1] ?? "1");
  if (!isFinite(num) || !isFinite(den) || den === 0) return 1;
  return (num + den) / den;
}

function fmtGame(g: typeof lotteryGamesTable.$inferSelect) {
  return {
    ...g,
    ticketPrice: parseFloat(g.ticketPrice),
    jackpot: parseFloat(g.jackpot),
    payoutConfig: (g.payoutConfig as PayoutConfig | null) ?? DEFAULT_PAYOUT_CONFIG,
  };
}

// ── Public / User Routes ──────────────────────────────────────────────────────

// GET /lottery/games — list all active games
router.get("/lottery/games", async (_req, res): Promise<void> => {
  const games = await db
    .select()
    .from(lotteryGamesTable)
    .where(eq(lotteryGamesTable.isActive, true))
    .orderBy(lotteryGamesTable.name);

  res.json({ games: games.map(fmtGame) });
});

// GET /lottery/games/:slug — single game with recent draws
router.get("/lottery/games/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const [game] = await db
    .select()
    .from(lotteryGamesTable)
    .where(eq(lotteryGamesTable.slug, slug))
    .limit(1);

  if (!game) {
    res.status(404).json({ error: "Lottery game not found" });
    return;
  }

  const recentDraws = await db
    .select()
    .from(lotteryDrawsTable)
    .where(and(eq(lotteryDrawsTable.gameId, game.id), eq(lotteryDrawsTable.status, "settled")))
    .orderBy(desc(lotteryDrawsTable.drawDate))
    .limit(5);

  const [nextDraw] = await db
    .select()
    .from(lotteryDrawsTable)
    .where(and(eq(lotteryDrawsTable.gameId, game.id), eq(lotteryDrawsTable.status, "pending")))
    .orderBy(lotteryDrawsTable.drawDate)
    .limit(1);

  res.json({
    game: fmtGame(game),
    recentDraws: recentDraws.map((d) => ({ ...d, jackpot: parseFloat(d.jackpot) })),
    nextDraw: nextDraw ? { ...nextDraw, jackpot: parseFloat(nextDraw.jackpot) } : null,
  });
});

// POST /lottery/tickets — buy a ticket
// Body: { gameId, numbers: number[], bonusNumber?: number | null }
// numbers: 1 to game.mainNumbersCount picks (flexible — all must match to win)
// bonusNumber: optional single bonus ball (null/omitted = excluded from ticket)
router.post("/lottery/tickets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { gameId, numbers, bonusNumber = null } = req.body;

  if (!gameId || !Array.isArray(numbers)) {
    res.status(400).json({ error: "gameId and numbers are required" });
    return;
  }

  // Load game — price is always taken server-side; never trust the client
  const [game] = await db
    .select()
    .from(lotteryGamesTable)
    .where(and(eq(lotteryGamesTable.id, parseInt(String(gameId), 10)), eq(lotteryGamesTable.isActive, true)))
    .limit(1);

  if (!game) {
    res.status(404).json({ error: "Lottery game not found or inactive" });
    return;
  }

  // Flexible count: 1 to mainNumbersCount
  if (numbers.length < 1 || numbers.length > game.mainNumbersCount) {
    res.status(400).json({ error: `Pick between 1 and ${game.mainNumbersCount} numbers` });
    return;
  }

  const mainNums: number[] = numbers.map((n: unknown) => Number(n));

  // Validate range + uniqueness
  const allMainValid = mainNums.every((n) => Number.isInteger(n) && n >= 1 && n <= game.mainNumbersMax);
  if (!allMainValid) {
    res.status(400).json({ error: `Main numbers must be integers between 1 and ${game.mainNumbersMax}` });
    return;
  }
  if (new Set(mainNums).size !== mainNums.length) {
    res.status(400).json({ error: "Main numbers must be unique" });
    return;
  }

  // Validate bonus number (optional single value)
  let bonusNums: number[] = [];
  if (bonusNumber !== null && bonusNumber !== undefined) {
    if (game.bonusNumbersCount === 0) {
      res.status(400).json({ error: "This lottery has no bonus ball" });
      return;
    }
    const bn = Number(bonusNumber);
    if (!Number.isInteger(bn) || bn < 1 || bn > game.bonusNumbersMax) {
      res.status(400).json({ error: `Bonus number must be between 1 and ${game.bonusNumbersMax}` });
      return;
    }
    bonusNums = [bn];
  }

  // Require a pending draw
  const [nextDraw] = await db
    .select({ id: lotteryDrawsTable.id })
    .from(lotteryDrawsTable)
    .where(and(eq(lotteryDrawsTable.gameId, game.id), eq(lotteryDrawsTable.status, "pending")))
    .orderBy(lotteryDrawsTable.drawDate)
    .limit(1);

  if (!nextDraw) {
    res.status(400).json({ error: "No upcoming draw scheduled for this lottery. Check back later." });
    return;
  }

  // Deduct wallet — price is authoritative from server
  const ticketPrice = parseFloat(game.ticketPrice);
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, req.userId!))
    .limit(1);

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const balance = parseFloat(wallet.balance);
  if (balance < ticketPrice) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const newBalance = (balance - ticketPrice).toFixed(2);
  await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id));

  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: ticketPrice.toFixed(2),
    type: "debit",
    description: `Lottery ticket — ${game.name} (${mainNums.join(",")}${bonusNums.length ? `+B${bonusNums[0]}` : ""})`,
  });

  const [ticket] = await db
    .insert(lotteryTicketsTable)
    .values({
      userId: req.userId!,
      gameId: game.id,
      drawId: nextDraw.id,
      numbers: mainNums,
      bonusNumbers: bonusNums,
      stake: ticketPrice.toFixed(2),
      status: "pending",
    })
    .returning();

  res.status(201).json({
    ...ticket,
    stake: parseFloat(ticket.stake),
    prizeAmount: ticket.prizeAmount ? parseFloat(ticket.prizeAmount) : null,
    newBalance: parseFloat(newBalance),
  });
});

// GET /lottery/tickets/my — user's own tickets
router.get("/lottery/tickets/my", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "20", 10);
  const offset = (page - 1) * limit;

  const [totalResult] = await db
    .select({ count: count() })
    .from(lotteryTicketsTable)
    .where(eq(lotteryTicketsTable.userId, req.userId!));

  const tickets = await db
    .select({
      ticket: lotteryTicketsTable,
      game: lotteryGamesTable,
      draw: lotteryDrawsTable,
    })
    .from(lotteryTicketsTable)
    .leftJoin(lotteryGamesTable, eq(lotteryGamesTable.id, lotteryTicketsTable.gameId))
    .leftJoin(lotteryDrawsTable, eq(lotteryDrawsTable.id, lotteryTicketsTable.drawId))
    .where(eq(lotteryTicketsTable.userId, req.userId!))
    .orderBy(desc(lotteryTicketsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    tickets: tickets.map(({ ticket, game, draw }) => ({
      ...ticket,
      stake: parseFloat(ticket.stake),
      prizeAmount: ticket.prizeAmount ? parseFloat(ticket.prizeAmount) : null,
      game: game ? { ...game, ticketPrice: parseFloat(game.ticketPrice), jackpot: parseFloat(game.jackpot) } : null,
      draw: draw ? { ...draw, jackpot: parseFloat(draw.jackpot) } : null,
    })),
    total: totalResult.count,
    page,
    limit,
  });
});

// ── Admin Routes ──────────────────────────────────────────────────────────────

// GET /admin/lottery/games
router.get("/admin/lottery/games", requireAdmin, async (_req, res): Promise<void> => {
  const games = await db.select().from(lotteryGamesTable).orderBy(lotteryGamesTable.name);
  res.json(games.map(fmtGame));
});

// POST /admin/lottery/games
router.post("/admin/lottery/games", requireAdmin, async (req, res): Promise<void> => {
  const {
    name, slug, country, mainNumbersCount, mainNumbersMax,
    bonusNumbersCount = 0, bonusNumbersMax = 0,
    ticketPrice, nextDrawAt, color = "#4ade80", emoji = "🎰", description = "",
    payoutConfig,
  } = req.body;

  if (!name || !slug || !country || !mainNumbersCount || !mainNumbersMax || !ticketPrice) {
    res.status(400).json({ error: "name, slug, country, mainNumbersCount, mainNumbersMax, ticketPrice are required" });
    return;
  }

  const [existing] = await db.select({ id: lotteryGamesTable.id }).from(lotteryGamesTable).where(eq(lotteryGamesTable.slug, slug)).limit(1);
  if (existing) {
    res.status(409).json({ error: "A game with this slug already exists" });
    return;
  }

  const [game] = await db
    .insert(lotteryGamesTable)
    .values({
      name, slug, country,
      mainNumbersCount: parseInt(mainNumbersCount),
      mainNumbersMax: parseInt(mainNumbersMax),
      bonusNumbersCount: parseInt(bonusNumbersCount),
      bonusNumbersMax: parseInt(bonusNumbersMax),
      ticketPrice: parseFloat(ticketPrice).toFixed(2),
      jackpot: "0.00",
      nextDrawAt: nextDrawAt ? new Date(nextDrawAt) : null,
      color, emoji, description,
      payoutConfig: payoutConfig ?? DEFAULT_PAYOUT_CONFIG,
    })
    .returning();

  res.status(201).json(fmtGame(game));
});

// PATCH /admin/lottery/games/:id
router.patch("/admin/lottery/games/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const {
    name, country, ticketPrice, nextDrawAt,
    isActive, color, emoji, description,
    mainNumbersCount, mainNumbersMax, bonusNumbersCount, bonusNumbersMax,
    payoutConfig,
  } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (country !== undefined) updates.country = country;
  if (ticketPrice !== undefined) updates.ticketPrice = parseFloat(ticketPrice).toFixed(2);
  if (nextDrawAt !== undefined) updates.nextDrawAt = nextDrawAt ? new Date(nextDrawAt) : null;
  if (isActive !== undefined) updates.isActive = isActive;
  if (color !== undefined) updates.color = color;
  if (emoji !== undefined) updates.emoji = emoji;
  if (description !== undefined) updates.description = description;
  if (mainNumbersCount !== undefined) updates.mainNumbersCount = parseInt(mainNumbersCount);
  if (mainNumbersMax !== undefined) updates.mainNumbersMax = parseInt(mainNumbersMax);
  if (bonusNumbersCount !== undefined) updates.bonusNumbersCount = parseInt(bonusNumbersCount);
  if (bonusNumbersMax !== undefined) updates.bonusNumbersMax = parseInt(bonusNumbersMax);
  if (payoutConfig !== undefined) updates.payoutConfig = payoutConfig;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [game] = await db
    .update(lotteryGamesTable)
    .set(updates as any)
    .where(eq(lotteryGamesTable.id, id))
    .returning();

  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  res.json(fmtGame(game));
});

// DELETE /admin/lottery/games/:id
router.delete("/admin/lottery/games/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(lotteryGamesTable).where(eq(lotteryGamesTable.id, id));
  res.json({ success: true });
});

// GET /admin/lottery/draws
router.get("/admin/lottery/draws", requireAdmin, async (req, res): Promise<void> => {
  const gameId = req.query.gameId ? parseInt(req.query.gameId as string, 10) : undefined;
  const draws = await db
    .select({ draw: lotteryDrawsTable, game: lotteryGamesTable })
    .from(lotteryDrawsTable)
    .leftJoin(lotteryGamesTable, eq(lotteryGamesTable.id, lotteryDrawsTable.gameId))
    .where(gameId ? eq(lotteryDrawsTable.gameId, gameId) : undefined)
    .orderBy(desc(lotteryDrawsTable.drawDate))
    .limit(100);

  res.json(
    draws.map(({ draw, game }) => ({
      ...draw,
      jackpot: parseFloat(draw.jackpot),
      game: game ? { id: game.id, name: game.name, slug: game.slug } : null,
    }))
  );
});

// POST /admin/lottery/draws
router.post("/admin/lottery/draws", requireAdmin, async (req, res): Promise<void> => {
  const { gameId, drawDate } = req.body;
  if (!gameId || !drawDate) {
    res.status(400).json({ error: "gameId and drawDate are required" });
    return;
  }

  const [draw] = await db
    .insert(lotteryDrawsTable)
    .values({
      gameId: parseInt(gameId),
      drawDate: new Date(drawDate),
      jackpot: "0.00",
      winningNumbers: [],
      bonusNumbers: [],
      status: "pending",
    })
    .returning();

  res.status(201).json({ ...draw, jackpot: parseFloat(draw.jackpot) });
});

// POST /admin/lottery/draws/:id/settle — set winning numbers and pay out using payout config odds
router.post("/admin/lottery/draws/:id/settle", requireAdmin, async (req, res): Promise<void> => {
  const drawId = parseInt(req.params.id, 10);
  const { winningNumbers, bonusNumbers = [] } = req.body;

  if (!Array.isArray(winningNumbers) || winningNumbers.length === 0) {
    res.status(400).json({ error: "winningNumbers array is required" });
    return;
  }

  const [row] = await db
    .select({ draw: lotteryDrawsTable, game: lotteryGamesTable })
    .from(lotteryDrawsTable)
    .leftJoin(lotteryGamesTable, eq(lotteryGamesTable.id, lotteryDrawsTable.gameId))
    .where(eq(lotteryDrawsTable.id, drawId))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Draw not found" });
    return;
  }
  if (row.draw.status === "settled") {
    res.status(400).json({ error: "Draw already settled" });
    return;
  }

  const payoutConfig: PayoutConfig = (row.game?.payoutConfig as PayoutConfig | null) ?? DEFAULT_PAYOUT_CONFIG;

  // Mark draw as settled
  await db
    .update(lotteryDrawsTable)
    .set({ winningNumbers, bonusNumbers, status: "settled" })
    .where(eq(lotteryDrawsTable.id, drawId));

  // Settle all pending tickets for this draw
  const tickets = await db
    .select()
    .from(lotteryTicketsTable)
    .where(and(eq(lotteryTicketsTable.drawId, drawId), eq(lotteryTicketsTable.status, "pending")));

  const winSet = new Set<number>(winningNumbers.map(Number));
  const bonusWinSet = new Set<number>((bonusNumbers as number[]).map(Number));

  let settled = 0;
  let winners = 0;

  for (const ticket of tickets) {
    const userNumbers = (ticket.numbers as number[]);
    const userBonusNums = (ticket.bonusNumbers as number[]);
    const userIncludedBonus = userBonusNums.length > 0;
    const userBonusNum = userIncludedBonus ? userBonusNums[0]! : null;
    const stake = parseFloat(ticket.stake);

    // ALL selected main numbers must appear in winning set
    const allMainMatched = userNumbers.length > 0 && userNumbers.every((n) => winSet.has(n));
    const bonusMatched = userIncludedBonus && userBonusNum !== null && bonusWinSet.has(userBonusNum);
    const pickedCount = userNumbers.length;

    let oddsStr: string | undefined;

    if (allMainMatched && pickedCount > 0) {
      if (userIncludedBonus && bonusMatched) {
        // All main + bonus matched → highest tier
        oddsStr = payoutConfig.withBonus?.[String(pickedCount)];
      }
      if (!oddsStr && userIncludedBonus) {
        // All main matched, bonus included but didn't match (or no withBonus entry)
        oddsStr = payoutConfig.includedBonus?.[String(pickedCount)];
      }
      if (!oddsStr && !userIncludedBonus) {
        // All main matched, no bonus selected
        oddsStr = payoutConfig.excludedBonus?.[String(pickedCount)];
      }
    } else if (!allMainMatched && bonusMatched && pickedCount === 0) {
      // Bonus-only ticket
      oddsStr = payoutConfig.bonusOnly;
    }

    const prizeAmount = oddsStr ? stake * parseOdds(oddsStr) : 0;
    const isWinner = prizeAmount > 0;

    if (isWinner) {
      const [wallet] = await db
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, ticket.userId))
        .limit(1);

      if (wallet) {
        const newBal = (parseFloat(wallet.balance) + prizeAmount).toFixed(2);
        await db.update(walletsTable).set({ balance: newBal }).where(eq(walletsTable.id, wallet.id));
        await db.insert(transactionsTable).values({
          walletId: wallet.id,
          amount: prizeAmount.toFixed(2),
          type: "credit",
          description: `Lottery win — ${row.game?.name} @ ${oddsStr} (Draw #${drawId})`,
        });
      }

      await db
        .update(lotteryTicketsTable)
        .set({ status: "won", prizeAmount: prizeAmount.toFixed(2) })
        .where(eq(lotteryTicketsTable.id, ticket.id));

      winners++;
    } else {
      await db
        .update(lotteryTicketsTable)
        .set({ status: "lost" })
        .where(eq(lotteryTicketsTable.id, ticket.id));
    }
    settled++;
  }

  res.json({ settled, winners, winningNumbers, bonusNumbers });
});

// GET /admin/lottery/tickets
router.get("/admin/lottery/tickets", requireAdmin, async (req, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(lotteryTicketsTable)
    .where(status ? eq(lotteryTicketsTable.status, status) : undefined);

  const tickets = await db
    .select({ ticket: lotteryTicketsTable, game: lotteryGamesTable })
    .from(lotteryTicketsTable)
    .leftJoin(lotteryGamesTable, eq(lotteryGamesTable.id, lotteryTicketsTable.gameId))
    .where(status ? eq(lotteryTicketsTable.status, status) : undefined)
    .orderBy(desc(lotteryTicketsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    tickets: tickets.map(({ ticket, game }) => ({
      ...ticket,
      stake: parseFloat(ticket.stake),
      prizeAmount: ticket.prizeAmount ? parseFloat(ticket.prizeAmount) : null,
      game: game ? { id: game.id, name: game.name, slug: game.slug, emoji: game.emoji } : null,
    })),
    total: totalResult.count,
    page,
    limit,
  });
});

export default router;
