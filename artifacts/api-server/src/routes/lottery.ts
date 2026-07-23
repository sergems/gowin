import { Router } from "express";
import { db, lotteryGamesTable, lotteryDrawsTable, lotteryTicketsTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middlewares/auth";

const router = Router();

// ── Seed helper (runs once on startup) ───────────────────────────────────────
const SEED_GAMES = [
  {
    name: "Powerball",
    slug: "powerball",
    country: "United States",
    mainNumbersCount: 5,
    mainNumbersMax: 69,
    bonusNumbersCount: 1,
    bonusNumbersMax: 26,
    ticketPrice: "2.00",
    jackpot: "500000000",
    color: "#ef4444",
    emoji: "🔴",
    description: "America's game. Match all 5 numbers plus the Powerball to win the jackpot.",
    nextDrawAt: nextWeekday(3), // Wednesday
  },
  {
    name: "Mega Millions",
    slug: "mega-millions",
    country: "United States",
    mainNumbersCount: 5,
    mainNumbersMax: 70,
    bonusNumbersCount: 1,
    bonusNumbersMax: 25,
    ticketPrice: "2.00",
    jackpot: "320000000",
    color: "#f59e0b",
    emoji: "🟡",
    description: "Mega prizes. Match 5 numbers plus the Mega Ball to win.",
    nextDrawAt: nextWeekday(2), // Tuesday
  },
  {
    name: "EuroMillions",
    slug: "euromillions",
    country: "Europe",
    mainNumbersCount: 5,
    mainNumbersMax: 50,
    bonusNumbersCount: 2,
    bonusNumbersMax: 12,
    ticketPrice: "2.50",
    jackpot: "230000000",
    color: "#3b82f6",
    emoji: "🇪🇺",
    description: "Europe's biggest lottery. Match 5 numbers and 2 Lucky Stars.",
    nextDrawAt: nextWeekday(2), // Tuesday
  },
  {
    name: "EuroJackpot",
    slug: "eurojackpot",
    country: "Europe",
    mainNumbersCount: 5,
    mainNumbersMax: 50,
    bonusNumbersCount: 2,
    bonusNumbersMax: 12,
    ticketPrice: "2.00",
    jackpot: "120000000",
    color: "#8b5cf6",
    emoji: "⭐",
    description: "Europe-wide jackpot drawn every Friday. Match 5+2 to win.",
    nextDrawAt: nextWeekday(5), // Friday
  },
  {
    name: "UK Lotto",
    slug: "uk-lotto",
    country: "United Kingdom",
    mainNumbersCount: 6,
    mainNumbersMax: 59,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "2.50",
    jackpot: "18000000",
    color: "#10b981",
    emoji: "🇬🇧",
    description: "The UK's official lottery. Draw every Wednesday and Saturday.",
    nextDrawAt: nextWeekday(6), // Saturday
  },
  {
    name: "South African Lotto",
    slug: "sa-lotto",
    country: "South Africa",
    mainNumbersCount: 6,
    mainNumbersMax: 52,
    bonusNumbersCount: 1,
    bonusNumbersMax: 52,
    ticketPrice: "1.50",
    jackpot: "9000000",
    color: "#06b6d4",
    emoji: "🇿🇦",
    description: "South Africa's national lottery. Draws every Wednesday and Saturday.",
    nextDrawAt: nextWeekday(6), // Saturday
  },
  {
    name: "Daily Lotto",
    slug: "daily-lotto",
    country: "South Africa",
    mainNumbersCount: 5,
    mainNumbersMax: 36,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "0.50",
    jackpot: "300000",
    color: "#f97316",
    emoji: "📅",
    description: "A draw every single day. Pick 5 numbers from 1–36.",
    nextDrawAt: tomorrowEvening(),
  },
  {
    name: "DRC Loto National",
    slug: "drc-loto",
    country: "Congo DR",
    mainNumbersCount: 5,
    mainNumbersMax: 45,
    bonusNumbersCount: 1,
    bonusNumbersMax: 10,
    ticketPrice: "0.50",
    jackpot: "50000",
    color: "#84cc16",
    emoji: "🇨🇩",
    description: "La loterie nationale de la RDC. Tirage chaque semaine.",
    nextDrawAt: nextWeekday(6), // Saturday
  },
];

function nextWeekday(targetDay: number): Date {
  const d = new Date();
  d.setHours(21, 0, 0, 0);
  const current = d.getDay();
  const diff = (targetDay - current + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function tomorrowEvening(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(20, 30, 0, 0);
  return d;
}

async function seedLotteryGames() {
  try {
    const [existing] = await db.select({ id: lotteryGamesTable.id }).from(lotteryGamesTable).limit(1);
    if (existing) return; // already seeded
    await db.insert(lotteryGamesTable).values(SEED_GAMES);
  } catch {
    // Table may not exist yet on first boot — silently skip
  }
}
seedLotteryGames();

// ── Public routes ─────────────────────────────────────────────────────────────

router.get("/lottery/games", async (_req, res): Promise<void> => {
  const games = await db
    .select()
    .from(lotteryGamesTable)
    .where(eq(lotteryGamesTable.isActive, true))
    .orderBy(lotteryGamesTable.id);
  res.json({ games: games.map(serializeGame) });
});

router.get("/lottery/games/:slug", async (req, res): Promise<void> => {
  const [game] = await db
    .select()
    .from(lotteryGamesTable)
    .where(eq(lotteryGamesTable.slug, req.params.slug))
    .limit(1);
  if (!game) { res.status(404).json({ error: "Lottery game not found" }); return; }

  const recentDraws = await db
    .select()
    .from(lotteryDrawsTable)
    .where(eq(lotteryDrawsTable.gameId, game.id))
    .orderBy(desc(lotteryDrawsTable.drawDate))
    .limit(5);

  res.json({ game: serializeGame(game), recentDraws: recentDraws.map(serializeDraw) });
});

// ── Auth routes ───────────────────────────────────────────────────────────────

router.post("/lottery/tickets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { slug, numbers, bonusNumbers = [] } = req.body as {
    slug: string;
    numbers: number[];
    bonusNumbers?: number[];
  };

  if (!slug || !Array.isArray(numbers) || numbers.length === 0) {
    res.status(400).json({ error: "slug and numbers are required" });
    return;
  }

  const [game] = await db
    .select()
    .from(lotteryGamesTable)
    .where(and(eq(lotteryGamesTable.slug, slug), eq(lotteryGamesTable.isActive, true)))
    .limit(1);
  if (!game) { res.status(404).json({ error: "Lottery game not found" }); return; }

  // Validate numbers
  if (numbers.length !== game.mainNumbersCount) {
    res.status(400).json({ error: `Please select exactly ${game.mainNumbersCount} numbers` });
    return;
  }
  for (const n of numbers) {
    if (!Number.isInteger(n) || n < 1 || n > game.mainNumbersMax) {
      res.status(400).json({ error: `Numbers must be between 1 and ${game.mainNumbersMax}` });
      return;
    }
  }
  if (game.bonusNumbersCount > 0) {
    if (bonusNumbers.length !== game.bonusNumbersCount) {
      res.status(400).json({ error: `Please select exactly ${game.bonusNumbersCount} bonus number(s)` });
      return;
    }
    for (const n of bonusNumbers) {
      if (!Number.isInteger(n) || n < 1 || n > game.bonusNumbersMax) {
        res.status(400).json({ error: `Bonus numbers must be between 1 and ${game.bonusNumbersMax}` });
        return;
      }
    }
  }

  const stake = parseFloat(game.ticketPrice);

  // Check wallet balance
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, req.userId!))
    .limit(1);
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

  const balance = parseFloat(wallet.balance);
  if (balance < stake) {
    res.status(400).json({ error: "Insufficient balance. Please top up your wallet." });
    return;
  }

  // Find the upcoming draw (soonest future draw or null)
  const [upcomingDraw] = await db
    .select()
    .from(lotteryDrawsTable)
    .where(and(eq(lotteryDrawsTable.gameId, game.id), eq(lotteryDrawsTable.status, "pending")))
    .orderBy(lotteryDrawsTable.drawDate)
    .limit(1);

  // Deduct wallet + insert ticket in a transaction
  const newBalance = balance - stake;
  await db.update(walletsTable)
    .set({ balance: newBalance.toFixed(2) })
    .where(eq(walletsTable.id, wallet.id));

  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: stake.toFixed(2),
    type: "debit",
    description: `Lottery ticket — ${game.name}`,
  });

  const [ticket] = await db.insert(lotteryTicketsTable).values({
    userId: req.userId!,
    gameId: game.id,
    drawId: upcomingDraw?.id ?? null,
    numbers,
    bonusNumbers,
    stake: stake.toFixed(2),
    status: "pending",
  }).returning();

  res.status(201).json({ ticket: serializeTicket(ticket!), newBalance });
});

router.get("/lottery/tickets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const tickets = await db
    .select({
      ticket: lotteryTicketsTable,
      game: lotteryGamesTable,
      draw: lotteryDrawsTable,
    })
    .from(lotteryTicketsTable)
    .innerJoin(lotteryGamesTable, eq(lotteryGamesTable.id, lotteryTicketsTable.gameId))
    .leftJoin(lotteryDrawsTable, eq(lotteryDrawsTable.id, lotteryTicketsTable.drawId))
    .where(eq(lotteryTicketsTable.userId, req.userId!))
    .orderBy(desc(lotteryTicketsTable.createdAt))
    .limit(50);

  res.json({
    tickets: tickets.map(({ ticket, game, draw }) => ({
      ...serializeTicket(ticket),
      game: serializeGame(game),
      draw: draw ? serializeDraw(draw) : null,
    })),
  });
});

// ── Admin routes ──────────────────────────────────────────────────────────────

router.get("/admin/lottery/games", requireAdminOrManager, async (_req, res): Promise<void> => {
  const games = await db.select().from(lotteryGamesTable).orderBy(lotteryGamesTable.id);
  const ticketCounts = await db
    .select({ gameId: lotteryTicketsTable.gameId, count: sql<number>`count(*)::int` })
    .from(lotteryTicketsTable)
    .groupBy(lotteryTicketsTable.gameId);
  const countMap = new Map(ticketCounts.map((r) => [r.gameId, r.count]));
  res.json({ games: games.map((g) => ({ ...serializeGame(g), ticketCount: countMap.get(g.id) ?? 0 })) });
});

router.post("/admin/lottery/games", requireAdminOrManager, async (req, res): Promise<void> => {
  const { name, slug, country, mainNumbersCount, mainNumbersMax, bonusNumbersCount, bonusNumbersMax, ticketPrice, jackpot, nextDrawAt, color, emoji, description } = req.body;
  if (!name || !slug || !country || !mainNumbersCount || !mainNumbersMax || !ticketPrice) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [game] = await db.insert(lotteryGamesTable).values({
    name, slug, country,
    mainNumbersCount: Number(mainNumbersCount),
    mainNumbersMax: Number(mainNumbersMax),
    bonusNumbersCount: Number(bonusNumbersCount ?? 0),
    bonusNumbersMax: Number(bonusNumbersMax ?? 0),
    ticketPrice: String(ticketPrice),
    jackpot: String(jackpot ?? "0"),
    nextDrawAt: nextDrawAt ? new Date(nextDrawAt) : null,
    color: color ?? "#4ade80",
    emoji: emoji ?? "🎰",
    description: description ?? null,
  }).returning();
  res.status(201).json({ game: serializeGame(game!) });
});

router.put("/admin/lottery/games/:id", requireAdminOrManager, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { jackpot, nextDrawAt, isActive, name, ticketPrice, description } = req.body;
  const updateData: Record<string, unknown> = {};
  if (jackpot !== undefined) updateData.jackpot = String(jackpot);
  if (nextDrawAt !== undefined) updateData.nextDrawAt = nextDrawAt ? new Date(nextDrawAt) : null;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (name !== undefined) updateData.name = name;
  if (ticketPrice !== undefined) updateData.ticketPrice = String(ticketPrice);
  if (description !== undefined) updateData.description = description;

  const [game] = await db.update(lotteryGamesTable).set(updateData).where(eq(lotteryGamesTable.id, id)).returning();
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  res.json({ game: serializeGame(game) });
});

// POST /admin/lottery/draws — enter a draw result
router.post("/admin/lottery/draws", requireAdminOrManager, async (req, res): Promise<void> => {
  const { gameId, drawDate, winningNumbers, bonusNumbers = [], jackpot } = req.body as {
    gameId: number;
    drawDate: string;
    winningNumbers: number[];
    bonusNumbers?: number[];
    jackpot: string;
  };
  if (!gameId || !drawDate || !Array.isArray(winningNumbers) || !jackpot) {
    res.status(400).json({ error: "gameId, drawDate, winningNumbers and jackpot are required" });
    return;
  }
  const [draw] = await db.insert(lotteryDrawsTable).values({
    gameId: Number(gameId),
    drawDate: new Date(drawDate),
    winningNumbers,
    bonusNumbers,
    jackpot: String(jackpot),
    status: "pending",
  }).returning();
  res.status(201).json({ draw: serializeDraw(draw!) });
});

// POST /admin/lottery/draws/:id/settle — evaluate all tickets and pay out winners
router.post("/admin/lottery/draws/:id/settle", requireAdminOrManager, async (req, res): Promise<void> => {
  const drawId = Number(req.params.id);
  const [draw] = await db.select().from(lotteryDrawsTable).where(eq(lotteryDrawsTable.id, drawId)).limit(1);
  if (!draw) { res.status(404).json({ error: "Draw not found" }); return; }
  if (draw.status === "settled") { res.status(400).json({ error: "Draw already settled" }); return; }

  const [game] = await db.select().from(lotteryGamesTable).where(eq(lotteryGamesTable.id, draw.gameId)).limit(1);
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  const tickets = await db
    .select()
    .from(lotteryTicketsTable)
    .where(and(eq(lotteryTicketsTable.drawId, drawId), eq(lotteryTicketsTable.status, "pending")));

  const winningSet = new Set(draw.winningNumbers as number[]);
  const bonusSet = new Set(draw.bonusNumbers as number[]);
  let totalPayout = 0;
  let winners = 0;

  for (const ticket of tickets) {
    const ticketNums = ticket.numbers as number[];
    const ticketBonus = ticket.bonusNumbers as number[];
    const mainMatches = ticketNums.filter((n) => winningSet.has(n)).length;
    const bonusMatches = ticketBonus.filter((n) => bonusSet.has(n)).length;

    const prize = calcPrize(game.mainNumbersCount, game.bonusNumbersCount, mainMatches, bonusMatches, parseFloat(draw.jackpot), parseFloat(game.ticketPrice));

    if (prize > 0) {
      // Credit wallet
      const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, ticket.userId)).limit(1);
      if (wallet) {
        const newBal = parseFloat(wallet.balance) + prize;
        await db.update(walletsTable).set({ balance: newBal.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
        await db.insert(transactionsTable).values({
          walletId: wallet.id,
          amount: prize.toFixed(2),
          type: "credit",
          description: `Lottery prize — ${game.name} draw`,
        });
      }
      await db.update(lotteryTicketsTable)
        .set({ status: "won", prizeAmount: prize.toFixed(2) })
        .where(eq(lotteryTicketsTable.id, ticket.id));
      totalPayout += prize;
      winners++;
    } else {
      await db.update(lotteryTicketsTable)
        .set({ status: "lost" })
        .where(eq(lotteryTicketsTable.id, ticket.id));
    }
  }

  await db.update(lotteryDrawsTable).set({ status: "settled" }).where(eq(lotteryDrawsTable.id, drawId));

  res.json({ settled: tickets.length, winners, totalPayout });
});

router.get("/admin/lottery/tickets", requireAdminOrManager, async (_req, res): Promise<void> => {
  const tickets = await db
    .select({ ticket: lotteryTicketsTable, game: lotteryGamesTable })
    .from(lotteryTicketsTable)
    .innerJoin(lotteryGamesTable, eq(lotteryGamesTable.id, lotteryTicketsTable.gameId))
    .orderBy(desc(lotteryTicketsTable.createdAt))
    .limit(200);
  res.json({
    tickets: tickets.map(({ ticket, game }) => ({
      ...serializeTicket(ticket),
      gameName: game.name,
      gameSlug: game.slug,
    })),
  });
});

router.get("/admin/lottery/draws", requireAdminOrManager, async (_req, res): Promise<void> => {
  const draws = await db
    .select({ draw: lotteryDrawsTable, game: lotteryGamesTable })
    .from(lotteryDrawsTable)
    .innerJoin(lotteryGamesTable, eq(lotteryGamesTable.id, lotteryDrawsTable.gameId))
    .orderBy(desc(lotteryDrawsTable.drawDate))
    .limit(100);
  res.json({
    draws: draws.map(({ draw, game }) => ({
      ...serializeDraw(draw),
      gameName: game.name,
      gameSlug: game.slug,
    })),
  });
});

// ── Prize calculator ──────────────────────────────────────────────────────────
// Simplified tiered prize structure — replace with real rules per game
function calcPrize(
  mainCount: number,
  bonusCount: number,
  mainMatches: number,
  bonusMatches: number,
  jackpot: number,
  ticketPrice: number,
): number {
  const total = mainCount + bonusCount;
  const matched = mainMatches + bonusMatches;
  if (matched === total) return jackpot; // Jackpot
  const ratio = matched / total;
  if (ratio >= 0.8) return jackpot * 0.01;   // ~2nd division
  if (ratio >= 0.6) return ticketPrice * 200; // ~3rd division
  if (ratio >= 0.4) return ticketPrice * 50;  // ~4th division
  if (ratio >= 0.2) return ticketPrice * 5;   // Small prize
  return 0;
}

// ── Serializers ───────────────────────────────────────────────────────────────
function serializeGame(g: any) {
  return {
    ...g,
    ticketPrice: parseFloat(g.ticketPrice),
    jackpot: parseFloat(g.jackpot),
    nextDrawAt: g.nextDrawAt ?? null,
  };
}
function serializeDraw(d: any) {
  return { ...d, jackpot: parseFloat(d.jackpot) };
}
function serializeTicket(t: any) {
  return {
    ...t,
    stake: parseFloat(t.stake),
    prizeAmount: t.prizeAmount ? parseFloat(t.prizeAmount) : null,
  };
}

export default router;
