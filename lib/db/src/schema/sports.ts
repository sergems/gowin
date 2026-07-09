import { pgTable, serial, text, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fixtureStatusEnum = pgEnum("fixture_status", [
  "upcoming",
  "live",
  "finished",
  "cancelled",
]);

export const sportsTable = pgTable("sports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
});

export const leaguesTable = pgTable("leagues", {
  id: serial("id").primaryKey(),
  sportId: integer("sport_id").notNull().references(() => sportsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  externalId: text("external_id").unique(),
  countryName: text("country_name"),
  countryKey: text("country_key"),
  countryLogo: text("country_logo"),
  leagueLogo: text("league_logo"),
  sortOrder: integer("sort_order").notNull().default(999),
});

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  externalId: text("external_id").unique(),
});

export const fixturesTable = pgTable("fixtures", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  homeTeamId: integer("home_team_id").notNull().references(() => teamsTable.id),
  awayTeamId: integer("away_team_id").notNull().references(() => teamsTable.id),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  status: fixtureStatusEnum("status").notNull().default("upcoming"),
  scoreHome: integer("score_home"),
  scoreAway: integer("score_away"),
  externalId: text("external_id").unique(),
});

export const marketsTable = pgTable("markets", {
  id: serial("id").primaryKey(),
  fixtureId: integer("fixture_id").notNull().references(() => fixturesTable.id, { onDelete: "cascade" }),
  marketType: text("market_type").notNull(),
  suspended: boolean("suspended").notNull().default(false),
});

export const oddsTable = pgTable("odds", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull().references(() => marketsTable.id, { onDelete: "cascade" }),
  selection: text("selection").notNull(),
  oddsValue: text("odds_value").notNull(),
});

export const insertSportSchema = createInsertSchema(sportsTable).omit({ id: true });
export type InsertSport = z.infer<typeof insertSportSchema>;
export type Sport = typeof sportsTable.$inferSelect;

export const insertLeagueSchema = createInsertSchema(leaguesTable).omit({ id: true });
export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type League = typeof leaguesTable.$inferSelect;

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;

export const insertFixtureSchema = createInsertSchema(fixturesTable).omit({ id: true });
export type InsertFixture = z.infer<typeof insertFixtureSchema>;
export type Fixture = typeof fixturesTable.$inferSelect;

export const insertMarketSchema = createInsertSchema(marketsTable).omit({ id: true });
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof marketsTable.$inferSelect;

export const insertOddsSchema = createInsertSchema(oddsTable).omit({ id: true });
export type InsertOdds = z.infer<typeof insertOddsSchema>;
export type OddsRow = typeof oddsTable.$inferSelect;

export const slidesTable = pgTable("slides", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
