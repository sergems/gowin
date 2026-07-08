import { pgTable, text, serial, integer, numeric, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "manager", "branch_admin", "agent", "payout", "payment_clerk"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  publicId: integer("public_id").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneNumber: text("phone_number").unique(),
  mobileOperator: text("mobile_operator"),
  secondaryPhoneNumber: text("secondary_phone_number"),
  secondaryMobileOperator: text("secondary_mobile_operator"),
  disabled: boolean("disabled").notNull().default(false),
  disabledReason: text("disabled_reason"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  tempPasswordHash: text("temp_password_hash"),
  tempPasswordExpiry: timestamp("temp_password_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  branchId: integer("branch_id"),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).default("0.00"),
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
