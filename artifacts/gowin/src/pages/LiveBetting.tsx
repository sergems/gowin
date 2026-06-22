import { useState, useEffect } from "react";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useLiveSocket, type LiveFixture, type LiveMarket, type LiveOdd, type OddsDirection } from "@/hooks/useLiveSocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Lock, Radio, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { LiveMarket as ApiLiveMarket } from "@/hooks/useLiveSocket";

interface TeamLogoProps { src: string | null | undefined; alt: string; size?: number }
function TeamLogo({ src, alt, size = 28 }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className="rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0"
        style={{ width: size, height: size }}>
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={src} alt={alt} width={size} height={size}
      className="object-contain shrink-0 rounded-sm"
      onError={() => setFailed(true)} />
  );
}

const MAIN_MARKETS = ["1X2", "Double Chance", "Over/Under 2.5"];

interface OddsButtonProps {
  fixtureId: number;
  market: LiveMarket;
  odd: LiveOdd;
  suspended: boolean;
  direction: OddsDirection | null;
  fixture: LiveFixture;
}

function OddsButton({ fixtureId, market, odd, suspended, direction, fixture }: OddsButtonProps) {
  const { addSelection, selections } = useBetSlip();
  const isSelected = selections.some((s) => s.oddsId === odd.id);

  const handleClick = () => {
    if (suspended) return;
    addSelection({
      oddsId: odd.id,
      fixtureId,
      market: market.marketType,
      selection: odd.selection,
      odds: odd.oddsValue,
      fixtureName: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
      marketName: market.marketType,
      competitionName: fixture.leagueName,
      startTime: fixture.startTime,
      fixtureStatus: fixture.status,
      scoreHome: fixture.scoreHome,
      scoreAway: fixture.scoreAway,
    });
  };

  const driftCls = !suspended && !isSelected && direction === "up"
    ? "ring-2 ring-green-400/60 bg-green-400/10"
    : !suspended && !isSelected && direction === "down"
      ? "ring-2 ring-red-400/60 bg-red-400/10"
      : "";

  const valueCls = direction === "up" ? "text-green-400"
    : direction === "down" ? "text-red-400"
    : "";

  return (
    <button
      onClick={handleClick}
      disabled={suspended}
      className={[
        "flex flex-col items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-all duration-200 min-w-[52px]",
        suspended
          ? "border-border/40 bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
          : isSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card hover:border-primary hover:bg-primary/10 hover:text-primary cursor-pointer",
        driftCls,
      ].join(" ")}>
      <span className="text-[10px] leading-tight text-muted-foreground truncate max-w-[60px]">
        {suspended ? <Lock className="w-2.5 h-2.5" /> : odd.selection}
      </span>
      <span className={["font-bold tabular-nums", valueCls].join(" ")}>
        {suspended ? "—" : odd.oddsValue.toFixed(2)}
      </span>
    </button>
  );
}

interface MarketRowProps { fixture: LiveFixture; market: LiveMarket; getOddsDirection: (fId: number, oId: number) => OddsDirection | null }
function MarketRow({ fixture, market, getOddsDirection }: MarketRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
        {market.marketType}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {market.odds.map((odd) => (
          <OddsButton
            key={odd.id}
            fixtureId={fixture.id}
            market={market}
            odd={odd}
            suspended={market.suspended}
            direction={getOddsDirection(fixture.id, odd.id)}
            fixture={fixture} />
        ))}
        {market.odds.length === 0 && (
          <span className="text-xs text-muted-foreground/40 italic">No odds available</span>
        )}
      </div>
    </div>
  );
}

interface FixtureCardProps { fixture: LiveFixture; getOddsDirection: (fId: number, oId: number) => OddsDirection | null }
function FixtureCard({ fixture, getOddsDirection }: FixtureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const mainMarkets = fixture.markets.filter((m) => MAIN_MARKETS.includes(m.marketType));

  const { data: fullMarkets, isLoading: loadingMarkets } = useQuery<{ markets: ApiLiveMarket[]; stats: any }>({
    queryKey: ["live-markets", fixture.id],
    queryFn: () => fetch(`/api/live/fixtures/${fixture.id}/markets`).then((r) => r.json()),
    enabled: expanded,
    staleTime: 10_000,
  });

  const extraMarkets = fullMarkets
    ? fullMarkets.markets.filter((m) => !MAIN_MARKETS.includes(m.marketType))
    : [];

  const stats = fullMarkets?.stats ?? fixture.stats;

  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-0">
        {/* Header: teams + score + minute */}
        <div className="flex items-center gap-3 p-3 bg-card">
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <TeamLogo src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} />
              <span className="text-sm font-semibold truncate">{fixture.homeTeam.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <TeamLogo src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} />
              <span className="text-sm font-semibold truncate">{fixture.awayTeam.name}</span>
            </div>
          </div>

          {/* Score + minute */}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold tabular-nums text-primary">
                {fixture.scoreHome ?? 0}
              </span>
              <span className="text-muted-foreground">–</span>
              <span className="text-xl font-bold tabular-nums text-primary">
                {fixture.scoreAway ?? 0}
              </span>
            </div>
            {fixture.matchMinute && (
              <span className="text-[10px] font-semibold text-green-400 animate-pulse">
                {fixture.matchMinute}
              </span>
            )}
          </div>
        </div>

        {/* Main markets */}
        {mainMarkets.length > 0 && (
          <div className="px-3 pb-3 pt-2 border-t border-border/30 flex flex-col gap-2.5">
            {mainMarkets.map((m) => (
              <MarketRow key={m.id} fixture={fixture} market={m} getOddsDirection={getOddsDirection} />
            ))}
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border/30 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {expanded ? "Hide markets" : "More markets"}
        </button>

        {/* Expanded: extra markets + stats */}
        {expanded && (
          <div className="border-t border-border/30 p-3 space-y-3">
            {loadingMarkets && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {!loadingMarkets && extraMarkets.map((m) => (
              <MarketRow key={m.id} fixture={fixture} market={m as LiveMarket} getOddsDirection={getOddsDirection} />
            ))}

            {!loadingMarkets && extraMarkets.length === 0 && (
              <p className="text-xs text-muted-foreground/50 italic text-center">No additional markets</p>
            )}

            {/* Live stats */}
            {stats && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2">
                  Match Statistics
                </p>
                <div className="space-y-1.5">
                  {stats.possessionHome && (
                    <StatRow label="Possession" home={stats.possessionHome} away={stats.possessionAway} />
                  )}
                  {stats.shotsHome !== undefined && (
                    <StatRow label="Shots" home={String(stats.shotsHome)} away={String(stats.shotsAway ?? 0)} />
                  )}
                  {stats.shotsOnTargetHome !== undefined && (
                    <StatRow label="On Target" home={String(stats.shotsOnTargetHome)} away={String(stats.shotsOnTargetAway ?? 0)} />
                  )}
                  {stats.cornersHome !== undefined && (
                    <StatRow label="Corners" home={String(stats.cornersHome)} away={String(stats.cornersAway ?? 0)} />
                  )}
                  {stats.yellowCardsHome !== undefined && (
                    <StatRow label="Yellow Cards" home={String(stats.yellowCardsHome)} away={String(stats.yellowCardsAway ?? 0)} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatRow({ label, home, away }: { label: string; home: string; away: string | undefined }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium tabular-nums text-foreground w-8 text-right">{home}</span>
      <div className="flex-1 text-center text-muted-foreground/60">{label}</div>
      <span className="font-medium tabular-nums text-foreground w-8">{away ?? "0"}</span>
    </div>
  );
}

export default function LiveBetting() {
  const { fixtures: wsFixtures, connected, getOddsDirection } = useLiveSocket();
  const [dataWarning, setDataWarning] = useState<string | null>(null);

  const { data: initialData, isLoading } = useQuery<{ fixtures: LiveFixture[]; dataWarning?: string }>({
    queryKey: ["live-fixtures-initial"],
    queryFn: () =>
      fetch("/api/live/fixtures").then((r) => r.json()),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (initialData?.dataWarning) setDataWarning(initialData.dataWarning);
  }, [initialData?.dataWarning]);

  const fixtures = wsFixtures.length > 0 ? wsFixtures : (initialData?.fixtures ?? []);

  // Group by sport, then by league
  const bySport = new Map<string, Map<string, LiveFixture[]>>();
  for (const f of fixtures) {
    if (!bySport.has(f.sportName)) bySport.set(f.sportName, new Map());
    const byLeague = bySport.get(f.sportName)!;
    if (!byLeague.has(f.leagueName)) byLeague.set(f.leagueName, []);
    byLeague.get(f.leagueName)!.push(f);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-5 h-5 text-red-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <h1 className="text-xl font-bold">Live Betting</h1>
          {fixtures.length > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
              {fixtures.length} LIVE
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected
            ? <><Wifi className="w-3.5 h-3.5 text-green-400" /><span>Live</span></>
            : <><WifiOff className="w-3.5 h-3.5 text-muted-foreground/50" /><span>Connecting…</span></>}
        </div>
      </div>

      {/* Data warning */}
      {dataWarning && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{dataWarning}</span>
          <button onClick={() => setDataWarning(null)} className="ml-auto text-yellow-400/60 hover:text-yellow-400">✕</button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && wsFixtures.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border/60 p-4 space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && fixtures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
          <Radio className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-lg font-medium">No live matches right now</p>
          <p className="text-sm text-center">Check back soon — live markets appear here automatically when matches kick off.</p>
        </div>
      )}

      {/* Fixtures grouped by sport → league */}
      {Array.from(bySport.entries()).map(([sportName, byLeague]) => (
        <div key={sportName} className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{sportName}</h2>
          </div>

          {Array.from(byLeague.entries()).map(([leagueName, leagueFixtures]) => (
            <div key={leagueName} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground/80">{leagueName}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 border-red-500/30 text-red-400">
                  {leagueFixtures.length} Live
                </Badge>
              </div>
              <div className="space-y-2">
                {leagueFixtures.map((f) => (
                  <FixtureCard key={f.id} fixture={f} getOddsDirection={getOddsDirection} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
