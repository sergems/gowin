import app from "./app";
import { logger } from "./lib/logger";
import { refreshAllUpcomingOdds } from "./lib/oddsRefresh";
import { syncFixtureResults } from "./lib/fixtureSync";
import { autoSettleFinishedFixtures } from "./lib/autoSettle";
import { autoExpireFixtures } from "./lib/fixtureExpiry";
import { switchDatabase } from "@workspace/db";
import { getMetaSetting, CUSTOM_DB_KEY } from "./lib/metaDb";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Check for a saved custom DB URL and switch to it if present
  try {
    const customUrl = await getMetaSetting(CUSTOM_DB_KEY);
    if (customUrl) {
      switchDatabase(customUrl);
      logger.info("Switched to custom database connection");
    }
  } catch (err) {
    logger.warn({ err }, "Could not read custom DB setting — using default connection");
  }
});

// ── Result sync helper ────────────────────────────────────────────────────────
async function runSync() {
  try {
    const syncResult = await syncFixtureResults();
    logger.info(syncResult, "Scheduled fixture sync finished");
  } catch (err) {
    logger.error({ err }, "Fixture sync failed");
  }
}

// ── Auto-expire + auto-settle (runs every 5 min) ─────────────────────────────
async function runAutoSettle() {
  try {
    const expired = await autoExpireFixtures();

    if (expired.toFinished > 0) {
      logger.info({ toFinished: expired.toFinished }, "Games just finished — syncing scores now");
      await runSync();
    }

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

// ── Full fixture sync every 5 min ─────────────────────────────────────────────
async function runFixtureSyncAndSettle() {
  logger.info("Scheduled fixture sync starting");
  try {
    await runSync();
    await autoSettleFinishedFixtures();
  } catch (err) {
    logger.error({ err }, "Scheduled fixture sync/settle failed");
  }
}

setTimeout(() => {
  runFixtureSyncAndSettle();
  setInterval(runFixtureSyncAndSettle, 5 * 60 * 1000);
}, 30_000);
