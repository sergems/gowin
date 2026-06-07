import { pgTable, serial, integer, numeric, timestamp, text, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "credit",
  "debit",
  "bet_placed",
  "bet_won",
  "bet_refund",
  "voucher_redeem",
]);

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
});

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => walletsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vouchersTable = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  isRedeemed: boolean("is_redeemed").notNull().default(false),
  redeemedBy: integer("redeemed_by").references(() => usersTable.id, { onDelete: "set null" }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVoucherSchema = createInsertSchema(vouchersTable).omit({ id: true, createdAt: true });
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Voucher = typeof vouchersTable.$inferSelect;

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
