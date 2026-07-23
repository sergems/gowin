import { Router } from "express";
import { db, lotteryGamesTable, lotteryDrawsTable, lotteryTicketsTable, walletsTable, transactionsTable } from "@workspace/db";
import { DEFAULT_PAYOUT_CONFIG, DEFAULT_ENABLED_PLAY_TYPES } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";
import type { PayoutConfig } from "@workspace/db";
import { settleLotteryDraw } from "../lib/lotterySettle";

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
    minStake: parseFloat(g.minStake),
    maxStake: parseFloat(g.maxStake),
    maxPayout: parseFloat(g.maxPayout),
    payoutConfig: (g.payoutConfig as PayoutConfig | null) ?? DEFAULT_PAYOUT_CONFIG,
    enabledPlayTypes: (g.enabledPlayTypes as string[] | null) ?? DEFAULT_ENABLED_PLAY_TYPES,
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

// POST /lottery/tickets — buy a ticket (flexible betting)
// Body: { gameId, playType, bonusMode?, numbers, bonusNumber?, stake }
// playType: '1'|'2'|'3'|'4'|'5'|'6'|'bonus_only'
// bonusMode: 'include'|'exclude' (required unless playType === 'bonus_only')
// numbers: exactly N main numbers matching playType (0 for bonus_only)
// bonusNumber: required when bonusMode === 'include' OR playType === 'bonus_only'
// stake: bet amount (validated against game min/max)
router.post("/lottery/tickets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { gameId, playType, bonusMode, numbers, bonusNumber = null, stake } = req.body;

  if (!gameId || !playType) {
    res.status(400).json({ error: "gameId and playType are required" });
    return;
  }

  const VALID_PLAY_TYPES = ["1", "2", "3", "4", "5", "6", "bonus_only"];
  if (!VALID_PLAY_TYPES.includes(String(playType))) {
    res.status(400).json({ error: "Invalid playType" });
    return;
  }

  const isBonusOnly = playType === "bonus_only";
  const validBonusModes = ["exclude", "bonus", "with_bonus", "include"]; // "include" kept for back-compat
  if (!isBonusOnly && !validBonusModes.includes(String(bonusMode))) {
    res.status(400).json({ error: "bonusMode must be 'exclude', 'bonus', or 'with_bonus'" });
    return;
  }

  // Load game
  const [game] = await db
    .select()
    .from(lotteryGamesTable)
    .where(and(eq(lotteryGamesTable.id, parseInt(String(gameId), 10)), eq(lotteryGamesTable.isActive, true)))
    .limit(1);

  if (!game) {
    res.status(404).json({ error: "Lottery game not found or inactive" });
    return;
  }

  // Check play type is enabled for this game
  const enabledTypes = (game.enabledPlayTypes as string[] | null) ?? DEFAULT_ENABLED_PLAY_TYPES;
  if (!enabledTypes.includes(String(playType))) {
    res.status(400).json({ error: "This play type is not available for this game" });
    return;
  }

  // Validate stake
  const stakeAmount = parseFloat(String(stake));
  if (!isFinite(stakeAmount) || stakeAmount <= 0) {
    res.status(400).json({ error: "Invalid stake amount" });
    return;
  }
  const minStake = parseFloat(game.minStake);
  const maxStake = parseFloat(game.maxStake);
  const maxPayout = parseFloat(game.maxPayout);
  if (stakeAmount < minStake) {
    res.status(400).json({ error: `Minimum stake is ${minStake.toFixed(2)}` });
    return;
  }
  if (stakeAmount > maxStake) {
    res.status(400).json({ error: `Maximum stake is ${maxStake.toFixed(2)}` });
    return;
  }

  // Validate numbers
  const requiredCount = isBonusOnly ? 0 : parseInt(String(playType));
  const mainNums: number[] = Array.isArray(numbers) ? numbers.map(Number) : [];

  if (mainNums.length !== requiredCount) {
    res.status(400).json({ error: `Pick exactly ${requiredCount} number${requiredCount !== 1 ? "s" : ""}` });
    return;
  }

  if (mainNums.length > 0) {
    const allValid = mainNums.every((n) => Number.isInteger(n) && n >= 1 && n <= game.mainNumbersMax);
    if (!allValid) {
      res.status(400).json({ error: `Numbers must be integers between 1 and ${game.mainNumbersMax}` });
      return;
    }
    if (new Set(mainNums).size !== mainNums.length) {
      res.status(400).json({ error: "Numbers must be unique" });
      return;
    }
  }

  // bonus_only and with_bonus both require an explicit bonus ball pick
  const needsBonus = isBonusOnly || bonusMode === "with_bonus";
  let bonusNums: number[] = [];
  if (needsBonus) {
    if (bonusNumber === null || bonusNumber === undefined) {
      res.status(400).json({ error: "Select your bonus ball number" });
      return;
    }
    if (game.bonusNumbersCount === 0) {
      res.status(400).json({ error: "This game has no bonus ball" });
      return;
    }
    const bn = Number(bonusNumber);
    if (!Number.isInteger(bn) || bn < 1 || bn > game.bonusNumbersMax) {
      res.status(400).json({ error: `Bonus number must be between 1 and ${game.bonusNumbersMax}` });
      return;
    }
    bonusNums = [bn];
  }

  // Look up odds from payout config
  const payoutConfig = (game.payoutConfig as PayoutConfig | null) ?? DEFAULT_PAYOUT_CONFIG;
  const effectiveBonusMode = isBonusOnly ? "bonus_only" : (bonusMode as string);

  let oddsStr: string | undefined;
  if (isBonusOnly) {
    oddsStr = payoutConfig.bonusOnly ?? undefined;
  } else if (bonusMode === "bonus") {
    // Bonus ball counts as part of drawn set — uses includedBonus odds
    oddsStr = payoutConfig.includedBonus?.[String(playType)] ?? undefined;
  } else if (bonusMode === "with_bonus" || bonusMode === "include") {
    // All main must match AND drawn bonus must coincide with selections — uses withBonus odds
    oddsStr = payoutConfig.withBonus?.[String(playType)] ?? undefined;
  } else {
    // exclude: bonus completely ignored
    oddsStr = payoutConfig.excludedBonus?.[String(playType)] ?? undefined;
  }

  if (!oddsStr) {
    res.status(400).json({ error: "No payout configured for this play type. Contact support." });
    return;
  }

  // Calculate potential win
  let potentialWin: number;
  if (oddsStr.toLowerCase() === "jackpot") {
    potentialWin = parseFloat(game.jackpot);
  } else {
    const parts = oddsStr.split("/");
    const num = parseFloat(parts[0] ?? "0");
    const den = parseFloat(parts[1] ?? "1");
    const multiplier = isFinite(num) && isFinite(den) && den !== 0 ? (num + den) / den : 1;
    potentialWin = stakeAmount * multiplier;
  }

  if (potentialWin > maxPayout) {
    const reducedStake = (maxPayout / (potentialWin / stakeAmount)).toFixed(2);
    res.status(400).json({ error: `Maximum payout is ${maxPayout.toFixed(2)}. Reduce your stake to ${reducedStake} or less.` });
    return;
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

  // Deduct wallet
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
  if (balance < stakeAmount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const newBalance = (balance - stakeAmount).toFixed(2);
  await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id));

  const numsDesc = isBonusOnly
    ? `Bonus only: ${bonusNums[0]}`
    : `${mainNums.join(",")}${bonusNums.length ? `+B${bonusNums[0]}` : ""}`;

  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: stakeAmount.toFixed(2),
    type: "debit",
    description: `Lottery — ${game.name} [${playType} | ${effectiveBonusMode}] (${numsDesc})`,
  });

  const [ticket] = await db
    .insert(lotteryTicketsTable)
    .values({
      userId: req.userId!,
      gameId: game.id,
      drawId: nextDraw.id,
      numbers: mainNums,
      bonusNumbers: bonusNums,
      stake: stakeAmount.toFixed(2),
      status: "pending",
      bonusMode: effectiveBonusMode,
      playType: String(playType),
      odds: oddsStr,
      potentialWin: potentialWin.toFixed(2),
    })
    .returning();

  res.status(201).json({
    ...ticket,
    stake: parseFloat(ticket.stake),
    prizeAmount: ticket.prizeAmount ? parseFloat(ticket.prizeAmount) : null,
    potentialWin: ticket.potentialWin ? parseFloat(ticket.potentialWin) : null,
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
    payoutConfig, minStake, maxStake, maxPayout, enabledPlayTypes,
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
  if (minStake !== undefined) updates.minStake = parseFloat(minStake).toFixed(2);
  if (maxStake !== undefined) updates.maxStake = parseFloat(maxStake).toFixed(2);
  if (maxPayout !== undefined) updates.maxPayout = parseFloat(maxPayout).toFixed(2);
  if (enabledPlayTypes !== undefined) updates.enabledPlayTypes = enabledPlayTypes;

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

  try {
    const result = await settleLotteryDraw(drawId, winningNumbers as number[], bonusNumbers as number[]);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found")) {
      res.status(404).json({ error: msg });
    } else if (msg.includes("already settled")) {
      res.status(400).json({ error: msg });
    } else {
      res.status(500).json({ error: "Settlement failed" });
    }
  }
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
