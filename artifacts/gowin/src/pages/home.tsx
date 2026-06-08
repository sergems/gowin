import { useListFixtures } from "@workspace/api-client-react";
import type { ListFixturesParams, Fixture } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Trophy, CalendarDays, Globe } from "lucide-react";
import { format } from "date-fns";
import { useBetSlip } from "@/contexts/BetSlipContext";

const PRIORITY_LEAGUES = [
  { label: "World Cup",                     test: (n: string) => /world cup/i.test(n) },
  { label: "UEFA Champions League",         test: (n: string) => /champions league/i.test(n) && !/europa/i.test(n) && !/caf/i.test(n) },
  { label: "UEFA Europa League",            test: (n: string) => /europa league/i.test(n) && !/conference/i.test(n) },
  { label: "UEFA Europa Conference League", test: (n: string) => /conference league/i.test(n) || /europa conference/i.test(n) },
  { label: "CAF Champions League",          test: (n: string) => /caf champions/i.test(n) },
  { label: "English Premier League",        test: (n: string) => /premier league/i.test(n) },
  { label: "Spanish La Liga",               test: (n: string) => /la liga/i.test(n) },
  { label: "Bundesliga",                    test: (n: string) => /bundesliga/i.test(n) },
  { label: "Ligue 1",                       test: (n: string) => /ligue 1/i.test(n) },
];

function getPriorityIndex(leagueName: string) {
  for (let i = 0; i < PRIORITY_LEAGUES.length; i++) {
    if (PRIORITY_LEAGUES[i].test(leagueName)) return i;
  }
  return PRIORITY_LEAGUES.length;
}

type OddRow = { id: number; marketId: number; selection: string; oddsValue: number };
type MarketWithOdds = { id: number; fixtureId: number; marketType: string; odds: OddRow[] };
type FixtureWithMarkets = Fixture & { markets?: MarketWithOdds[] };

function OddsButton({
  oddsId, fixtureId, market, selection, oddsValue, fixtureName,
}: {
  oddsId: number;
  fixtureId: number;
  market: string;
  selection: string;
  oddsValue: number;
  fixtureName: string;
}) {
  const { selections, addSelection, removeSelection } = useBetSlip();
  const selected = selections.some((s) => s.oddsId === oddsId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selected) {
          removeSelection(oddsId);
        } else {
          addSelection({
            oddsId,
            fixtureId,
            market,
            selection,
            odds: oddsValue,
            fixtureName,
            marketName: market,
          });
        }
      }}
      className={`flex flex-col items-center justify-center px-2 py-1.5 rounded text-xs font-semibold border transition-colors min-w-[52px] ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:border-primary hover:text-primary text-foreground"
      }`}
    >
      <span className="text-[10px] font-normal text-muted-foreground leading-none mb-0.5 truncate max-w-[60px]">
        {selection}
      </span>
      <span>{oddsValue.toFixed(2)}</span>
    </button>
  );
}

function FixtureCard({ fixture }: { fixture: FixtureWithMarkets }) {
  const markets: MarketWithOdds[] = (fixture as any).markets ?? [];
  const fixtureName = `${fixture.homeTeam?.name ?? "Home"} vs ${fixture.awayTeam?.name ?? "Away"}`;

  return (
    <Link href={`/fixtures/${fixture.id}`}>
      <Card className="hover:bg-accent/30 transition-colors border-border bg-card cursor-pointer">
        <CardContent className="p-4">
          {/* League + time row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 min-w-0">
              {fixture.league?.logo ? (
                <img src={fixture.league.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
              ) : (
                <Trophy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs text-muted-foreground truncate">
                {fixture.league?.countryName && (
                  <span className="font-medium text-foreground/80">{fixture.league.countryName} · </span>
                )}
                {fixture.league?.name ?? "League"}
              </span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground ml-2 shrink-0">
              <CalendarDays className="w-3 h-3 mr-1" />
              {format(new Date(fixture.startTime), "HH:mm")}
            </div>
          </div>

          {/* Teams row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 flex flex-col items-center gap-1">
              {fixture.homeTeam?.logo && (
                <img src={fixture.homeTeam.logo} alt="" className="w-7 h-7 object-contain" />
              )}
              <span className="text-sm font-semibold leading-tight text-center">{fixture.homeTeam?.name}</span>
            </div>
            <div className="px-4 shrink-0">
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-muted-foreground text-[11px] font-bold">
                VS
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              {fixture.awayTeam?.logo && (
                <img src={fixture.awayTeam.logo} alt="" className="w-7 h-7 object-contain" />
              )}
              <span className="text-sm font-semibold leading-tight text-center">{fixture.awayTeam?.name}</span>
            </div>
          </div>

          {/* Markets / odds */}
          {markets.length > 0 && (
            <div
              className="space-y-2 pt-3 border-t border-border"
              onClick={(e) => e.preventDefault()}
            >
              {markets.map((market) => (
                <div key={market.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {market.marketType}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {market.odds.map((odd) => (
                      <OddsButton
                        key={odd.id}
                        oddsId={odd.id}
                        fixtureId={fixture.id}
                        market={market.marketType}
                        selection={odd.selection}
                        oddsValue={odd.oddsValue}
                        fixtureName={fixtureName}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function LeagueSection({ leagueName, fixtures }: { leagueName: string; fixtures: FixtureWithMarkets[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-0.5">
        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{leagueName}</span>
        <span className="text-xs text-muted-foreground">({fixtures.length})</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {fixtures.map((f) => <FixtureCard key={f.id} fixture={f} />)}
      </div>
    </div>
  );
}

export default function Home() {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  const { data, isLoading } = useListFixtures(
    { status: "upcoming", limit: 16, date: dateStr, withMarkets: true } as ListFixturesParams,
    { query: { queryKey: ["fixtures", "today", dateStr, "upcoming", "withMarkets"] } },
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <div className="h-7 w-44 bg-accent/50 rounded animate-pulse mb-2" />
          <div className="h-3.5 w-28 bg-accent/30 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-accent/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const fixtures: FixtureWithMarkets[] = (data?.fixtures as FixtureWithMarkets[]) || [];

  if (fixtures.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight mb-1">Today's Matches</h1>
          <p className="text-sm text-muted-foreground">{format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="py-14 text-center border border-dashed border-border rounded-xl">
          <Trophy className="w-9 h-9 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No upcoming matches today.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Check back later or browse other fixtures.</p>
        </div>
      </div>
    );
  }

  type LeagueGroup = { leagueName: string; priorityIndex: number; fixtures: FixtureWithMarkets[] };
  const leagueMap = new Map<number, LeagueGroup>();

  for (const fixture of fixtures) {
    const leagueId = fixture.leagueId ?? 0;
    const leagueName = fixture.league?.name ?? "Other";
    if (!leagueMap.has(leagueId)) {
      leagueMap.set(leagueId, { leagueName, priorityIndex: getPriorityIndex(leagueName), fixtures: [] });
    }
    leagueMap.get(leagueId)!.fixtures.push(fixture);
  }

  const priorityGroups = Array.from(leagueMap.values())
    .filter((g) => g.priorityIndex < PRIORITY_LEAGUES.length)
    .sort((a, b) => a.priorityIndex - b.priorityIndex);

  const otherGroups = Array.from(leagueMap.values())
    .filter((g) => g.priorityIndex === PRIORITY_LEAGUES.length)
    .sort((a, b) => a.leagueName.localeCompare(b.leagueName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight mb-1">Today's Matches</h1>
        <p className="text-sm text-muted-foreground">
          {format(today, "EEEE, MMMM d, yyyy")} · {data?.total ?? fixtures.length} upcoming
        </p>
      </div>

      {priorityGroups.length > 0 && (
        <div className="space-y-5">
          {priorityGroups.map((g) => (
            <LeagueSection key={g.leagueName} leagueName={g.leagueName} fixtures={g.fixtures} />
          ))}
        </div>
      )}

      {otherGroups.length > 0 && (
        <div className="space-y-5">
          {priorityGroups.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">More Today</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {otherGroups.map((g) => (
            <LeagueSection key={g.leagueName} leagueName={g.leagueName} fixtures={g.fixtures} />
          ))}
        </div>
      )}
    </div>
  );
}
