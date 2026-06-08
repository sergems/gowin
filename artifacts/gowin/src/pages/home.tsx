import { useListFixtures } from "@workspace/api-client-react";
import type { ListFixturesParams, Fixture } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Trophy, CalendarDays } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_LEAGUES = [
  { label: "World Cup",                   test: (name: string) => /world cup/i.test(name) },
  { label: "UEFA Champions League",       test: (name: string) => /champions league/i.test(name) && !/europa/i.test(name) && !/caf/i.test(name) },
  { label: "UEFA Europa League",          test: (name: string) => /europa league/i.test(name) && !/conference/i.test(name) },
  { label: "UEFA Europa Conference League", test: (name: string) => /conference league/i.test(name) || /europa conference/i.test(name) },
  { label: "CAF Champions League",        test: (name: string) => /caf champions/i.test(name) },
  { label: "English Premier League",      test: (name: string) => /premier league/i.test(name) },
  { label: "Spanish La Liga",             test: (name: string) => /la liga/i.test(name) },
  { label: "Bundesliga",                  test: (name: string) => /bundesliga/i.test(name) },
  { label: "Ligue 1",                     test: (name: string) => /ligue 1/i.test(name) },
];

function getPriorityIndex(leagueName: string): number {
  for (let i = 0; i < PRIORITY_LEAGUES.length; i++) {
    if (PRIORITY_LEAGUES[i].test(leagueName)) return i;
  }
  return PRIORITY_LEAGUES.length;
}

function FixtureCard({ fixture }: { fixture: Fixture }) {
  return (
    <Link href={`/fixtures/${fixture.id}`}>
      <Card className="hover:bg-accent/40 transition-colors border-border bg-card cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <div className="font-bold text-base leading-tight">{fixture.homeTeam?.name}</div>
            </div>

            <div className="px-5 flex flex-col items-center justify-center gap-1 min-w-[80px]">
              {fixture.status === "live" || fixture.status === "finished" ? (
                <div className="flex items-center gap-2 text-xl font-black">
                  <span>{fixture.scoreHome ?? "-"}</span>
                  <span className="text-muted-foreground text-sm">:</span>
                  <span>{fixture.scoreAway ?? "-"}</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-muted-foreground text-xs font-bold">
                  VS
                </div>
              )}
              <div className="flex items-center text-xs text-muted-foreground">
                {fixture.status === "live" ? (
                  <span className="flex items-center text-primary font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-1" /> LIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {format(new Date(fixture.startTime), "HH:mm")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 text-center">
              <div className="font-bold text-base leading-tight">{fixture.awayTeam?.name}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LeagueSection({ leagueName, leagueLogo, fixtures }: { leagueName: string; leagueLogo?: string | null; fixtures: Fixture[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        {leagueLogo ? (
          <img src={leagueLogo} alt={leagueName} className="w-5 h-5 object-contain" />
        ) : (
          <Trophy className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold text-foreground">{leagueName}</span>
        <span className="text-xs text-muted-foreground">({fixtures.length})</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {fixtures.map(f => <FixtureCard key={f.id} fixture={f} />)}
      </div>
    </div>
  );
}

export default function Home() {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  const { data, isLoading } = useListFixtures(
    { limit: 500, date: dateStr } as ListFixturesParams,
    { query: { queryKey: ["fixtures", "today", dateStr] } },
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-accent/50 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-accent/30 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-accent/50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const fixtures = data?.fixtures || [];

  if (fixtures.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Today's Matches</h1>
          <p className="text-muted-foreground">{format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No matches scheduled for today.</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Check back later or browse upcoming fixtures.</p>
        </div>
      </div>
    );
  }

  type LeagueGroup = {
    leagueName: string;
    leagueLogo: string | null | undefined;
    priorityIndex: number;
    fixtures: Fixture[];
  };

  const leagueMap = new Map<number, LeagueGroup>();

  for (const fixture of fixtures) {
    const leagueId = fixture.leagueId ?? 0;
    const leagueName = fixture.league?.name ?? "Other";
    const leagueLogo = fixture.league?.logo;
    if (!leagueMap.has(leagueId)) {
      leagueMap.set(leagueId, {
        leagueName,
        leagueLogo,
        priorityIndex: getPriorityIndex(leagueName),
        fixtures: [],
      });
    }
    leagueMap.get(leagueId)!.fixtures.push(fixture);
  }

  const priorityGroups = Array.from(leagueMap.values())
    .filter(g => g.priorityIndex < PRIORITY_LEAGUES.length)
    .sort((a, b) => a.priorityIndex - b.priorityIndex);

  const otherGroups = Array.from(leagueMap.values())
    .filter(g => g.priorityIndex === PRIORITY_LEAGUES.length)
    .sort((a, b) => a.leagueName.localeCompare(b.leagueName));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Today's Matches</h1>
        <p className="text-muted-foreground">{format(today, "EEEE, MMMM d, yyyy")} · {fixtures.length} match{fixtures.length !== 1 ? "es" : ""}</p>
      </div>

      {priorityGroups.length > 0 && (
        <div className="space-y-6">
          {priorityGroups.map(group => (
            <LeagueSection
              key={group.leagueName}
              leagueName={group.leagueName}
              leagueLogo={group.leagueLogo}
              fixtures={group.fixtures}
            />
          ))}
        </div>
      )}

      {otherGroups.length > 0 && (
        <div className="space-y-6">
          {(priorityGroups.length > 0) && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">More Today</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {otherGroups.map(group => (
            <LeagueSection
              key={group.leagueName}
              leagueName={group.leagueName}
              leagueLogo={group.leagueLogo}
              fixtures={group.fixtures}
            />
          ))}
        </div>
      )}
    </div>
  );
}
