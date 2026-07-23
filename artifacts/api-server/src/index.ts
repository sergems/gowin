import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { generateFixturesPdf } from "./lib/pdfGenerator";
import { refreshAllUpcomingOdds } from "./lib/oddsRefresh";
import { syncFixtureResults } from "./lib/fixtureSync";
import { autoSettleFinishedFixtures } from "./lib/autoSettle";
import { autoExpireFixtures } from "./lib/fixtureExpiry";
import { switchDatabase, db, fixturesTable } from "@workspace/db";
import { getMetaSetting, setMetaSetting, CUSTOM_DB_KEY } from "./lib/metaDb";
import { setJwtSecret } from "./middlewares/auth";
import { eq, sql } from "drizzle-orm";
import { attachWebSocketServer } from "./lib/wsServer";
import { startLiveSyncWorkers } from "./lib/liveSync";
import { runFullFixtureSync } from "./routes/apiSync";
import { seedLotteryGames } from "./lib/lotterySeed";
import { syncLotteryDraws } from "./lib/lotterySync";

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

  // Load JWT secret from DB (overrides env var; migrates env var into DB on first boot)
  try {
    const dbSecret = await getMetaSetting("jwt_secret");
    if (dbSecret) {
      setJwtSecret(dbSecret);
      logger.info("JWT secret loaded from database");
    } else if (process.env.JWT_SECRET) {
      await setMetaSetting("jwt_secret", process.env.JWT_SECRET);
      setJwtSecret(process.env.JWT_SECRET);
      logger.info("JWT secret seeded from env var into database");
    } else {
      logger.warn("JWT_SECRET not configured — set it in Admin → Settings to enable authentication");
    }
  } catch (err) {
    logger.warn({ err }, "Could not load JWT secret from DB — falling back to env var");
  }

  // Seed default lottery games (no-op if already seeded)
  await seedLotteryGames();

  // Start live betting sync workers after server is ready
  startLiveSyncWorkers();

  // Lottery API sync — run immediately then every hour
  syncLotteryDraws();
  setInterval(syncLotteryDraws, 60 * 60 * 1000);
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

// ── Daily fixtures PDF (8:00 and 13:00) ──────────────────────────────────────
// Tracks which slot (date + hour band) was last generated so we regenerate
// whenever the slot changes without relying on exact-minute polling.
let lastPdfSlot = "";

function getPdfSlot(): string {
  const now = new Date();
  const d = now.toISOString().slice(0, 10);
  const h = now.getHours();
  if (h >= 13) return `${d}_13`;
  if (h >= 8) return `${d}_08`;
  return ""; // before 8 AM — no generation yet
}

async function maybeGeneratePdf() {
  const slot = getPdfSlot();
  if (!slot || slot === lastPdfSlot) return;
  lastPdfSlot = slot;
  try {
    await generateFixturesPdf();
  } catch (err) {
    logger.error({ err }, "Scheduled fixtures PDF generation failed");
  }
}

// Generate once 10 s after startup (catches the current slot on first boot)
setTimeout(maybeGeneratePdf, 10_000);
// Check every minute whether the slot has changed
setInterval(maybeGeneratePdf, 60_000);

// ── Daily fixture sync at 07:00 ───────────────────────────────────────────────
// Uses a slot string (date + "07") so it fires once per day and is
// idempotent across restarts — same logic as the PDF scheduler above.
let lastDailySyncSlot = "";

function getDailySyncSlot(): string {
  const now = new Date();
  const d = now.toISOString().slice(0, 10);
  const h = now.getHours();
  if (h >= 7) return `${d}_07`;
  return "";
}

async function maybeDailySync() {
  const slot = getDailySyncSlot();
  if (!slot || slot === lastDailySyncSlot) return;
  lastDailySyncSlot = slot;
  logger.info("Daily 07:00 fixture sync starting");
  try {
    const result = await runFullFixtureSync();
    logger.info(result, "Daily 07:00 fixture sync finished");
  } catch (err) {
    logger.error({ err }, "Daily 07:00 fixture sync failed");
  }
}

// Check every minute; fires once the clock passes 07:00 each day
setInterval(maybeDailySync, 60_000);
