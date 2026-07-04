import { Router } from "express";
import { db, settingsTable, sportsTable, leaguesTable, teamsTable, fixturesTable, marketsTable, oddsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin, setJwtSecret, type AuthRequest } from "../middlewares/auth";
import { refreshAllUpcomingOdds } from "../lib/oddsRefresh";
import { sendTestEmail } from "../lib/email";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db
    .insert(settingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

function dateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function mapStatus(eventStatus: string): "upcoming" | "live" | "finished" | "cancelled" {
  if (!eventStatus || eventStatus === "") return "upcoming";
  const s = eventStatus.toLowerCase();
  if (s === "finished" || s === "ft" || s === "aet" || s === "pen" || s === "completed" || s === "complete") return "finished";
  if (s === "cancelled" || s === "postponed" || s === "abandoned" || s === "walkover" || s === "retired") return "cancelled";
  if (["1h", "ht", "2h", "et", "p", "live", "inprogress", "in play", "in_play",
       "q1", "q2", "q3", "q4", "ot", "1st", "2nd", "3rd", "4th",
       "break", "progress", "innings"].some((k) => s.includes(k))) return "live";
  return "upcoming";
}

function parseScore(result: string): { home: number | null; away: number | null } {
  if (!result || result === "-" || result.trim() === "") return { home: null, away: null };
  const parts = result.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { home: parts[0], away: parts[1] };
  }
  return { home: null, away: null };
}

function valid(n: any): boolean {
  return n != null && isFinite(Number(n)) && Number(n) > 1;
}

interface CountryInfo {
  name: string;
  logo: string | null;
  iso2: string | null;
}

async function upsertLeague(
  sportId: number,
  name: string,
  externalId: string,
  countryKey: string,
  countryName: string,
  countryLogo: string | null,
  leagueLogo: string | null,
): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO leagues (sport_id, name, external_id, country_key, country_name, country_logo, league_logo)
    VALUES (${sportId}, ${name}, ${externalId}, ${countryKey}, ${countryName}, ${countryLogo}, ${leagueLogo})
    ON CONFLICT (external_id) DO UPDATE SET
      name = EXCLUDED.name,
      country_key = EXCLUDED.country_key,
      country_name = EXCLUDED.country_name,
      country_logo = COALESCE(EXCLUDED.country_logo, leagues.country_logo),
      league_logo = COALESCE(EXCLUDED.league_logo, leagues.league_logo)
    RETURNING id
  `);
  return (result.rows[0] as any).id as number;
}

async function upsertTeam(name: string, logo: string | null, externalId: string): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO teams (name, logo, external_id)
    VALUES (${name}, ${logo}, ${externalId})
    ON CONFLICT (external_id) DO UPDATE SET
      name = EXCLUDED.name,
      logo = COALESCE(EXCLUDED.logo, teams.logo)
    RETURNING id
  `);
  return (result.rows[0] as any).id as number;
}

async function getOrCreateSport(name: string, icon: string) {
  let [sport] = await db.select().from(sportsTable).where(eq(sportsTable.name, name)).limit(1);
  if (!sport) {
    [sport] = await db.insert(sportsTable).values({ name, icon }).returning();
  }
  return sport;
}

// ── Fetch real odds from AllSportsAPI for a single match ────────────────────

async function fetchRealOdds(apiKey: string, matchId: string, apiBase: string = "football"): Promise<any | null> {
  try {
    const resp = await fetch(
      `https://apiv2.allsportsapi.com/${apiBase}/?met=Odds&APIkey=${apiKey}&matchId=${matchId}`,
      { signal: AbortSignal.timeout(10000) },
    );
    const data: any = await resp.json();
    if (data?.success === 1 && data?.result?.[matchId]) {
      const bookmakers: any[] = data.result[matchId];
      return (
        bookmakers.find((b) => b.odd_bookmakers === "bet365") ??
        bookmakers.find((b) => b.odd_bookmakers === "WilliamHill") ??
        bookmakers[0] ??
        null
      );
    }
  } catch {
    // non-fatal — fall back to no markets
  }
  return null;
}

// ── Football markets ─────────────────────────────────────────────────────────

async function insertFootballMarkets(fixtureId: number, real: any | null) {
  if (!real) return;

  // 1X2
  if (valid(real.odd_1) && valid(real.odd_x) && valid(real.odd_2)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "1X2" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "Home", oddsValue: Number(real.odd_1).toFixed(2) },
      { marketId: m.id, selection: "Draw", oddsValue: Number(real.odd_x).toFixed(2) },
      { marketId: m.id, selection: "Away", oddsValue: Number(real.odd_2).toFixed(2) },
    ]);
  }

  // Double Chance
  if (valid(real.odd_1x) && valid(real.odd_12) && valid(real.odd_x2)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "Double Chance" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "1X", oddsValue: Number(real.odd_1x).toFixed(2) },
      { marketId: m.id, selection: "12", oddsValue: Number(real.odd_12).toFixed(2) },
      { marketId: m.id, selection: "X2", oddsValue: Number(real.odd_x2).toFixed(2) },
    ]);
  }

  // Both Teams To Score
  if (valid(real.bts_yes) && valid(real.bts_no)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "Both Teams To Score" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "Yes", oddsValue: Number(real.bts_yes).toFixed(2) },
      { marketId: m.id, selection: "No", oddsValue: Number(real.bts_no).toFixed(2) },
    ]);
  }

  // Over/Under (5 lines)
  for (const line of ["0.5", "1.5", "2.5", "3.5", "4.5"]) {
    const overKey = `o+${line}`;
    const underKey = `u+${line}`;
    if (valid(real[overKey]) && valid(real[underKey])) {
      const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: `Over/Under ${line}` }).returning();
      await db.insert(oddsTable).values([
        { marketId: m.id, selection: `Over ${line}`, oddsValue: Number(real[overKey]).toFixed(2) },
        { marketId: m.id, selection: `Under ${line}`, oddsValue: Number(real[underKey]).toFixed(2) },
      ]);
    }
  }

  // Asian Handicap
  const ahPairs: Array<[string, string, string, string]> = [
    ["ah-1_1", "ah-1_2", "-1", "+1"],
    ["ah-1.5_1", "ah-1.5_2", "-1.5", "+1.5"],
    ["ah0_1", "ah0_2", "0", "0"],
    ["ah+1_1", "ah+1_2", "+1", "-1"],
    ["ah+1.5_1", "ah+1.5_2", "+1.5", "-1.5"],
  ];
  for (const [k1, k2, label1, label2] of ahPairs) {
    if (valid(real[k1]) && valid(real[k2])) {
      const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: `Asian Handicap ${label1}` }).returning();
      await db.insert(oddsTable).values([
        { marketId: m.id, selection: `Home (${label1})`, oddsValue: Number(real[k1]).toFixed(2) },
        { marketId: m.id, selection: `Away (${label2})`, oddsValue: Number(real[k2]).toFixed(2) },
      ]);
      break;
    }
  }
}

// ── Basketball markets ───────────────────────────────────────────────────────

async function insertBasketballMarkets(fixtureId: number, real: any | null) {
  if (!real) return;

  // Moneyline (no draw in basketball)
  if (valid(real.odd_1) && valid(real.odd_2)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "Moneyline" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "Home", oddsValue: Number(real.odd_1).toFixed(2) },
      { marketId: m.id, selection: "Away", oddsValue: Number(real.odd_2).toFixed(2) },
    ]);
  }

  // Point Spread (Asian Handicap)
  const ahPairs: Array<[string, string, string, string]> = [
    ["ah-10.5_1", "ah-10.5_2", "-10.5", "+10.5"],
    ["ah-7.5_1", "ah-7.5_2", "-7.5", "+7.5"],
    ["ah-5.5_1", "ah-5.5_2", "-5.5", "+5.5"],
    ["ah-3.5_1", "ah-3.5_2", "-3.5", "+3.5"],
    ["ah-1.5_1", "ah-1.5_2", "-1.5", "+1.5"],
    ["ah+1.5_1", "ah+1.5_2", "+1.5", "-1.5"],
    ["ah+3.5_1", "ah+3.5_2", "+3.5", "-3.5"],
    ["ah+5.5_1", "ah+5.5_2", "+5.5", "-5.5"],
  ];
  for (const [k1, k2, label1, label2] of ahPairs) {
    if (valid(real[k1]) && valid(real[k2])) {
      const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: `Point Spread ${label1}` }).returning();
      await db.insert(oddsTable).values([
        { marketId: m.id, selection: `Home (${label1})`, oddsValue: Number(real[k1]).toFixed(2) },
        { marketId: m.id, selection: `Away (${label2})`, oddsValue: Number(real[k2]).toFixed(2) },
      ]);
      break;
    }
  }

  // Total Points (Over/Under) — basketball lines are much higher
  const ouLines = ["150.5", "160.5", "170.5", "180.5", "190.5", "200.5", "210.5", "220.5",
                   "130.5", "140.5", "145.5", "155.5", "165.5", "175.5", "185.5", "195.5"];
  for (const line of ouLines) {
    const overKey = `o+${line}`;
    const underKey = `u+${line}`;
    if (valid(real[overKey]) && valid(real[underKey])) {
      const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: `Total Points ${line}` }).returning();
      await db.insert(oddsTable).values([
        { marketId: m.id, selection: `Over ${line}`, oddsValue: Number(real[overKey]).toFixed(2) },
        { marketId: m.id, selection: `Under ${line}`, oddsValue: Number(real[underKey]).toFixed(2) },
      ]);
      break;
    }
  }

  // Quarter Winner (if available via odd_1q1 etc. — varies by provider, try common keys)
  if (valid(real.odd_1q1) && valid(real.odd_xq1) && valid(real.odd_2q1)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "Quarter 1 Winner" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "Home", oddsValue: Number(real.odd_1q1).toFixed(2) },
      { marketId: m.id, selection: "Draw", oddsValue: Number(real.odd_xq1).toFixed(2) },
      { marketId: m.id, selection: "Away", oddsValue: Number(real.odd_2q1).toFixed(2) },
    ]);
  }
}

// ── Tennis markets ───────────────────────────────────────────────────────────

async function insertTennisMarkets(fixtureId: number, real: any | null, homeLabel: string, awayLabel: string) {
  if (!real) return;

  // Match Winner (no draw in tennis)
  if (valid(real.odd_1) && valid(real.odd_2)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "Match Winner" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: homeLabel, oddsValue: Number(real.odd_1).toFixed(2) },
      { marketId: m.id, selection: awayLabel, oddsValue: Number(real.odd_2).toFixed(2) },
    ]);
  }

  // Over/Under Games — tennis totals (number of games in a match)
  const tennisOuLines = ["17.5", "18.5", "19.5", "20.5", "21.5", "22.5", "23.5", "24.5",
                          "15.5", "16.5", "25.5", "26.5", "27.5", "28.5"];
  for (const line of tennisOuLines) {
    const overKey = `o+${line}`;
    const underKey = `u+${line}`;
    if (valid(real[overKey]) && valid(real[underKey])) {
      const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: `Over/Under Games ${line}` }).returning();
      await db.insert(oddsTable).values([
        { marketId: m.id, selection: `Over ${line}`, oddsValue: Number(real[overKey]).toFixed(2) },
        { marketId: m.id, selection: `Under ${line}`, oddsValue: Number(real[underKey]).toFixed(2) },
      ]);
      break;
    }
  }

  // Game Handicap (spread)
  const ahPairs: Array<[string, string, string, string]> = [
    ["ah-3.5_1", "ah-3.5_2", "-3.5", "+3.5"],
    ["ah-2.5_1", "ah-2.5_2", "-2.5", "+2.5"],
    ["ah-1.5_1", "ah-1.5_2", "-1.5", "+1.5"],
    ["ah+1.5_1", "ah+1.5_2", "+1.5", "-1.5"],
    ["ah+2.5_1", "ah+2.5_2", "+2.5", "-2.5"],
    ["ah+3.5_1", "ah+3.5_2", "+3.5", "-3.5"],
  ];
  for (const [k1, k2, label1, label2] of ahPairs) {
    if (valid(real[k1]) && valid(real[k2])) {
      const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: `Game Handicap ${label1}` }).returning();
      await db.insert(oddsTable).values([
        { marketId: m.id, selection: `${homeLabel} (${label1})`, oddsValue: Number(real[k1]).toFixed(2) },
        { marketId: m.id, selection: `${awayLabel} (${label2})`, oddsValue: Number(real[k2]).toFixed(2) },
      ]);
      break;
    }
  }

  // First Set Winner
  if (valid(real.odd_1fs) && valid(real.odd_2fs)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "First Set Winner" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: homeLabel, oddsValue: Number(real.odd_1fs).toFixed(2) },
      { marketId: m.id, selection: awayLabel, oddsValue: Number(real.odd_2fs).toFixed(2) },
    ]);
  }
}

// ── Cricket markets ───────────────────────────────────────────────────────────

async function insertCricketMarkets(fixtureId: number, real: any | null) {
  if (!real) return;

  // Match Winner (no draw in limited-overs; tests can draw)
  if (valid(real.odd_1) && valid(real.odd_2)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "Match Winner" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "Home", oddsValue: Number(real.odd_1).toFixed(2) },
      { marketId: m.id, selection: "Away", oddsValue: Number(real.odd_2).toFixed(2) },
    ]);
  }

  // Draw (Test matches may have draw)
  if (valid(real.odd_x)) {
    const markets = await db.select().from(marketsTable).where(eq(marketsTable.fixtureId, fixtureId));
    const matchWinner = markets.find((m) => m.marketType === "Match Winner");
    if (matchWinner && valid(real.odd_1) && valid(real.odd_2)) {
      // If there's a draw price, update Match Winner to include it
      await db.insert(oddsTable).values([
        { marketId: matchWinner.id, selection: "Draw", oddsValue: Number(real.odd_x).toFixed(2) },
      ]);
    }
  }

  // Total Runs (Over/Under)
  const cricketLines = ["150.5", "160.5", "170.5", "180.5", "200.5", "250.5", "300.5", "320.5",
                         "140.5", "145.5", "155.5", "165.5", "175.5", "190.5", "220.5", "280.5"];
  for (const line of cricketLines) {
    const overKey = `o+${line}`;
    const underKey = `u+${line}`;
    if (valid(real[overKey]) && valid(real[underKey])) {
      const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: `Total Runs ${line}` }).returning();
      await db.insert(oddsTable).values([
        { marketId: m.id, selection: `Over ${line}`, oddsValue: Number(real[overKey]).toFixed(2) },
        { marketId: m.id, selection: `Under ${line}`, oddsValue: Number(real[underKey]).toFixed(2) },
      ]);
      break;
    }
  }

  // Toss Winner (if available)
  if (valid(real.odd_toss_1) && valid(real.odd_toss_2)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "Toss Winner" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "Home", oddsValue: Number(real.odd_toss_1).toFixed(2) },
      { marketId: m.id, selection: "Away", oddsValue: Number(real.odd_toss_2).toFixed(2) },
    ]);
  }
}

// ── Generic sport sync ────────────────────────────────────────────────────────

interface SportSyncConfig {
  name: string;
  icon: string;
  apiBase: string;
  getLeagueExternalId: (e: any) => string;
  getLeagueName: (e: any) => string;
  getLeagueLogo: (e: any) => string | null;
  getHomeTeamName: (e: any) => string;
  getAwayTeamName: (e: any) => string;
  getHomeTeamKey: (e: any) => string;
  getAwayTeamKey: (e: any) => string;
  getHomeTeamLogo: (e: any) => string | null;
  getAwayTeamLogo: (e: any) => string | null;
  getFixtureKey: (e: any) => string;
  getDate: (e: any) => string;
  getTime: (e: any) => string | undefined;
  getStatus: (e: any) => string;
  getResult: (e: any) => string;
  getCountryKey: (e: any) => string;
  getCountryName: (e: any) => string;
  getCountryLogo: (e: any) => string | null;
  insertMarkets: (fixtureId: number, real: any | null, homeTeam: string, awayTeam: string) => Promise<void>;
}

const SPORT_CONFIGS: SportSyncConfig[] = [
  {
    name: "Football",
    icon: "⚽",
    apiBase: "football",
    getLeagueExternalId: (e) => String(e.league_key),
    getLeagueName: (e) => e.league_name ?? "Unknown League",
    getLeagueLogo: (e) => e.league_logo ?? null,
    getHomeTeamName: (e) => e.event_home_team ?? "Home",
    getAwayTeamName: (e) => e.event_away_team ?? "Away",
    getHomeTeamKey: (e) => String(e.home_team_key),
    getAwayTeamKey: (e) => String(e.away_team_key),
    getHomeTeamLogo: (e) => e.home_team_logo ?? null,
    getAwayTeamLogo: (e) => e.away_team_logo ?? null,
    getFixtureKey: (e) => String(e.event_key),
    getDate: (e) => e.event_date,
    getTime: (e) => e.event_time,
    getStatus: (e) => e.event_status ?? "",
    getResult: (e) => e.event_final_result ?? "",
    getCountryKey: (e) => String(e.event_country_key ?? ""),
    getCountryName: (e) => e.country_name ?? "Unknown",
    getCountryLogo: (e) => e.country_logo ?? null,
    insertMarkets: async (fixtureId, real) => insertFootballMarkets(fixtureId, real),
  },
  {
    name: "Basketball",
    icon: "🏀",
    apiBase: "basketball",
    getLeagueExternalId: (e) => "bball_league_" + String(e.league_key ?? e.event_key),
    getLeagueName: (e) => e.league_name ?? e.event_league ?? "Unknown League",
    getLeagueLogo: (e) => e.league_logo ?? null,
    getHomeTeamName: (e) => e.event_home_team ?? e.home_team ?? "Home",
    getAwayTeamName: (e) => e.event_away_team ?? e.away_team ?? "Away",
    getHomeTeamKey: (e) => "bball_team_" + String(e.home_team_key ?? "ht_" + String(e.event_key)),
    getAwayTeamKey: (e) => "bball_team_" + String(e.away_team_key ?? "at_" + String(e.event_key)),
    getHomeTeamLogo: (e) => e.event_home_team_logo ?? e.home_team_logo ?? null,
    getAwayTeamLogo: (e) => e.event_away_team_logo ?? e.away_team_logo ?? null,
    getFixtureKey: (e) => "bball_" + String(e.event_key),
    getDate: (e) => e.event_date,
    getTime: (e) => e.event_time,
    getStatus: (e) => e.event_status ?? "",
    getResult: (e) => e.event_final_result ?? "",
    getCountryKey: (e) => String(e.event_country_key ?? e.country_key ?? ""),
    getCountryName: (e) => e.country_name ?? e.event_country ?? "Unknown",
    getCountryLogo: (e) => e.country_logo ?? null,
    insertMarkets: async (fixtureId, real) => insertBasketballMarkets(fixtureId, real),
  },
  {
    name: "Tennis",
    icon: "🎾",
    apiBase: "tennis",
    getLeagueExternalId: (e) => "tennis_league_" + String(e.league_key ?? e.event_key),
    getLeagueName: (e) => e.league_name ?? e.tournament_name ?? "Unknown Tournament",
    getLeagueLogo: (e) => e.league_logo ?? null,
    // Tennis uses players, not teams — map to home/away slots
    getHomeTeamName: (e) => e.event_first_player ?? e.event_home_team ?? "Player 1",
    getAwayTeamName: (e) => e.event_second_player ?? e.event_away_team ?? "Player 2",
    getHomeTeamKey: (e) => "tennis_player_" + String(e.first_player_key ?? String(e.event_key) + "_1"),
    getAwayTeamKey: (e) => "tennis_player_" + String(e.second_player_key ?? String(e.event_key) + "_2"),
    getHomeTeamLogo: (e) => e.event_first_player_logo ?? e.first_player_logo ?? null,
    getAwayTeamLogo: (e) => e.event_second_player_logo ?? e.second_player_logo ?? null,
    getFixtureKey: (e) => "tennis_" + String(e.event_key),
    getDate: (e) => e.event_date,
    getTime: (e) => e.event_time,
    getStatus: (e) => e.event_status ?? "",
    getResult: (e) => e.event_final_result ?? "",
    getCountryKey: (e) => String(e.event_country_key ?? ""),
    getCountryName: (e) => e.country_name ?? "International",
    getCountryLogo: (e) => e.country_logo ?? null,
    insertMarkets: async (fixtureId, real, homeTeam, awayTeam) => insertTennisMarkets(fixtureId, real, homeTeam, awayTeam),
  },
  {
    name: "Cricket",
    icon: "🏏",
    apiBase: "cricket",
    getLeagueExternalId: (e) => "cricket_league_" + String(e.league_key ?? e.event_key),
    getLeagueName: (e) => e.league_name ?? "Unknown Competition",
    getLeagueLogo: (e) => e.league_logo ?? null,
    getHomeTeamName: (e) => e.event_home_team ?? e.home_team ?? "Home",
    getAwayTeamName: (e) => e.event_away_team ?? e.away_team ?? "Away",
    getHomeTeamKey: (e) => "cricket_team_" + String(e.home_team_key ?? "ht_" + String(e.event_key)),
    getAwayTeamKey: (e) => "cricket_team_" + String(e.away_team_key ?? "at_" + String(e.event_key)),
    getHomeTeamLogo: (e) => e.event_home_team_logo ?? e.home_team_logo ?? null,
    getAwayTeamLogo: (e) => e.event_away_team_logo ?? e.away_team_logo ?? null,
    getFixtureKey: (e) => "cricket_" + String(e.event_key),
    // Cricket uses event_date_start (not event_date)
    getDate: (e) => e.event_date_start ?? e.event_date ?? null,
    getTime: (e) => e.event_time,
    getStatus: (e) => e.event_status ?? "",
    getResult: (e) => {
      const h = e.event_home_final_result;
      const a = e.event_away_final_result;
      if (h && a && h !== "" && a !== "") return `${h}-${a}`;
      return e.event_final_result ?? "";
    },
    getCountryKey: (e) => String(e.event_country_key ?? ""),
    getCountryName: (e) => e.country_name ?? "International",
    getCountryLogo: (e) => e.country_logo ?? null,
    insertMarkets: async (fixtureId, real) => insertCricketMarkets(fixtureId, real),
  },
];

// ── Core sync function for a single sport ─────────────────────────────────────

async function syncSportFixtures(
  config: SportSyncConfig,
  apiKey: string,
  countryMap: Map<string, CountryInfo>,
  today: Date,
  future: Date,
): Promise<{ imported: number; updated: number; total: number; errors: string[] }> {
  const url = `https://apiv2.allsportsapi.com/${config.apiBase}/?met=Fixtures&APIkey=${apiKey}&from=${dateStr(today)}&to=${dateStr(future)}`;

  let apiData: any;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    apiData = await response.json();
  } catch (err: any) {
    return { imported: 0, updated: 0, total: 0, errors: [`Failed to reach ${config.name} API: ${err.message}`] };
  }

  if (apiData?.success !== 1 || !Array.isArray(apiData?.result)) {
    return { imported: 0, updated: 0, total: 0, errors: [`${config.name} API error: ${apiData?.message ?? `success=${apiData?.success}`}`] };
  }

  const events: any[] = apiData.result;
  const sport = await getOrCreateSport(config.name, config.icon);

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      const leagueExtId = config.getLeagueExternalId(event);
      const homeTeamName = config.getHomeTeamName(event);
      const awayTeamName = config.getAwayTeamName(event);
      const homeExtId = config.getHomeTeamKey(event);
      const awayExtId = config.getAwayTeamKey(event);
      const fixtureExtId = config.getFixtureKey(event);

      const countryKeyStr = config.getCountryKey(event);
      const countryInfo = countryMap.get(countryKeyStr);
      const countryName = config.getCountryName(event) ?? countryInfo?.name ?? "Unknown";
      const countryLogo = config.getCountryLogo(event) ?? countryInfo?.logo ?? null;
      const leagueLogo = config.getLeagueLogo(event);

      const leagueId = await upsertLeague(sport.id, config.getLeagueName(event), leagueExtId, countryKeyStr, countryName, countryLogo, leagueLogo);
      const homeTeamId = await upsertTeam(homeTeamName, config.getHomeTeamLogo(event), homeExtId);
      const awayTeamId = await upsertTeam(awayTeamName, config.getAwayTeamLogo(event), awayExtId);

      const rawDate = config.getDate(event);
      if (!rawDate || typeof rawDate !== "string" || !rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        errors.push(`[${config.name}] Event ${event.event_key}: missing/invalid event_date "${rawDate}"`);
        continue;
      }
      const timeStr = config.getTime(event) ?? "00:00";
      const safeTime = timeStr && typeof timeStr === "string" && timeStr.match(/^\d{2}:\d{2}$/) ? timeStr : "00:00";
      const rawStartTime = new Date(`${rawDate}T${safeTime}:00Z`);
      if (isNaN(rawStartTime.getTime())) {
        errors.push(`[${config.name}] Event ${event.event_key}: unparseable date "${rawDate}T${safeTime}"`);
        continue;
      }
      // AllSports API sends local time (UTC+2) labeled as UTC — subtract 2h for true UTC
      const startTime = new Date(rawStartTime.getTime() - 2 * 60 * 60 * 1000);
      const rawStatus = mapStatus(config.getStatus(event));
      const score = parseScore(config.getResult(event));

      const [existing] = await db.select({ id: fixturesTable.id }).from(fixturesTable).where(eq(fixturesTable.externalId, fixtureExtId)).limit(1);

      if (existing) {
        const updateFields: Record<string, unknown> = { status: rawStatus, scoreHome: score.home, scoreAway: score.away };
        if (rawStatus === "upcoming") {
          updateFields.startTime = startTime;
        }
        await db.update(fixturesTable).set(updateFields).where(eq(fixturesTable.id, existing.id));
        updated++;
      } else {
        const [fixture] = await db.insert(fixturesTable).values({
          leagueId, homeTeamId, awayTeamId, startTime, status: rawStatus,
          scoreHome: score.home, scoreAway: score.away, externalId: fixtureExtId,
        }).returning();

        if (rawStatus === "upcoming") {
          const realOdds = await fetchRealOdds(apiKey, String(event.event_key), config.apiBase);
          await config.insertMarkets(fixture.id, realOdds, homeTeamName, awayTeamName);
        }
        imported++;
      }
    } catch (err: any) {
      errors.push(`[${config.name}] Event ${event.event_key}: ${err.message}`);
    }
  }

  return { imported, updated, total: events.length, errors };
}

// ── GET /site-settings (public) ──────────────────────────────────────────────
router.get("/site-settings", async (_req, res): Promise<void> => {
  const [currency, language, exchangeRate] = await Promise.all([
    getSetting("site_currency"),
    getSetting("site_language"),
    getSetting("usd_to_cdf_rate"),
  ]);
  res.json({
    currency: currency ?? "USD",
    language: language ?? "en",
    exchangeRate: parseFloat(exchangeRate ?? "2800"),
  });
});

// ── GET /admin/site-settings ──────────────────────────────────────────────────
router.get("/admin/site-settings", requireAdmin, async (_req, res): Promise<void> => {
  const [currency, language, exchangeRate] = await Promise.all([
    getSetting("site_currency"),
    getSetting("site_language"),
    getSetting("usd_to_cdf_rate"),
  ]);
  res.json({
    currency: currency ?? "USD",
    language: language ?? "en",
    exchangeRate: parseFloat(exchangeRate ?? "2800"),
  });
});

// ── PUT /admin/site-settings ──────────────────────────────────────────────────
router.put("/admin/site-settings", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { currency, language, exchangeRate } = req.body;
  const saves: Promise<void>[] = [];
  if (currency && typeof currency === "string" && currency.trim()) {
    saves.push(setSetting("site_currency", currency.trim().toUpperCase()));
  }
  if (language && typeof language === "string" && ["en", "fr"].includes(language)) {
    saves.push(setSetting("site_language", language));
  }
  if (exchangeRate !== undefined) {
    const rate = parseFloat(String(exchangeRate));
    if (!isNaN(rate) && rate > 0) {
      saves.push(setSetting("usd_to_cdf_rate", String(rate)));
    }
  }
  await Promise.all(saves);
  res.json({ ok: true });
});

// ── GET /admin/settings ──────────────────────────────────────────────────────
router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const apiKey = await getSetting("allsports_api_key");
  const lastSync = await getSetting("last_sync");
  const syncStatus = await getSetting("sync_status");
  const syncSummary = await getSetting("sync_summary");
  res.json({
    apiKey: apiKey ?? "",
    lastSync: lastSync ?? "never",
    syncStatus: syncStatus ?? "idle",
    syncSummary: syncSummary ?? "",
  });
});

// ── PUT /admin/settings ──────────────────────────────────────────────────────
router.put("/admin/settings", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    res.status(400).json({ error: "API key is required" });
    return;
  }
  await setSetting("allsports_api_key", apiKey.trim());
  res.json({ ok: true });
});

// ── GET /admin/email-settings ─────────────────────────────────────────────────
router.get("/admin/email-settings", requireAdmin, async (_req, res): Promise<void> => {
  const host = await getSetting("smtp_host");
  const port = await getSetting("smtp_port");
  const user = await getSetting("smtp_user");
  const pass = await getSetting("smtp_pass");
  const secure = await getSetting("smtp_secure");
  const from = await getSetting("smtp_from");
  const appUrl = await getSetting("app_url");
  res.json({
    host: host ?? "",
    port: port ?? "587",
    user: user ?? "",
    hasPass: !!pass,
    secure: secure === "true",
    from: from ?? "",
    appUrl: appUrl ?? "",
    configured: !!(host && user && pass),
  });
});

// ── PUT /admin/email-settings ─────────────────────────────────────────────────
router.put("/admin/email-settings", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { host, port, user, pass, secure, from, appUrl } = req.body;
  if (!host || typeof host !== "string" || !host.trim()) {
    res.status(400).json({ error: "SMTP host is required" });
    return;
  }
  if (!user || typeof user !== "string" || !user.trim()) {
    res.status(400).json({ error: "SMTP username is required" });
    return;
  }
  await setSetting("smtp_host", host.trim());
  await setSetting("smtp_port", String(port || "587").trim());
  await setSetting("smtp_user", user.trim());
  if (pass && typeof pass === "string" && pass.trim() && pass !== "••••••••") {
    await setSetting("smtp_pass", pass.trim());
  }
  await setSetting("smtp_secure", secure ? "true" : "false");
  if (from && typeof from === "string" && from.trim()) {
    await setSetting("smtp_from", from.trim());
  }
  if (appUrl && typeof appUrl === "string" && appUrl.trim()) {
    await setSetting("app_url", appUrl.trim());
  }
  res.json({ ok: true });
});

// ── POST /admin/email-settings/test ──────────────────────────────────────────
router.post("/admin/email-settings/test", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { to } = req.body;
  if (!to || typeof to !== "string" || !to.trim()) {
    res.status(400).json({ error: "Recipient email address is required" });
    return;
  }
  const ok = await sendTestEmail(to.trim());
  if (ok) {
    res.json({ ok: true });
  } else {
    res.status(500).json({ error: "Failed to send test email — check your SMTP settings are saved and correct." });
  }
});

// ── POST /admin/refresh-odds ──────────────────────────────────────────────────
router.post("/admin/refresh-odds", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const result = await refreshAllUpcomingOdds();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Shared sync logic (called by route + daily scheduler) ─────────────────────
export async function runFullFixtureSync(sportFilter?: string): Promise<{
  ok: boolean; imported: number; updated: number; total: number; errors: string[]; lastSync: string;
}> {
  const apiKey = await getSetting("allsports_api_key");
  if (!apiKey) throw new Error("No API key configured. Add one in Settings first.");

  await setSetting("sync_status", "syncing");

  // 1. Fetch country list (football endpoint has the best country data)
  const countryMap = new Map<string, CountryInfo>();
  try {
    const cResp = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Countries&APIkey=${apiKey}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const cData: any = await cResp.json();
    if (cData?.success === 1 && Array.isArray(cData.result)) {
      for (const c of cData.result) {
        countryMap.set(String(c.country_key), {
          name: c.country_name,
          logo: c.country_logo ?? null,
          iso2: c.country_iso2 ?? null,
        });
      }
    }
  } catch { /* non-fatal */ }

  const today = new Date();
  const future = new Date(today);
  future.setDate(future.getDate() + 14);

  // 2. Sync all (or selected) sports
  const configsToSync = sportFilter
    ? SPORT_CONFIGS.filter((c) => c.name.toLowerCase() === sportFilter.toLowerCase())
    : SPORT_CONFIGS;

  let totalImported = 0;
  let totalUpdated = 0;
  let totalEvents = 0;
  const allErrors: string[] = [];

  for (const config of configsToSync) {
    const result = await syncSportFixtures(config, apiKey, countryMap, today, future);
    totalImported += result.imported;
    totalUpdated += result.updated;
    totalEvents += result.total;
    allErrors.push(...result.errors);
  }

  const timestamp = new Date().toISOString();
  await setSetting("last_sync", timestamp);
  await setSetting("sync_status", "idle");
  await setSetting("sync_summary", `${totalImported} imported, ${totalUpdated} updated, ${allErrors.length} errors out of ${totalEvents} total`);

  return { ok: true, imported: totalImported, updated: totalUpdated, total: totalEvents, errors: allErrors.slice(0, 20), lastSync: timestamp };
}

// ── POST /admin/sync-fixtures ─────────────────────────────────────────────────
router.post("/admin/sync-fixtures", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const apiKey = await getSetting("allsports_api_key");
  if (!apiKey) {
    res.status(400).json({ error: "No API key configured. Add one in Settings first." });
    return;
  }
  const sport = typeof req.body?.sport === "string" ? req.body.sport : undefined;
  try {
    const result = await runFullFixtureSync(sport);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// ── GET /admin/jwt-secret ─────────────────────────────────────────────────────
router.get("/admin/jwt-secret", requireAdmin, async (_req, res): Promise<void> => {
  const stored = await getSetting("jwt_secret");
  res.json({ isSet: !!stored });
});

// ── PUT /admin/jwt-secret ─────────────────────────────────────────────────────
router.put("/admin/jwt-secret", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { secret } = req.body as { secret?: string };
  if (!secret || typeof secret !== "string" || secret.trim().length < 16) {
    res.status(400).json({ error: "Le secret JWT doit comporter au moins 16 caractères." });
    return;
  }
  const trimmed = secret.trim();
  await setSetting("jwt_secret", trimmed);
  setJwtSecret(trimmed);
  res.json({ ok: true });
});

export default router;
