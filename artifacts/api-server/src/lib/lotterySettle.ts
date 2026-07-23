/**
 * Shared lottery draw settlement logic.
 * Used by both the admin settle route and the automated APIVerve sync.
 */
import {
  db,
  lotteryDrawsTable,
  lotteryGamesTable,
  lotteryTicketsTable,
  walletsTable,
  transactionsTable,
} from "@workspace/db";
import { DEFAULT_PAYOUT_CONFIG } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { PayoutConfig } from "@workspace/db";
import { logger } from "./logger";

function parseOdds(odds: string): number {
  const parts = odds.split("/");
  const num = parseFloat(parts[0] ?? "0");
  const den = parseFloat(parts[1] ?? "1");
  if (!isFinite(num) || !isFinite(den) || den === 0) return 1;
  return (num + den) / den;
}

export interface SettleResult {
  settled: number;
  winners: number;
  winningNumbers: number[];
  bonusNumbers: number[];
}

/**
 * Settle a pending draw: record winning numbers, evaluate all tickets, credit winners.
 * Returns counts of settled tickets and winners.
 * Throws if the draw is not found or already settled.
 */
export async function settleLotteryDraw(
  drawId: number,
  winningNumbers: number[],
  bonusNumbers: number[]
): Promise<SettleResult> {
  const [row] = await db
    .select({ draw: lotteryDrawsTable, game: lotteryGamesTable })
    .from(lotteryDrawsTable)
    .leftJoin(lotteryGamesTable, eq(lotteryGamesTable.id, lotteryDrawsTable.gameId))
    .where(eq(lotteryDrawsTable.id, drawId))
    .limit(1);

  if (!row) throw new Error(`Draw #${drawId} not found`);
  if (row.draw.status === "settled") throw new Error(`Draw #${drawId} already settled`);

  const payoutConfig: PayoutConfig =
    (row.game?.payoutConfig as PayoutConfig | null) ?? DEFAULT_PAYOUT_CONFIG;

  // Mark draw as settled with winning numbers
  await db
    .update(lotteryDrawsTable)
    .set({ winningNumbers, bonusNumbers, status: "settled" })
    .where(eq(lotteryDrawsTable.id, drawId));

  // Load all pending tickets for this draw
  const tickets = await db
    .select()
    .from(lotteryTicketsTable)
    .where(and(eq(lotteryTicketsTable.drawId, drawId), eq(lotteryTicketsTable.status, "pending")));

  const winSet = new Set<number>(winningNumbers.map(Number));
  const bonusWinSet = new Set<number>(bonusNumbers.map(Number));

  let settled = 0;
  let winners = 0;

  for (const ticket of tickets) {
    const userNumbers = ticket.numbers as number[];
    const userBonusNums = ticket.bonusNumbers as number[];
    const userIncludedBonus = userBonusNums.length > 0;
    const userBonusNum = userIncludedBonus ? userBonusNums[0]! : null;
    const stake = parseFloat(ticket.stake);
    const pickedCount = userNumbers.length;

    const allMainMatched =
      pickedCount > 0 && userNumbers.every((n) => winSet.has(n));
    const bonusMatched =
      userIncludedBonus && userBonusNum !== null && bonusWinSet.has(userBonusNum);

    let oddsStr: string | undefined;

    if (allMainMatched) {
      if (userIncludedBonus && bonusMatched) {
        oddsStr = payoutConfig.withBonus?.[String(pickedCount)];
      }
      if (!oddsStr && userIncludedBonus) {
        oddsStr = payoutConfig.includedBonus?.[String(pickedCount)];
      }
      if (!oddsStr && !userIncludedBonus) {
        oddsStr = payoutConfig.excludedBonus?.[String(pickedCount)];
      }
    } else if (!allMainMatched && bonusMatched && pickedCount === 0) {
      // Bonus-only ticket
      oddsStr = payoutConfig.bonusOnly;
    }

    const prizeAmount = oddsStr ? stake * parseOdds(oddsStr) : 0;
    const isWinner = prizeAmount > 0;

    if (isWinner) {
      const [wallet] = await db
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, ticket.userId))
        .limit(1);

      if (wallet) {
        const newBal = (parseFloat(wallet.balance) + prizeAmount).toFixed(2);
        await db
          .update(walletsTable)
          .set({ balance: newBal })
          .where(eq(walletsTable.id, wallet.id));
        await db.insert(transactionsTable).values({
          walletId: wallet.id,
          amount: prizeAmount.toFixed(2),
          type: "credit",
          description: `Lottery win — ${row.game?.name} @ ${oddsStr} (Draw #${drawId})`,
        });
      }

      await db
        .update(lotteryTicketsTable)
        .set({ status: "won", prizeAmount: prizeAmount.toFixed(2) })
        .where(eq(lotteryTicketsTable.id, ticket.id));

      winners++;
    } else {
      await db
        .update(lotteryTicketsTable)
        .set({ status: "lost" })
        .where(eq(lotteryTicketsTable.id, ticket.id));
    }

    settled++;
  }

  logger.info({ drawId, settled, winners, winningNumbers, bonusNumbers }, "Lottery draw settled");
  return { settled, winners, winningNumbers, bonusNumbers };
}
