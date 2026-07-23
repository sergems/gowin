import { pgTable, serial, integer, numeric, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export type PayoutConfig = {
  excludedBonus: Record<string, string>; // "1" → "13/2", "2" → "60/1" …
  includedBonus: Record<string, string>; // "1" → "11/2", "2" → "50/1" …
  bonusOnly: string;                     // "45/1"
  withBonus: Record<string, string>;     // "1" → "344/1", "2" → "2805/1" …
};

export const DEFAULT_PAYOUT_CONFIG: PayoutConfig = {
  excludedBonus: { "1": "13/2", "2": "60/1", "3": "600/1", "4": "10000/1", "5": "100000/1" },
  includedBonus: { "1": "11/2", "2": "50/1", "3": "420/1", "4": "5000/1", "5": "50000/1" },
  bonusOnly: "45/1",
  withBonus: { "1": "344/1", "2": "2805/1", "3": "27645/1", "4": "460045/1" },
};

export const lotteryGamesTable = pgTable("lottery_games", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  country: text("country").notNull(),
  mainNumbersCount: integer("main_numbers_count").notNull(),
  mainNumbersMax: integer("main_numbers_max").notNull(),
  bonusNumbersCount: integer("bonus_numbers_count").notNull().default(0),
  bonusNumbersMax: integer("bonus_numbers_max").notNull().default(0),
  ticketPrice: numeric("ticket_price", { precision: 10, scale: 2 }).notNull(),
  jackpot: numeric("jackpot", { precision: 20, scale: 2 }).notNull().default("0"),
  nextDrawAt: timestamp("next_draw_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  color: text("color").notNull().default("#4ade80"),
  emoji: text("emoji").notNull().default("🎰"),
  description: text("description"),
  payoutConfig: jsonb("payout_config").$type<PayoutConfig>().default(DEFAULT_PAYOUT_CONFIG),
});

export const lotteryDrawsTable = pgTable("lottery_draws", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id")
    .notNull()
    .references(() => lotteryGamesTable.id, { onDelete: "cascade" }),
  drawDate: timestamp("draw_date", { withTimezone: true }).notNull(),
  winningNumbers: jsonb("winning_numbers").$type<number[]>().notNull().default([]),
  bonusNumbers: jsonb("bonus_numbers").$type<number[]>().notNull().default([]),
  jackpot: numeric("jackpot", { precision: 20, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending | settled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lotteryTicketsTable = pgTable("lottery_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  gameId: integer("game_id")
    .notNull()
    .references(() => lotteryGamesTable.id),
  drawId: integer("draw_id").references(() => lotteryDrawsTable.id, { onDelete: "set null" }),
  numbers: jsonb("numbers").$type<number[]>().notNull(),
  bonusNumbers: jsonb("bonus_numbers").$type<number[]>().notNull().default([]),
  stake: numeric("stake", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending | won | lost
  prizeAmount: numeric("prize_amount", { precision: 20, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LotteryGame = typeof lotteryGamesTable.$inferSelect;
export type LotteryDraw = typeof lotteryDrawsTable.$inferSelect;
export type LotteryTicket = typeof lotteryTicketsTable.$inferSelect;
