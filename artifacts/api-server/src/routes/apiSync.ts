import { Router } from "express";
import { db, settingsTable, sportsTable, leaguesTable, teamsTable, fixturesTable, marketsTable, oddsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";
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
  if (s === "finished" || s === "ft" || s === "aet" || s === "pen") return "finished";
  if (s === "cancelled" || s === "postponed" || s === "abandoned") return "cancelled";
  if (["1h", "ht", "2h", "et", "p", "live", "inprogress"].some((k) => s.includes(k))) return "live";
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
      country_logo = EXCLUDED.country_logo,
      league_logo = EXCLUDED.league_logo
    RETURNING id
  `);
  return (result.rows[0] as any).id as number;
}

async function upsertTeam(name: string, logo: string | null, externalId: string): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO teams (name, logo, external_id)
    VALUES (${name}, ${logo}, ${externalId})
    ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name, logo = EXCLUDED.logo
    RETURNING id
  `);
  return (result.rows[0] as any).id as number;
}

// ── Fetch real odds from AllSportsAPI for a single match ────────────────────

async function fetchRealOdds(apiKey: string, matchId: string): Promise<any | null> {
  try {
    const resp = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Odds&APIkey=${apiKey}&matchId=${matchId}`,
      { signal: AbortSignal.timeout(10000) },
    );
    const data = await resp.json();
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
    // non-fatal — fall back to generated odds
  }
  return null;
}

function valid(n: any): boolean {
  return n != null && isFinite(Number(n)) && Number(n) > 1;
}

// ── Insert only real API-sourced markets for a new upcoming fixture ──────────

async function insertAllMarkets(fixtureId: number, real: any | null, _seed: number) {
  if (!real) return; // No real odds from API — create no markets

  // ── 1X2 ───────────────────────────────────────────────────────────────────
  if (valid(real.odd_1) && valid(real.odd_x) && valid(real.odd_2)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "1X2" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "Home", oddsValue: Number(real.odd_1).toFixed(2) },
      { marketId: m.id, selection: "Draw", oddsValue: Number(real.odd_x).toFixed(2) },
      { marketId: m.id, selection: "Away", oddsValue: Number(real.odd_2).toFixed(2) },
    ]);
  }

  // ── Double Chance ─────────────────────────────────────────────────────────
  if (valid(real.odd_1x) && valid(real.odd_12) && valid(real.odd_x2)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "Double Chance" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "1X", oddsValue: Number(real.odd_1x).toFixed(2) },
      { marketId: m.id, selection: "12", oddsValue: Number(real.odd_12).toFixed(2) },
      { marketId: m.id, selection: "X2", oddsValue: Number(real.odd_x2).toFixed(2) },
    ]);
  }

  // ── Both Teams To Score ───────────────────────────────────────────────────
  if (valid(real.bts_yes) && valid(real.bts_no)) {
    const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: "Both Teams To Score" }).returning();
    await db.insert(oddsTable).values([
      { marketId: m.id, selection: "Yes", oddsValue: Number(real.bts_yes).toFixed(2) },
      { marketId: m.id, selection: "No",  oddsValue: Number(real.bts_no).toFixed(2) },
    ]);
  }

  // ── Over/Under (5 lines) ──────────────────────────────────────────────────
  for (const line of ["0.5", "1.5", "2.5", "3.5", "4.5"]) {
    const overKey = `o+${line}`;
    const underKey = `u+${line}`;
    if (valid(real[overKey]) && valid(real[underKey])) {
      const [m] = await db.insert(marketsTable).values({ fixtureId, marketType: `Over/Under ${line}` }).returning();
      await db.insert(oddsTable).values([
        { marketId: m.id, selection: `Over ${line}`,  oddsValue: Number(real[overKey]).toFixed(2) },
        { marketId: m.id, selection: `Under ${line}`, oddsValue: Number(real[underKey]).toFixed(2) },
      ]);
    }
  }

  // ── Asian Handicap — first valid line from API ─────────────────────────────
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

// ── GET /site-settings (public) ──────────────────────────────────────────────
router.get("/site-settings", async (_req, res): Promise<void> => {
  const currency = await getSetting("site_currency");
  const language = await getSetting("site_language");
  res.json({
    currency: currency ?? "USD",
    language: language ?? "en",
  });
});

// ── GET /admin/site-settings ──────────────────────────────────────────────────
router.get("/admin/site-settings", requireAdmin, async (_req, res): Promise<void> => {
  const currency = await getSetting("site_currency");
  const language = await getSetting("site_language");
  res.json({
    currency: currency ?? "USD",
    language: language ?? "en",
  });
});

// ── PUT /admin/site-settings ──────────────────────────────────────────────────
router.put("/admin/site-settings", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { currency, language } = req.body;
  if (currency && typeof currency === "string" && currency.trim()) {
    await setSetting("site_currency", currency.trim().toUpperCase());
  }
  if (language && typeof language === "string" && ["en", "fr"].includes(language)) {
    await setSetting("site_language", language);
  }
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

// ── POST /admin/sync-fixtures ─────────────────────────────────────────────────
router.post("/admin/sync-fixtures", requireAdmin, async (_req, res): Promise<void> => {
  const apiKey = await getSetting("allsports_api_key");
  if (!apiKey) {
    res.status(400).json({ error: "No API key configured. Add one in Settings first." });
    return;
  }

  await setSetting("sync_status", "syncing");

  // 1. Fetch country list
  const countryMap = new Map<string, CountryInfo>();
  try {
    const cResp = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Countries&APIkey=${apiKey}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const cData = await cResp.json();
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

  // 2. Fetch fixtures for next 14 days
  const today = new Date();
  const future = new Date(today);
  future.setDate(future.getDate() + 14);
  const url = `https://apiv2.allsportsapi.com/football/?met=Fixtures&APIkey=${apiKey}&from=${dateStr(today)}&to=${dateStr(future)}`;

  let apiData: any;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    apiData = await response.json();
  } catch (err: any) {
    await setSetting("sync_status", "error");
    res.status(502).json({ error: "Failed to reach AllSportsAPI", detail: err.message });
    return;
  }

  if (apiData?.success !== 1 || !Array.isArray(apiData?.result)) {
    await setSetting("sync_status", "error");
    res.status(502).json({
      error: "AllSportsAPI returned an error",
      detail: apiData?.message ?? `success=${apiData?.success}`,
    });
    return;
  }

  const events: any[] = apiData.result;
  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  let [footballSport] = await db.select().from(sportsTable).where(eq(sportsTable.name, "Football")).limit(1);
  if (!footballSport) {
    [footballSport] = await db.insert(sportsTable).values({ name: "Football", icon: "⚽" }).returning();
  }

  for (const event of events) {
    try {
      const leagueExtId = String(event.league_key);
      const homeExtId = String(event.home_team_key);
      const awayExtId = String(event.away_team_key);
      const fixtureExtId = String(event.event_key);

      const countryKeyStr = String(event.event_country_key ?? "");
      const countryInfo = countryMap.get(countryKeyStr);
      const countryName = event.country_name ?? countryInfo?.name ?? "Unknown";
      const countryLogo = event.country_logo ?? countryInfo?.logo ?? null;
      const leagueLogo = event.league_logo ?? null;

      const leagueId = await upsertLeague(footballSport.id, event.league_name ?? "Unknown League", leagueExtId, countryKeyStr, countryName, countryLogo, leagueLogo);
      const homeTeamId = await upsertTeam(event.event_home_team, event.home_team_logo ?? null, homeExtId);
      const awayTeamId = await upsertTeam(event.event_away_team, event.away_team_logo ?? null, awayExtId);

      // The AllSports API sends event_time as local time (UTC+2) but labels it as UTC.
      // Subtract 2 hours to get true UTC so live/upcoming detection stays in sync.
      const rawStartTime = new Date(`${event.event_date}T${event.event_time ?? "00:00"}:00Z`);
      const startTime = new Date(rawStartTime.getTime() - 2 * 60 * 60 * 1000);
      const rawStatus = mapStatus(event.event_status ?? "");
      const score = parseScore(event.event_final_result ?? "");

      const [existing] = await db.select({ id: fixturesTable.id }).from(fixturesTable).where(eq(fixturesTable.externalId, fixtureExtId)).limit(1);

      if (existing) {
        const updateFields: Record<string, unknown> = { status: rawStatus, scoreHome: score.home, scoreAway: score.away };
        if (rawStatus === "upcoming") {
          updateFields.startTime = startTime;
        }
        await db.update(fixturesTable).set(updateFields).where(eq(fixturesTable.id, existing.id));
        updated++;
      } else {
        const [fixture] = await db.insert(fixturesTable).values({ leagueId, homeTeamId, awayTeamId, startTime, status: rawStatus, scoreHome: score.home, scoreAway: score.away, externalId: fixtureExtId }).returning();

        if (rawStatus === "upcoming") {
          // Try to fetch real odds from AllSportsAPI
          const realOdds = await fetchRealOdds(apiKey, fixtureExtId);
          const seed = (parseInt(fixtureExtId, 10) % 1000) / 1000;
          await insertAllMarkets(fixture.id, realOdds, seed);
        }
        imported++;
      }
    } catch (err: any) {
      errors.push(`Event ${event.event_key}: ${err.message}`);
    }
  }

  const timestamp = new Date().toISOString();
  await setSetting("last_sync", timestamp);
  await setSetting("sync_status", "idle");
  await setSetting("sync_summary", `${imported} imported, ${updated} updated, ${errors.length} errors out of ${events.length} total`);

  res.json({ ok: true, imported, updated, total: events.length, errors: errors.slice(0, 10), lastSync: timestamp });
});

export default router;
