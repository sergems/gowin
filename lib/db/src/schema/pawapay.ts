import { pgTable, serial, integer, numeric, text, timestamp, jsonb, boolean, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { walletsTable } from "./wallets";

export const pawapayDepositsTable = pgTable("pawapay_deposits", {
  id: serial("id").primaryKey(),
  depositId: text("deposit_id").notNull().unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  walletId: integer("wallet_id").notNull().references(() => walletsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  phoneNumber: text("phone_number").notNull(),
  operator: text("operator"),
  status: text("status").notNull().default("PENDING"),
  pawapayStatus: text("pawapay_status"),
  pawapayResponse: jsonb("pawapay_response"),
  walletCredited: boolean("wallet_credited").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookLogsTable = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PawapayDeposit = typeof pawapayDepositsTable.$inferSelect;
export type WebhookLog = typeof webhookLogsTable.$inferSelect;
