import { Router } from "express";
import {
  db, betsTable, betSelectionsTable, fixturesTable, leaguesTable,
  marketsTable, oddsTable, walletsTable, transactionsTable, usersTable,
  cashOutAuditLogTable, settingsTable,
} from "@workspace/db";
import { eq, and, inArray, desc, gte, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, requireAdminOrManager, type AuthRequest } from "../middlewares/auth";
import {
  getCashOutConfig, saveCashOutConfig, computeCashOutOffer, checkCashOutEligibility,
  DEFAULT_CASH_OUT_CONFIG, type CashOutConfig, type RemainingSelectionInput, type CashOutEligibilityContext,
} from "../lib/cashOut";
import { getSelectionOutcome } from "../lib/autoSettle";
import { UP_SELECTIONS } from "../lib/upMarkets";
import { createNotification } from "../lib/notifications";
import { broadcast } from "../lib/wsServer";
import { logger } from "../lib/logger";

const router = Router();

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

// ── Shared: build the eligibility/offer context for a bet ──────────────────────

interface BetContextResult {
  bet: any;
  ctx: CashOutEligibilityContext | null;
  settledLegsWinFactor: number;
  blockedReason?: string;
}

async function buildBetContext(bet: any, executor: typeof db = db): Promise<BetContextResult> {
  if (bet.status !== "pending") {
    return { bet, ctx: null, settledLegsWinFactor: 1, blockedReason: "Ticket already settled" };
  }

  const selections = await executor.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, bet.id));
  if (selections.length === 0) {
    return { bet, ctx: null, settledLegsWinFactor: 1, blockedReason: "No selections found on this ticket" };
  }

  const fixtureIds = [...new Set(selections.map((s) => s.fixtureId))];
  const fixtures = await executor.select().from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds));
  const fixtureMap = Object.fromEntries(fixtures.map((f) => [f.id, f]));

  const leagueIds = [...new Set(fixtures.map((f) => f.leagueId))];
  const leagues = leagueIds.length > 0 ? await executor.select().from(leaguesTable).where(inArray(leaguesTable.id, leagueIds)) : [];
  const leagueMap = Object.fromEntries(leagues.map((l) => [l.id, l]));

  const markets = fixtureIds.length > 0 ? await executor.select().from(marketsTable).where(inArray(marketsTable.fixtureId, fixtureIds)) : [];
  const marketIds = markets.map((m) => m.id);
  const odds = marketIds.length > 0 ? await executor.select().from(oddsTable).where(inArray(oddsTable.marketId, marketIds)) : [];

  // (fixtureId, marketType) -> market row
  const marketKey = (fixtureId: number, marketType: string) => `${fixtureId}::${marketType.trim().toLowerCase()}`;
  const marketMap = new Map(markets.map((m) => [marketKey(m.fixtureId, m.marketType), m]));
  const oddsByMarket = new Map<number, typeof odds>();
  for (const o of odds) {
    const arr = oddsByMarket.get(o.marketId) ?? [];
    arr.push(o);
    oddsByMarket.set(o.marketId, arr);
  }

  const remaining: RemainingSelectionInput[] = [];
  let settledLegsWinFactor = 1;
  let hasKnownLoss = false;

  for (const sel of selections) {
    const fixture = fixtureMap[sel.fixtureId];
    if (!fixture) { hasKnownLoss = true; continue; }
    const league = leagueMap[fixture.leagueId];

    // 1UP/2UP legs already settled live by the sync worker
    if (UP_SELECTIONS.has(sel.selection)) {
      if (sel.upWon) { settledLegsWinFactor *= 1; continue; }
      if (fixture.status === "finished") { hasKnownLoss = true; }
      // else: still pending live resolution — cannot cash out until it resolves
      else {
        remaining.push({
          selectionId: sel.id, fixtureId: sel.fixtureId, sportId: league?.sportId ?? null,
          leagueId: fixture.leagueId, countryName: league?.countryName ?? null,
          market: sel.market, selection: sel.selection, originalOdds: parseFloat(sel.odds),
          liveOdds: null, suspended: true, fixtureStatus: fixture.status,
          matchMinute: null, startTime: fixture.startTime.toISOString(),
        });
      }
      continue;
    }

    if (fixture.status === "finished" && fixture.scoreHome !== null && fixture.scoreAway !== null) {
      const outcome = getSelectionOutcome(sel.selection, sel.market, fixture.scoreHome, fixture.scoreAway);
      if (outcome === false) { hasKnownLoss = true; continue; }
      if (outcome === true) { settledLegsWinFactor *= 1; continue; }
      // outcome === null (void/unrecognised market) — treat as locked-in at factor 1 (refund-equivalent)
      settledLegsWinFactor *= 1;
      continue;
    }

    // Still unresolved — this leg needs a live odds lookup
    const market = marketMap.get(marketKey(sel.fixtureId, sel.market));
    const marketOdds = market ? oddsByMarket.get(market.id) ?? [] : [];
    const oddsRow = marketOdds.find((o) => o.selection.trim().toLowerCase() === sel.selection.trim().toLowerCase());

    remaining.push({
      selectionId: sel.id,
      fixtureId: sel.fixtureId,
      sportId: league?.sportId ?? null,
      leagueId: fixture.leagueId,
      countryName: league?.countryName ?? null,
      market: sel.market,
      selection: sel.selection,
      originalOdds: parseFloat(sel.odds),
      liveOdds: oddsRow ? parseFloat(oddsRow.oddsValue) : null,
      suspended: market?.suspended ?? true,
      fixtureStatus: fixture.status,
      matchMinute: null, // match-minute/red-card/VAR live-state is not persisted server-side yet
      startTime: fixture.startTime.toISOString(),
    });
  }

  if (hasKnownLoss) {
    return { bet, ctx: null, settledLegsWinFactor, blockedReason: "This ticket has a losing selection and is no longer eligible for Cash Out" };
  }

  const ctx: CashOutEligibilityContext = {
    betStatus: bet.status,
    isLiveBet: remaining.some((r) => r.fixtureStatus === "live") || fixtures.some((f) => f.status === "live"),
    isPreMatchOnly: remaining.every((r) => r.fixtureStatus === "upcoming"),
    totalSelectionsCount: selections.length,
    isSystemBet: false, // system bets are not currently supported by this platform
    stake: parseFloat(bet.stake),
    remaining,
  };

  return { bet, ctx, settledLegsWinFactor };
}

// ── GET /bets/:id/cash-out — fetch current live offer (does not lock anything) ──
router.get("/bets/:id/cash-out", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid bet id" }); return; }

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  if (!bet) { res.status(404).json({ error: "Bet not found" }); return; }

  const isAdminOrManager = req.userRole === "admin" || req.userRole === "manager";
  if (!isAdminOrManager && bet.userId !== req.userId) {
    res.status(403).json({ error: "You do not have permission to view this ticket" });
    return;
  }

  const config = await getCashOutConfig();
  const { ctx, settledLegsWinFactor, blockedReason } = await buildBetContext(bet);

  if (!ctx) {
    res.json({ eligible: false, reason: blockedReason ?? "Not eligible for Cash Out" });
    return;
  }

  const offer = computeCashOutOffer(ctx, parseFloat(bet.potentialWin), config, settledLegsWinFactor);
  res.json(offer);
});

// ── POST /bets/:id/cash-out — accept the offer (fully re-validated server-side) ─
router.post("/bets/:id/cash-out", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid bet id" }); return; }

  const clientExpectedAmount = typeof req.body?.expectedAmount === "number" ? req.body.expectedAmount : null;

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  if (!bet) { res.status(404).json({ error: "Bet not found" }); return; }
  if (bet.userId !== req.userId) {
    res.status(403).json({ error: "You do not have permission to cash out this ticket" });
    return;
  }

  const config = await getCashOutConfig();

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
  const userAgent = (req.headers["user-agent"] as string) || null;

  // Preliminary (non-authoritative) check outside the transaction, purely to fail
  // fast with a friendly error before taking any locks. The authoritative offer
  // is recomputed inside the transaction below, right after the row lock.
  const preliminary = await buildBetContext(bet);
  if (!preliminary.ctx) {
    res.status(400).json({ error: preliminary.blockedReason ?? "This ticket is not eligible for Cash Out" });
    return;
  }
  const preliminaryOffer = computeCashOutOffer(preliminary.ctx, parseFloat(bet.potentialWin), config, preliminary.settledLegsWinFactor);
  if (!preliminaryOffer.eligible) {
    res.status(400).json({ error: preliminaryOffer.reason ?? "Cash Out is not available for this ticket" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the bet row and re-check status inside the transaction to prevent
      // double cash-out / race conditions from concurrent accept requests.
      const [freshBet] = await tx.execute(
        sql`select * from bets where id = ${id} for update`
      ).then((r: any) => r.rows ?? r);
      if (!freshBet || freshBet.status !== "pending") {
        throw new Error("ALREADY_SETTLED");
      }

      // Recompute eligibility/offer from scratch inside the lock, using fresh live
      // odds/fixture state, so nothing settles against a quote that went stale
      // between the initial GET/preview and this accept request.
      const { ctx, settledLegsWinFactor, blockedReason } = await buildBetContext(freshBet, tx as unknown as typeof db);
      if (!ctx) {
        throw new Error(`INELIGIBLE:${blockedReason ?? "This ticket is not eligible for Cash Out"}`);
      }
      const offer = computeCashOutOffer(ctx, parseFloat(freshBet.potential_win ?? bet.potentialWin), config, settledLegsWinFactor);
      if (!offer.eligible) {
        throw new Error(`INELIGIBLE:${offer.reason ?? "Cash Out is not available for this ticket"}`);
      }

      // Reject if the freshly recomputed offer has drifted too far from what the
      // client last saw and agreed to (protects the customer from silently
      // accepting a materially different amount than they confirmed).
      if (clientExpectedAmount !== null && config.maxOddsDriftPercent > 0) {
        const driftPercent = Math.abs(offer.offerAmount - clientExpectedAmount) / Math.max(clientExpectedAmount, 0.01) * 100;
        if (driftPercent > config.maxOddsDriftPercent) {
          throw new Error(`OFFER_CHANGED:${JSON.stringify(offer)}`);
        }
      }

      // Serialize all cap-checking transactions on a fixed advisory lock key so
      // concurrent accepts (even across different bets/customers) can never both
      // read the same pre-insert aggregate and jointly overshoot a configured cap.
      if (config.maxDailyCashOutLiability > 0 || config.maxCashOutPerCustomerPerDay > 0 || config.maxCashOutExposure > 0) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext('cash_out_limits'))`);

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const [dailyTotals] = await tx.execute(
          sql`select
                coalesce(sum(offer_amount), 0) as daily_total,
                coalesce(sum(offer_amount) filter (where user_id = ${bet.userId}), 0) as customer_total
              from cash_out_audit_log
              where status = 'accepted' and created_at >= ${startOfDay}`
        ).then((r: any) => r.rows ?? r);

        const dailyTotal = parseFloat(dailyTotals?.daily_total ?? "0");
        const customerTotal = parseFloat(dailyTotals?.customer_total ?? "0");

        if (config.maxDailyCashOutLiability > 0 && dailyTotal + offer.offerAmount > config.maxDailyCashOutLiability) {
          throw new Error("DAILY_LIABILITY_EXCEEDED");
        }
        if (config.maxCashOutExposure > 0 && dailyTotal + offer.offerAmount > config.maxCashOutExposure) {
          throw new Error("EXPOSURE_EXCEEDED");
        }
        if (config.maxCashOutPerCustomerPerDay > 0 && customerTotal + offer.offerAmount > config.maxCashOutPerCustomerPerDay) {
          throw new Error("CUSTOMER_DAILY_CAP_EXCEEDED");
        }
      }

      const [wallet] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, bet.userId)).limit(1);
      if (!wallet) throw new Error("NO_WALLET");

      // Atomic increment (balance = balance + amount) directly in SQL rather than
      // read-then-write, so concurrent wallet mutations (bets, deposits, other
      // cash-outs) can never be lost to a stale read.
      const [updatedWalletRow] = await tx.execute(
        sql`update wallets set balance = balance + ${offer.offerAmount.toFixed(2)} where id = ${wallet.id} returning *`
      ).then((r: any) => r.rows ?? r);
      const newBalance = parseFloat(updatedWalletRow.balance);

      await tx.insert(transactionsTable).values({
        walletId: wallet.id,
        amount: offer.offerAmount.toFixed(2),
        type: "cash_out",
        description: `Cash Out — Bet ${bet.code ?? "#" + bet.id}`,
      });

      // Cash-out is a distinct financial event from placement — snapshot the rate
      // in effect right now so its CDF display never drifts either, independent of
      // the bet's placement-time rate.
      const cashOutRateStr = await getSetting("usd_to_cdf_rate");
      const cashOutRateNum = parseFloat(cashOutRateStr ?? "2800");
      const cashOutRate = Number.isFinite(cashOutRateNum) && cashOutRateNum > 0 ? cashOutRateNum : 2800;

      const [updatedBet] = await tx.update(betsTable).set({
        status: "cashed_out",
        cashOutAmount: offer.offerAmount.toFixed(2),
        cashOutAt: new Date(),
        cashOutMarginUsed: offer.marginUsed.toFixed(2),
        cashOutFairValue: offer.fairValue.toFixed(2),
        cashOutProbability: offer.combinedProbability.toFixed(4),
        cashOutOddsSnapshot: offer.liveOddsUsed,
        cashOutIp: ip,
        cashOutDevice: userAgent,
        cashOutExchangeRate: cashOutRate.toFixed(4),
      }).where(eq(betsTable.id, id)).returning();

      const [user] = await tx.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, bet.userId)).limit(1);

      await tx.insert(cashOutAuditLogTable).values({
        betId: id,
        userId: bet.userId,
        username: user?.username ?? null,
        stake: bet.stake,
        potentialWin: bet.potentialWin,
        offerAmount: offer.offerAmount.toFixed(2),
        acceptedAmount: offer.offerAmount.toFixed(2),
        marginUsed: offer.marginUsed.toFixed(2),
        remainingSelections: ctx.remaining,
        liveOdds: offer.liveOddsUsed,
        adminSettingsVersion: String(config.version),
        ipAddress: ip,
        browser: userAgent,
        device: userAgent,
        status: "accepted",
      });

      return { updatedBet, offer, wallet: { ...wallet, balance: newBalance.toFixed(2) } };
    });

    createNotification(
      bet.userId,
      "cash_out",
      "Cash Out Successful",
      `You cashed out bet ${bet.code ?? "#" + bet.id} for ${result.offer.offerAmount.toFixed(2)}.`,
      { betId: id, amount: result.offer.offerAmount },
    ).catch(() => {});

    broadcast("CASH_OUT_ACCEPTED", { betId: id, userId: bet.userId, amount: result.offer.offerAmount });

    res.json({ success: true, offer: result.offer, bet: result.updatedBet });
  } catch (err: any) {
    const message: string = err?.message ?? "";
    if (message === "ALREADY_SETTLED") {
      res.status(409).json({ error: "This ticket has already been settled or cashed out" });
      return;
    }
    if (message === "NO_WALLET") {
      res.status(400).json({ error: "Wallet not found" });
      return;
    }
    if (message === "DAILY_LIABILITY_EXCEEDED" || message === "EXPOSURE_EXCEEDED") {
      res.status(409).json({ error: "Cash Out is temporarily unavailable due to a system risk limit. Please try again shortly." });
      return;
    }
    if (message === "CUSTOMER_DAILY_CAP_EXCEEDED") {
      res.status(409).json({ error: "You have reached your daily Cash Out limit." });
      return;
    }
    if (message.startsWith("INELIGIBLE:")) {
      res.status(400).json({ error: message.slice("INELIGIBLE:".length) });
      return;
    }
    if (message.startsWith("OFFER_CHANGED:")) {
      const freshOffer = JSON.parse(message.slice("OFFER_CHANGED:".length));
      res.status(409).json({
        error: "The Cash Out offer has changed. Please review the new amount and confirm again.",
        offer: freshOffer,
      });
      return;
    }
    logger.error({ err, betId: id }, "Cash Out accept failed");
    res.status(500).json({ error: "Failed to process Cash Out. Please try again." });
  }
});

// ── Admin: settings ──────────────────────────────────────────────────────────
router.get("/admin/cash-out/settings", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await getCashOutConfig());
});

router.put("/admin/cash-out/settings", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const body = req.body as Partial<CashOutConfig>;

  // Lightweight manual validation (no zod available in api-server)
  const numericFields: Array<keyof CashOutConfig> = [
    "houseMarginPercent", "minMarginPercent", "maxMarginPercent",
    "minCashOutAmount", "maxCashOutAmount", "minTicketStake", "maxTicketStake",
    "minOfferAmount", "maxOfferAmount", "disableMinutesBeforeKickoff", "disableAfterMinute",
    "refreshIntervalSeconds", "maxOddsDriftPercent",
    "largeWinProtectionPercent", "highOddsProtectionPercent", "accumulatorProtectionPercent",
    "lateMatchProtectionPercent", "riskAdjustmentPercent",
    "largeWinThreshold", "highOddsThreshold", "accumulatorSelectionsThreshold", "lateMatchMinuteThreshold",
    "maxCashOutExposure", "maxDailyCashOutLiability", "maxCashOutPerTicket", "maxCashOutPerCustomerPerDay",
  ];
  for (const f of numericFields) {
    if (body[f] !== undefined && (typeof body[f] !== "number" || Number.isNaN(body[f] as number) || (body[f] as number) < 0)) {
      res.status(400).json({ error: `${f} must be a non-negative number` });
      return;
    }
  }
  if (body.roundingMode !== undefined && !["none", "up", "down", "nearest"].includes(body.roundingMode)) {
    res.status(400).json({ error: "Invalid roundingMode" });
    return;
  }
  if (body.minMarginPercent !== undefined && body.maxMarginPercent !== undefined && body.minMarginPercent > body.maxMarginPercent) {
    res.status(400).json({ error: "minMarginPercent cannot exceed maxMarginPercent" });
    return;
  }

  const updated = await saveCashOutConfig({ ...DEFAULT_CASH_OUT_CONFIG, ...(await getCashOutConfig()), ...body } as CashOutConfig);
  res.json(updated);
});

// ── Admin: reports ───────────────────────────────────────────────────────────
router.get("/admin/cash-out/reports", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const days = Math.min(Math.max(parseInt((req.query.days as string) ?? "30", 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const cashedOutBets = await db.select().from(betsTable).where(and(eq(betsTable.status, "cashed_out"), gte(betsTable.cashOutAt, since)));

  const totalPaid = cashedOutBets.reduce((acc, b) => acc + parseFloat(b.cashOutAmount ?? "0"), 0);
  const totalSaved = cashedOutBets.reduce((acc, b) => acc + (parseFloat(b.potentialWin) - parseFloat(b.cashOutAmount ?? "0")), 0);
  const avgMargin = cashedOutBets.length > 0
    ? cashedOutBets.reduce((acc, b) => acc + parseFloat(b.cashOutMarginUsed ?? "0"), 0) / cashedOutBets.length
    : 0;
  const avgOffer = cashedOutBets.length > 0 ? totalPaid / cashedOutBets.length : 0;
  const largest = cashedOutBets.reduce((max, b) => Math.max(max, parseFloat(b.cashOutAmount ?? "0")), 0);

  // Most cashed-out sport/league/market — derived from selections of cashed-out bets
  const betIds = cashedOutBets.map((b) => b.id);
  const selections = betIds.length > 0 ? await db.select().from(betSelectionsTable).where(inArray(betSelectionsTable.betId, betIds)) : [];
  const marketCounts: Record<string, number> = {};
  for (const s of selections) marketCounts[s.market] = (marketCounts[s.market] ?? 0) + 1;
  const mostCashedOutMarket = Object.entries(marketCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const fixtureIds = [...new Set(selections.map((s) => s.fixtureId))];
  const fixtures = fixtureIds.length > 0 ? await db.select().from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds)) : [];
  const leagueIds = [...new Set(fixtures.map((f) => f.leagueId))];
  const leagues = leagueIds.length > 0 ? await db.select().from(leaguesTable).where(inArray(leaguesTable.id, leagueIds)) : [];
  const leagueMap = Object.fromEntries(leagues.map((l) => [l.id, l]));
  const sportCounts: Record<number, number> = {};
  const leagueCounts: Record<number, number> = {};
  for (const f of fixtures) {
    const league = leagueMap[f.leagueId];
    if (league) sportCounts[league.sportId] = (sportCounts[league.sportId] ?? 0) + 1;
    leagueCounts[f.leagueId] = (leagueCounts[f.leagueId] ?? 0) + 1;
  }
  const mostCashedOutSportId = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const mostCashedOutLeagueId = Object.entries(leagueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  res.json({
    days,
    totalCashOuts: cashedOutBets.length,
    totalPaid,
    totalSaved,
    avgMarginUsed: avgMargin,
    avgOfferAmount: avgOffer,
    largestCashOut: largest,
    mostCashedOutMarket,
    mostCashedOutSportId: mostCashedOutLeagueId ? Number(mostCashedOutSportId) : null,
    mostCashedOutLeagueId: mostCashedOutLeagueId ? Number(mostCashedOutLeagueId) : null,
  });
});

// ── Admin: audit log ─────────────────────────────────────────────────────────
router.get("/admin/cash-out/audit-log", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const page = Math.max(parseInt((req.query.page as string) ?? "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) ?? "50", 10) || 50, 1), 200);
  const offset = (page - 1) * limit;

  const rows = await db.select().from(cashOutAuditLogTable).orderBy(desc(cashOutAuditLogTable.createdAt)).limit(limit).offset(offset);
  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(cashOutAuditLogTable);

  res.json({ logs: rows, total, page, limit });
});

export default router;
