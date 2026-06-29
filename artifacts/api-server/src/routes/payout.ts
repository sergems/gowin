import { Router } from "express";
import { alias } from "drizzle-orm/pg-core";
import { db, betsTable, betSelectionsTable, usersTable, walletsTable, withdrawalsTable, branchesTable, fixturesTable, teamsTable } from "@workspace/db";
import { eq, and, isNull, isNotNull, inArray, count, sum, gte, desc } from "drizzle-orm";
import { requirePayout, type AuthRequest } from "../middlewares/auth";

const router = Router();

const homeTeams = alias(teamsTable, "home_teams");
const awayTeams = alias(teamsTable, "away_teams");

// ── GET /api/payout/stats — dashboard summary ─────────────────────────────────
router.get("/payout/stats", requirePayout, async (req: AuthRequest, res): Promise<void> => {
  const branchId = req.userBranchId ?? null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const branchFilter = branchId
    ? and(isNotNull(withdrawalsTable.betId), eq(withdrawalsTable.branchId, branchId))
    : isNotNull(withdrawalsTable.betId);

  const [paidToday] = await db.select({ count: count(), total: sum(withdrawalsTable.amount) })
    .from(withdrawalsTable)
    .where(and(branchFilter as any, eq(withdrawalsTable.status, "paid"), gte(withdrawalsTable.createdAt, todayStart)));

  const [pendingClaims] = await db.select({ count: count() })
    .from(withdrawalsTable)
    .where(and(branchFilter as any, inArray(withdrawalsTable.status, ["pending", "approved"])));

  const [allTime] = await db.select({ count: count(), total: sum(withdrawalsTable.amount) })
    .from(withdrawalsTable)
    .where(and(branchFilter as any, eq(withdrawalsTable.status, "paid")));

  // Recent paid tickets
  const recent = await db
    .select({
      id: withdrawalsTable.id,
      amount: withdrawalsTable.amount,
      status: withdrawalsTable.status,
      createdAt: withdrawalsTable.createdAt,
      betCode: betsTable.code,
      betStatus: betsTable.status,
    })
    .from(withdrawalsTable)
    .leftJoin(betsTable, eq(withdrawalsTable.betId, betsTable.id))
    .where(and(branchFilter as any, eq(withdrawalsTable.status, "paid")))
    .orderBy(desc(withdrawalsTable.createdAt))
    .limit(10);

  res.json({
    paidToday: paidToday.count,
    amountPaidToday: parseFloat(paidToday.total ?? "0"),
    pendingClaims: pendingClaims.count,
    paidTotal: allTime.count,
    amountPaidTotal: parseFloat(allTime.total ?? "0"),
    recentPaid: recent.map(r => ({
      ...r,
      amount: parseFloat(r.amount as any),
    })),
  });
});

// ── GET /api/payout/ticket/:code — verify ticket ─────────────────────────────
router.get("/payout/ticket/:code", requirePayout, async (req: AuthRequest, res): Promise<void> => {
  const code = req.params.code as string;

  const [bet] = await db
    .select({
      id: betsTable.id,
      code: betsTable.code,
      stake: betsTable.stake,
      totalOdds: betsTable.totalOdds,
      potentialWin: betsTable.potentialWin,
      status: betsTable.status,
      createdAt: betsTable.createdAt,
      branchId: betsTable.branchId,
      userId: betsTable.userId,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(betsTable.userId, usersTable.id))
    .where(eq(betsTable.code, code))
    .limit(1);

  if (!bet) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  // Enrich selections with fixture result (teams + score)
  const selections = await db
    .select({
      id: betSelectionsTable.id,
      market: betSelectionsTable.market,
      selection: betSelectionsTable.selection,
      odds: betSelectionsTable.odds,
      fixtureId: betSelectionsTable.fixtureId,
      fixtureStatus: fixturesTable.status,
      scoreHome: fixturesTable.scoreHome,
      scoreAway: fixturesTable.scoreAway,
      homeTeam: homeTeams.name,
      awayTeam: awayTeams.name,
    })
    .from(betSelectionsTable)
    .leftJoin(fixturesTable, eq(betSelectionsTable.fixtureId, fixturesTable.id))
    .leftJoin(homeTeams, eq(fixturesTable.homeTeamId, homeTeams.id))
    .leftJoin(awayTeams, eq(fixturesTable.awayTeamId, awayTeams.id))
    .where(eq(betSelectionsTable.betId, bet.id));

  // Check if there is already a pending/approved/paid claim for this bet
  const [existingClaim] = await db
    .select({ id: withdrawalsTable.id, status: withdrawalsTable.status })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.betId, bet.id))
    .limit(1);

  res.json({
    bet: {
      ...bet,
      stake: parseFloat(bet.stake as any),
      totalOdds: parseFloat(bet.totalOdds as any),
      potentialWin: parseFloat(bet.potentialWin as any),
      selections: selections.map(s => ({
        ...s,
        odds: parseFloat(s.odds as any),
      })),
    },
    claim: existingClaim ?? null,
  });
});

// ── POST /api/payout/ticket/:code/claim — initiate payout for won ticket ─────
router.post("/payout/ticket/:code/claim", requirePayout, async (req: AuthRequest, res): Promise<void> => {
  const code = req.params.code as string;

  const [bet] = await db
    .select()
    .from(betsTable)
    .where(eq(betsTable.code, code))
    .limit(1);

  if (!bet) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (bet.status !== "won") {
    res.status(400).json({ error: `Ticket is not a winner (status: ${bet.status})` });
    return;
  }

  // Prevent duplicate claims
  const [existing] = await db
    .select({ id: withdrawalsTable.id, status: withdrawalsTable.status })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.betId, bet.id))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: `Ticket already claimed (status: ${existing.status})` });
    return;
  }

  // Resolve branch — prefer bet's branchId, fall back to payout agent's branchId
  const branchId: number | null = bet.branchId ?? req.userBranchId ?? null;

  // Resolve a valid phone/bank detail from the bet owner
  const [betOwner] = await db
    .select({ phoneNumber: usersTable.phoneNumber, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, bet.userId))
    .limit(1);

  const amount = parseFloat(bet.potentialWin as any);

  const [claim] = await db
    .insert(withdrawalsTable)
    .values({
      userId: bet.userId,
      amount: amount.toFixed(2),
      bankDetails: betOwner?.phoneNumber ?? betOwner?.username ?? "walk-in",
      status: "pending",
      betId: bet.id,
      branchId: branchId ?? undefined,
    } as any)
    .returning();

  res.status(201).json({ claim: { ...claim, amount: parseFloat(claim.amount) } });
});

export default router;
