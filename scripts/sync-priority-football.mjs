/**
 * Standalone script: sync 60 days of football fixtures for the 6 priority countries.
 * Runs outside the api-server process — uses DATABASE_URL + AllSports API key directly.
 * Safe to run multiple times (full upsert).
 */
import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const PRIORITY_COUNTRIES = new Set(["England", "France", "Germany", "International", "Italy", "Spain"]);

function dateStr(d) {
  return d.toISOString().split("T")[0];
}

async function main() {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  // Get API key
  const { rows: [keyRow] } = await db.query("SELECT value FROM settings WHERE key='allsports_api_key'");
  const apiKey = keyRow?.value;
  if (!apiKey) { console.error("No allsports_api_key in settings"); process.exit(1); }

  // Get football sport id
  const { rows: [sportRow] } = await db.query("SELECT id FROM sports WHERE name='Football' LIMIT 1");
  const sportId = sportRow?.id;
  if (!sportId) { console.error("Football sport not found in DB"); process.exit(1); }

  console.log(`Sport ID: ${sportId}, API key: ${apiKey.slice(0,8)}...`);

  // Fetch country map from API
  const cResp = await fetch(`https://apiv2.allsportsapi.com/football/?met=Countries&APIkey=${apiKey}`, { signal: AbortSignal.timeout(15000) });
  const cData = await cResp.json();
  const countryMap = new Map();
  if (cData?.success === 1 && Array.isArray(cData.result)) {
    for (const c of cData.result) {
      countryMap.set(String(c.country_key), { name: c.country_name, logo: c.country_logo ?? null });
    }
  }
  console.log(`Country map: ${countryMap.size} entries`);

  const today = new Date();
  let totalImported = 0, totalUpdated = 0, totalSkipped = 0;

  // 3 batches: days 14-29, 30-44, 45-60
  const batches = [
    { startDay: 14, endDay: 29 },
    { startDay: 30, endDay: 44 },
    { startDay: 45, endDay: 60 },
  ];

  for (const { startDay, endDay } of batches) {
    const from = new Date(today); from.setDate(from.getDate() + startDay);
    const to   = new Date(today); to.setDate(to.getDate() + endDay);
    console.log(`\nBatch days ${startDay}-${endDay}: ${dateStr(from)} → ${dateStr(to)}`);

    let apiData;
    try {
      const url = `https://apiv2.allsportsapi.com/football/?met=Fixtures&APIkey=${apiKey}&from=${dateStr(from)}&to=${dateStr(to)}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(25000) });
      apiData = await resp.json();
    } catch (err) {
      console.error(`  Batch ${startDay}-${endDay} fetch failed:`, err.message);
      continue;
    }

    if (apiData?.success !== 1 || !Array.isArray(apiData?.result)) {
      console.error(`  API error: ${apiData?.message ?? apiData?.success}`);
      continue;
    }

    console.log(`  ${apiData.result.length} events from API`);

    for (const event of apiData.result) {
      const countryKey = String(event.event_country_key ?? "");
      const countryInfo = countryMap.get(countryKey);
      const countryName = event.country_name ?? countryInfo?.name ?? "Unknown";
      const countryLogo = event.country_logo ?? countryInfo?.logo ?? null;

      if (!PRIORITY_COUNTRIES.has(countryName)) { totalSkipped++; continue; }

      const leagueExtId = String(event.league_key);
      const leagueName  = event.league_name ?? "Unknown League";
      const leagueLogo  = event.league_logo ?? null;

      // Upsert league
      const leagueRes = await db.query(`
        INSERT INTO leagues (sport_id, name, external_id, country_key, country_name, country_logo, league_logo)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (external_id) DO UPDATE SET
          name=EXCLUDED.name, country_name=EXCLUDED.country_name,
          country_logo=EXCLUDED.country_logo, league_logo=EXCLUDED.league_logo
        RETURNING id`,
        [sportId, leagueName, leagueExtId, countryKey, countryName, countryLogo, leagueLogo]);
      const leagueId = leagueRes.rows[0].id;

      // Upsert teams
      const upsertTeam = async (name, logo, extId) => {
        const r = await db.query(`
          INSERT INTO teams (name, logo, external_id)
          VALUES ($1,$2,$3)
          ON CONFLICT (external_id) DO UPDATE SET name=EXCLUDED.name, logo=EXCLUDED.logo
          RETURNING id`, [name, logo ?? null, extId]);
        return r.rows[0].id;
      };
      const homeTeamId = await upsertTeam(event.event_home_team ?? "Home", event.home_team_logo, String(event.home_team_key));
      const awayTeamId = await upsertTeam(event.event_away_team ?? "Away", event.away_team_logo, String(event.away_team_key));

      const rawDate = event.event_date;
      if (!rawDate || !rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
      const timeStr = event.event_time ?? "00:00";
      const safeTime = timeStr.match(/^\d{2}:\d{2}$/) ? timeStr : "00:00";
      const startTime = new Date(new Date(`${rawDate}T${safeTime}:00Z`).getTime() - 2 * 3600 * 1000);

      const fixtureExtId = String(event.event_key);

      // Check if exists
      const existing = await db.query("SELECT id FROM fixtures WHERE external_id=$1 LIMIT 1", [fixtureExtId]);
      if (existing.rows.length > 0) {
        await db.query("UPDATE fixtures SET status='upcoming' WHERE id=$1 AND status='upcoming'", [existing.rows[0].id]);
        totalUpdated++;
      } else {
        await db.query(`
          INSERT INTO fixtures (league_id, home_team_id, away_team_id, start_time, status, score_home, score_away, external_id)
          VALUES ($1,$2,$3,$4,'upcoming',NULL,NULL,$5)
          ON CONFLICT (external_id) DO NOTHING`,
          [leagueId, homeTeamId, awayTeamId, startTime, fixtureExtId]);
        totalImported++;
      }
    }
    console.log(`  Done — imported ${totalImported} total, updated ${totalUpdated}, skipped ${totalSkipped} non-priority`);
  }

  console.log(`\n✓ Priority sync complete: ${totalImported} imported, ${totalUpdated} updated`);
  await db.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
