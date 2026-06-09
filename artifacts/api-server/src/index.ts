import app from "./app";
import { logger } from "./lib/logger";
import { refreshAllUpcomingOdds } from "./lib/oddsRefresh";
import { syncFixtureResults } from "./lib/fixtureSync";
import { autoSettleFinishedFixtures } from "./lib/autoSettle";

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

// ── Odds refresh scheduler ────────────────────────────────────────────────────
const ODDS_REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function runOddsRefresh() {
  logger.info("Scheduled odds refresh starting");
  try {
    const result = await refreshAllUpcomingOdds();
    logger.info(result, "Scheduled odds refresh finished");
  } catch (err) {
    logger.error({ err }, "Scheduled odds refresh failed");
  }
}

// First run 60 s after startup, then every 15 min
setTimeout(() => {
  runOddsRefresh();
  setInterval(runOddsRefresh, ODDS_REFRESH_INTERVAL_MS);
}, 60_000);

// ── Fixture sync + auto-settle scheduler ─────────────────────────────────────
const FIXTURE_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function runFixtureSyncAndSettle() {
  logger.info("Scheduled fixture sync starting");
  try {
    const syncResult = await syncFixtureResults();
    logger.info(syncResult, "Scheduled fixture sync finished");
    const settleResult = await autoSettleFinishedFixtures();
    logger.info(settleResult, "Auto-settle finished");
  } catch (err) {
    logger.error({ err }, "Scheduled fixture sync/settle failed");
  }
}

// First run 5 min after startup, then every hour
setTimeout(() => {
  runFixtureSyncAndSettle();
  setInterval(runFixtureSyncAndSettle, FIXTURE_SYNC_INTERVAL_MS);
}, 5 * 60 * 1000);
