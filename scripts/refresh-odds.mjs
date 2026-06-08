/**
 * Refresh odds for all upcoming fixtures using real data from AllSportsAPI only.
 * - Updates odds where the API has data
 * - Clears odds where the API has no data (leaves market empty — can't bet)
 * - Never estimates or fabricates odds
 */

import pg from "/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const { Client } = pg;
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const CONCURRENCY = 8;
const API_BASE = "https://apiv2.allsportsapi.com/football";

// ── Get API key ──────────────────────────────────────────────────────────────
const { rows: keyRows } = await db.query(
  `SELECT value FROM settings WHERE key = 'allsports_api_key'`
);
const API_KEY = keyRows[0]?.value;
if (!API_KEY) { console.error("No API key in settings"); process.exit(1); }

// ── Load all upcoming fixtures within next 14 days ───────────────────────────
const { rows: fixtures } = await db.query(`
  SELECT id, external_id
  FROM fixtures
  WHERE status = 'upcoming'
    AND external_id IS NOT NULL
    AND start_time <= NOW() + INTERVAL '14 days'
  ORDER BY start_time ASC
`);

console.log(`Processing ${fixtures.length} fixtures ...`);

// ── Helpers ──────────────────────────────────────────────────────────────────
function valid(v) {
  return v != null && isFinite(Number(v)) && Number(v) > 1;
}

// ── Fetch real odds from API ──────────────────────────────────────────────────
async function fetchOdds(externalId) {
  try {
    const url = `${API_BASE}/?met=Odds&APIkey=${API_KEY}&matchId=${externalId}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await resp.json();
    if (data?.success === 1 && data?.result?.[externalId]) {
      const bks = data.result[externalId];
      const bk =
        bks.find((b) => b.odd_bookmakers === "bet365") ??
        bks.find((b) => b.odd_bookmakers === "WilliamHill") ??
        bks[0];
      if (bk && valid(bk.odd_1) && valid(bk.odd_x) && valid(bk.odd_2)) return bk;
    }
  } catch { /* timeout / network */ }
  return null;
}

// ── Get or create a market record ────────────────────────────────────────────
async function getOrCreateMarket(fixtureId, marketType) {
  const { rows } = await db.query(
    `SELECT id FROM markets WHERE fixture_id = $1 AND market_type = $2 LIMIT 1`,
    [fixtureId, marketType]
  );
  if (rows[0]) return rows[0].id;
  const ins = await db.query(
    `INSERT INTO markets (fixture_id, market_type) VALUES ($1, $2) RETURNING id`,
    [fixtureId, marketType]
  );
  return ins.rows[0].id;
}

// ── Refresh one fixture ───────────────────────────────────────────────────────
async function updateFixture(fixtureId, externalId) {
  const bk = await fetchOdds(externalId);

  // Wipe all existing odds for this fixture — no estimates allowed
  await db.query(`
    DELETE FROM odds
    WHERE market_id IN (SELECT id FROM markets WHERE fixture_id = $1)
  `, [fixtureId]);

  if (!bk) return false; // No data — all markets now empty, can't bet

  const oddsRows = [];

  // ── 1X2 ──────────────────────────────────────────────────────────────────
  if (valid(bk.odd_1) && valid(bk.odd_x) && valid(bk.odd_2)) {
    const mId = await getOrCreateMarket(fixtureId, "1X2");
    oddsRows.push(
      [mId, "Home", Number(bk.odd_1).toFixed(2)],
      [mId, "Draw", Number(bk.odd_x).toFixed(2)],
      [mId, "Away", Number(bk.odd_2).toFixed(2)],
    );
  }

  // ── Double Chance ─────────────────────────────────────────────────────────
  if (valid(bk.odd_1x) && valid(bk.odd_12) && valid(bk.odd_x2)) {
    const mId = await getOrCreateMarket(fixtureId, "Double Chance");
    oddsRows.push(
      [mId, "1X", Number(bk.odd_1x).toFixed(2)],
      [mId, "12", Number(bk.odd_12).toFixed(2)],
      [mId, "X2", Number(bk.odd_x2).toFixed(2)],
    );
  }

  // ── Both Teams To Score ───────────────────────────────────────────────────
  if (valid(bk.bts_yes) && valid(bk.bts_no)) {
    const mId = await getOrCreateMarket(fixtureId, "Both Teams To Score");
    oddsRows.push(
      [mId, "Yes", Number(bk.bts_yes).toFixed(2)],
      [mId, "No",  Number(bk.bts_no).toFixed(2)],
    );
  }

  // ── Over/Under lines ──────────────────────────────────────────────────────
  for (const line of ["0.5", "1.5", "2.5", "3.5", "4.5"]) {
    if (valid(bk[`o+${line}`]) && valid(bk[`u+${line}`])) {
      const mId = await getOrCreateMarket(fixtureId, `Over/Under ${line}`);
      oddsRows.push(
        [mId, `Over ${line}`,  Number(bk[`o+${line}`]).toFixed(2)],
        [mId, `Under ${line}`, Number(bk[`u+${line}`]).toFixed(2)],
      );
    }
  }

  // ── Asian Handicap — first valid line ─────────────────────────────────────
  const ahPairs = [
    ["ah-1_1", "ah-1_2", "-1", "+1"],
    ["ah-1.5_1", "ah-1.5_2", "-1.5", "+1.5"],
    ["ah0_1", "ah0_2", "0", "0"],
    ["ah+1_1", "ah+1_2", "+1", "-1"],
    ["ah+1.5_1", "ah+1.5_2", "+1.5", "-1.5"],
  ];
  for (const [k1, k2, l1, l2] of ahPairs) {
    if (valid(bk[k1]) && valid(bk[k2])) {
      // Re-use any existing AH market or create new
      const { rows: ahRows } = await db.query(
        `SELECT id FROM markets WHERE fixture_id = $1 AND market_type LIKE 'Asian Handicap%' LIMIT 1`,
        [fixtureId]
      );
      const mId = ahRows[0]?.id ?? (await getOrCreateMarket(fixtureId, `Asian Handicap ${l1}`));
      oddsRows.push(
        [mId, `Home (${l1})`, Number(bk[k1]).toFixed(2)],
        [mId, `Away (${l2})`, Number(bk[k2]).toFixed(2)],
      );
      break;
    }
  }

  // Bulk insert all new odds
  for (const [marketId, selection, oddsValue] of oddsRows) {
    await db.query(
      `INSERT INTO odds (market_id, selection, odds_value) VALUES ($1, $2, $3)`,
      [marketId, selection, oddsValue]
    );
  }

  return oddsRows.length > 0;
}

// ── Batch processing ─────────────────────────────────────────────────────────
let processed = 0, fromApi = 0, noData = 0;

for (let i = 0; i < fixtures.length; i += CONCURRENCY) {
  const batch = fixtures.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(async (f) => {
    const ok = await updateFixture(f.id, f.external_id);
    processed++;
    if (ok) fromApi++; else noData++;
  }));
  const pct = Math.round((processed / fixtures.length) * 100);
  process.stdout.write(`\r  ${processed}/${fixtures.length} (${pct}%)  — real: ${fromApi}  no data: ${noData}  `);
}

// Update last refresh timestamp
await db.query(
  `INSERT INTO settings (key, value, updated_at) VALUES ('last_odds_refresh', $1, NOW())
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
  [new Date().toISOString()]
);

console.log(`\nDone. ${fromApi} fixtures with real odds, ${noData} with no data (markets cleared).`);
await db.end();
