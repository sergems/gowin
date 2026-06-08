import { useState } from "react";
import { useListFixtures } from "@workspace/api-client-react";
import type { ListFixturesParams, Fixture } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Trophy, CalendarDays, Globe, ChevronDown, Shield } from "lucide-react";
import { format, startOfDay, endOfMonth, addMonths, isToday, isTomorrow, subHours } from "date-fns";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { sortOdds } from "@/lib/sortOdds";

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

function Logo({ src, alt, size = 24, fallback }: { src: string | null | undefined; alt: string; size?: number; fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback ?? <Shield className="text-muted-foreground" style={{ width: size, height: size }} />}</>;
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain shrink-0"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

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
          addSelection({ oddsId, fixtureId, market, selection, odds: oddsValue, fixtureName, marketName: market });
        }
      }}
      className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex-1 min-w-0 ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:border-primary hover:text-primary text-foreground"
      }`}
    >
      <span className="text-[10px] font-normal text-muted-foreground leading-none mb-0.5 truncate w-full text-center">
        {selection}
      </span>
      <span>{oddsValue.toFixed(2)}</span>
    </button>
  );
}

function FixtureCard({ fixture }: { fixture: FixtureWithMarkets }) {
  const markets: MarketWithOdds[] = (fixture as any).markets ?? [];
  const [expanded, setExpanded] = useState(false);
  const [activeMarketIdx, setActiveMarketIdx] = useState(0);

  const market1x2 = markets.find((m) => m.marketType === "1X2") ?? markets[0] ?? null;
  const fixtureName = `${fixture.homeTeam?.name ?? "Home"} vs ${fixture.awayTeam?.name ?? "Away"}`;
  const activeMarket = expanded ? (markets[activeMarketIdx] ?? market1x2) : market1x2;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
    if (!expanded) setActiveMarketIdx(0);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all">
      <Link href={`/fixtures/${fixture.id}`}>
        <div className="p-4 cursor-pointer hover:bg-accent/20 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <Logo src={fixture.league?.logo} alt={fixture.league?.name ?? ""} size={14} fallback={<Trophy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />} />
              <span className="text-xs text-muted-foreground truncate">
                {fixture.league?.countryName && (
                  <span className="font-medium text-foreground/80">{fixture.league.countryName} · </span>
                )}
                {fixture.league?.name ?? "League"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <CalendarDays className="w-3 h-3" />
              {format(subHours(new Date(fixture.startTime), 2), "HH:mm")}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Logo src={fixture.homeTeam?.logo} alt={fixture.homeTeam?.name ?? ""} size={28} />
              <span className="font-semibold text-sm truncate">{fixture.homeTeam?.name}</span>
            </div>
            <div className="shrink-0">
              <div className="px-2.5 py-1 rounded-lg bg-accent/50 text-xs font-bold text-muted-foreground">VS</div>
            </div>
            <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
              <span className="font-semibold text-sm truncate text-right">{fixture.awayTeam?.name}</span>
              <Logo src={fixture.awayTeam?.logo} alt={fixture.awayTeam?.name ?? ""} size={28} />
            </div>
          </div>
        </div>
      </Link>

      {markets.length > 0 && (
        <div className="border-t border-border/50">
          {expanded && markets.length > 1 && (
            <div className="flex overflow-x-auto scrollbar-none border-b border-border/40 bg-accent/10">
              {markets.map((m, i) => (
                <button
                  key={m.id}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMarketIdx(i); }}
                  className={`shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    i === activeMarketIdx
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.marketType}
                </button>
              ))}
            </div>
          )}

          {activeMarket && (
            <div className="px-3 pt-3 pb-1" onClick={(e) => e.preventDefault()}>
              {!expanded && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {market1x2?.marketType ?? activeMarket.marketType}
                </p>
              )}
              <div className="flex gap-2">
                {sortOdds(activeMarket.odds, activeMarket.marketType).map((odd) => (
                  <OddsButton
                    key={odd.id}
                    oddsId={odd.id}
                    fixtureId={fixture.id}
                    market={activeMarket.marketType}
                    selection={odd.selection}
                    oddsValue={odd.oddsValue}
                    fixtureName={fixtureName}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleToggle}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {expanded ? (
              <span className="font-medium text-primary">Hide markets ↑</span>
            ) : (
              <>
                <span className="font-medium">Popular Markets</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
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

function dateDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function dateDayLabel(date: Date): string {
  if (isToday(date)) return `Today · ${format(date, "EEEE, d MMMM yyyy")}`;
  if (isTomorrow(date)) return `Tomorrow · ${format(date, "EEEE, d MMMM yyyy")}`;
  return format(date, "EEEE, d MMMM yyyy");
}

export default function Home() {
  const today = startOfDay(new Date());
  const dateFrom = format(today, "yyyy-MM-dd");
  // Fetch through end of next month
  const dateTo = format(endOfMonth(addMonths(today, 1)), "yyyy-MM-dd");

  const { data, isLoading } = useListFixtures(
    { status: "upcoming", limit: 20, dateFrom, dateTo, withMarkets: true } as ListFixturesParams,
    { query: { queryKey: ["fixtures", "range", dateFrom, dateTo, "upcoming", "withMarkets"] } },
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

  const now = new Date();
  const fixtures: FixtureWithMarkets[] = ((data?.fixtures as FixtureWithMarkets[]) || []).filter(
    (f) => new Date(f.startTime) > now,
  );

  if (fixtures.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight mb-1">Upcoming Matches</h1>
          <p className="text-sm text-muted-foreground">{format(today, "MMMM yyyy")}</p>
        </div>
        <div className="py-14 text-center border border-dashed border-border rounded-xl">
          <Trophy className="w-9 h-9 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No upcoming matches found.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Check back later or browse other fixtures.</p>
        </div>
      </div>
    );
  }

  // Group fixtures by date day, then by league within each day
  type LeagueGroup = { leagueName: string; priorityIndex: number; fixtures: FixtureWithMarkets[] };
  type DayGroup = { dateKey: string; date: Date; leagueGroups: LeagueGroup[] };

  const dayMap = new Map<string, { date: Date; leagueMap: Map<number, LeagueGroup> }>();

  for (const fixture of fixtures) {
    const d = new Date(fixture.startTime);
    const key = dateDayKey(d);
    if (!dayMap.has(key)) {
      dayMap.set(key, { date: d, leagueMap: new Map() });
    }
    const { leagueMap } = dayMap.get(key)!;
    const leagueId = fixture.leagueId ?? 0;
    const leagueName = fixture.league?.name ?? "Other";
    if (!leagueMap.has(leagueId)) {
      leagueMap.set(leagueId, { leagueName, priorityIndex: getPriorityIndex(leagueName), fixtures: [] });
    }
    leagueMap.get(leagueId)!.fixtures.push(fixture);
  }

  const dayGroups: DayGroup[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, { date, leagueMap }]) => {
      const leagues = Array.from(leagueMap.values());
      const priority = leagues.filter((g) => g.priorityIndex < PRIORITY_LEAGUES.length).sort((a, b) => a.priorityIndex - b.priorityIndex);
      const others = leagues.filter((g) => g.priorityIndex === PRIORITY_LEAGUES.length).sort((a, b) => a.leagueName.localeCompare(b.leagueName));
      return { dateKey, date, leagueGroups: [...priority, ...others] };
    });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight mb-1">Upcoming Matches</h1>
      </div>

      {dayGroups.map(({ dateKey, date, leagueGroups }) => (
        <div key={dateKey} className="space-y-5">
          {/* Date header */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-1.5 shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground">{dateDayLabel(date)}</span>
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>

          {leagueGroups.map((g) => (
            <LeagueSection key={`${dateKey}-${g.leagueName}`} leagueName={g.leagueName} fixtures={g.fixtures} />
          ))}
        </div>
      ))}
    </div>
  );
}
