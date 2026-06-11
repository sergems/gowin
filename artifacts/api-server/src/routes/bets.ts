import { Router } from "express";
import { db, betsTable, betSelectionsTable, walletsTable, transactionsTable, fixturesTable, usersTable, teamsTable, leaguesTable } from "@workspace/db";
import { eq, desc, and, count, inArray, ne } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";
import {
  PlaceBetBody,
  ListAllBetsQueryParams,
  GetMyBetsQueryParams,
  GetBetParams,
  VoidBetParams,
} from "@workspace/api-zod";

const router = Router();

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

  const nonUpcoming = fixtures.filter((f) => f.status !== "upcoming");
  if (nonUpcoming.length > 0) {
    res.status(400).json({ error: "One or more events have already started or finished and are no longer open for betting." });
    return;
  }

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

  const MAX_WIN = 1_000_000;
  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const rawPotentialWin = stake * totalOdds;
  const potentialWin = Math.min(rawPotentialWin, MAX_WIN);
  const code = await uniqueBetCode();

  const newBalance = parseFloat(wallet.balance) - stake;
  await db.update(walletsTable).set({ balance: newBalance.toFixed(2) }).where(eq(walletsTable.id, wallet.id));

  const [bet] = await db.insert(betsTable).values({
    code,
    userId: req.userId!,
    stake: stake.toFixed(2),
    totalOdds: totalOdds.toFixed(4),
    potentialWin: potentialWin.toFixed(2),
    status: "pending",
  }).returning();

  await db.insert(betSelectionsTable).values(
    selections.map((s) => ({
      betId: bet.id,
      fixtureId: s.fixtureId,
      market: s.market,
      selection: s.selection,
      odds: s.odds.toFixed(4),
    }))
  );

  await db.insert(transactionsTable).values({
    walletId: wallet.id,
    amount: stake.toFixed(2),
    type: "bet_placed",
    description: `Bet ${bet.code ?? "#" + bet.id} placed`,
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
    user: user || undefined,
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
router.get("/admin/bets/lookup/:code", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const code = req.params.code.toUpperCase().trim();

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
      fixture: fixtureMap[s.fixtureId] || null,
    })),
  });
});

// ── Admin: list all bets ──────────────────────────────────────────────────────
router.get("/bets", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
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
      fixture: fixtureMap[s.fixtureId] || null,
    })),
  });
});

// ── Void bet ──────────────────────────────────────────────────────────────────
router.patch("/bets/:id/void", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
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
