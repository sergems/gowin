import { pgTable, serial, integer, numeric, text, timestamp, pgEnum, jsonb, varchar, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "approved",
  "rejected",
  "paid",
  "clerk_review",
  "processing",
  "completed",
  "failed",
]);

export const withdrawalsTable = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  bankDetails: text("bank_details").notNull(),
  status: withdrawalStatusEnum("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  betId: integer("bet_id"),
  branchId: integer("branch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // PawaPay fields
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  phoneNumber: text("phone_number"),
  operator: text("operator"),
  pawapayPayoutId: text("pawapay_payout_id"),
  pawapayStatus: text("pawapay_status"),
  pawapayResponse: jsonb("pawapay_response"),
  clerkId: integer("clerk_id").references(() => usersTable.id),
  clerkNote: text("clerk_note"),
  clerkActionedAt: timestamp("clerk_actioned_at", { withTimezone: true }),
});

export type Withdrawal = typeof withdrawalsTable.$inferSelect;
