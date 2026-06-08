/**
 * Refresh 1X2 odds (and all derived markets) for all upcoming fixtures.
 * - Fetches real odds from AllSportsAPI where available
 * - Falls back to a realistic deterministic model based on fixture ID seed
 */

import pg from "/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const { Client } = pg;
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

// ── Config ──────────────────────────────────────────────────────────────────
const CONCURRENCY = 25;
const API_BASE = "https://apiv2.allsportsapi.com/football";

// ── Get API key ──────────────────────────────────────────────────────────────
const { rows: keyRows } = await db.query(
  `SELECT value FROM settings WHERE key = 'allsports_api_key'`
);
const API_KEY = keyRows[0]?.value;
if (!API_KEY) { console.error("No API key in settings"); process.exit(1); }

// ── Load all upcoming fixtures ───────────────────────────────────────────────
const { rows: fixtures } = await db.query(`
  SELECT f.id, f.external_id,
         m.id AS market_id
  FROM fixtures f
  JOIN markets m ON m.fixture_id = f.id AND m.market_type = '1X2'
  WHERE f.status = 'upcoming' AND f.external_id IS NOT NULL
  ORDER BY f.start_time ASC
`);

console.log(`Processing ${fixtures.length} fixtures ...`);

// ── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Realistic seed-based odds generator.
 * Produces one "team differential" so one side is usually favoured.
 */
function realisticOdds(seed) {
  // Use seed to generate a home advantage factor (0..1)
  // Then map to a realistic market distribution
  const s1 = ((seed * 9301 + 49297) % 233280) / 233280;
  const s2 = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  // "Strength differential" — how lopsided is the match?
  // 0 = equal, 1 = maximum favourite
  const diff = s1 * 0.85;          // 0..0.85
  const homeAdv = s2 > 0.5;        // who is stronger: home or away

  // Implied win probabilities (margin ~6%)
  const mg = 1.06;
  let pH, pD, pA;

  if (diff < 0.15) {
    // Close match (coin-flip)
    pH = 0.33 + (s1 - 0.075) * 0.3;
    pA = 0.33 - (s1 - 0.075) * 0.3;
    pD = 1.0 - pH - pA;
  } else if (diff < 0.45) {
    // Moderate favourite
    const strongP = 0.48 + diff * 0.35;
    const weakP   = 0.20 + (0.45 - diff) * 0.20;
    pD = 1.0 - strongP - weakP;
    pH = homeAdv ? strongP : weakP;
    pA = homeAdv ? weakP   : strongP;
  } else {
    // Clear favourite (1.10 – 1.55 range)
    const strongP = 0.60 + diff * 0.25;
    const weakP   = 0.12 + (0.85 - diff) * 0.12;
    pD = 1.0 - strongP - weakP;
    pH = homeAdv ? strongP : weakP;
    pA = homeAdv ? weakP   : strongP;
  }

  pD = Math.max(0.15, Math.min(0.35, pD));

  // Normalise so they sum to 1
  const sum = pH + pD + pA;
  pH /= sum; pD /= sum; pA /= sum;

  return {
    home: clamp(parseFloat((1 / (pH * mg)).toFixed(2)), 1.05, 18),
    draw: clamp(parseFloat((1 / (pD * mg)).toFixed(2)), 2.50, 5.50),
    away: clamp(parseFloat((1 / (pA * mg)).toFixed(2)), 1.05, 18),
  };
}

// ── Fetch real odds for one fixture ─────────────────────────────────────────
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
      if (bk?.odd_1 > 1 && bk?.odd_x > 1 && bk?.odd_2 > 1) {
        return {
          home: parseFloat(bk.odd_1.toFixed(2)),
          draw: parseFloat(bk.odd_x.toFixed(2)),
          away: parseFloat(bk.odd_2.toFixed(2)),
          btsYes: bk.bts_yes > 1 ? parseFloat(bk.bts_yes.toFixed(2)) : null,
          btsNo:  bk.bts_no  > 1 ? parseFloat(bk.bts_no.toFixed(2))  : null,
          dc1x:   bk.odd_1x  > 1 ? parseFloat(bk.odd_1x.toFixed(2))  : null,
          dc12:   bk.odd_12  > 1 ? parseFloat(bk.odd_12.toFixed(2))  : null,
          dcx2:   bk.odd_x2  > 1 ? parseFloat(bk.odd_x2.toFixed(2))  : null,
        };
      }
    }
  } catch { /* timeout / network */ }
  return null;
}

// ── Update one fixture's markets ─────────────────────────────────────────────
async function updateFixture(fixtureId, marketId, externalId, realOdds, seed) {
  const o = realOdds ?? realisticOdds(seed);
  const mg = 1.06;

  // Derive normalised probabilities
  const pH = 1 / o.home, pD = 1 / o.draw, pA = 1 / o.away;
  const tot = pH + pD + pA;
  const nH = pH / tot, nD = pD / tot, nA = pA / tot;

  // ── 1X2 ──────────────────────────────────────────────────────────────────
  await db.query(
    `UPDATE odds SET odds_value = CASE
       WHEN selection = 'Home' THEN $1
       WHEN selection = 'Draw' THEN $2
       WHEN selection = 'Away' THEN $3
     END
     WHERE market_id = $4 AND selection IN ('Home','Draw','Away')`,
    [o.home.toFixed(2), o.draw.toFixed(2), o.away.toFixed(2), marketId]
  );

  // ── Double Chance ─────────────────────────────────────────────────────────
  const dc1x = realOdds?.dc1x ?? parseFloat((1 / ((nH + nD) * mg)).toFixed(2));
  const dc12 = realOdds?.dc12 ?? parseFloat((1 / ((nH + nA) * mg)).toFixed(2));
  const dcx2 = realOdds?.dcx2 ?? parseFloat((1 / ((nD + nA) * mg)).toFixed(2));
  await db.query(
    `UPDATE odds SET odds_value = CASE
       WHEN selection = '1X' THEN $1
       WHEN selection = '12' THEN $2
       WHEN selection = 'X2' THEN $3
     END
     FROM markets m
     WHERE odds.market_id = m.id AND m.fixture_id = $4 AND m.market_type = 'Double Chance'
       AND odds.selection IN ('1X','12','X2')`,
    [dc1x.toFixed(2), dc12.toFixed(2), dcx2.toFixed(2), fixtureId]
  );

  // ── Draw No Bet ───────────────────────────────────────────────────────────
  const dnbH = parseFloat((1 / (nH / (nH + nA) * mg)).toFixed(2));
  const dnbA = parseFloat((1 / (nA / (nH + nA) * mg)).toFixed(2));
  await db.query(
    `UPDATE odds SET odds_value = CASE
       WHEN selection = 'Home' THEN $1
       WHEN selection = 'Away' THEN $2
     END
     FROM markets m
     WHERE odds.market_id = m.id AND m.fixture_id = $3 AND m.market_type = 'Draw No Bet'
       AND odds.selection IN ('Home','Away')`,
    [dnbH.toFixed(2), dnbA.toFixed(2), fixtureId]
  );

  // ── Asian Handicap 0 ──────────────────────────────────────────────────────
  await db.query(
    `UPDATE odds SET odds_value = CASE
       WHEN selection LIKE 'Home%' THEN $1
       WHEN selection LIKE 'Away%' THEN $2
     END
     FROM markets m
     WHERE odds.market_id = m.id AND m.fixture_id = $3 AND m.market_type LIKE 'Asian Handicap%'
       AND (odds.selection LIKE 'Home%' OR odds.selection LIKE 'Away%')`,
    [dnbH.toFixed(2), dnbA.toFixed(2), fixtureId]
  );

  // ── BTTS ──────────────────────────────────────────────────────────────────
  if (realOdds?.btsYes && realOdds?.btsNo) {
    await db.query(
      `UPDATE odds SET odds_value = CASE
         WHEN selection = 'Yes' THEN $1
         WHEN selection = 'No'  THEN $2
       END
       FROM markets m
       WHERE odds.market_id = m.id AND m.fixture_id = $3 AND m.market_type = 'Both Teams To Score'
         AND odds.selection IN ('Yes','No')`,
      [realOdds.btsYes.toFixed(2), realOdds.btsNo.toFixed(2), fixtureId]
    );
  }

  // ── European Handicap ─────────────────────────────────────────────────────
  const ehH = Math.max(1.01, o.home * 0.65);
  const ehD = Math.max(1.01, o.draw * 0.85);
  const ehA = Math.max(1.01, o.away * 1.45);
  await db.query(
    `UPDATE odds SET odds_value = CASE
       WHEN selection = 'Home -1' THEN $1
       WHEN selection = 'Draw'    THEN $2
       WHEN selection = 'Away +1' THEN $3
     END
     FROM markets m
     WHERE odds.market_id = m.id AND m.fixture_id = $4 AND m.market_type = 'European Handicap'`,
    [ehH.toFixed(2), ehD.toFixed(2), ehA.toFixed(2), fixtureId]
  );

  // ── Half-Time Result ──────────────────────────────────────────────────────
  const htH = Math.max(1.01, o.home * 1.25);
  const htD = Math.max(1.01, o.draw * 0.70);
  const htA = Math.max(1.01, o.away * 1.25);
  await db.query(
    `UPDATE odds SET odds_value = CASE
       WHEN selection = 'Home' THEN $1
       WHEN selection = 'Draw' THEN $2
       WHEN selection = 'Away' THEN $3
     END
     FROM markets m
     WHERE odds.market_id = m.id AND m.fixture_id = $4 AND m.market_type = 'Half-Time Result'`,
    [htH.toFixed(2), htD.toFixed(2), htA.toFixed(2), fixtureId]
  );

  // ── Win Either Half (Home & Away) ─────────────────────────────────────────
  const hWehYes = Math.max(1.10, o.home * 0.80);
  const hWehNo  = Math.max(1.10, (1 / (1 - 1 / hWehYes)) * mg);
  const aWehYes = Math.max(1.10, o.away * 0.80);
  const aWehNo  = Math.max(1.10, (1 / (1 - 1 / aWehYes)) * mg);
  await db.query(
    `UPDATE odds SET odds_value = CASE
       WHEN selection = 'Yes' THEN $1
       WHEN selection = 'No'  THEN $2
     END
     FROM markets m
     WHERE odds.market_id = m.id AND m.fixture_id = $3 AND m.market_type = 'Home Win Either Half'`,
    [hWehYes.toFixed(2), hWehNo.toFixed(2), fixtureId]
  );
  await db.query(
    `UPDATE odds SET odds_value = CASE
       WHEN selection = 'Yes' THEN $1
       WHEN selection = 'No'  THEN $2
     END
     FROM markets m
     WHERE odds.market_id = m.id AND m.fixture_id = $3 AND m.market_type = 'Away Win Either Half'`,
    [aWehYes.toFixed(2), aWehNo.toFixed(2), fixtureId]
  );
}

// ── Batch processing ─────────────────────────────────────────────────────────
let updated = 0, fromApi = 0, fromModel = 0;

for (let i = 0; i < fixtures.length; i += CONCURRENCY) {
  const batch = fixtures.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(async (f) => {
    const seed = parseInt(f.external_id, 10);
    const real = await fetchOdds(f.external_id);
    await updateFixture(f.id, f.market_id, f.external_id, real, seed);
    updated++;
    if (real) fromApi++; else fromModel++;
  }));

  const pct = Math.round((updated / fixtures.length) * 100);
  process.stdout.write(`\r  ${updated}/${fixtures.length} (${pct}%)  — API: ${fromApi}  model: ${fromModel}  `);
}

console.log(`\nDone. ${fromApi} real odds from API, ${fromModel} from model.`);
await db.end();
