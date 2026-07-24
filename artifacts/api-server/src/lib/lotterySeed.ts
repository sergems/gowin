/**
 * Lottery seed — inserts the default lottery games if the table is empty.
 * South African game configuration is also reconciled on every startup so
 * imported databases receive new games and corrected number ranges.
 */
import { db, lotteryGamesTable, lotteryDrawsTable } from "@workspace/db";
import { DEFAULT_PAYOUT_CONFIG } from "@workspace/db";
import { and, count, eq } from "drizzle-orm";
import { logger } from "./logger";

const UK_49S_LOGO_URL = "/images/lottery/uk-49s.webp";
const UK_49S_SLUGS = [
  "uk-49s-lunchtime",
  "uk-49s-teatime",
  "uk-49s-brunchtime",
  "uk-49s-drivetime",
] as const;

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
    description: "Daily draws Monday to Sunday at 21:00 SAST, except Christmas Day. Pick 1–5 from 1–36.",
  },
  {
    name: "PowerBall",
    slug: "sa-powerball",
    country: "South Africa",
    mainNumbersCount: 5,
    mainNumbersMax: 50,
    bonusNumbersCount: 1,
    bonusNumbersMax: 20,
    ticketPrice: "10.00",
    jackpot: "0.00",
    drawOffsetDays: 1,
    color: "#2563eb",
    emoji: "🔵",
    description: "South African PowerBall. Draws Tuesdays and Fridays at 21:00 SAST.",
  },
  {
    name: "PowerBall XTRA",
    slug: "sa-powerball-xtra",
    country: "South Africa",
    mainNumbersCount: 5,
    mainNumbersMax: 50,
    bonusNumbersCount: 1,
    bonusNumbersMax: 20,
    ticketPrice: "5.00",
    jackpot: "0.00",
    drawOffsetDays: 1,
    color: "#7c3aed",
    emoji: "✖️",
    description: "PowerBall XTRA. Draws Tuesdays and Fridays at 21:00 SAST.",
  },
  {
    name: "Lotto Plus 1",
    slug: "sa-lotto-plus-1",
    country: "South Africa",
    mainNumbersCount: 6,
    mainNumbersMax: 52,
    bonusNumbersCount: 1,
    bonusNumbersMax: 52,
    ticketPrice: "2.50",
    jackpot: "0.00",
    drawOffsetDays: 2,
    color: "#0891b2",
    emoji: "➕",
    description: "Lotto Plus 1. Draws Wednesdays and Saturdays at 21:00 SAST.",
  },
  {
    name: "Lotto 5 Max",
    slug: "sa-lotto-5-max",
    country: "South Africa",
    mainNumbersCount: 6,
    mainNumbersMax: 52,
    bonusNumbersCount: 1,
    bonusNumbersMax: 52,
    ticketPrice: "2.50",
    jackpot: "0.00",
    drawOffsetDays: 2,
    color: "#0e7490",
    emoji: "⑤",
    description: "Lotto 5 Max. Draws Wednesdays and Saturdays at 21:00 SAST.",
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
  // ── Russian Gosloto games ────────────────────────────────────────────────────
  {
    name: "Gosloto 6/45",
    slug: "gosloto-645",
    country: "Russia",
    mainNumbersCount: 6,
    mainNumbersMax: 45,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 1,
    color: "#ef4444",
    emoji: "🇷🇺",
    description: "Russia's popular lottery. Pick 1–5 numbers from 1 to 45. No bonus ball.",
    enabledPlayTypes: ["1", "2", "3", "4", "5"],
    payoutConfig: {
      excludedBonus: { "1": "4.7/1", "2": "54/1", "3": "549/1", "4": "5999/1", "5": "81999/1" },
      includedBonus: {},
      bonusOnly: "",
      withBonus: {},
    },
    scraperClass: "GosLoto645Scraper",
    website: "https://iss.stoloto.ru/gosloto645/draws?count=1",
    logoUrl: "https://flagcdn.com/40x30/ru.png",
  },
  {
    name: "Gosloto 6/45 Plus",
    slug: "gosloto-645-plus",
    country: "Russia",
    mainNumbersCount: 6,
    mainNumbersMax: 45,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 1,
    color: "#dc2626",
    emoji: "🇷🇺",
    description: "Gosloto 6/45 Plus — same draw as 6/45 with enhanced prizes. Pick 1–5 numbers from 1 to 45.",
    enabledPlayTypes: ["1", "2", "3", "4", "5"],
    payoutConfig: {
      excludedBonus: { "1": "4.7/1", "2": "54/1", "3": "549/1", "4": "5999/1", "5": "81999/1" },
      includedBonus: {},
      bonusOnly: "",
      withBonus: {},
    },
    scraperClass: "GosLoto645PlusScraper",
    website: "https://iss.stoloto.ru/gosloto645plus/draws?count=1",
    logoUrl: "https://flagcdn.com/40x30/ru.png",
  },
  {
    name: "Gosloto 7/49",
    slug: "gosloto-749",
    country: "Russia",
    mainNumbersCount: 7,
    mainNumbersMax: 49,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 2,
    color: "#b91c1c",
    emoji: "🇷🇺",
    description: "Russia's Gosloto 7/49. Pick 1–5 numbers from 1 to 49. No bonus ball.",
    enabledPlayTypes: ["1", "2", "3", "4", "5"],
    payoutConfig: {
      excludedBonus: { "1": "4.4/1", "2": "47/1", "3": "399/1", "4": "3999/1", "5": "4999/1" },
      includedBonus: {},
      bonusOnly: "",
      withBonus: {},
    },
    scraperClass: "GosLoto749Scraper",
    website: "https://iss.stoloto.ru/gosloto749/draws?count=1",
    logoUrl: "https://flagcdn.com/40x30/ru.png",
  },
  {
    name: "Gosloto 4/20 Field 1",
    slug: "gosloto-420-field1",
    country: "Russia",
    mainNumbersCount: 4,
    mainNumbersMax: 20,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "1.00",
    jackpot: "0.00",
    drawOffsetDays: 0,
    drawOffsetHours: 8,
    color: "#f97316",
    emoji: "🇷🇺",
    description: "Gosloto 4/20 Field 1 (morning draw). Pick 1–4 numbers from 1 to 20. No bonus ball.",
    enabledPlayTypes: ["1", "2", "3", "4"],
    payoutConfig: {
      excludedBonus: { "1": "2.4/1", "2": "24/1", "3": "219/1", "4": "2999/1" },
      includedBonus: {},
      bonusOnly: "",
      withBonus: {},
    },
    scraperClass: "GosLoto420Field1Scraper",
    website: "https://iss.stoloto.ru/rapido/draws?count=1",
    logoUrl: "https://flagcdn.com/40x30/ru.png",
  },
  {
    name: "Gosloto 4/20 Field 2",
    slug: "gosloto-420-field2",
    country: "Russia",
    mainNumbersCount: 4,
    mainNumbersMax: 20,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "1.00",
    jackpot: "0.00",
    drawOffsetDays: 0,
    drawOffsetHours: 20,
    color: "#ea580c",
    emoji: "🇷🇺",
    description: "Gosloto 4/20 Field 2 (evening draw). Pick 1–4 numbers from 1 to 20. No bonus ball.",
    enabledPlayTypes: ["1", "2", "3", "4"],
    payoutConfig: {
      excludedBonus: { "1": "2.4/1", "2": "24/1", "3": "219/1", "4": "2999/1" },
      includedBonus: {},
      bonusOnly: "",
      withBonus: {},
    },
    scraperClass: "GosLoto420Field2Scraper",
    website: "https://iss.stoloto.ru/rapido2/draws?count=1",
    logoUrl: "https://flagcdn.com/40x30/ru.png",
  },
  {
    name: "Gosloto 5/50",
    slug: "gosloto-550",
    country: "Russia",
    mainNumbersCount: 5,
    mainNumbersMax: 50,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 1,
    color: "#c2410c",
    emoji: "🇷🇺",
    description: "Gosloto 5/50. Pick 1–4 numbers from 1 to 50. No bonus ball.",
    enabledPlayTypes: ["1", "2", "3", "4"],
    payoutConfig: {
      excludedBonus: { "1": "6/1", "2": "99/1", "3": "1199/1", "4": "24999/1" },
      includedBonus: {},
      bonusOnly: "",
      withBonus: {},
    },
    scraperClass: "GosLoto550Scraper",
    website: "https://iss.stoloto.ru/gosloto550/draws?count=1",
    logoUrl: "https://flagcdn.com/40x30/ru.png",
  },
] as const;

const SA_SOURCE = "https://www.nationallottery.co.za/#/results";
const SA_TIMEZONE = "Africa/Johannesburg";
const SA_SCHEDULES: Record<string, number[]> = {
  "daily-lotto": [0, 1, 2, 3, 4, 5, 6],
  "sa-powerball": [2, 5],
  "sa-powerball-xtra": [2, 5],
  "sa-lotto": [3, 6],
  "sa-lotto-plus-1": [3, 6],
  "sa-lotto-5-max": [3, 6],
};

function nextSADraw(days: number[]): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SA_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const base = new Date(Date.UTC(get("year"), get("month") - 1, get("day"), 19, 0, 0));

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(base.getTime() + offset * 86_400_000);
    const weekday = candidate.getUTCDay();
    const christmas = candidate.getUTCMonth() === 11 && candidate.getUTCDate() === 25;
    if (days.includes(weekday) && !christmas && candidate > now) return candidate;
  }
  return new Date(now.getTime() + 7 * 86_400_000);
}

const SA_GAME_CONFIG = [
  { slug: "daily-lotto", name: "Daily Lotto", mainNumbersCount: 5, mainNumbersMax: 36, bonusNumbersCount: 0, bonusNumbersMax: 0, drawDays: SA_SCHEDULES["daily-lotto"]!, drawTime: "21:00", description: "Daily draws Monday to Sunday at 21:00 SAST, except Christmas Day. Pick 1–5 from 1–36." },
  { slug: "sa-lotto", name: "South African Lotto", mainNumbersCount: 6, mainNumbersMax: 52, bonusNumbersCount: 1, bonusNumbersMax: 52, drawDays: SA_SCHEDULES["sa-lotto"]!, drawTime: "21:00", description: "South Africa's Lotto. Draws Wednesdays and Saturdays at 21:00 SAST with a bonus ball." },
  { slug: "sa-powerball", name: "PowerBall", mainNumbersCount: 5, mainNumbersMax: 50, bonusNumbersCount: 1, bonusNumbersMax: 20, drawDays: SA_SCHEDULES["sa-powerball"]!, drawTime: "21:00", description: "South African PowerBall. Draws Tuesdays and Fridays at 21:00 SAST." },
  { slug: "sa-powerball-xtra", name: "PowerBall XTRA", mainNumbersCount: 5, mainNumbersMax: 50, bonusNumbersCount: 1, bonusNumbersMax: 20, drawDays: SA_SCHEDULES["sa-powerball-xtra"]!, drawTime: "21:00", description: "PowerBall XTRA. Draws Tuesdays and Fridays at 21:00 SAST." },
  { slug: "sa-lotto-plus-1", name: "Lotto Plus 1", mainNumbersCount: 6, mainNumbersMax: 52, bonusNumbersCount: 1, bonusNumbersMax: 52, drawDays: SA_SCHEDULES["sa-lotto-plus-1"]!, drawTime: "21:00", description: "Lotto Plus 1. Draws Wednesdays and Saturdays at 21:00 SAST." },
  { slug: "sa-lotto-5-max", name: "Lotto 5 Max", mainNumbersCount: 6, mainNumbersMax: 52, bonusNumbersCount: 1, bonusNumbersMax: 52, drawDays: SA_SCHEDULES["sa-lotto-5-max"]!, drawTime: "21:00", description: "Lotto 5 Max. Draws Wednesdays and Saturdays at 21:00 SAST." },
] as const;

/**
 * Keep all UK 49s draw variants on the official locally-hosted brand image.
 * This also repairs imported databases that still point at the old placeholder.
 */
export async function ensureUK49sLotteryLogos(): Promise<void> {
  for (const slug of UK_49S_SLUGS) {
    await db
      .update(lotteryGamesTable)
      .set({ logoUrl: UK_49S_LOGO_URL })
      .where(eq(lotteryGamesTable.slug, slug));
  }
}

/**
 * Reconcile SA lottery rows in imported databases. This is intentionally
 * separate from the empty-database seed because imported dumps already have
 * games and therefore skip the normal seed path.
 */
export async function ensureSouthAfricanLotteryGames(): Promise<void> {
  for (const config of SA_GAME_CONFIG) {
    const nextDrawAt = nextSADraw(config.drawDays);
    const [existing] = await db
      .select({ id: lotteryGamesTable.id })
      .from(lotteryGamesTable)
      .where(eq(lotteryGamesTable.slug, config.slug))
      .limit(1);

    if (existing) {
      await db
        .update(lotteryGamesTable)
        .set({
          name: config.name,
          country: "South Africa",
          mainNumbersCount: config.mainNumbersCount,
          mainNumbersMax: config.mainNumbersMax,
          bonusNumbersCount: config.bonusNumbersCount,
          bonusNumbersMax: config.bonusNumbersMax,
          description: config.description,
          website: `${SA_SOURCE}/${config.slug}`,
          scraperClass: "SALotteryScraper",
          drawDays: config.drawDays,
          drawTime: config.drawTime,
          timezone: SA_TIMEZONE,
          nextDrawAt,
        })
        .where(eq(lotteryGamesTable.id, existing.id));

      const [pending] = await db
        .select({ id: lotteryDrawsTable.id })
        .from(lotteryDrawsTable)
        .where(
          and(
            eq(lotteryDrawsTable.gameId, existing.id),
            eq(lotteryDrawsTable.status, "pending"),
          ),
        )
        .limit(1);
      if (!pending) {
        await db.insert(lotteryDrawsTable).values({
          gameId: existing.id,
          drawDate: nextDrawAt,
          jackpot: "0.00",
          winningNumbers: [],
          bonusNumbers: [],
          status: "pending",
        });
      }
      continue;
    }

    const [game] = await db
      .insert(lotteryGamesTable)
      .values({
        name: config.name,
        slug: config.slug,
        country: "South Africa",
        mainNumbersCount: config.mainNumbersCount,
        mainNumbersMax: config.mainNumbersMax,
        bonusNumbersCount: config.bonusNumbersCount,
        bonusNumbersMax: config.bonusNumbersMax,
        ticketPrice: config.slug === "daily-lotto" ? "1.00" : "2.50",
        jackpot: "0.00",
        nextDrawAt,
        isActive: true,
        color: "#06b6d4",
        emoji: "🇿🇦",
        description: config.description,
        payoutConfig: DEFAULT_PAYOUT_CONFIG,
        website: `${SA_SOURCE}/${config.slug}`,
        scraperClass: "SALotteryScraper",
        drawDays: config.drawDays,
        drawTime: config.drawTime,
        timezone: SA_TIMEZONE,
      })
      .returning({ id: lotteryGamesTable.id });

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
}

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
