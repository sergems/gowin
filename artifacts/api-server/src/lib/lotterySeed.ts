/**
 * Lottery seed — inserts the default lottery games if the table is empty.
 * South African game configuration is also reconciled on every startup so
 * imported databases receive new games and corrected number ranges.
 */
import { db, lotteryGamesTable, lotteryDrawsTable } from "@workspace/db";
import { DEFAULT_PAYOUT_CONFIG } from "@workspace/db";
import { and, count, eq, sql } from "drizzle-orm";
import { logger } from "./logger";
import { computeNextLotteryDraw } from "./lotterySchedule";

const UK_49S_LOGO_URL = "/images/lottery/uk-49s.webp";
const UK_49S_SLUGS = [
  "uk-49s-lunchtime",
  "uk-49s-teatime",
  "uk-49s-brunchtime",
  "uk-49s-drivetime",
] as const;
const SA_DAILY_LOTTO_LOGO_URL = "/images/lottery/sa-daily-lotto.png";
const SA_LOTTO_LOGO_URL = "/images/lottery/sa-lotto.png";
const SA_POWERBALL_LOGO_URL = "/images/lottery/sa-powerball.png";
const SA_LOTTO_SLUGS = [
  "sa-lotto",
  "sa-lotto-plus-1",
  "sa-lotto-5-max",
] as const;
const SA_POWERBALL_SLUGS = ["sa-powerball", "sa-powerball-xtra"] as const;

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
  // UK National Lottery games are managed by ensureUKNationalLotteryGames() at startup
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
  // ── TheLotter-backed international lotteries ─────────────────────────────
  // Australia
  {
    name: "OZ Lotto",
    slug: "aus-oz-lotto",
    country: "Australia",
    mainNumbersCount: 7,
    mainNumbersMax: 47,
    bonusNumbersCount: 2,
    bonusNumbersMax: 47,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 2,
    color: "#16a34a",
    emoji: "🦘",
    description: "Australia's biggest Tuesday night lottery. Pick up to 7 numbers from 1–47.",
    scraperClass: "TheLotterAusOzLottoScraper",
    website: "https://www.thelotter.com",
    logoUrl: "https://flagcdn.com/80x60/au.png",
  },
  {
    name: "Australia Powerball",
    slug: "aus-powerball",
    country: "Australia",
    mainNumbersCount: 7,
    mainNumbersMax: 35,
    bonusNumbersCount: 1,
    bonusNumbersMax: 20,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 3,
    color: "#ef4444",
    emoji: "🔴",
    description: "Australia's Thursday night Powerball. Pick up to 7 main numbers plus optional Powerball.",
    scraperClass: "TheLotterAusPowerballScraper",
    website: "https://www.thelotter.com",
    logoUrl: "https://flagcdn.com/80x60/au.png",
  },
  {
    name: "Saturday Lotto",
    slug: "aus-saturday-lotto",
    country: "Australia",
    mainNumbersCount: 6,
    mainNumbersMax: 45,
    bonusNumbersCount: 2,
    bonusNumbersMax: 45,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 5,
    color: "#f59e0b",
    emoji: "🌟",
    description: "Australia's iconic Saturday night lottery. Pick up to 6 numbers from 1–45.",
    scraperClass: "TheLotterAusSaturdayLottoScraper",
    website: "https://www.thelotter.com",
    logoUrl: "https://flagcdn.com/80x60/au.png",
  },
  {
    name: "Weekday Windfall",
    slug: "aus-weekday-windfall",
    country: "Australia",
    mainNumbersCount: 6,
    mainNumbersMax: 45,
    bonusNumbersCount: 2,
    bonusNumbersMax: 45,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 1,
    color: "#06b6d4",
    emoji: "💨",
    description: "Australia's midweek lottery drawn on Wednesdays and Saturdays.",
    scraperClass: "TheLotterAusWeekdayWindfallScraper",
    website: "https://www.thelotter.com",
    logoUrl: "https://flagcdn.com/80x60/au.png",
  },
  // Europe
  {
    name: "Austria Lotto",
    slug: "austria-lotto",
    country: "Austria",
    mainNumbersCount: 6,
    mainNumbersMax: 45,
    bonusNumbersCount: 1,
    bonusNumbersMax: 45,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 2,
    color: "#dc2626",
    emoji: "🇦🇹",
    description: "Austria's national lottery drawn on Wednesdays and Sundays. Pick 6 from 1–45.",
    scraperClass: "TheLotterAustriaLottoScraper",
    website: "https://www.thelotter.com",
    logoUrl: "https://flagcdn.com/80x60/at.png",
  },
  {
    name: "EuroDreams",
    slug: "eurodreams",
    country: "Europe",
    mainNumbersCount: 6,
    mainNumbersMax: 40,
    bonusNumbersCount: 1,
    bonusNumbersMax: 5,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 1,
    color: "#7c3aed",
    emoji: "💜",
    description: "European lottery with a lifetime prize. Pick 6 from 1–40 plus a Dream Number 1–5.",
    scraperClass: "TheLotterEuroDreamsScraper",
    website: "https://www.thelotter.com",
    logoUrl: "https://flagcdn.com/80x60/eu.png",
  },
  {
    name: "El Gordo",
    slug: "spain-el-gordo",
    country: "Spain",
    mainNumbersCount: 5,
    mainNumbersMax: 54,
    bonusNumbersCount: 1,
    bonusNumbersMax: 10,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 6,
    color: "#f97316",
    emoji: "🇪🇸",
    description: "Spain's popular Sunday lottery — El Gordo de la Primitiva. Pick 5 from 1–54.",
    scraperClass: "TheLotterSpainElGordoScraper",
    website: "https://www.thelotter.com",
    logoUrl: "https://flagcdn.com/80x60/es.png",
  },
  {
    name: "Germany Lotto",
    slug: "germany-lotto",
    country: "Germany",
    mainNumbersCount: 6,
    mainNumbersMax: 49,
    bonusNumbersCount: 1,
    bonusNumbersMax: 9,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 3,
    color: "#fbbf24",
    emoji: "🇩🇪",
    description: "Germany's 6aus49 drawn on Wednesdays and Saturdays. Pick 6 from 1–49.",
    scraperClass: "TheLotterGermanyLottoScraper",
    website: "https://www.thelotter.com",
    logoUrl: "https://flagcdn.com/80x60/de.png",
  },
  {
    name: "SuperEnalotto",
    slug: "italy-superenalotto",
    country: "Italy",
    mainNumbersCount: 6,
    mainNumbersMax: 90,
    bonusNumbersCount: 1,
    bonusNumbersMax: 90,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 2,
    color: "#16a34a",
    emoji: "🇮🇹",
    description: "Italy's SuperEnalotto with some of the highest jackpots in Europe. Pick 6 from 1–90.",
    scraperClass: "TheLotterItalySuperEnalottoScraper",
    website: "https://www.thelotter.com",
  },
  // Canada
  {
    name: "Lotto 6/49",
    slug: "canada-lotto-649",
    country: "Canada",
    mainNumbersCount: 6,
    mainNumbersMax: 49,
    bonusNumbersCount: 1,
    bonusNumbersMax: 49,
    ticketPrice: "3.00",
    jackpot: "0.00",
    drawOffsetDays: 3,
    color: "#ef4444",
    emoji: "🇨🇦",
    description: "Canada's classic lottery drawn on Wednesdays and Saturdays. Pick 6 from 1–49.",
    scraperClass: "TheLotterCanadaLotto649Scraper",
    website: "https://www.thelotter.com",
  },
  {
    name: "Ontario 49",
    slug: "canada-ontario-49",
    country: "Canada",
    mainNumbersCount: 6,
    mainNumbersMax: 49,
    bonusNumbersCount: 1,
    bonusNumbersMax: 49,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 1,
    color: "#f59e0b",
    emoji: "🍁",
    description: "Ontario's daily lottery. Pick 6 from 1–49 for a chance at the jackpot.",
    scraperClass: "TheLotterCanadaOntario49Scraper",
    website: "https://www.thelotter.com",
  },
  // New Zealand
  {
    name: "NZ Powerball",
    slug: "nz-powerball",
    country: "New Zealand",
    mainNumbersCount: 6,
    mainNumbersMax: 40,
    bonusNumbersCount: 1,
    bonusNumbersMax: 10,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 5,
    color: "#0ea5e9",
    emoji: "🥝",
    description: "New Zealand's Saturday Powerball. Pick 6 from 1–40 plus an optional Powerball 1–10.",
    scraperClass: "TheLotterNZPowerballScraper",
    website: "https://www.thelotter.com",
  },
  // ── Irish Lotto ──────────────────────────────────────────────────────────
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
      excludedBonus: { "1": "6/1", "2": "55/1", "3": "550/1", "4": "6000/1", "5": "80000/1" },
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
      excludedBonus: { "1": "6/1", "2": "55/1", "3": "550/1", "4": "6000/1", "5": "80000/1" },
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
      excludedBonus: { "1": "11/2", "2": "52/1", "3": "400/1", "4": "4000/1", "5": "50000/1" },
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
      excludedBonus: { "1": "7/2", "2": "25/1", "3": "220/1", "4": "3500/1" },
      includedBonus: {},
      bonusOnly: "",
      withBonus: {},
    },
    scraperClass: "GosLoto420Field1Scraper",
    website: "https://iss.stoloto.ru/gosloto420/draws?count=1",
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
      excludedBonus: { "1": "7/2", "2": "25/1", "3": "220/1", "4": "3500/1" },
      includedBonus: {},
      bonusOnly: "",
      withBonus: {},
    },
    scraperClass: "GosLoto420Field2Scraper",
    website: "https://iss.stoloto.ru/gosloto420/draws?count=1",
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
  {
    name: "Gosloto 6/36",
    slug: "gosloto-636",
    country: "Russia",
    mainNumbersCount: 6,
    mainNumbersMax: 36,
    bonusNumbersCount: 0,
    bonusNumbersMax: 0,
    ticketPrice: "2.00",
    jackpot: "0.00",
    drawOffsetDays: 7,
    color: "#7c3aed",
    emoji: "🇷🇺",
    description: "Gosloto 6/36. Weekly draw — pick 1–4 numbers from 1 to 36. No bonus ball.",
    enabledPlayTypes: ["1", "2", "3", "4"],
    payoutConfig: {
      excludedBonus: { "1": "9/2", "2": "35/1", "3": "275/1", "4": "2750/1" },
      includedBonus: {},
      bonusOnly: "",
      withBonus: {},
    },
    scraperClass: "GosLoto636Scraper",
    website: "https://iss.stoloto.ru/gosloto636/draws?count=1",
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

const UK_49S_DRAW_CONFIGS = [
  { slug: "uk-49s-brunchtime", drawTime: "12:49" },
  { slug: "uk-49s-lunchtime",  drawTime: "13:49" },
  { slug: "uk-49s-drivetime",  drawTime: "17:49" },
  { slug: "uk-49s-teatime",    drawTime: "18:49" },
] as const;

/**
 * Reconcile UK 49s timezone, next_draw_at, and pending draw dates on every startup.
 * Imported databases may have Africa/Lubumbashi (DRC timezone) instead of
 * Europe/London, which causes computeNextLotteryDraw to push draws 6+ days out.
 * Also repairs any pending lottery_draws rows that have stale far-future dates.
 */
export async function ensureUK49sDrawTimes(): Promise<void> {
  for (const cfg of UK_49S_DRAW_CONFIGS) {
    // All UK 49s draws happen every day; draw_days = [] means no day restriction.
    const nextDrawAt = computeNextLotteryDraw(cfg.drawTime, [], "Europe/London");
    if (!nextDrawAt) continue;

    const [game] = await db
      .select({ id: lotteryGamesTable.id })
      .from(lotteryGamesTable)
      .where(eq(lotteryGamesTable.slug, cfg.slug))
      .limit(1);
    if (!game) continue;

    // Fix timezone, next_draw_at, and withBonus payout odds on the game row
    await db
      .update(lotteryGamesTable)
      .set({
        timezone: "Europe/London",
        nextDrawAt,
        payoutConfig: sql`jsonb_set(payout_config, '{withBonus}', '{"1":"350/1","2":"3000/1","3":"32000/1","4":"250000/1"}')`,
      })
      .where(eq(lotteryGamesTable.id, game.id));

    // Fix the nearest pending draw: update its draw_date to the correct time,
    // or create it if none exists.
    const [pendingDraw] = await db
      .select({ id: lotteryDrawsTable.id })
      .from(lotteryDrawsTable)
      .where(and(eq(lotteryDrawsTable.gameId, game.id), eq(lotteryDrawsTable.status, "pending")))
      .orderBy(lotteryDrawsTable.drawDate)
      .limit(1);

    if (pendingDraw) {
      await db
        .update(lotteryDrawsTable)
        .set({ drawDate: nextDrawAt })
        .where(eq(lotteryDrawsTable.id, pendingDraw.id));
    } else {
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

/**
 * Keep South African lottery variants on their official locally-hosted logos.
 * This repairs imported databases and prevents old placeholder URLs returning.
 */
export async function ensureSouthAfricanLotteryLogos(): Promise<void> {
  await db
    .update(lotteryGamesTable)
    .set({ logoUrl: SA_DAILY_LOTTO_LOGO_URL })
    .where(eq(lotteryGamesTable.slug, "daily-lotto"));

  for (const slug of SA_LOTTO_SLUGS) {
    await db
      .update(lotteryGamesTable)
      .set({ logoUrl: SA_LOTTO_LOGO_URL })
      .where(eq(lotteryGamesTable.slug, slug));
  }

  for (const slug of SA_POWERBALL_SLUGS) {
    await db
      .update(lotteryGamesTable)
      .set({ logoUrl: SA_POWERBALL_LOGO_URL })
      .where(eq(lotteryGamesTable.slug, slug));
  }
}

/**
 * Reconcile SA lottery rows in imported databases. This is intentionally
 * separate from the empty-database seed because imported dumps already have
 * games and therefore skip the normal seed path.
 */
// ── UK National Lottery ───────────────────────────────────────────────────────

const UK_TIMEZONE = "Europe/London";

/**
 * Compute the next draw datetime (UTC) for a UK National Lottery game.
 * @param days     ISO weekday numbers (0=Sun … 6=Sat)
 * @param hour     Draw hour in UK local time (e.g. 20)
 * @param minute   Draw minute in UK local time (e.g. 45)
 */
function nextUKDraw(days: number[], hour: number, minute: number): Date {
  const now = new Date();
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now.getTime() + offset * 86_400_000);
    // Convert candidate to London local date
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: UK_TIMEZONE,
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", hour12: false,
    }).formatToParts(candidate);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const londonWeekday = new Date(
      Date.UTC(get("year"), get("month") - 1, get("day")),
    ).getUTCDay();

    if (!days.includes(londonWeekday)) continue;

    // Build the draw time in UTC by finding when London==hour:minute on that date
    const baseUtc = Date.UTC(get("year"), get("month") - 1, get("day"), 0, 0, 0);
    // Probe: what UTC offset does London have at noon on that day?
    const noon = new Date(baseUtc + 12 * 3_600_000);
    const londonNoon = new Intl.DateTimeFormat("en-US", {
      timeZone: UK_TIMEZONE, hour: "numeric", hour12: false,
    }).formatToParts(noon);
    const utcNoon = noon.getUTCHours();
    const localNoon = Number(londonNoon.find((p) => p.type === "hour")?.value ?? utcNoon);
    const offsetH = localNoon - utcNoon; // e.g. 1 for BST, 0 for GMT

    const drawUtc = new Date(baseUtc + (hour - offsetH) * 3_600_000 + minute * 60_000);
    if (drawUtc > now) return drawUtc;
  }
  return new Date(now.getTime() + 7 * 86_400_000);
}

const UK_NATIONAL_GAMES = [
  {
    slug: "uk-lotto",
    name: "Lotto",
    mainNumbersCount: 6, mainNumbersMax: 59,
    bonusNumbersCount: 1, bonusNumbersMax: 59,
    ticketPrice: "2.00",
    color: "#f59e0b", emoji: "🎰",
    description: "The UK National Lottery Lotto. Pick 1–6 numbers from 1–59. Draws every Wednesday and Saturday at 20:00 UK time.",
    drawDays: [3, 6], drawHour: 20, drawMinute: 0, drawTime: "20:00",
    scraperClass: "UKNationalLottoScraper",
    website: "https://www.national-lottery.co.uk/results/lotto/draw-history/xml",
  },
  {
    slug: "uk-euromillions",
    name: "EuroMillions",
    mainNumbersCount: 5, mainNumbersMax: 50,
    bonusNumbersCount: 2, bonusNumbersMax: 12,
    ticketPrice: "2.50",
    color: "#3b82f6", emoji: "⭐",
    description: "Europe's biggest lottery, drawn in the UK. Pick 1–5 numbers from 1–50 plus optional Lucky Stars. Draws Tuesdays and Fridays at 20:45 UK time.",
    drawDays: [2, 5], drawHour: 20, drawMinute: 45, drawTime: "20:45",
    scraperClass: "UKEuroMillionsScraper",
    website: "https://www.national-lottery.co.uk/results/euromillions/draw-history/xml",
  },
  {
    slug: "uk-thunderball",
    name: "Thunderball",
    mainNumbersCount: 5, mainNumbersMax: 39,
    bonusNumbersCount: 1, bonusNumbersMax: 14,
    ticketPrice: "1.00",
    color: "#ef4444", emoji: "⚡",
    description: "UK National Lottery Thunderball. Pick 1–5 numbers from 1–39 plus an optional Thunderball from 1–14. Draws Tuesdays, Wednesdays, Fridays, and Saturdays at 20:00 UK time.",
    drawDays: [2, 3, 5, 6], drawHour: 20, drawMinute: 0, drawTime: "20:00",
    scraperClass: "UKThunderballScraper",
    website: "https://www.national-lottery.co.uk/results/thunderball/draw-history/xml",
  },
  {
    slug: "uk-set-for-life",
    name: "Set For Life",
    mainNumbersCount: 5, mainNumbersMax: 47,
    bonusNumbersCount: 1, bonusNumbersMax: 10,
    ticketPrice: "1.50",
    color: "#10b981", emoji: "🍀",
    description: "UK National Lottery Set For Life. Pick 1–5 numbers from 1–47 plus an optional Life Ball from 1–10. Draws Mondays and Thursdays at 20:00 UK time.",
    drawDays: [1, 4], drawHour: 20, drawMinute: 0, drawTime: "20:00",
    scraperClass: "UKSetForLifeScraper",
    website: "https://www.national-lottery.co.uk/results/set-for-life/draw-history/xml",
  },
] as const;

/**
 * Upsert UK National Lottery games on every startup.
 * Safe to run on both fresh and imported databases.
 */
export async function ensureUKNationalLotteryGames(): Promise<void> {
  for (const cfg of UK_NATIONAL_GAMES) {
    const nextDrawAt = nextUKDraw([...cfg.drawDays], cfg.drawHour, cfg.drawMinute);
    const [existing] = await db
      .select({ id: lotteryGamesTable.id })
      .from(lotteryGamesTable)
      .where(eq(lotteryGamesTable.slug, cfg.slug))
      .limit(1);

    if (existing) {
      await db.update(lotteryGamesTable).set({
        name: cfg.name,
        country: "United Kingdom",
        mainNumbersCount: cfg.mainNumbersCount,
        mainNumbersMax: cfg.mainNumbersMax,
        bonusNumbersCount: cfg.bonusNumbersCount,
        bonusNumbersMax: cfg.bonusNumbersMax,
        color: cfg.color,
        emoji: cfg.emoji,
        description: cfg.description,
        drawDays: [...cfg.drawDays],
        drawTime: cfg.drawTime,
        timezone: UK_TIMEZONE,
        scraperClass: cfg.scraperClass,
        website: cfg.website,
        nextDrawAt,
      }).where(eq(lotteryGamesTable.id, existing.id));

      const [pending] = await db
        .select({ id: lotteryDrawsTable.id })
        .from(lotteryDrawsTable)
        .where(and(eq(lotteryDrawsTable.gameId, existing.id), eq(lotteryDrawsTable.status, "pending")))
        .limit(1);
      if (!pending) {
        await db.insert(lotteryDrawsTable).values({
          gameId: existing.id, drawDate: nextDrawAt,
          jackpot: "0.00", winningNumbers: [], bonusNumbers: [], status: "pending",
        });
      }
      continue;
    }

    const [game] = await db.insert(lotteryGamesTable).values({
      name: cfg.name, slug: cfg.slug, country: "United Kingdom",
      mainNumbersCount: cfg.mainNumbersCount, mainNumbersMax: cfg.mainNumbersMax,
      bonusNumbersCount: cfg.bonusNumbersCount, bonusNumbersMax: cfg.bonusNumbersMax,
      ticketPrice: cfg.ticketPrice, jackpot: "0.00", nextDrawAt, isActive: true,
      color: cfg.color, emoji: cfg.emoji, description: cfg.description,
      payoutConfig: DEFAULT_PAYOUT_CONFIG,
      drawDays: [...cfg.drawDays], drawTime: cfg.drawTime, timezone: UK_TIMEZONE,
      scraperClass: cfg.scraperClass, website: cfg.website,
    }).returning({ id: lotteryGamesTable.id });

    if (game) {
      await db.insert(lotteryDrawsTable).values({
        gameId: game.id, drawDate: nextDrawAt,
        jackpot: "0.00", winningNumbers: [], bonusNumbers: [], status: "pending",
      });
    }
  }
}

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

// ── Russian Gosloto ensure (runs on every startup) ───────────────────────────

/** SAST = UTC+2, no daylight saving. All Gosloto draw times are SA time. */
const GOSLOTO_TZ = "Africa/Johannesburg";
const GOSLOTO_SA_OFFSET = 2; // hours ahead of UTC

interface GoslotoTime { hour: number; minute: number; }

interface GoslotoGameDef {
  slug: string;
  name: string;
  mainNumbersCount: number;
  mainNumbersMax: number;
  enabledPlayTypes: string[];
  payoutConfig: { excludedBonus: Record<string, string>; includedBonus: Record<string, string>; bonusOnly: string; withBonus: Record<string, string> };
  scraperClass: string;
  website: string;
  /** Daily draw times in SA local time */
  drawSchedule: GoslotoTime[];
  /** If set, draws only happen on these ISO weekdays (0=Sun…6=Sat) */
  drawWeekdays?: number[];
  /** Minutes before draw that betting closes */
  bettingCutoffMinutes: number;
  color: string;
  emoji: string;
  ticketPrice: string;
  description: string;
}

const GOSLOTO_GAMES: GoslotoGameDef[] = [
  {
    slug: "gosloto-645",
    name: "Gosloto 6/45",
    mainNumbersCount: 6,
    mainNumbersMax: 45,
    enabledPlayTypes: ["1", "2", "3", "4", "5"],
    payoutConfig: {
      excludedBonus: { "1": "6/1", "2": "55/1", "3": "550/1", "4": "6000/1", "5": "80000/1" },
      includedBonus: {}, bonusOnly: "", withBonus: {},
    },
    scraperClass: "GosLoto645Scraper",
    website: "https://iss.stoloto.ru/gosloto645/draws?count=1",
    drawSchedule: [{ hour: 11, minute: 0 }, { hour: 23, minute: 0 }],
    bettingCutoffMinutes: 70,
    color: "#ef4444",
    emoji: "🇷🇺",
    ticketPrice: "2.00",
    description: "Russia's Gosloto 6/45. Pick 1–5 numbers from 1 to 45. No bonus ball. Draws at 11:00 and 23:00 SA time.",
  },
  {
    slug: "gosloto-645-plus",
    name: "Gosloto 6/45 Plus",
    mainNumbersCount: 6,
    mainNumbersMax: 45,
    enabledPlayTypes: ["1", "2", "3", "4", "5"],
    payoutConfig: {
      excludedBonus: { "1": "6/1", "2": "55/1", "3": "550/1", "4": "6000/1", "5": "80000/1" },
      includedBonus: {}, bonusOnly: "", withBonus: {},
    },
    scraperClass: "GosLoto645PlusScraper",
    website: "https://iss.stoloto.ru/gosloto645plus/draws?count=1",
    drawSchedule: [{ hour: 11, minute: 0 }, { hour: 23, minute: 0 }],
    bettingCutoffMinutes: 70,
    color: "#dc2626",
    emoji: "🇷🇺",
    ticketPrice: "2.00",
    description: "Gosloto 6/45 Plus. Pick 1–5 numbers from 1 to 45. Draws at 11:00 and 23:00 SA time.",
  },
  {
    slug: "gosloto-749",
    name: "Gosloto 7/49",
    mainNumbersCount: 7,
    mainNumbersMax: 49,
    enabledPlayTypes: ["1", "2", "3", "4", "5"],
    payoutConfig: {
      excludedBonus: { "1": "11/2", "2": "52/1", "3": "400/1", "4": "4000/1", "5": "50000/1" },
      includedBonus: {}, bonusOnly: "", withBonus: {},
    },
    scraperClass: "GosLoto749Scraper",
    website: "https://iss.stoloto.ru/gosloto749/draws?count=1",
    drawSchedule: [
      { hour: 10, minute: 30 }, { hour: 13, minute: 30 },
      { hour: 15, minute: 30 }, { hour: 19, minute: 0 }, { hour: 22, minute: 30 },
    ],
    bettingCutoffMinutes: 62,
    color: "#b91c1c",
    emoji: "🇷🇺",
    ticketPrice: "2.00",
    description: "Russia's Gosloto 7/49. Pick 1–5 numbers from 1 to 49. No bonus ball. Five draws daily.",
  },
  {
    slug: "gosloto-420-field1",
    name: "Gosloto 4/20 Field 1",
    mainNumbersCount: 4,
    mainNumbersMax: 20,
    enabledPlayTypes: ["1", "2", "3", "4"],
    payoutConfig: {
      excludedBonus: { "1": "7/2", "2": "25/1", "3": "220/1", "4": "3500/1" },
      includedBonus: {}, bonusOnly: "", withBonus: {},
    },
    scraperClass: "GosLoto420Field1Scraper",
    website: "https://iss.stoloto.ru/gosloto420/draws?count=1",
    drawSchedule: [
      { hour: 10, minute: 0 }, { hour: 13, minute: 0 },
      { hour: 16, minute: 0 }, { hour: 22, minute: 0 },
    ],
    bettingCutoffMinutes: 70,
    color: "#f97316",
    emoji: "🇷🇺",
    ticketPrice: "1.00",
    description: "Gosloto 4/20 Field 1. Pick 1–4 numbers from 1 to 20. No bonus ball. Four draws daily at 10:00, 13:00, 16:00, 22:00 SA time.",
  },
  {
    slug: "gosloto-420-field2",
    name: "Gosloto 4/20 Field 2",
    mainNumbersCount: 4,
    mainNumbersMax: 20,
    enabledPlayTypes: ["1", "2", "3", "4"],
    payoutConfig: {
      excludedBonus: { "1": "7/2", "2": "25/1", "3": "220/1", "4": "3500/1" },
      includedBonus: {}, bonusOnly: "", withBonus: {},
    },
    scraperClass: "GosLoto420Field2Scraper",
    website: "https://iss.stoloto.ru/gosloto420/draws?count=1",
    drawSchedule: [
      { hour: 10, minute: 0 }, { hour: 13, minute: 0 },
      { hour: 16, minute: 0 }, { hour: 22, minute: 0 },
    ],
    bettingCutoffMinutes: 70,
    color: "#ea580c",
    emoji: "🇷🇺",
    ticketPrice: "1.00",
    description: "Gosloto 4/20 Field 2. Pick 1–4 numbers from 1 to 20. No bonus ball. Four draws daily at 10:00, 13:00, 16:00, 22:00 SA time.",
  },
  {
    slug: "gosloto-636",
    name: "Gosloto 6/36",
    mainNumbersCount: 6,
    mainNumbersMax: 36,
    enabledPlayTypes: ["1", "2", "3", "4"],
    payoutConfig: {
      excludedBonus: { "1": "9/2", "2": "35/1", "3": "275/1", "4": "2750/1" },
      includedBonus: {}, bonusOnly: "", withBonus: {},
    },
    scraperClass: "GosLoto636Scraper",
    website: "https://iss.stoloto.ru/gosloto636/draws?count=1",
    drawSchedule: [{ hour: 22, minute: 0 }],
    drawWeekdays: [0], // Sunday only
    bettingCutoffMinutes: 70,
    color: "#7c3aed",
    emoji: "🇷🇺",
    ticketPrice: "2.00",
    description: "Gosloto 6/36. Weekly Sunday draw — pick 1–4 numbers from 1 to 36. No bonus ball.",
  },
];

/**
 * Convert an SA-time slot to UTC for a given reference date.
 * SAST = UTC+2, no DST — the offset is constant.
 */
function goslotoDrawUtc(saHour: number, saMinute: number, refDate: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GOSLOTO_TZ,
    year: "numeric", month: "numeric", day: "numeric",
  }).formatToParts(refDate);
  const y = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "month")?.value ?? 1) - 1;
  const d = Number(parts.find((p) => p.type === "day")?.value ?? 1);
  return new Date(Date.UTC(y, m, d, saHour - GOSLOTO_SA_OFFSET, saMinute, 0));
}

/**
 * Return all draw times (UTC) within the next `horizonHours` hours for the game.
 */
function upcomingGoslotoDraws(
  drawSchedule: GoslotoTime[],
  drawWeekdays: number[] | undefined,
  horizonHours = 48,
): Date[] {
  const now = new Date();
  const horizon = now.getTime() + horizonHours * 3_600_000;
  const results: Date[] = [];

  for (let dayOffset = 0; dayOffset <= Math.ceil(horizonHours / 24) + 1; dayOffset++) {
    const refDate = new Date(now.getTime() + dayOffset * 86_400_000);

    if (drawWeekdays && drawWeekdays.length > 0) {
      const dayParts = new Intl.DateTimeFormat("en-US", {
        timeZone: GOSLOTO_TZ,
        year: "numeric", month: "numeric", day: "numeric",
      }).formatToParts(refDate);
      const y = Number(dayParts.find((p) => p.type === "year")?.value ?? 0);
      const m = Number(dayParts.find((p) => p.type === "month")?.value ?? 1) - 1;
      const d = Number(dayParts.find((p) => p.type === "day")?.value ?? 1);
      const saWeekday = new Date(Date.UTC(y, m, d)).getUTCDay();
      if (!drawWeekdays.includes(saWeekday)) continue;
    }

    for (const { hour, minute } of drawSchedule) {
      const drawTime = goslotoDrawUtc(hour, minute, refDate);
      if (drawTime.getTime() > now.getTime() && drawTime.getTime() <= horizon) {
        results.push(drawTime);
      }
    }
  }
  return results;
}

/**
 * Upsert all Russian Gosloto game records with correct odds, draw schedules,
 * and per-game betting cutoffs. Safe to run on both fresh and imported databases.
 */
export async function ensureRussianGoslotoGames(): Promise<void> {
  // Add the betting_cutoff_minutes column if it doesn't exist yet (idempotent).
  await db.execute(
    sql`ALTER TABLE lottery_games ADD COLUMN IF NOT EXISTS betting_cutoff_minutes INTEGER NOT NULL DEFAULT 15`,
  );

  for (const cfg of GOSLOTO_GAMES) {
    const [existing] = await db
      .select({ id: lotteryGamesTable.id })
      .from(lotteryGamesTable)
      .where(eq(lotteryGamesTable.slug, cfg.slug))
      .limit(1);

    let gameId: number;

    if (existing) {
      gameId = existing.id;
      // Update odds, cutoff, draw schedule and description on every startup.
      await db
        .update(lotteryGamesTable)
        .set({
          name: cfg.name,
          country: "Russia",
          mainNumbersCount: cfg.mainNumbersCount,
          mainNumbersMax: cfg.mainNumbersMax,
          bonusNumbersCount: 0,
          bonusNumbersMax: 0,
          payoutConfig: cfg.payoutConfig,
          enabledPlayTypes: cfg.enabledPlayTypes,
          scraperClass: cfg.scraperClass,
          website: cfg.website,
          description: cfg.description,
          color: cfg.color,
          emoji: cfg.emoji,
          timezone: GOSLOTO_TZ,
          logoUrl: "https://flagcdn.com/40x30/ru.png",
          bettingCutoffMinutes: cfg.bettingCutoffMinutes,
        })
        .where(eq(lotteryGamesTable.id, gameId));
    } else {
      const firstDraw = upcomingGoslotoDraws(cfg.drawSchedule, cfg.drawWeekdays, 48)[0]
        ?? new Date(Date.now() + 24 * 3_600_000);

      const [inserted] = await db
        .insert(lotteryGamesTable)
        .values({
          name: cfg.name,
          slug: cfg.slug,
          country: "Russia",
          mainNumbersCount: cfg.mainNumbersCount,
          mainNumbersMax: cfg.mainNumbersMax,
          bonusNumbersCount: 0,
          bonusNumbersMax: 0,
          ticketPrice: cfg.ticketPrice,
          jackpot: "0.00",
          nextDrawAt: firstDraw,
          isActive: true,
          color: cfg.color,
          emoji: cfg.emoji,
          description: cfg.description,
          payoutConfig: cfg.payoutConfig,
          enabledPlayTypes: cfg.enabledPlayTypes,
          scraperClass: cfg.scraperClass,
          website: cfg.website,
          timezone: GOSLOTO_TZ,
          logoUrl: "https://flagcdn.com/40x30/ru.png",
          bettingCutoffMinutes: cfg.bettingCutoffMinutes,
        })
        .returning({ id: lotteryGamesTable.id });

      if (!inserted) continue;
      gameId = inserted.id;
    }

    // Ensure pending draws exist for every upcoming slot in the next 48 hours.
    const slots = upcomingGoslotoDraws(cfg.drawSchedule, cfg.drawWeekdays, 48);
    for (const drawTime of slots) {
      // Check whether a pending draw already exists within ±5 minutes of this slot.
      const windowStart = new Date(drawTime.getTime() - 5 * 60_000);
      const windowEnd   = new Date(drawTime.getTime() + 5 * 60_000);
      const [existing] = await db
        .select({ id: lotteryDrawsTable.id })
        .from(lotteryDrawsTable)
        .where(
          and(
            eq(lotteryDrawsTable.gameId, gameId),
            eq(lotteryDrawsTable.status, "pending"),
            sql`${lotteryDrawsTable.drawDate} >= ${windowStart} AND ${lotteryDrawsTable.drawDate} <= ${windowEnd}`,
          ),
        )
        .limit(1);

      if (!existing) {
        await db.insert(lotteryDrawsTable).values({
          gameId,
          drawDate: drawTime,
          jackpot: "0.00",
          winningNumbers: [],
          bonusNumbers: [],
          status: "pending",
        });
      }
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
