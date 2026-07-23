/**
 * Shared lottery draw settlement logic.
 * Uses the ticket's stored bonus_mode for accurate settlement.
 * Falls back to legacy behaviour (infer from bonusNumbers presence) for old tickets.
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

export function parseOdds(odds: string): number {
  if (!odds || odds.toLowerCase() === "jackpot") return 0; // handled separately
  const parts = odds.split("/");
  const num = parseFloat(parts[0] ?? "0");
  const den = parseFloat(parts[1] ?? "1");
  if (!isFinite(num) || !isFinite(den) || den === 0) return 1;
  return (num + den) / den; // total return multiplier (stake × result = total back incl. stake)
}

export interface SettleResult {
  settled: number;
  winners: number;
  winningNumbers: number[];
  bonusNumbers: number[];
}

/**
 * Settle a pending draw: record winning numbers, evaluate every ticket, credit winners.
 *
 * Settlement rules per bonus_mode:
 *   bonus_only — win if the one selected bonus number appears in the draw's bonus numbers
 *   include    — win ONLY if ALL main numbers match AND the bonus number matches → includedBonus[N]
 *   exclude    — win if ALL main numbers match → excludedBonus[N]
 *                enhanced: if bonus also matches → withBonus[N] (falls back to excludedBonus[N])
 *
 * The ticket's stored `odds` field is used when available so that config changes
 * after ticket purchase cannot retroactively alter outcomes.
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

  // Mark draw settled
  await db
    .update(lotteryDrawsTable)
    .set({ winningNumbers, bonusNumbers, status: "settled" })
    .where(eq(lotteryDrawsTable.id, drawId));

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
    const pickedCount = userNumbers.length;
    const stake = parseFloat(ticket.stake);

    // Determine bonus_mode — use stored value, fall back to legacy inference
    const storedMode = (ticket as any).bonusMode as string | null;
    const mode: string = storedMode ?? (userBonusNums.length > 0 ? "include" : "exclude");

    const allMainMatched = pickedCount > 0 && userNumbers.every((n) => winSet.has(n));
    const bonusMatched =
      userBonusNums.length > 0 &&
      userBonusNums[0] !== undefined &&
      bonusWinSet.has(userBonusNums[0]);

    let oddsStr: string | undefined;

    if (mode === "bonus_only") {
      // Win if the selected bonus number is the drawn bonus ball
      const userBonus = userBonusNums[0];
      if (userBonus !== undefined && bonusWinSet.has(userBonus)) {
        oddsStr = payoutConfig.bonusOnly;
      }
    } else if (mode === "include") {
      // Win ONLY if all main numbers match AND bonus matches
      if (allMainMatched && bonusMatched) {
        oddsStr = payoutConfig.includedBonus?.[String(pickedCount)];
      }
      // else: loss — no consolation for include mode
    } else {
      // exclude mode: win if all main numbers match
      if (allMainMatched) {
        if (bonusMatched) {
          // Enhanced payout when exclude-mode player also hits bonus
          oddsStr =
            payoutConfig.withBonus?.[String(pickedCount)] ??
            payoutConfig.excludedBonus?.[String(pickedCount)];
        } else {
          oddsStr = payoutConfig.excludedBonus?.[String(pickedCount)];
        }
      }
    }

    // Prefer the odds stored at ticket purchase time (config-change-safe)
    const storedOdds = (ticket as any).odds as string | undefined;
    const effectiveOdds = storedOdds && oddsStr ? storedOdds : oddsStr;

    let prizeAmount = 0;
    if (effectiveOdds) {
      if (effectiveOdds.toLowerCase() === "jackpot") {
        prizeAmount = parseFloat(row.draw.jackpot ?? "0");
      } else {
        prizeAmount = stake * parseOdds(effectiveOdds);
      }
    }
    const isWinner = prizeAmount > 0;

    if (isWinner) {
      const [wallet] = await db
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, ticket.userId))
        .limit(1);

      if (wallet) {
        const newBal = (parseFloat(wallet.balance) + prizeAmount).toFixed(2);
        await db.update(walletsTable).set({ balance: newBal }).where(eq(walletsTable.id, wallet.id));
        await db.insert(transactionsTable).values({
          walletId: wallet.id,
          amount: prizeAmount.toFixed(2),
          type: "credit",
          description: `Lottery win — ${row.game?.name} @ ${effectiveOdds} (Draw #${drawId})`,
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
