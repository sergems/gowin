/**
 * Lottery seed — inserts the 8 default lottery games if the table is empty.
 * Safe to call on every startup: it only inserts when no games exist yet.
 */
import { db, lotteryGamesTable, lotteryDrawsTable } from "@workspace/db";
import { DEFAULT_PAYOUT_CONFIG } from "@workspace/db";
import { count } from "drizzle-orm";
import { logger } from "./logger";

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
    jackpot: "0.00",
    drawOffsetDays: 3,
    color: "#ef4444",
    emoji: "🔴",
    description: "America's favorite lottery. Pick 1–5 numbers + optional Powerball to win.",
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
    jackpot: "0.00",
    drawOffsetDays: 2,
    color: "#f59e0b",
    emoji: "⭐",
    description: "One of the world's largest lotteries. Pick 1–5 numbers plus optional Mega Ball.",
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
    jackpot: "0.00",
    drawOffsetDays: 4,
    color: "#3b82f6",
    emoji: "🇪🇺",
    description: "Europe's biggest transnational lottery. Pick 1–5 main numbers and optional Lucky Stars.",
  },
  {
    name: "EuroJackpot",
    slug: "eurojackpot",
    country: "Europe",
    mainNumbersCount: 5,
    mainNumbersMax: 50,
    bonusNumbersCount: 2,
    bonusNumbersMax: 10,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 5,
    color: "#8b5cf6",
    emoji: "💜",
    description: "A pan-European lottery. Pick 1–5 numbers + optional Euro Numbers.",
  },
  {
    name: "UK Lotto",
    slug: "uk-lotto",
    country: "United Kingdom",
    mainNumbersCount: 6,
    mainNumbersMax: 59,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 1,
    color: "#10b981",
    emoji: "🇬🇧",
    description: "The UK's flagship lottery. Pick 1–6 numbers from 1 to 59.",
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
    jackpot: "0.00",
    drawOffsetDays: 2,
    color: "#06b6d4",
    emoji: "🇿🇦",
    description: "South Africa's national lottery. Pick 1–6 numbers plus optional bonus ball.",
  },
  {
    name: "Daily Lotto",
    slug: "daily-lotto",
    country: "South Africa",
    mainNumbersCount: 5,
    mainNumbersMax: 36,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "1.00",
    jackpot: "0.00",
    drawOffsetDays: 0,
    drawOffsetHours: 12,
    color: "#f97316",
    emoji: "🌅",
    description: "Daily draws every night. Pick 1–5 from 1–36. No rollover — always pays out!",
  },
  {
    name: "Irish Lotto",
    slug: "irish-lotto",
    country: "Ireland",
    mainNumbersCount: 6,
    mainNumbersMax: 47,
    bonusNumbersCount: 1,
    bonusNumbersMax: 47,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 3,
    color: "#4ade80",
    emoji: "🍀",
    description: "Ireland's national lottery. Pick 1–6 numbers plus optional bonus from 1–47.",
  },
] as const;

export async function seedLotteryGames(): Promise<void> {
  try {
    const [{ total }] = await db.select({ total: count() }).from(lotteryGamesTable);

    if (total > 0) {
      // Games already exist — skip seeding
      return;
    }

    logger.info("Seeding default lottery games…");
    const now = new Date();

    for (const g of SEED_GAMES) {
      const drawOffsetMs =
        ((g as any).drawOffsetDays ?? 0) * 86_400_000 +
        ((g as any).drawOffsetHours ?? 0) * 3_600_000;
      const nextDrawAt = new Date(now.getTime() + drawOffsetMs);

      const [game] = await db
        .insert(lotteryGamesTable)
        .values({
          name: g.name,
          slug: g.slug,
          country: g.country,
          mainNumbersCount: g.mainNumbersCount,
          mainNumbersMax: g.mainNumbersMax,
          bonusNumbersCount: g.bonusNumbersCount,
          bonusNumbersMax: g.bonusNumbersMax,
          ticketPrice: g.ticketPrice,
          jackpot: g.jackpot,
          nextDrawAt,
          color: g.color,
          emoji: g.emoji,
          description: g.description,
          isActive: true,
          payoutConfig: DEFAULT_PAYOUT_CONFIG,
        })
        .onConflictDoNothing()
        .returning({ id: lotteryGamesTable.id, name: lotteryGamesTable.name });

      if (game) {
        await db.insert(lotteryDrawsTable).values({
          gameId: game.id,
          drawDate: nextDrawAt,
          jackpot: "0.00",
          winningNumbers: [],
          bonusNumbers: [],
          status: "pending",
        });
      }
    }

    logger.info(`Seeded ${SEED_GAMES.length} lottery games with pending draws`);
  } catch (err) {
    logger.warn({ err }, "Lottery seed failed — continuing without seed data");
  }
}
