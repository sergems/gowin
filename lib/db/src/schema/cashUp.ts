import { pgTable, serial, integer, numeric, text, timestamp, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const branchFloatAllocationsTable = pgTable("branch_float_allocations", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id),
  agentId: integer("agent_id").notNull().references(() => usersTable.id),
  allocatedBy: integer("allocated_by").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  shiftDate: date("shift_date").notNull(),
  shiftLabel: text("shift_label").notNull().default("Day"),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashUpSessionsTable = pgTable("cash_up_sessions", {
  id: serial("id").primaryKey(),
  allocationId: integer("allocation_id").notNull().references(() => branchFloatAllocationsTable.id),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id),
  agentId: integer("agent_id").notNull().references(() => usersTable.id),
  performedBy: integer("performed_by").notNull().references(() => usersTable.id),
  openingFloat: numeric("opening_float", { precision: 15, scale: 2 }).notNull(),
  totalBets: numeric("total_bets", { precision: 15, scale: 2 }).notNull().default("0"),
  totalPayouts: numeric("total_payouts", { precision: 15, scale: 2 }).notNull().default("0"),
  expectedReturn: numeric("expected_return", { precision: 15, scale: 2 }).notNull(),
  cashReturned: numeric("cash_returned", { precision: 15, scale: 2 }).notNull(),
  variance: numeric("variance", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BranchFloatAllocation = typeof branchFloatAllocationsTable.$inferSelect;
export type CashUpSession = typeof cashUpSessionsTable.$inferSelect;
