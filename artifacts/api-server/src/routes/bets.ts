import { Router } from "express";
import { db, betsTable, betSelectionsTable, walletsTable, transactionsTable, fixturesTable, usersTable, teamsTable, leaguesTable, oddsTable, marketsTable, settingsTable, betBookingsTable } from "@workspace/db";
import { eq, desc, and, count, inArray, ne } from "drizzle-orm";
import { requireAuth, requireAdmin, requireAdminOrManager, type AuthRequest } from "../middlewares/auth";
import {
  PlaceBetBody,
  ListAllBetsQueryParams,
  GetMyBetsQueryParams,
  GetBetParams,
  VoidBetParams,
} from "@workspace/api-zod";
import { getWinBonusConfig, calculateWinBonus } from "../lib/winBonus";

const router = Router();

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

// ── Bet code generation ───────────────────────────────────────────────────────
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode(): string {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
}

async function uniqueBetCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode();
    const [existing] = await db.select({ id: betsTable.id }).from(betsTable).where(eq(betsTable.code, code)).limit(1);
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique bet code");
}

// ── Place bet ─────────────────────────────────────────────────────────────────
router.post("/bets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = PlaceBetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { stake, selections } = parsed.data;

  // Validate all fixtures are still open for betting
  const fixtureIds = [...new Set(selections.map((s) => s.fixtureId))];
  const fixtures = fixtureIds.length > 0
    ? await db.select({ id: fixturesTable.id, status: fixturesTable.status }).from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds))
    : [];

  if (fixtures.length !== fixtureIds.length) {
    res.status(400).json({ error: "One or more fixtures could not be found." });
    return;
  }

  // Allow betting on both upcoming (pre-match) and live fixtures
  const closedFixtures = fixtures.filter((f) => f.status !== "upcoming" && f.status !== "live");
  if (closedFixtures.length > 0) {
    res.status(400).json({ error: "One or more events have already finished and are no longer open for betting." });
    return;
  }

  // Verify odds server-side — prevents clients from submitting manipulated odds.
  // Also binds each oddsId to its fixtureId, market type, and selection to prevent
  // cross-fixture oddsId injection (e.g. pairing a high-priced unrelated oddsId).
  const oddsIds = [...new Set(selections.map((s) => s.oddsId))];
  const dbOddsRows = oddsIds.length > 0
    ? await db
        .select({
          id: oddsTable.id,
          oddsValue: oddsTable.oddsValue,
          selection: oddsTable.selection,
          marketId: oddsTable.marketId,
          fixtureId: marketsTable.fixtureId,
          marketType: marketsTable.marketType,
          suspended: marketsTable.suspended,
        })
        .from(oddsTable)
        .innerJoin(marketsTable, eq(marketsTable.id, oddsTable.marketId))
        .where(inArray(oddsTable.id, oddsIds))
    : [];

  if (dbOddsRows.length !== oddsIds.length) {
    res.status(400).json({ error: "One or more selected odds are no longer available. Please refresh and try again." });
    return;
  }

  const dbOddsMap = new Map(dbOddsRows.map((o) => [o.id, o]));

  // Validate each selection against the DB — reject any mismatch
  for (const s of selections) {
    const row = dbOddsMap.get(s.oddsId);
    if (!row) {
      res.status(400).json({ error: "One or more selected odds are no longer available. Please refresh and try again." });
      return;
    }
    if (row.suspended) {
      res.status(400).json({ error: "One or more selected markets are currently suspended." });
      return;
    }
    // Virtual 1UP/2UP markets on the frontend map to the parent 1X2 market in the DB
    const UP_PARENT: Record<string, string> = { "1UP": "1X2", "2UP": "1X2" };
    const effectiveClientMarket = UP_PARENT[s.market] ?? s.market;
    if (row.fixtureId !== s.fixtureId || row.marketType !== effectiveClientMarket || row.selection !== s.selection) {
      res.status(400).json({ error: "Bet selection data is invalid. Please refresh the page and try again." });
      return;
    }
  }

  // Use DB odds values — never trust client-supplied odds
  const dbOddsValueMap = new Map(dbOddsRows.map((o) => [o.id, parseFloat(o.oddsValue)]));

  const [userRecord] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!userRecord?.phoneNumber) {
    res.status(403).json({ error: "You must set your phone number in your profile before placing bets." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!)).limit(1);
  if (!wallet || parseFloat(wallet.balance) < stake) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  // Load win bonus config and calculate bonus
  const winBonusConfig = await getWinBonusConfig();

  // Enforce max selections server-side
  if (selections.length > winBonusConfig.maxSelections) {
    res.status(400).json({ error: `Maximum of ${winBonusConfig.maxSelections} selections allowed.` });
    return;
  }

  const oddsValues = selections.map((s) => dbOddsValueMap.get(s.oddsId) ?? s.odds);
  const totalOdds = oddsValues.reduce((acc, o) => acc * o, 1);
  const bonus = calculateWinBonus(oddsValues, stake, winBonusConfig);
  const potentialWin = bonus.potentialWin;

  // Snapshot the USD→CDF rate in effect right now — this bet's CDF value must never
  // change later even if an admin updates the site-wide exchange rate afterwards.
  const rateAtPlacementStr = await getSetting("usd_to_cdf_rate");
  const rateAtPlacement = parseFloat(rateAtPlacementStr ?? "2800");

  const code = await uniqueBetCode();
  const isAgent = userRecord.role === "agent";

  const bet = await db.transaction(async (tx) => {
    // Re-read wallet inside transaction for a consistent balance
    const [freshWallet] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!)).limit(1);
    if (!freshWallet || parseFloat(freshWallet.balance) < stake) {
      throw new Error("Insufficient wallet balance");
    }

    const newBalance = parseFloat(freshWallet.balance) - stake;
    await tx.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, freshWallet.id));

    const [newBet] = await tx.insert(betsTable).values({
      code,
      userId: req.userId!,
      stake: stake.toFixed(2),
      totalOdds: totalOdds.toFixed(4),
      potentialWin: potentialWin.toFixed(2),
      status: "pending",
      qualifyingSelections: bonus.qualifyingSelections,
      bonusPercentage: bonus.bonusPercentage.toFixed(2),
      baseWin: bonus.baseWin.toFixed(2),
      bonusAmount: bonus.bonusAmount.toFixed(2),
      maxWinApplied: bonus.maxWinApplied,
      exchangeRate: (Number.isFinite(rateAtPlacement) && rateAtPlacement > 0 ? rateAtPlacement : 2800).toFixed(4),
      ...(isAgent && {
        agentId: req.userId!,
        branchId: userRecord.branchId ?? undefined,
      }),
    }).returning();

    await tx.insert(betSelectionsTable).values(
      selections.map((s) => ({
        betId: newBet.id,
        fixtureId: s.fixtureId,
        market: s.market,
        selection: s.selection,
        odds: (dbOddsValueMap.get(s.oddsId) ?? s.odds).toFixed(4),
      }))
    );

    await tx.insert(transactionsTable).values({
      walletId: freshWallet.id,
      amount: stake.toFixed(2),
      type: "bet_placed",
      description: `Bet ${newBet.code ?? "#" + newBet.id} placed`,
    });

    return newBet;
  });

  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  res.status(201).json({
    ...formatBet(bet, user),
  });
});

// ── formatBet helper ──────────────────────────────────────────────────────────
function formatBet(bet: any, user?: any) {
  return {
    id: bet.id,
    code: bet.code ?? null,
    userId: bet.userId,
    stake: parseFloat(bet.stake),
    totalOdds: parseFloat(bet.totalOdds),
    potentialWin: parseFloat(bet.potentialWin),
    status: bet.status,
    createdAt: bet.createdAt,
    // Snapshot rate at placement; null for legacy bets predating this column
    exchangeRate: bet.exchangeRate !== undefined && bet.exchangeRate !== null ? parseFloat(bet.exchangeRate) : null,
    user: user || undefined,
    // Win bonus fields
    qualifyingSelections: bet.qualifyingSelections ?? 0,
    bonusPercentage: parseFloat(bet.bonusPercentage ?? "0"),
    baseWin: parseFloat(bet.baseWin ?? "0"),
    bonusAmount: parseFloat(bet.bonusAmount ?? "0"),
    maxWinApplied: bet.maxWinApplied ?? false,
    // Cash Out fields — only populated once status === 'cashed_out'
    cashOutAmount: bet.cashOutAmount !== undefined && bet.cashOutAmount !== null ? parseFloat(bet.cashOutAmount) : null,
    cashOutAt: bet.cashOutAt ?? null,
    cashOutMarginUsed: bet.cashOutMarginUsed !== undefined && bet.cashOutMarginUsed !== null ? parseFloat(bet.cashOutMarginUsed) : null,
    // Rate snapshot from the cash-out event itself (distinct from placement's exchangeRate)
    cashOutExchangeRate: bet.cashOutExchangeRate !== undefined && bet.cashOutExchangeRate !== null ? parseFloat(bet.cashOutExchangeRate) : null,
  };
}

// ── My bets ───────────────────────────────────────────────────────────────────
router.get("/bets/my", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const qp = GetMyBetsQueryParams.safeParse(req.query);
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const limit = qp.success ? (qp.data.limit ?? 20) : 20;
  const status = qp.success ? qp.data.status : undefined;
  const offset = (page - 1) * limit;

  const conditions = [eq(betsTable.userId, req.userId!)];
  if (status) conditions.push(eq(betsTable.status, status as any));

  const [totalResult] = await db.select({ count: count() }).from(betsTable).where(and(...conditions));
  const bets = await db.select().from(betsTable).where(and(...conditions)).orderBy(desc(betsTable.createdAt)).limit(limit).offset(offset);

  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  const betIds = bets.map((b) => b.id);
  const allSelections = betIds.length > 0
    ? await db.select().from(betSelectionsTable).where(inArray(betSelectionsTable.betId, betIds))
    : [];

  const fixtureIds = [...new Set(allSelections.map((s) => s.fixtureId))];
  const allFixtures = fixtureIds.length > 0
    ? await db.select().from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds))
    : [];

  const teamIds = [...new Set([...allFixtures.map((f) => f.homeTeamId), ...allFixtures.map((f) => f.awayTeamId)])];
  const allTeams = teamIds.length > 0
    ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds))
    : [];

  const leagueIds = [...new Set(allFixtures.map((f) => f.leagueId))];
  const allLeagues = leagueIds.length > 0
    ? await db.select().from(leaguesTable).where(inArray(leaguesTable.id, leagueIds))
    : [];
  const leagueMap = Object.fromEntries(allLeagues.map((l) => [l.id, l]));

  const teamMap = Object.fromEntries(allTeams.map((t) => [t.id, t]));
  const fixtureMap = Object.fromEntries(allFixtures.map((f) => [f.id, {
    ...f,
    displayTime: new Date(f.startTime.getTime() + 2 * 60 * 60 * 1000),
    homeTeam: teamMap[f.homeTeamId] || null,
    awayTeam: teamMap[f.awayTeamId] || null,
    league: leagueMap[f.leagueId] || null,
  }]));
  const selectionsByBet: Record<number, any[]> = {};
  for (const s of allSelections) {
    if (!selectionsByBet[s.betId]) selectionsByBet[s.betId] = [];
    selectionsByBet[s.betId].push({
      id: s.id, betId: s.betId, fixtureId: s.fixtureId,
      market: s.market, selection: s.selection, odds: parseFloat(s.odds),
      upWon: s.upWon,
      fixture: fixtureMap[s.fixtureId] || null,
    });
  }

  res.json({
    bets: bets.map((b) => ({ ...formatBet(b, user), selections: selectionsByBet[b.id] || [] })),
    total: totalResult.count,
    page,
    limit,
  });
});

// ── Admin: lookup bet by code ─────────────────────────────────────────────────
router.get("/admin/bets/lookup/:code", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const code = (req.params.code as string).toUpperCase().trim();

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.code, code)).limit(1);
  if (!bet) {
    res.status(404).json({ error: "No bet found with that code" });
    return;
  }

  const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, bet.id));
  const fixtureIds = [...new Set(selections.map((s) => s.fixtureId))];
  const fixtures = fixtureIds.length > 0
    ? await db.select().from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds))
    : [];
  const teamIds = [...new Set([...fixtures.map((f) => f.homeTeamId), ...fixtures.map((f) => f.awayTeamId)])];
  const teams = teamIds.length > 0
    ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds))
    : [];
  const leagueIdsLookup = [...new Set(fixtures.map((f) => f.leagueId))];
  const leaguesLookup = leagueIdsLookup.length > 0
    ? await db.select().from(leaguesTable).where(inArray(leaguesTable.id, leagueIdsLookup))
    : [];
  const teamMapL = Object.fromEntries(teams.map((t) => [t.id, t]));
  const leagueMapL = Object.fromEntries(leaguesLookup.map((l) => [l.id, l]));
  const fixtureMap = Object.fromEntries(fixtures.map((f) => [f.id, {
    ...f,
    displayTime: new Date(f.startTime.getTime() + 2 * 60 * 60 * 1000),
    homeTeam: teamMapL[f.homeTeamId] || null,
    awayTeam: teamMapL[f.awayTeamId] || null,
    league: leagueMapL[f.leagueId] || null,
  }]));

  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, bet.userId)).limit(1);

  res.json({
    ...formatBet(bet, user),
    selections: selections.map((s) => ({
      id: s.id, betId: s.betId, fixtureId: s.fixtureId,
      market: s.market, selection: s.selection, odds: parseFloat(s.odds),
      upWon: s.upWon,
      fixture: fixtureMap[s.fixtureId] || null,
    })),
  });
});

// ── Admin: list all bets ──────────────────────────────────────────────────────
router.get("/bets", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const qp = ListAllBetsQueryParams.safeParse(req.query);
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const limit = qp.success ? (qp.data.limit ?? 20) : 20;
  const status = qp.success ? qp.data.status : undefined;
  const userId = qp.success ? qp.data.userId : undefined;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) conditions.push(eq(betsTable.status, status as any));
  if (userId) conditions.push(eq(betsTable.userId, userId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(betsTable).where(whereClause);
  const rows = await db
    .select({
      bet: betsTable,
      user: { id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt },
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(usersTable.id, betsTable.userId))
    .where(whereClause)
    .orderBy(desc(betsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    bets: rows.map((r) => formatBet(r.bet, r.user)),
    total: totalResult.count,
    page,
    limit,
  });
});

// ── Get single bet ────────────────────────────────────────────────────────────
router.get("/bets/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetBetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, params.data.id)).limit(1);
  if (!bet) {
    res.status(404).json({ error: "Bet not found" });
    return;
  }

  // Ownership check — only the bet owner, admin, or manager may view a bet
  const isAdminOrManager = req.userRole === "admin" || req.userRole === "manager";
  if (!isAdminOrManager && bet.userId !== req.userId) {
    res.status(403).json({ error: "You do not have permission to view this bet" });
    return;
  }

  const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, bet.id));
  const fixtureIds = [...new Set(selections.map((s) => s.fixtureId))];
  const fixtures = fixtureIds.length > 0 ? await db.select().from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds)) : [];
  const leagueIds2 = [...new Set(fixtures.map((f) => f.leagueId))];
  const leagues2 = leagueIds2.length > 0 ? await db.select().from(leaguesTable).where(inArray(leaguesTable.id, leagueIds2)) : [];
  const leagueMap2 = Object.fromEntries(leagues2.map((l) => [l.id, l]));
  const fixtureMap = Object.fromEntries(fixtures.map((f) => [f.id, { ...f, displayTime: new Date(f.startTime.getTime() + 2 * 60 * 60 * 1000), league: leagueMap2[f.leagueId] || null }]));

  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, bet.userId)).limit(1);

  res.json({
    ...formatBet(bet, user),
    selections: selections.map((s) => ({
      id: s.id, betId: s.betId, fixtureId: s.fixtureId,
      market: s.market, selection: s.selection, odds: parseFloat(s.odds),
      upWon: s.upWon,
      fixture: fixtureMap[s.fixtureId] || null,
    })),
  });
});

// ── Share / Replay bet ────────────────────────────────────────────────────────
// Creates a booking code from a placed bet's selections so it can be shared
// with friends or replayed by the owner. Only selections whose fixture is still
// upcoming or live are included — finished / cancelled legs are silently dropped.
// The response also returns the enriched selections array so the frontend can
// load them directly (replay) without a second round-trip.

const SHARE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateShareCode(): string {
  return Array.from({ length: 8 }, () => SHARE_CODE_CHARS[Math.floor(Math.random() * SHARE_CODE_CHARS.length)]).join("");
}
async function uniqueShareBookingCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateShareCode();
    const [ex] = await db.select({ id: betBookingsTable.id }).from(betBookingsTable).where(eq(betBookingsTable.code, code)).limit(1);
    if (!ex) return code;
  }
  throw new Error("Failed to generate unique share code");
}

router.post("/bets/:id/share", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid bet ID" }); return; }

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  if (!bet) { res.status(404).json({ error: "Bet not found" }); return; }

  const isAdminOrManager = req.userRole === "admin" || req.userRole === "manager";
  if (!isAdminOrManager && bet.userId !== req.userId) {
    res.status(403).json({ error: "You do not have permission to share this bet" });
    return;
  }

  const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, bet.id));
  const fixtureIds = [...new Set(selections.map((s) => s.fixtureId))];
  const fixtures = fixtureIds.length > 0 ? await db.select().from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds)) : [];
  const teamIds = [...new Set([...fixtures.map((f) => f.homeTeamId), ...fixtures.map((f) => f.awayTeamId)])] as number[];
  const teams = teamIds.length > 0 ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds)) : [];
  const leagueIds = [...new Set(fixtures.map((f) => f.leagueId))] as number[];
  const leagues = leagueIds.length > 0 ? await db.select().from(leaguesTable).where(inArray(leaguesTable.id, leagueIds)) : [];
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const leagueMap = Object.fromEntries(leagues.map((l) => [l.id, l]));
  const fixtureMap = Object.fromEntries(
    fixtures.map((f) => [f.id, {
      ...f,
      homeTeam: teamMap[f.homeTeamId] || null,
      awayTeam: teamMap[f.awayTeamId] || null,
      league: leagueMap[f.leagueId] || null,
    }])
  );

  // Build booking selections — only upcoming/live fixtures, re-lookup current odds
  const bookingSelections: any[] = [];
  for (const sel of selections) {
    const fixture = fixtureMap[sel.fixtureId];
    if (!fixture || fixture.status === "finished" || fixture.status === "cancelled") continue;

    // Find the current live odds row for this fixture + market + selection
    const [currentOdds] = await db
      .select({ id: oddsTable.id, oddsValue: oddsTable.oddsValue })
      .from(oddsTable)
      .innerJoin(marketsTable, eq(marketsTable.id, oddsTable.marketId))
      .where(
        and(
          eq(marketsTable.fixtureId, sel.fixtureId),
          eq(marketsTable.marketType, sel.market),
          eq(oddsTable.selection, sel.selection),
        )
      )
      .limit(1);

    if (!currentOdds) continue; // market no longer offered — skip silently

    bookingSelections.push({
      oddsId: currentOdds.id,
      fixtureId: sel.fixtureId,
      market: sel.market,
      selection: sel.selection,
      odds: parseFloat(currentOdds.oddsValue),
      fixtureName: `${fixture.homeTeam?.name ?? "?"} vs ${fixture.awayTeam?.name ?? "?"}`,
      competitionName: fixture.league?.name ?? null,
      startTime: fixture.startTime?.toISOString() ?? null,
      displayTime: fixture.startTime
        ? new Date(fixture.startTime.getTime() + 2 * 60 * 60 * 1000).toISOString()
        : null,
      fixtureStatus: fixture.status,
    });
  }

  if (bookingSelections.length === 0) {
    res.status(409).json({ error: "No shareable events found — all events on this bet have already played or markets are no longer available" });
    return;
  }

  const code = await uniqueShareBookingCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(betBookingsTable).values({ code, selections: bookingSelections, expiresAt });

  res.status(201).json({ code, expiresAt, selections: bookingSelections });
});

// ── Void bet ──────────────────────────────────────────────────────────────────
router.patch("/bets/:id/void", requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const params = VoidBetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, params.data.id)).limit(1);
  if (!bet) {
    res.status(404).json({ error: "Bet not found" });
    return;
  }
  if (bet.status !== "pending") {
    res.status(400).json({ error: "Only pending bets can be voided" });
    return;
  }

  const [updated] = await db.update(betsTable).set({ status: "void" }).where(eq(betsTable.id, bet.id)).returning();

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, bet.userId)).limit(1);
  if (wallet) {
    const refunded = parseFloat(wallet.balance) + parseFloat(bet.stake);
    await db.update(walletsTable).set({ balance: refunded.toFixed(2) }).where(eq(walletsTable.id, wallet.id));
    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      amount: bet.stake,
      type: "bet_refund",
      description: `Bet ${bet.code ?? "#" + bet.id} voided - stake refunded`,
    });
  }

  res.json(formatBet(updated));
});

export default router;
