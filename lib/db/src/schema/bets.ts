import { pgTable, serial, integer, numeric, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { fixturesTable } from "./sports";

export const betStatusEnum = pgEnum("bet_status", ["pending", "won", "lost", "void"]);

export const betsTable = pgTable("bets", {
  id: serial("id").primaryKey(),
  code: text("code").unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  stake: numeric("stake", { precision: 15, scale: 2 }).notNull(),
  totalOdds: numeric("total_odds", { precision: 10, scale: 4 }).notNull(),
  potentialWin: numeric("potential_win", { precision: 15, scale: 2 }).notNull(),
  status: betStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const betSelectionsTable = pgTable("bet_selections", {
  id: serial("id").primaryKey(),
  betId: integer("bet_id").notNull().references(() => betsTable.id, { onDelete: "cascade" }),
  fixtureId: integer("fixture_id").notNull().references(() => fixturesTable.id),
  market: text("market").notNull(),
  selection: text("selection").notNull(),
  odds: numeric("odds", { precision: 10, scale: 4 }).notNull(),
});

export const betBookingsTable = pgTable("bet_bookings", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  selections: text("selections").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const insertBetSchema = createInsertSchema(betsTable).omit({ id: true, createdAt: true });
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof betsTable.$inferSelect;

export const insertBetSelectionSchema = createInsertSchema(betSelectionsTable).omit({ id: true });
export type InsertBetSelection = z.infer<typeof insertBetSelectionSchema>;
export type BetSelection = typeof betSelectionsTable.$inferSelect;
