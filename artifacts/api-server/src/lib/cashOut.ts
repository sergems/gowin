import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSelectionOutcome } from "./autoSettle";

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

  // Suspend cash-out when a selection is currently LOSING at or after this minute (0 = disabled)
  // Per spec: "If match reaches 85 minutes and the prediction is still going against the user: Cash Out must automatically become Suspended"
  suspendWhenLosingAfterMinute: number;

  // Live match-state momentum adjustment — reacts immediately to the scoreline instead of
  // waiting on the bookmaker live-odds feed to catch up. Applied per remaining selection,
  // scaled by how far through the match we are (minute / 90, shaped by momentumDecayPower).
  matchStateAdjustmentEnabled: boolean;
  losingMomentumDecayPercent: number;  // max % probability shrink by full-time when a selection is currently LOSING
  winningMomentumBoostPercent: number; // max % probability boost by full-time when a selection is currently WINNING
  momentumDecayPower: number;          // >1 = decay accelerates late in the match (drastic near full-time); 1 = linear

  // ── Adversity Cash Out override ─────────────────────────────────────────────
  // Overrides the normal fair-value calculation with a flat % of stake whenever
  // one or more remaining live legs are currently going against the bet. Spec:
  //   1 leg down by 1 goal    -> 50% of stake
  //   1 leg down by 2+ goals  -> 15% of stake
  //   2 legs down (1 goal ea.) -> 50% of stake
  //   3 legs down             -> 15% of stake
  //   4+ legs down            -> Cash Out not available
  // As soon as legs recover (fewer than 1 leg is against the bet), this override
  // stops applying and the normal fair-value/momentum engine takes back over.
  adversityCashOutEnabled: boolean;
  adversityOneLegOneGoalPercent: number;
  adversityOneLegTwoGoalPercent: number;
  adversityTwoLegsPercent: number;
  adversityThreeLegsPercent: number;
  adversityMaxLegsAgainst: number; // more legs against than this -> Cash Out not available
  // Suspend Cash Out (no offer at all) when ANY remaining live leg is losing by this many
  // goals or more. Suspension lifts automatically once the scoreline improves below the
  // threshold — no admin action needed. 0 = disabled.
  suspendWhenLosingByGoals: number;

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

  suspendWhenLosingAfterMinute: 85,

  matchStateAdjustmentEnabled: true,
  losingMomentumDecayPercent: 70,
  winningMomentumBoostPercent: 15,
  momentumDecayPower: 1.6,

  adversityCashOutEnabled: true,
  adversityOneLegOneGoalPercent: 50,
  adversityOneLegTwoGoalPercent: 15,
  adversityTwoLegsPercent: 50,
  adversityThreeLegsPercent: 15,
  adversityMaxLegsAgainst: 3,
  suspendWhenLosingByGoals: 3,

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
  // Current live score — used for late-match-losing suspension
  currentScoreHome?: number | null;
  currentScoreAway?: number | null;
}

export interface CashOutEligibilityContext {
  betStatus: string;
  isLiveBet: boolean; // true if any selection's fixture is/was live
  isPreMatchOnly: boolean; // all selections still upcoming
  totalSelectionsCount: number;
  isSystemBet: boolean;
  stake: number;
  remaining: RemainingSelectionInput[];
  // Product of originalOdds for legs that are already settled-won (e.g. earlier legs of a
  // multi already resolved as won, or 1UP/2UP locked in). Represents how much the stake has
  // effectively "grown" already — used as the stake basis for the adversity override below
  // instead of the raw ticket stake, so a bettor who already banked a win isn't offered a
  // flat % of their original stake when the remaining legs turn against them.
  lockedInStakeMultiplier: number;
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

      // Late-match losing rule: if the prediction is currently failing at the configured minute threshold, suspend.
      // Spec: "If match reaches 85 minutes and the prediction is still going against the user: Cash Out must automatically become Suspended."
      if (
        config.suspendWhenLosingAfterMinute > 0 &&
        minute !== null &&
        minute >= config.suspendWhenLosingAfterMinute &&
        sel.currentScoreHome != null &&
        sel.currentScoreAway != null
      ) {
        const outcome = getSelectionOutcome(sel.selection, sel.market, sel.currentScoreHome, sel.currentScoreAway);
        if (outcome === false) {
          // Confirmed losing — suspend
          return {
            eligible: false,
            reason: `Cash Out suspended — match is in the final stage and this prediction is not currently winning`,
          };
        }
        // outcome === null means the market type is not evaluable (unsupported).
        // Do NOT suspend on unknown — only suspend when we *know* it's losing.
        // This is intentionally conservative: failing open protects the customer.
      }
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
  // Momentum multiplier applied per remaining selection (1 = neutral, <1 = shrunk because losing, >1 = boosted because winning)
  momentumMultipliers?: number[];
  // Set when the flat adversity-% override (see AdversityOverrideResult) replaced the normal fair-value calc
  adversityOverride?: { legsAgainst: number; maxDeficit: number; percentOfStake: number; stakeBasis: number };
}

/**
 * How much a remaining selection's implied probability should be nudged based on the
 * *current* scoreline, independent of the bookmaker live-odds feed (which can lag behind
 * fast-moving match events). Returns a multiplier applied to `1 / liveOdds`:
 *   - Currently LOSING: shrinks toward 0 as the match approaches full time (drastic reduction,
 *     eventually offering next to nothing if the course of the game keeps going against the bet).
 *   - Currently WINNING: grows modestly toward full time (a held lead is worth more late on).
 *   - Undeterminable (market outcome can't be evaluated from the score, e.g. pre-match) → neutral.
 */
function computeMomentumMultiplier(sel: RemainingSelectionInput, config: CashOutConfig): number {
  if (!config.matchStateAdjustmentEnabled) return 1;
  if (sel.fixtureStatus !== "live") return 1;
  if (sel.currentScoreHome == null || sel.currentScoreAway == null) return 1;

  const outcome = getSelectionOutcome(sel.selection, sel.market, sel.currentScoreHome, sel.currentScoreAway);
  if (outcome === null) return 1;

  const minute = parseMinuteNumber(sel.matchMinute) ?? 0;
  const progress = Math.min(1, Math.max(0, minute / 90));
  const shaped = Math.pow(progress, config.momentumDecayPower);

  if (outcome === false) {
    const shrink = (config.losingMomentumDecayPercent / 100) * shaped;
    return Math.max(0, 1 - shrink);
  }
  const boost = (config.winningMomentumBoostPercent / 100) * shaped;
  return 1 + boost;
}

/**
 * How many goals a currently-losing selection is behind by, i.e. how many goals
 * would need to swing back for the selection to flip to winning. Best-effort:
 * markets that aren't naturally goal-margin based (BTTS, etc.) fall back to a
 * conservative deficit of 1 (the least severe bucket) rather than guessing.
 * Only meaningful when `getSelectionOutcome(...)` has already returned `false`
 * for this selection/score combination.
 */
function computeGoalDeficit(selection: string, market: string, scoreHome: number, scoreAway: number): number {
  const m = market.trim().toLowerCase();
  const s = selection.trim().toLowerCase();

  if (m === "1x2" || m === "match result") {
    if (s === "home" || s === "home win" || s === "1") return Math.max(1, scoreAway - scoreHome);
    if (s === "away" || s === "away win" || s === "2") return Math.max(1, scoreHome - scoreAway);
    if (s === "draw" || s === "x") return Math.max(1, Math.abs(scoreHome - scoreAway));
    return 1;
  }

  if (m === "double chance") {
    if (s === "1x") return Math.max(1, scoreAway - scoreHome); // currently away is winning outright
    if (s === "x2") return Math.max(1, scoreHome - scoreAway); // currently home is winning outright
    if (s === "12") return 1; // currently a draw — needs either side to break the tie
    return 1;
  }

  const ouMatch = market.match(/^Over\/Under\s+(\d+(?:\.\d+)?)$/i);
  if (ouMatch) {
    const line = parseFloat(ouMatch[1]!);
    const total = scoreHome + scoreAway;
    if (s.startsWith("over")) return Math.max(1, Math.ceil(line - total));
    // "under" already exceeded the line — treat as maximally against (can never recover)
    return Math.max(1, Math.ceil(total - line));
  }

  return 1;
}

export interface AdversityOverrideResult {
  applies: boolean; // true if the flat-% override should replace the normal fair-value offer
  unavailable: boolean; // true if Cash Out should be blocked entirely
  unavailableReason?: string; // human-readable reason shown to the client when unavailable
  percent: number | null; // % of stake to offer, when applies === true
  legsAgainst: number;
  maxDeficit: number;
}

/**
 * Counts how many remaining LIVE legs are currently going against the bet (and by how
 * many goals), and maps that to the flat stake-percentage Cash Out override described
 * in `CashOutConfig`'s adversity* fields. Legs that are winning, drawing-in-favor,
 * not yet live, or on an unevaluable market do not count against the bet.
 */
export function computeAdversityOverride(remaining: RemainingSelectionInput[], config: CashOutConfig): AdversityOverrideResult {
  if (!config.adversityCashOutEnabled) {
    return { applies: false, unavailable: false, percent: null, legsAgainst: 0, maxDeficit: 0 };
  }

  let legsAgainst = 0;
  let maxDeficit = 0;

  for (const sel of remaining) {
    if (sel.fixtureStatus !== "live") continue;
    if (sel.currentScoreHome == null || sel.currentScoreAway == null) continue;

    const outcome = getSelectionOutcome(sel.selection, sel.market, sel.currentScoreHome, sel.currentScoreAway);
    if (outcome !== false) continue; // winning, drawing-in-favor, or unevaluable — not against the bet

    legsAgainst++;
    const deficit = computeGoalDeficit(sel.selection, sel.market, sel.currentScoreHome, sel.currentScoreAway);
    if (deficit > maxDeficit) maxDeficit = deficit;

    // Hard suspend: if ANY live leg is losing by 3 or more goals, block Cash Out entirely.
    // The suspension lifts automatically on the next recalc if the scoreline improves
    // (deficit drops back below the threshold — e.g. a comeback goal).
    const goalThreshold = config.suspendWhenLosingByGoals ?? 3;
    if (goalThreshold > 0 && deficit >= goalThreshold) {
      return {
        applies: false,
        unavailable: true,
        unavailableReason: `Cash Out suspended — your selection is currently losing by ${deficit} goals`,
        percent: null,
        legsAgainst,
        maxDeficit: deficit,
      };
    }
  }

  if (legsAgainst === 0) {
    return { applies: false, unavailable: false, percent: null, legsAgainst: 0, maxDeficit: 0 };
  }

  if (legsAgainst > config.adversityMaxLegsAgainst) {
    return {
      applies: false,
      unavailable: true,
      unavailableReason: "Cash Out not available — too many selections are currently going against your bet",
      percent: null,
      legsAgainst,
      maxDeficit,
    };
  }

  if (legsAgainst === 1) {
    const percent = maxDeficit >= 2 ? config.adversityOneLegTwoGoalPercent : config.adversityOneLegOneGoalPercent;
    return { applies: true, unavailable: false, percent, legsAgainst, maxDeficit };
  }

  if (legsAgainst === 2) {
    // Two legs down by 1 goal each -> 50%; if either is down by 2+, treat as worse-case.
    const percent = maxDeficit >= 2 ? config.adversityThreeLegsPercent : config.adversityTwoLegsPercent;
    return { applies: true, unavailable: false, percent, legsAgainst, maxDeficit };
  }

  // legsAgainst === 3 (config.adversityMaxLegsAgainst default)
  return { applies: true, unavailable: false, percent: config.adversityThreeLegsPercent, legsAgainst, maxDeficit };
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

  // Adversity override: if one or more remaining live legs are currently going against
  // the bet, replace the normal fair-value calc with a flat % of stake (or block entirely
  // once too many legs are down). Takes priority over the momentum/margin math below.
  // As soon as legs recover (no legs against, or back under the block threshold), this
  // stops applying and the normal engine below takes back over on the very next recalculation.
  const adversity = computeAdversityOverride(ctx.remaining, config);
  const liveOddsUsedForAdversity = ctx.remaining.map((sel) => ({ selectionId: sel.selectionId, oddsValue: sel.liveOdds! }));

  if (adversity.unavailable) {
    return {
      eligible: false,
      reason: adversity.unavailableReason ?? "Cash Out not available",
      offerAmount: 0,
      fairValue: 0,
      combinedProbability: 0,
      marginUsed: 0,
      baseMarginPercent: config.houseMarginPercent,
      protectionsApplied: {},
      liveOddsUsed: liveOddsUsedForAdversity,
      potentialWin,
      stake: ctx.stake,
      adversityOverride: { legsAgainst: adversity.legsAgainst, maxDeficit: adversity.maxDeficit, percentOfStake: 0, stakeBasis: ctx.stake },
    };
  }

  if (adversity.applies && adversity.percent !== null) {
    // If an earlier leg has already won (locked in), the stake has effectively grown —
    // the % below is applied to that grown amount, not the raw original stake, so a
    // bettor who already banked a win isn't shortchanged when the remaining legs turn.
    const effectiveStake = ctx.stake * Math.max(1, ctx.lockedInStakeMultiplier);
    const rawOffer = effectiveStake * (adversity.percent / 100);
    let offerAmount = applyRounding(Math.max(0, rawOffer), config);
    if (config.maxOfferAmount > 0) offerAmount = Math.min(offerAmount, config.maxOfferAmount);
    if (config.maxCashOutAmount > 0) offerAmount = Math.min(offerAmount, config.maxCashOutAmount);
    if (config.maxCashOutPerTicket > 0) offerAmount = Math.min(offerAmount, config.maxCashOutPerTicket);

    return {
      eligible: true,
      offerAmount,
      fairValue: offerAmount,
      combinedProbability: 0,
      marginUsed: 0,
      baseMarginPercent: config.houseMarginPercent,
      protectionsApplied: {},
      liveOddsUsed: liveOddsUsedForAdversity,
      potentialWin,
      stake: ctx.stake,
      adversityOverride: { legsAgainst: adversity.legsAgainst, maxDeficit: adversity.maxDeficit, percentOfStake: adversity.percent, stakeBasis: effectiveStake },
    };
  }

  // Step 1 + 2: implied probability of each remaining live-odds selection, nudged by the
  // live match-state momentum adjustment (reacts instantly to the scoreline, not just the feed)
  const liveOddsUsed = ctx.remaining.map((sel) => ({ selectionId: sel.selectionId, oddsValue: sel.liveOdds! }));
  const momentumMultipliers = ctx.remaining.map((sel) => computeMomentumMultiplier(sel, config));
  const probabilities = ctx.remaining.map((sel, i) => Math.min(1, (1 / sel.liveOdds!) * momentumMultipliers[i]!));

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
    momentumMultipliers,
  };
}
