import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralRewardsTable = pgTable("referral_rewards", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id")
    .notNull()
    .references(() => usersTable.id),
  referredUserId: integer("referred_user_id")
    .notNull()
    .references(() => usersTable.id),
  depositNumber: integer("deposit_number").notNull(), // 1-5
  depositAmount: numeric("deposit_amount", { precision: 15, scale: 2 }).notNull(),
  rewardAmount: numeric("reward_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("credited"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReferralReward = typeof referralRewardsTable.$inferSelect;
