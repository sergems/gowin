import { Router } from "express";
import { db, lotteryGamesTable, lotteryDrawsTable, lotteryTicketsTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";

const router = Router();

// ── Public / User Routes ──────────────────────────────────────────────────────

// GET /lottery/games — list all active games
router.get("/lottery/games", async (_req, res): Promise<void> => {
  const games = await db
    .select()
    .from(lotteryGamesTable)
    .where(eq(lotteryGamesTable.isActive, true))
    .orderBy(lotteryGamesTable.name);

  res.json(
    games.map((g) => ({
      ...g,
      ticketPrice: parseFloat(g.ticketPrice),
      jackpot: parseFloat(g.jackpot),
    }))
  );
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

  // Next pending draw
  const [nextDraw] = await db
    .select()
    .from(lotteryDrawsTable)
    .where(and(eq(lotteryDrawsTable.gameId, game.id), eq(lotteryDrawsTable.status, "pending")))
    .orderBy(lotteryDrawsTable.drawDate)
    .limit(1);

  res.json({
    ...game,
    ticketPrice: parseFloat(game.ticketPrice),
    jackpot: parseFloat(game.jackpot),
    recentDraws: recentDraws.map((d) => ({ ...d, jackpot: parseFloat(d.jackpot) })),
    nextDraw: nextDraw ? { ...nextDraw, jackpot: parseFloat(nextDraw.jackpot) } : null,
  });
});

// POST /lottery/tickets — buy a ticket
router.post("/lottery/tickets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { gameId, numbers, bonusNumbers = [] } = req.body;

  if (!gameId || !Array.isArray(numbers) || numbers.length === 0) {
    res.status(400).json({ error: "gameId and numbers are required" });
    return;
  }

  if (!Array.isArray(bonusNumbers)) {
    res.status(400).json({ error: "bonusNumbers must be an array" });
    return;
  }

  // Load game — price is always taken server-side; never trust the client stake
  const [game] = await db
    .select()
    .from(lotteryGamesTable)
    .where(and(eq(lotteryGamesTable.id, parseInt(String(gameId), 10)), eq(lotteryGamesTable.isActive, true)))
    .limit(1);

  if (!game) {
    res.status(404).json({ error: "Lottery game not found or inactive" });
    return;
  }

  // Server-side authoritative ticket price — client cannot override this
  const ticketPrice = parseFloat(game.ticketPrice);

  // Validate number counts
  if (numbers.length !== game.mainNumbersCount) {
    res.status(400).json({ error: `Must select exactly ${game.mainNumbersCount} main numbers` });
    return;
  }
  if (bonusNumbers.length !== game.bonusNumbersCount) {
    res.status(400).json({ error: `Must select exactly ${game.bonusNumbersCount} bonus numbers` });
    return;
  }

  // Validate each number is a valid integer within range
  const mainNums: number[] = numbers.map((n: unknown) => Number(n));
  const bonusNums: number[] = bonusNumbers.map((n: unknown) => Number(n));

  const allMainValid = mainNums.every((n) => Number.isInteger(n) && n >= 1 && n <= game.mainNumbersMax);
  const allBonusValid = bonusNums.every((n) => Number.isInteger(n) && n >= 1 && n <= game.bonusNumbersMax);
  if (!allMainValid || !allBonusValid) {
    res.status(400).json({ error: "One or more numbers are out of the allowed range" });
    return;
  }

  // Enforce uniqueness — no duplicates within main or bonus sets
  if (new Set(mainNums).size !== mainNums.length) {
    res.status(400).json({ error: "Main numbers must be unique" });
    return;
  }
  if (bonusNums.length > 0 && new Set(bonusNums).size !== bonusNums.length) {
    res.status(400).json({ error: "Bonus numbers must be unique" });
    return;
  }

  // Require a pending draw — tickets without a draw can never be settled
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

  // Deduct wallet using the authoritative server-side price
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
    description: `Lottery ticket — ${game.name}`,
  });

  // Create ticket bound to the pending draw
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
  res.json(
    games.map((g) => ({
      ...g,
      ticketPrice: parseFloat(g.ticketPrice),
      jackpot: parseFloat(g.jackpot),
    }))
  );
});

// POST /admin/lottery/games
router.post("/admin/lottery/games", requireAdmin, async (req, res): Promise<void> => {
  const {
    name, slug, country, mainNumbersCount, mainNumbersMax,
    bonusNumbersCount = 0, bonusNumbersMax = 0,
    ticketPrice, jackpot = "0", nextDrawAt, color = "#4ade80", emoji = "🎰", description = "",
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
      jackpot: parseFloat(jackpot).toFixed(2),
      nextDrawAt: nextDrawAt ? new Date(nextDrawAt) : null,
      color, emoji, description,
    })
    .returning();

  res.status(201).json({ ...game, ticketPrice: parseFloat(game.ticketPrice), jackpot: parseFloat(game.jackpot) });
});

// PATCH /admin/lottery/games/:id
router.patch("/admin/lottery/games/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const {
    name, country, ticketPrice, jackpot, nextDrawAt,
    isActive, color, emoji, description,
    mainNumbersCount, mainNumbersMax, bonusNumbersCount, bonusNumbersMax,
  } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (country !== undefined) updates.country = country;
  if (ticketPrice !== undefined) updates.ticketPrice = parseFloat(ticketPrice).toFixed(2);
  if (jackpot !== undefined) updates.jackpot = parseFloat(jackpot).toFixed(2);
  if (nextDrawAt !== undefined) updates.nextDrawAt = nextDrawAt ? new Date(nextDrawAt) : null;
  if (isActive !== undefined) updates.isActive = isActive;
  if (color !== undefined) updates.color = color;
  if (emoji !== undefined) updates.emoji = emoji;
  if (description !== undefined) updates.description = description;
  if (mainNumbersCount !== undefined) updates.mainNumbersCount = parseInt(mainNumbersCount);
  if (mainNumbersMax !== undefined) updates.mainNumbersMax = parseInt(mainNumbersMax);
  if (bonusNumbersCount !== undefined) updates.bonusNumbersCount = parseInt(bonusNumbersCount);
  if (bonusNumbersMax !== undefined) updates.bonusNumbersMax = parseInt(bonusNumbersMax);

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

  res.json({ ...game, ticketPrice: parseFloat(game.ticketPrice), jackpot: parseFloat(game.jackpot) });
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
  const { gameId, drawDate, jackpot } = req.body;
  if (!gameId || !drawDate || !jackpot) {
    res.status(400).json({ error: "gameId, drawDate, jackpot required" });
    return;
  }

  const [draw] = await db
    .insert(lotteryDrawsTable)
    .values({
      gameId: parseInt(gameId),
      drawDate: new Date(drawDate),
      jackpot: parseFloat(jackpot).toFixed(2),
      winningNumbers: [],
      bonusNumbers: [],
      status: "pending",
    })
    .returning();

  res.status(201).json({ ...draw, jackpot: parseFloat(draw.jackpot) });
});

// POST /admin/lottery/draws/:id/settle — set winning numbers and settle tickets
router.post("/admin/lottery/draws/:id/settle", requireAdmin, async (req, res): Promise<void> => {
  const drawId = parseInt(req.params.id, 10);
  const { winningNumbers, bonusNumbers = [] } = req.body;

  if (!Array.isArray(winningNumbers) || winningNumbers.length === 0) {
    res.status(400).json({ error: "winningNumbers array is required" });
    return;
  }

  const [draw] = await db
    .select({ draw: lotteryDrawsTable, game: lotteryGamesTable })
    .from(lotteryDrawsTable)
    .leftJoin(lotteryGamesTable, eq(lotteryGamesTable.id, lotteryDrawsTable.gameId))
    .where(eq(lotteryDrawsTable.id, drawId))
    .limit(1);

  if (!draw) {
    res.status(404).json({ error: "Draw not found" });
    return;
  }
  if (draw.draw.status === "settled") {
    res.status(400).json({ error: "Draw already settled" });
    return;
  }

  // Update draw with winning numbers
  await db
    .update(lotteryDrawsTable)
    .set({ winningNumbers, bonusNumbers, status: "settled" })
    .where(eq(lotteryDrawsTable.id, drawId));

  // Settle tickets for this draw
  const tickets = await db
    .select()
    .from(lotteryTicketsTable)
    .where(and(eq(lotteryTicketsTable.drawId, drawId), eq(lotteryTicketsTable.status, "pending")));

  let settled = 0;
  for (const ticket of tickets) {
    const winSet = new Set(winningNumbers);
    const bonusWinSet = new Set(bonusNumbers);
    const matchedMain = (ticket.numbers as number[]).filter((n) => winSet.has(n)).length;
    const matchedBonus = (ticket.bonusNumbers as number[]).filter((n) => bonusWinSet.has(n)).length;
    const totalMatched = matchedMain + matchedBonus;
    const requiredMain = draw.game?.mainNumbersCount ?? winningNumbers.length;

    const isWinner = totalMatched === (requiredMain + (draw.game?.bonusNumbersCount ?? bonusNumbers.length));

    if (isWinner) {
      const prizeAmount = parseFloat(draw.draw.jackpot);

      // Credit wallet
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
          description: `Lottery win — ${draw.game?.name} (Draw #${drawId})`,
        });
      }

      await db
        .update(lotteryTicketsTable)
        .set({ status: "won", prizeAmount: prizeAmount.toFixed(2) })
        .where(eq(lotteryTicketsTable.id, ticket.id));
    } else {
      await db
        .update(lotteryTicketsTable)
        .set({ status: "lost" })
        .where(eq(lotteryTicketsTable.id, ticket.id));
    }
    settled++;
  }

  res.json({ settled, winningNumbers, bonusNumbers });
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
