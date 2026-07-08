import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WinBonusTier {
  selections: number;
  bonusPercent: number;
}

export interface WinBonusConfig {
  enabled: boolean;
  title: string;
  description: string;
  minQualifyingSelections: number;
  maxSelections: number;
  minQualifyingOdds: number;
  maxPayout: number;
  bonusTable: WinBonusTier[];
}

export interface WinBonusCalculation {
  stake: number;
  combinedOdds: number;
  totalSelections: number;
  qualifyingSelections: number;
  bonusPercentage: number;
  baseWin: number;
  bonusAmount: number;
  potentialWin: number;
  maxWinApplied: boolean;
}

// ── Default config ─────────────────────────────────────────────────────────────

export const DEFAULT_BONUS_TABLE: WinBonusTier[] = [
  { selections: 10, bonusPercent: 10 },
  { selections: 11, bonusPercent: 15 },
  { selections: 12, bonusPercent: 17 },
  { selections: 13, bonusPercent: 20 },
  { selections: 14, bonusPercent: 22 },
  { selections: 15, bonusPercent: 25 },
  { selections: 16, bonusPercent: 30 },
  { selections: 17, bonusPercent: 35 },
  { selections: 18, bonusPercent: 40 },
  { selections: 19, bonusPercent: 45 },
  { selections: 20, bonusPercent: 50 },
  { selections: 21, bonusPercent: 75 },
  { selections: 22, bonusPercent: 85 },
  { selections: 23, bonusPercent: 90 },
  { selections: 24, bonusPercent: 95 },
  { selections: 25, bonusPercent: 100 },
  { selections: 26, bonusPercent: 150 },
  { selections: 27, bonusPercent: 200 },
  { selections: 28, bonusPercent: 250 },
  { selections: 29, bonusPercent: 300 },
  { selections: 30, bonusPercent: 350 },
  { selections: 31, bonusPercent: 400 },
  { selections: 32, bonusPercent: 450 },
  { selections: 33, bonusPercent: 500 },
  { selections: 34, bonusPercent: 550 },
  { selections: 35, bonusPercent: 600 },
  { selections: 36, bonusPercent: 650 },
  { selections: 37, bonusPercent: 700 },
  { selections: 38, bonusPercent: 1025 },
  { selections: 39, bonusPercent: 1050 },
  { selections: 40, bonusPercent: 1075 },
  { selections: 41, bonusPercent: 1100 },
  { selections: 42, bonusPercent: 1125 },
  { selections: 43, bonusPercent: 1150 },
  { selections: 44, bonusPercent: 1175 },
  { selections: 45, bonusPercent: 1200 },
  { selections: 46, bonusPercent: 1215 },
  { selections: 47, bonusPercent: 1225 },
  { selections: 48, bonusPercent: 1235 },
  { selections: 49, bonusPercent: 1245 },
  { selections: 50, bonusPercent: 1250 },
];

export const DEFAULT_WIN_BONUS_CONFIG: WinBonusConfig = {
  enabled: true,
  title: "Up to 1250% Win Bonus",
  description:
    "The more qualifying selections you add to your accumulator, the bigger your Win Bonus and the bigger your potential payout.\n\nOnly selections with decimal odds greater than 1.40 count towards the Win Bonus.",
  minQualifyingSelections: 10,
  maxSelections: 50,
  minQualifyingOdds: 1.4,
  maxPayout: 1_000_000,
  bonusTable: DEFAULT_BONUS_TABLE,
};

// ── DB helpers ─────────────────────────────────────────────────────────────────

export async function getWinBonusConfig(): Promise<WinBonusConfig> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "win_bonus_config"))
    .limit(1);
  if (!row?.value) return DEFAULT_WIN_BONUS_CONFIG;
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_WIN_BONUS_CONFIG, ...parsed };
  } catch {
    return DEFAULT_WIN_BONUS_CONFIG;
  }
}

export async function saveWinBonusConfig(config: WinBonusConfig): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key: "win_bonus_config", value: JSON.stringify(config) })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: JSON.stringify(config), updatedAt: new Date() },
    });
}

// ── Calculation ────────────────────────────────────────────────────────────────

export function getBonusPercentage(qualifyingSelections: number, config: WinBonusConfig): number {
  if (qualifyingSelections < config.minQualifyingSelections) return 0;
  const sorted = [...config.bonusTable].sort((a, b) => a.selections - b.selections);
  let bonusPercent = 0;
  for (const entry of sorted) {
    if (qualifyingSelections >= entry.selections) {
      bonusPercent = entry.bonusPercent;
    }
  }
  return bonusPercent;
}

/**
 * Calculate Win Bonus for an accumulator bet.
 * oddsValues: the server-verified odds for each selection (in order).
 * Only applies to accumulator bets (2+ selections). Singles get 0% bonus.
 */
export function calculateWinBonus(
  oddsValues: number[],
  stake: number,
  config: WinBonusConfig,
): WinBonusCalculation {
  const totalSelections = oddsValues.length;

  // Bonus only applies to multi bets (accumulators)
  const isAccumulator = totalSelections >= 2;

  const qualifyingSelections = isAccumulator
    ? oddsValues.filter((o) => o > config.minQualifyingOdds).length
    : 0;

  const combinedOdds = oddsValues.reduce((acc, o) => acc * o, 1);
  const baseWin = stake * combinedOdds;

  const bonusPercentage =
    config.enabled && isAccumulator ? getBonusPercentage(qualifyingSelections, config) : 0;

  const rawBonusAmount = baseWin * (bonusPercentage / 100);
  const rawPotentialWin = baseWin + rawBonusAmount;
  const maxPayout = config.maxPayout;
  const potentialWin = Math.min(rawPotentialWin, maxPayout);
  const maxWinApplied = rawPotentialWin > maxPayout;

  // If the max win cap was applied, clamp the bonus amount too so that
  // baseWin + bonusAmount === potentialWin always holds.
  const bonusAmount = maxWinApplied
    ? Math.max(0, potentialWin - baseWin)
    : rawBonusAmount;

  return {
    stake,
    combinedOdds,
    totalSelections,
    qualifyingSelections,
    bonusPercentage,
    baseWin,
    bonusAmount,
    potentialWin,
    maxWinApplied,
  };
}
