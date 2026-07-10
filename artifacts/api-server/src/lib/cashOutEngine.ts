/**
 * Live Cash-Out recalculation engine.
 *
 * Called by liveSync workers after every fixture / odds / stats update.
 * Finds all pending bets that have selections in the affected fixtures and
 * broadcasts a CASH_OUT_UPDATE WebSocket message.
 *
 * Privacy: the broadcast payload contains NO bet IDs or amounts — only a
 * monotonically-increasing sequence number. Each connected client reacts by
 * re-fetching its own offers via the authenticated REST endpoint, so no
 * cross-user betting-activity metadata leaks over the public WS channel.
 *
 * Concurrency: while a DB run is in progress, incoming fixture-ID sets are
 * coalesced into a pending queue. A single follow-up pass executes after the
 * current run finishes, ensuring no live update is ever silently dropped.
 */
import { db, betsTable, betSelectionsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { broadcast, getWsClientCount } from "./wsServer";
import { logger } from "./logger";

let running = false;
let pendingFixtureIds = new Set<number>();
let updateSeq = 0;

async function runRecalc(fixtureIds: number[]): Promise<void> {
  try {
    // Find all bet selections that belong to these fixtures
    const selections = await db
      .select({ betId: betSelectionsTable.betId })
      .from(betSelectionsTable)
      .where(inArray(betSelectionsTable.fixtureId, fixtureIds));

    if (selections.length === 0) return;

    const candidateBetIds = [...new Set(selections.map((s) => s.betId))];

    // Filter to only pending bets
    const bets = await db
      .select({ id: betsTable.id, status: betsTable.status })
      .from(betsTable)
      .where(inArray(betsTable.id, candidateBetIds));

    const pendingCount = bets.filter((b) => b.status === "pending").length;
    if (pendingCount === 0) return;

    // Broadcast a privacy-safe signal — no bet IDs, no amounts.
    // Each client re-fetches its own offers via its authenticated REST endpoint.
    updateSeq++;
    broadcast("CASH_OUT_UPDATE", { seq: updateSeq, ts: Date.now() });

    logger.debug(
      { pendingBets: pendingCount, fixtures: fixtureIds.length, seq: updateSeq },
      "CashOut: live recalc broadcast sent",
    );
  } catch (err) {
    logger.warn({ err }, "CashOut: recalc run failed");
  }
}

export async function triggerCashOutRecalcForFixtures(fixtureIds: number[]): Promise<void> {
  if (fixtureIds.length === 0) return;

  // Skip entirely if nobody is connected — saves a DB round-trip
  if (getWsClientCount() === 0) return;

  if (running) {
    // Coalesce: accumulate IDs to process after the current run finishes
    for (const id of fixtureIds) pendingFixtureIds.add(id);
    return;
  }

  running = true;
  try {
    await runRecalc(fixtureIds);

    // Drain any IDs that arrived while we were running
    while (pendingFixtureIds.size > 0) {
      const next = [...pendingFixtureIds];
      pendingFixtureIds.clear();
      await runRecalc(next);
    }
  } finally {
    running = false;
  }
}
