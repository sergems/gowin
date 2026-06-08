import app from "./app";
import { logger } from "./lib/logger";
import { refreshAllUpcomingOdds } from "./lib/oddsRefresh";

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
