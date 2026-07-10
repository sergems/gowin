import { pgTable, serial, integer, numeric, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { betsTable } from "./bets";

// Every cash-out attempt (offered or accepted) is logged here for audit/compliance.
export const cashOutAuditLogTable = pgTable("cash_out_audit_log", {
  id: serial("id").primaryKey(),
  betId: integer("bet_id").notNull().references(() => betsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  username: text("username"),
  stake: numeric("stake", { precision: 15, scale: 2 }).notNull(),
  potentialWin: numeric("potential_win", { precision: 15, scale: 2 }).notNull(),
  offerAmount: numeric("offer_amount", { precision: 15, scale: 2 }).notNull(),
  acceptedAmount: numeric("accepted_amount", { precision: 15, scale: 2 }),
  marginUsed: numeric("margin_used", { precision: 8, scale: 2 }).notNull(),
  remainingSelections: jsonb("remaining_selections").notNull(),
  liveOdds: jsonb("live_odds").notNull(),
  adminSettingsVersion: text("admin_settings_version"),
  ipAddress: text("ip_address"),
  browser: text("browser"),
  device: text("device"),
  // "offered" — offer computed/displayed, "accepted" — customer confirmed, "failed" — accept attempt rejected
  status: text("status").notNull().default("offered"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CashOutAuditLog = typeof cashOutAuditLogTable.$inferSelect;
