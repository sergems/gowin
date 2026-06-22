import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { refreshAllUpcomingOdds } from "./lib/oddsRefresh";
import { syncFixtureResults } from "./lib/fixtureSync";
import { autoSettleFinishedFixtures } from "./lib/autoSettle";
import { autoExpireFixtures } from "./lib/fixtureExpiry";
import { switchDatabase, db, fixturesTable } from "@workspace/db";
import { getMetaSetting, CUSTOM_DB_KEY } from "./lib/metaDb";
import { eq, sql } from "drizzle-orm";
import { attachWebSocketServer } from "./lib/wsServer";
import { startLiveSyncWorkers } from "./lib/liveSync";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

attachWebSocketServer(server);

server.on("error", (err) => {
  logger.error({ err }, "HTTP server error");
  process.exit(1);
});

server.listen(port, async () => {
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

  // Start live betting sync workers after server is ready
  startLiveSyncWorkers();
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

// ── Fast live-score sync (every 60 s) ─────────────────────────────────────────
// Only fires when at least one fixture is currently live, to avoid burning API
// calls when nothing is in progress.
async function runLiveSync() {
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(fixturesTable)
      .where(eq(fixturesTable.status, "live"));
    const liveCount = row?.n ?? 0;
    if (liveCount > 0) {
      const result = await syncFixtureResults();
      logger.info({ ...result, liveCount }, "Live score sync finished");
      await autoSettleFinishedFixtures();
    }
  } catch (err) {
    logger.error({ err }, "Live score sync failed");
  }
}

// Start the live sync loop 90 s after boot (after initial full sync completes)
setTimeout(() => {
  setInterval(runLiveSync, 60_000);
}, 90_000);
