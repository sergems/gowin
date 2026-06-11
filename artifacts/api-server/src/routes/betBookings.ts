import { Router } from "express";
import { db, betBookingsTable, fixturesTable, teamsTable, leaguesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import type { Request, Response } from "express";

const router = Router();

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateCode(): string {
  return Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
}
async function uniqueBookingCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateCode();
    const [ex] = await db.select({ id: betBookingsTable.id }).from(betBookingsTable).where(eq(betBookingsTable.code, code)).limit(1);
    if (!ex) return code;
  }
  throw new Error("Failed to generate unique booking code");
}

router.post("/bet-bookings", async (req: Request, res: Response): Promise<void> => {
  const { selections } = req.body;
  if (!Array.isArray(selections) || selections.length === 0) {
    res.status(400).json({ error: "selections must be a non-empty array" });
    return;
  }
  for (const s of selections) {
    if (typeof s.oddsId !== "number" || typeof s.fixtureId !== "number" ||
        typeof s.market !== "string" || typeof s.selection !== "string" ||
        typeof s.odds !== "number") {
      res.status(400).json({ error: "Invalid selection format" });
      return;
    }
  }
  const code = await uniqueBookingCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(betBookingsTable).values({
    code,
    selections,
    expiresAt,
  });
  res.status(201).json({ code, expiresAt });
});

router.get("/bet-bookings/:code", async (req: Request, res: Response): Promise<void> => {
  const code = req.params.code.toUpperCase().trim();
  const [booking] = await db.select().from(betBookingsTable).where(eq(betBookingsTable.code, code)).limit(1);
  if (!booking) {
    res.status(404).json({ error: "Booking code not found" });
    return;
  }
  if (new Date(booking.expiresAt) < new Date()) {
    res.status(410).json({ error: "This booking code has expired" });
    return;
  }
  const selections = booking.selections as any[];
  if (!Array.isArray(selections)) {
    res.status(500).json({ error: "Invalid booking data" });
    return;
  }

  const fixtureIds = [...new Set(selections.map((s: any) => s.fixtureId))] as number[];
  const fixtures = fixtureIds.length > 0
    ? await db.select().from(fixturesTable).where(inArray(fixturesTable.id, fixtureIds))
    : [];
  const teamIds = [...new Set([...fixtures.map(f => f.homeTeamId), ...fixtures.map(f => f.awayTeamId)])] as number[];
  const teams = teamIds.length > 0 ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds)) : [];
  const leagueIds = [...new Set(fixtures.map(f => f.leagueId))] as number[];
  const leagues = leagueIds.length > 0 ? await db.select().from(leaguesTable).where(inArray(leaguesTable.id, leagueIds)) : [];
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const leagueMap = Object.fromEntries(leagues.map(l => [l.id, l]));
  const fixtureMap = Object.fromEntries(fixtures.map(f => [f.id, {
    ...f,
    homeTeam: teamMap[f.homeTeamId] || null,
    awayTeam: teamMap[f.awayTeamId] || null,
    league: leagueMap[f.leagueId] || null,
  }]));

  const enriched = selections.map((s: any) => ({
    ...s,
    fixture: fixtureMap[s.fixtureId] || null,
    fixtureName: fixtureMap[s.fixtureId]
      ? `${fixtureMap[s.fixtureId].homeTeam?.name || "?"} vs ${fixtureMap[s.fixtureId].awayTeam?.name || "?"}`
      : s.fixtureName || "Unknown Fixture",
    competitionName: fixtureMap[s.fixtureId]?.league?.name || s.competitionName,
    startTime: fixtureMap[s.fixtureId]?.startTime || s.startTime,
    displayTime: fixtureMap[s.fixtureId]?.startTime
      ? new Date(new Date(fixtureMap[s.fixtureId]!.startTime).getTime() + 2 * 60 * 60 * 1000).toISOString()
      : s.startTime,
  }));

  res.json({ code: booking.code, expiresAt: booking.expiresAt, createdAt: booking.createdAt, selections: enriched });
});

export default router;
