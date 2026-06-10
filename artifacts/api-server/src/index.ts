import app from "./app";
import { logger } from "./lib/logger";
import { refreshAllUpcomingOdds } from "./lib/oddsRefresh";
import { syncFixtureResults } from "./lib/fixtureSync";
import { autoSettleFinishedFixtures } from "./lib/autoSettle";
import { autoExpireFixtures } from "./lib/fixtureExpiry";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// ── Auto-expire + auto-settle (runs without any external API call) ───────────
// 1. Advance fixture statuses based on elapsed time (upcoming→live→finished)
// 2. Settle any bets on fixtures now marked finished
// Runs immediately on startup to clear any backlog, then every 5 minutes
async function runAutoSettle() {
  try {
    await autoExpireFixtures();
    const result = await autoSettleFinishedFixtures();
    if (result.settled > 0) logger.info(result, "Auto-settle finished");
  } catch (err) {
    logger.error({ err }, "Auto-settle failed");
  }
}

runAutoSettle();
setInterval(runAutoSettle, 5 * 60 * 1000);

// ── Odds refresh (every 15 min, 60 s delay on first run) ─────────────────────
async function runOddsRefresh() {
  logger.info("Scheduled odds refresh starting");
  try {
    const result = await refreshAllUpcomingOdds();
    logger.info(result, "Scheduled odds refresh finished");
  } catch (err) {
    logger.error({ err }, "Scheduled odds refresh failed");
  }
}

setTimeout(() => {
  runOddsRefresh();
  setInterval(runOddsRefresh, 15 * 60 * 1000);
}, 60_000);

// ── Fixture sync (runs every 30 min, 30 s delay on first run) ────────────────
// Fetches scores/results from AllSports API, then settles bets immediately after
async function runFixtureSyncAndSettle() {
  logger.info("Scheduled fixture sync starting");
  try {
    const syncResult = await syncFixtureResults();
    logger.info(syncResult, "Scheduled fixture sync finished");
    // Settle immediately after syncing so results reflect right away
    await runAutoSettle();
  } catch (err) {
    logger.error({ err }, "Scheduled fixture sync/settle failed");
  }
}

setTimeout(() => {
  runFixtureSyncAndSettle();
  setInterval(runFixtureSyncAndSettle, 30 * 60 * 1000);
}, 30_000);
