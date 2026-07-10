import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ── Config types ─────────────────────────────────────────────────────────────
// Full Cash Out only (no Partial, no Auto). Every rule below is admin-configurable.

export interface CashOutConfig {
  enabled: boolean;

  // Margin
  houseMarginPercent: number; // default offer margin, e.g. 10 = 10%
  minMarginPercent: number;
  maxMarginPercent: number;

  // Amount limits
  minCashOutAmount: number;
  maxCashOutAmount: number;
  minTicketStake: number;
  maxTicketStake: number;
  minOfferAmount: number;
  maxOfferAmount: number;

  // Bet type eligibility
  enableSingles: boolean;
  enableMultiples: boolean;
  enableSystemBets: boolean;
  enableLiveBets: boolean;
  enablePreMatchBets: boolean;

  // Scope eligibility — empty array = allow all
  enabledSportIds: number[];
  enabledLeagueIds: number[];
  enabledCountries: string[];
  enabledMarkets: string[];

  // Timing rules
  allowBeforeMatchStarts: boolean;
  allowDuringMatch: boolean;
  disableMinutesBeforeKickoff: number;
  disableAfterMinute: number; // 0 = no limit

  // Live-state disable rules
  disableWhenOddsSuspended: boolean;
  disableAfterRedCard: boolean;
  disableAfterPenalty: boolean;
  disableAfterVar: boolean;
  disableDuringInjuryTime: boolean;
  disableDuringExtraTime: boolean;
  disableDuringPenaltyShootout: boolean;

  // Refresh & drift
  refreshIntervalSeconds: number;
  maxOddsDriftPercent: number; // reject stale accept if live odds moved more than this since offer

  // Rounding
  roundingMode: "none" | "up" | "down" | "nearest";
  roundingIncrement: 0.01 | 0.05 | 0.1 | 0.5 | 1.0;

  // Advanced profit protection (additional deductions, stacked on top of house margin)
  largeWinProtectionPercent: number;
  highOddsProtectionPercent: number;
  accumulatorProtectionPercent: number;
  lateMatchProtectionPercent: number;
  riskAdjustmentPercent: number;

  // Thresholds that trigger the protections above
  largeWinThreshold: number; // potentialWin above this triggers largeWinProtectionPercent
  highOddsThreshold: number; // totalOdds above this triggers highOddsProtectionPercent
  accumulatorSelectionsThreshold: number; // selections count above this triggers accumulatorProtectionPercent
  lateMatchMinuteThreshold: number; // match minute above this triggers lateMatchProtectionPercent

  // Exposure limits
  maxCashOutExposure: number; // max total offer value system will allow to be paid out concurrently (informational cap)
  maxDailyCashOutLiability: number;
  maxCashOutPerTicket: number;
  maxCashOutPerCustomerPerDay: number;

  // Bumped whenever config is saved — stored in audit rows as "admin settings version"
  version: number;
}

export const DEFAULT_CASH_OUT_CONFIG: CashOutConfig = {
  enabled: true,

  houseMarginPercent: 10,
  minMarginPercent: 2,
  maxMarginPercent: 30,

  minCashOutAmount: 1,
  maxCashOutAmount: 1_000_000,
  minTicketStake: 0,
  maxTicketStake: 1_000_000,
  minOfferAmount: 1,
  maxOfferAmount: 1_000_000,

  enableSingles: true,
  enableMultiples: true,
  enableSystemBets: false,
  enableLiveBets: true,
  enablePreMatchBets: true,

  enabledSportIds: [],
  enabledLeagueIds: [],
  enabledCountries: [],
  enabledMarkets: [],

  allowBeforeMatchStarts: true,
  allowDuringMatch: true,
  disableMinutesBeforeKickoff: 0,
  disableAfterMinute: 0,

  disableWhenOddsSuspended: true,
  disableAfterRedCard: false,
  disableAfterPenalty: false,
  disableAfterVar: false,
  disableDuringInjuryTime: false,
  disableDuringExtraTime: false,
  disableDuringPenaltyShootout: true,

  refreshIntervalSeconds: 10,
  maxOddsDriftPercent: 15,

  roundingMode: "nearest",
  roundingIncrement: 0.1,

  largeWinProtectionPercent: 0,
  highOddsProtectionPercent: 0,
  accumulatorProtectionPercent: 0,
  lateMatchProtectionPercent: 0,
  riskAdjustmentPercent: 0,

  largeWinThreshold: 5000,
  highOddsThreshold: 50,
  accumulatorSelectionsThreshold: 10,
  lateMatchMinuteThreshold: 75,

  maxCashOutExposure: 0, // 0 = unlimited
  maxDailyCashOutLiability: 0,
  maxCashOutPerTicket: 0,
  maxCashOutPerCustomerPerDay: 0,

  version: 1,
};

const SETTINGS_KEY = "cash_out_config";

export async function getCashOutConfig(): Promise<CashOutConfig> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, SETTINGS_KEY)).limit(1);
    if (!row?.value) return DEFAULT_CASH_OUT_CONFIG;
    return { ...DEFAULT_CASH_OUT_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_CASH_OUT_CONFIG;
  }
}

export async function saveCashOutConfig(config: CashOutConfig): Promise<CashOutConfig> {
  const current = await getCashOutConfig();
  const updated: CashOutConfig = { ...current, ...config, version: (current.version ?? 1) + 1 };
  await db
    .insert(settingsTable)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(updated) })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: JSON.stringify(updated), updatedAt: new Date() },
    });
  return updated;
}

// ── Rounding ─────────────────────────────────────────────────────────────────

export function applyRounding(amount: number, config: CashOutConfig): number {
  const inc = config.roundingIncrement || 0.01;
  if (config.roundingMode === "none") return Math.round(amount * 100) / 100;
  if (config.roundingMode === "up") return Math.ceil(amount / inc) * inc;
  if (config.roundingMode === "down") return Math.floor(amount / inc) * inc;
  // nearest
  return Math.round(amount / inc) * inc;
}

// ── Types for offer computation ───────────────────────────────────────────────

export interface RemainingSelectionInput {
  selectionId: number;
  fixtureId: number;
  sportId: number | null;
  leagueId: number | null;
  countryName: string | null;
  market: string;
  selection: string;
  originalOdds: number;
  liveOdds: number | null; // null = unavailable (suspended/no market)
  suspended: boolean;
  fixtureStatus: string; // upcoming | live | finished | cancelled
  matchMinute: string | null; // e.g. "45'", "HT", "90+2'"
  isRedCardMatch?: boolean;
  isPenaltyMatch?: boolean;
  isVarMatch?: boolean;
  isInjuryTime?: boolean;
  isExtraTime?: boolean;
  isPenaltyShootout?: boolean;
  startTime: string; // ISO
}

export interface CashOutEligibilityContext {
  betStatus: string;
  isLiveBet: boolean; // true if any selection's fixture is/was live
  isPreMatchOnly: boolean; // all selections still upcoming
  totalSelectionsCount: number;
  isSystemBet: boolean;
  stake: number;
  remaining: RemainingSelectionInput[];
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

/** Parse a match-minute string like "45'", "90+3'", "HT", "FT" into a plain integer minute (best-effort). */
function parseMinuteNumber(minute: string | null): number | null {
  if (!minute) return null;
  if (minute === "HT") return 45;
  if (minute === "FT") return 90;
  const m = minute.match(/^(\d+)/);
  return m ? parseInt(m[1]!, 10) : null;
}

export function checkCashOutEligibility(ctx: CashOutEligibilityContext, config: CashOutConfig): EligibilityResult {
  if (!config.enabled) return { eligible: false, reason: "Cash Out is currently disabled" };
  if (ctx.betStatus !== "pending") return { eligible: false, reason: "Ticket already settled" };
  if (ctx.remaining.length === 0) return { eligible: false, reason: "No unsettled selections remain" };

  if (ctx.isSystemBet && !config.enableSystemBets) return { eligible: false, reason: "System bets are not eligible for Cash Out" };
  if (ctx.totalSelectionsCount === 1 && !config.enableSingles) return { eligible: false, reason: "Single bets are not eligible for Cash Out" };
  if (ctx.totalSelectionsCount > 1 && !config.enableMultiples) return { eligible: false, reason: "Multi bets are not eligible for Cash Out" };

  if (ctx.stake < config.minTicketStake) return { eligible: false, reason: "Ticket stake below minimum for Cash Out" };
  if (config.maxTicketStake > 0 && ctx.stake > config.maxTicketStake) return { eligible: false, reason: "Ticket stake above maximum for Cash Out" };

  for (const sel of ctx.remaining) {
    if (sel.fixtureStatus === "cancelled") return { eligible: false, reason: "An event on this ticket was cancelled" };
    if (sel.fixtureStatus === "finished") return { eligible: false, reason: "An event on this ticket has already finished" };

    const isLive = sel.fixtureStatus === "live";
    if (isLive && !config.enableLiveBets) return { eligible: false, reason: "Cash Out is not available for live bets" };
    if (!isLive && !config.enablePreMatchBets) return { eligible: false, reason: "Cash Out is not available for pre-match bets" };
    if (isLive && !config.allowDuringMatch) return { eligible: false, reason: "Cash Out is disabled during live matches" };
    if (!isLive && !config.allowBeforeMatchStarts) return { eligible: false, reason: "Cash Out is disabled before match start" };

    if (config.enabledSportIds.length > 0 && sel.sportId != null && !config.enabledSportIds.includes(sel.sportId)) {
      return { eligible: false, reason: "This sport is not enabled for Cash Out" };
    }
    if (config.enabledLeagueIds.length > 0 && sel.leagueId != null && !config.enabledLeagueIds.includes(sel.leagueId)) {
      return { eligible: false, reason: "This league is not enabled for Cash Out" };
    }
    if (config.enabledCountries.length > 0 && sel.countryName && !config.enabledCountries.includes(sel.countryName)) {
      return { eligible: false, reason: "This country is not enabled for Cash Out" };
    }
    if (config.enabledMarkets.length > 0 && !config.enabledMarkets.includes(sel.market)) {
      return { eligible: false, reason: "This market is not enabled for Cash Out" };
    }

    if (config.disableWhenOddsSuspended && sel.suspended) return { eligible: false, reason: "Odds are currently suspended for one of your selections" };
    if (sel.liveOdds === null || sel.liveOdds <= 1) return { eligible: false, reason: "Live odds are unavailable for one of your selections" };

    if (!isLive) {
      const minsToKickoff = (new Date(sel.startTime).getTime() - Date.now()) / 60000;
      if (config.disableMinutesBeforeKickoff > 0 && minsToKickoff <= config.disableMinutesBeforeKickoff) {
        return { eligible: false, reason: "Cash Out closed — match is about to start" };
      }
    }

    if (isLive) {
      const minute = parseMinuteNumber(sel.matchMinute);
      if (config.disableAfterMinute > 0 && minute !== null && minute >= config.disableAfterMinute) {
        return { eligible: false, reason: "Cash Out closed for this stage of the match" };
      }
      if (config.disableAfterRedCard && sel.isRedCardMatch) return { eligible: false, reason: "Cash Out disabled after a red card" };
      if (config.disableAfterPenalty && sel.isPenaltyMatch) return { eligible: false, reason: "Cash Out disabled after a penalty" };
      if (config.disableAfterVar && sel.isVarMatch) return { eligible: false, reason: "Cash Out disabled during VAR review" };
      if (config.disableDuringInjuryTime && sel.isInjuryTime) return { eligible: false, reason: "Cash Out disabled during injury time" };
      if (config.disableDuringExtraTime && sel.isExtraTime) return { eligible: false, reason: "Cash Out disabled during extra time" };
      if (config.disableDuringPenaltyShootout && sel.isPenaltyShootout) return { eligible: false, reason: "Cash Out disabled during penalty shootout" };
    }
  }

  return { eligible: true };
}

// ── Offer calculation ─────────────────────────────────────────────────────────
// NEVER uses original ticket odds — always current live odds for remaining legs.
// settledLegsWinFactor: product of odds for legs that are already settled-won
// (e.g. 1UP/2UP already locked in, or earlier legs of a multi already resolved as won)
// — these contribute their fixed value instead of a probability.

export interface CashOutOfferResult {
  eligible: boolean;
  reason?: string;
  offerAmount: number;
  fairValue: number;
  combinedProbability: number;
  marginUsed: number; // final effective margin % after protections stacked on top
  baseMarginPercent: number;
  protectionsApplied: Record<string, number>;
  liveOddsUsed: Array<{ selectionId: number; oddsValue: number }>;
  potentialWin: number;
  stake: number;
}

export function computeCashOutOffer(
  ctx: CashOutEligibilityContext,
  potentialWin: number,
  config: CashOutConfig,
  settledLegsWinFactor: number = 1,
): CashOutOfferResult {
  const eligibility = checkCashOutEligibility(ctx, config);
  if (!eligibility.eligible) {
    return {
      eligible: false,
      reason: eligibility.reason,
      offerAmount: 0,
      fairValue: 0,
      combinedProbability: 0,
      marginUsed: 0,
      baseMarginPercent: config.houseMarginPercent,
      protectionsApplied: {},
      liveOddsUsed: [],
      potentialWin,
      stake: ctx.stake,
    };
  }

  // Step 1 + 2: implied probability of each remaining live-odds selection
  const liveOddsUsed = ctx.remaining.map((sel) => ({ selectionId: sel.selectionId, oddsValue: sel.liveOdds! }));
  const probabilities = ctx.remaining.map((sel) => 1 / sel.liveOdds!);

  // Step 3: combined probability across remaining legs, multiplied by the
  // fixed contribution of any already-settled-won legs (e.g. locked 1UP/2UP)
  const combinedProbability = probabilities.reduce((acc, p) => acc * p, 1) * settledLegsWinFactor;

  // Step 4: fair value = potential payout × combined probability
  const fairValue = potentialWin * combinedProbability;

  // Step 5: house margin + stacked profit-protection deductions
  let marginPercent = config.houseMarginPercent;
  const protectionsApplied: Record<string, number> = {};

  if (config.largeWinProtectionPercent > 0 && potentialWin >= config.largeWinThreshold) {
    marginPercent += config.largeWinProtectionPercent;
    protectionsApplied.largeWinProtection = config.largeWinProtectionPercent;
  }
  const totalOdds = ctx.remaining.reduce((acc, s) => acc * s.originalOdds, 1);
  if (config.highOddsProtectionPercent > 0 && totalOdds >= config.highOddsThreshold) {
    marginPercent += config.highOddsProtectionPercent;
    protectionsApplied.highOddsProtection = config.highOddsProtectionPercent;
  }
  if (config.accumulatorProtectionPercent > 0 && ctx.totalSelectionsCount >= config.accumulatorSelectionsThreshold) {
    marginPercent += config.accumulatorProtectionPercent;
    protectionsApplied.accumulatorProtection = config.accumulatorProtectionPercent;
  }
  const maxMinute = Math.max(0, ...ctx.remaining.map((s) => parseMinuteNumber(s.matchMinute) ?? 0));
  if (config.lateMatchProtectionPercent > 0 && maxMinute >= config.lateMatchMinuteThreshold) {
    marginPercent += config.lateMatchProtectionPercent;
    protectionsApplied.lateMatchProtection = config.lateMatchProtectionPercent;
  }
  if (config.riskAdjustmentPercent > 0) {
    marginPercent += config.riskAdjustmentPercent;
    protectionsApplied.riskAdjustment = config.riskAdjustmentPercent;
  }

  // Clamp effective margin to admin-defined bounds
  marginPercent = Math.min(Math.max(marginPercent, config.minMarginPercent), config.maxMarginPercent);

  const rawOffer = fairValue * (1 - marginPercent / 100);
  let offerAmount = applyRounding(Math.max(0, rawOffer), config);

  // Amount limit enforcement
  if (config.maxOfferAmount > 0) offerAmount = Math.min(offerAmount, config.maxOfferAmount);
  if (config.minOfferAmount > 0 && offerAmount < config.minOfferAmount) {
    return {
      eligible: false,
      reason: "Cash Out offer is below the minimum allowed amount",
      offerAmount: 0,
      fairValue,
      combinedProbability,
      marginUsed: marginPercent,
      baseMarginPercent: config.houseMarginPercent,
      protectionsApplied,
      liveOddsUsed,
      potentialWin,
      stake: ctx.stake,
    };
  }
  if (config.maxCashOutAmount > 0 && offerAmount > config.maxCashOutAmount) offerAmount = config.maxCashOutAmount;
  if (config.minCashOutAmount > 0 && offerAmount < config.minCashOutAmount) {
    return {
      eligible: false,
      reason: "Cash Out offer is below the minimum allowed amount",
      offerAmount: 0,
      fairValue,
      combinedProbability,
      marginUsed: marginPercent,
      baseMarginPercent: config.houseMarginPercent,
      protectionsApplied,
      liveOddsUsed,
      potentialWin,
      stake: ctx.stake,
    };
  }
  if (config.maxCashOutPerTicket > 0 && offerAmount > config.maxCashOutPerTicket) offerAmount = config.maxCashOutPerTicket;

  return {
    eligible: true,
    offerAmount,
    fairValue,
    combinedProbability,
    marginUsed: marginPercent,
    baseMarginPercent: config.houseMarginPercent,
    protectionsApplied,
    liveOddsUsed,
    potentialWin,
    stake: ctx.stake,
  };
}
