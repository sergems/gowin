import { pgTable, serial, integer, numeric, text, timestamp, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { fixturesTable } from "./sports";

export const betStatusEnum = pgEnum("bet_status", ["pending", "won", "lost", "void", "cashed_out"]);

export const betsTable = pgTable("bets", {
  id: serial("id").primaryKey(),
  code: text("code").unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  stake: numeric("stake", { precision: 15, scale: 2 }).notNull(),
  totalOdds: numeric("total_odds", { precision: 10, scale: 4 }).notNull(),
  potentialWin: numeric("potential_win", { precision: 15, scale: 2 }).notNull(),
  status: betStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // USD→CDF rate in effect when the bet was placed — snapshot so CDF display never
  // drifts if the site-wide rate is changed later. Null on legacy rows pre-dating this column.
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 4 }),
  agentId: integer("agent_id").references(() => usersTable.id, { onDelete: "set null" }),
  branchId: integer("branch_id"),
  // Win Bonus fields — stored at placement, never recomputed after acceptance
  qualifyingSelections: integer("qualifying_selections").notNull().default(0),
  bonusPercentage: numeric("bonus_percentage", { precision: 8, scale: 2 }).notNull().default("0"),
  baseWin: numeric("base_win", { precision: 15, scale: 2 }).notNull().default("0"),
  bonusAmount: numeric("bonus_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  maxWinApplied: boolean("max_win_applied").notNull().default(false),
  // Cash Out fields — populated only when a bet is cashed out (status = 'cashed_out')
  cashOutAmount: numeric("cash_out_amount", { precision: 15, scale: 2 }),
  cashOutAt: timestamp("cash_out_at", { withTimezone: true }),
  cashOutMarginUsed: numeric("cash_out_margin_used", { precision: 8, scale: 2 }),
  cashOutFairValue: numeric("cash_out_fair_value", { precision: 15, scale: 2 }),
  cashOutProbability: numeric("cash_out_probability", { precision: 8, scale: 4 }),
  cashOutOddsSnapshot: jsonb("cash_out_odds_snapshot"),
  cashOutIp: text("cash_out_ip"),
  cashOutDevice: text("cash_out_device"),
  // USD→CDF rate in effect when the cash-out was accepted — the cash-out payout is a
  // distinct financial event from bet placement, so it gets its own rate snapshot.
  cashOutExchangeRate: numeric("cash_out_exchange_rate", { precision: 10, scale: 4 }),
});

export const betSelectionsTable = pgTable("bet_selections", {
  id: serial("id").primaryKey(),
  betId: integer("bet_id").notNull().references(() => betsTable.id, { onDelete: "cascade" }),
  fixtureId: integer("fixture_id").notNull().references(() => fixturesTable.id),
  market: text("market").notNull(),
  selection: text("selection").notNull(),
  odds: numeric("odds", { precision: 10, scale: 4 }).notNull(),
  upWon: boolean("up_won").notNull().default(false),
});

export const betBookingsTable = pgTable("bet_bookings", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  selections: jsonb("selections").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const insertBetSchema = createInsertSchema(betsTable).omit({ id: true, createdAt: true });
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof betsTable.$inferSelect;

export const insertBetSelectionSchema = createInsertSchema(betSelectionsTable).omit({ id: true });
export type InsertBetSelection = z.infer<typeof insertBetSelectionSchema>;
export type BetSelection = typeof betSelectionsTable.$inferSelect;
