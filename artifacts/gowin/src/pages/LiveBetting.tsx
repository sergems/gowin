import { useState, useEffect } from "react";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useLiveSocket, type LiveFixture, type LiveMarket, type LiveOdd, type OddsDirection } from "@/hooks/useLiveSocket";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Lock, Radio, Wifi, WifiOff, AlertTriangle, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { LiveMarket as ApiLiveMarket } from "@/hooks/useLiveSocket";
import { sortOdds } from "@/lib/sortOdds";

const MAIN_MARKETS = ["1X2", "Double Chance", "Over/Under 2.5"];

/** A market has "value" if it is not suspended and has at least one odds value > 1 */
function hasValue(market: LiveMarket): boolean {
  if (market.suspended) return false;
  return market.odds.some((o) => o.oddsValue > 1);
}

function Logo({ src, alt, size = 24 }: { src: string | null | undefined; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Shield className="text-muted-foreground shrink-0" style={{ width: size, height: size }} />;
  return (
    <img
      src={src} alt={alt} width={size} height={size}
      className="object-contain shrink-0"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

interface OddsButtonProps {
  fixtureId: number;
  market: LiveMarket;
  odd: LiveOdd;
  direction: OddsDirection | null;
  fixture: LiveFixture;
}

function OddsButton({ fixtureId, market, odd, direction, fixture }: OddsButtonProps) {
  const { addSelection, removeSelection, selections } = useBetSlip();
  const isSelected = selections.some((s) => s.oddsId === odd.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSelected) {
      removeSelection(odd.id);
    } else {
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
    }
  };

  const driftRing =
    !isSelected && direction === "up" ? "ring-2 ring-green-400/60 bg-green-400/10" :
    !isSelected && direction === "down" ? "ring-2 ring-red-400/60 bg-red-400/10" : "";

  const valueColor =
    direction === "up" ? "text-green-400" :
    direction === "down" ? "text-red-400" : "";

  return (
    <button
      onClick={handleClick}
      className={[
        "flex flex-col items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex-1 min-w-0",
        isSelected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:border-primary hover:text-primary text-foreground",
        driftRing,
      ].join(" ")}
    >
      <span className="text-[10px] font-normal text-muted-foreground leading-none mb-0.5 truncate w-full text-center">
        {odd.selection}
      </span>
      <span className={["font-bold tabular-nums", isSelected ? "" : valueColor].join(" ")}>
        {odd.oddsValue.toFixed(2)}
      </span>
    </button>
  );
}

interface MarketSectionProps {
  fixture: LiveFixture;
  market: LiveMarket;
  getOddsDirection: (fId: number, oId: number) => OddsDirection | null;
}

function MarketSection({ fixture, market, getOddsDirection }: MarketSectionProps) {
  const sorted = sortOdds(market.odds, market.marketType);
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {market.marketType}
      </p>
      <div className="flex gap-2">
        {sorted.map((odd) => (
          <OddsButton
            key={odd.id}
            fixtureId={fixture.id}
            market={market}
            odd={odd}
            direction={getOddsDirection(fixture.id, odd.id)}
            fixture={fixture}
          />
        ))}
      </div>
    </div>
  );
}

interface FixtureCardProps {
  fixture: LiveFixture;
  getOddsDirection: (fId: number, oId: number) => OddsDirection | null;
}

function FixtureCard({ fixture, getOddsDirection }: FixtureCardProps) {
  const [expanded, setExpanded] = useState(false);

  const mainMarkets = fixture.markets
    .filter((m) => MAIN_MARKETS.includes(m.marketType) && hasValue(m));

  const { data: fullMarkets, isLoading: loadingMarkets } = useQuery<{ markets: ApiLiveMarket[] }>({
    queryKey: ["live-markets", fixture.id],
    queryFn: () => fetch(`/api/live/fixtures/${fixture.id}/markets`).then((r) => r.json()),
    enabled: expanded,
    staleTime: 10_000,
  });

  const extraMarkets = (fullMarkets?.markets ?? [])
    .filter((m) => !MAIN_MARKETS.includes(m.marketType) && hasValue(m as LiveMarket));

  const stats = fixture.stats;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-red-500/30 transition-all">
      {/* League + status bar */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Logo src={fixture.leagueLogo} alt={fixture.leagueName} size={14} />
          <span className="text-xs text-muted-foreground truncate">{fixture.leagueName}</span>
          {fixture.countryName && (
            <span className="text-xs text-muted-foreground/50 truncate">· {fixture.countryName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {fixture.matchMinute && (
            <span className="text-xs font-bold text-green-400 tabular-nums">{fixture.matchMinute}</span>
          )}
          <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Teams + score — horizontal layout matching normal cards */}
      <div className="px-4 pb-3 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Logo src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} size={28} />
          <span className="font-semibold text-sm truncate">{fixture.homeTeam.name}</span>
        </div>
        <div className="shrink-0">
          <div className="flex items-center gap-2 text-lg font-black">
            <span>{fixture.scoreHome ?? 0}</span>
            <span className="text-muted-foreground text-xs font-normal">:</span>
            <span>{fixture.scoreAway ?? 0}</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
          <span className="font-semibold text-sm truncate text-right">{fixture.awayTeam.name}</span>
          <Logo src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} size={28} />
        </div>
      </div>

      {/* Main markets */}
      {mainMarkets.length > 0 && (
        <div className="border-t border-border/50 px-3 pt-3 pb-1 space-y-3">
          {mainMarkets.map((m) => (
            <MarketSection key={m.id} fixture={fixture} market={m} getOddsDirection={getOddsDirection} />
          ))}
        </div>
      )}

      {/* Expand / collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors border-t border-border/30"
      >
        {expanded ? (
          <span className="font-medium text-primary">Hide markets ↑</span>
        ) : (
          <>
            <span className="font-medium">More markets</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </>
        )}
      </button>

      {/* Expanded extra markets + stats */}
      {expanded && (
        <div className="border-t border-border/30 px-3 pb-3 space-y-3">
          {loadingMarkets && (
            <div className="space-y-2 pt-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!loadingMarkets && extraMarkets.length > 0 && (
            <div className="space-y-3 pt-2">
              {extraMarkets.map((m) => (
                <MarketSection key={m.id} fixture={fixture} market={m as LiveMarket} getOddsDirection={getOddsDirection} />
              ))}
            </div>
          )}

          {!loadingMarkets && extraMarkets.length === 0 && (
            <p className="text-xs text-muted-foreground/50 italic text-center pt-2">No additional markets available</p>
          )}

          {stats && (
            <div className="mt-2 pt-3 border-t border-border/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2">
                Match Statistics
              </p>
              <div className="space-y-1.5">
                {stats.possessionHome != null && (
                  <StatRow label="Possession" home={stats.possessionHome} away={stats.possessionAway} />
                )}
                {stats.shotsHome != null && (
                  <StatRow label="Shots" home={String(stats.shotsHome)} away={String(stats.shotsAway ?? 0)} />
                )}
                {stats.shotsOnTargetHome != null && (
                  <StatRow label="On Target" home={String(stats.shotsOnTargetHome)} away={String(stats.shotsOnTargetAway ?? 0)} />
                )}
                {stats.cornersHome != null && (
                  <StatRow label="Corners" home={String(stats.cornersHome)} away={String(stats.cornersAway ?? 0)} />
                )}
                {stats.yellowCardsHome != null && (
                  <StatRow label="Yellow Cards" home={String(stats.yellowCardsHome)} away={String(stats.yellowCardsAway ?? 0)} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, home, away }: { label: string; home: string; away?: string }) {
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
    queryFn: () => fetch("/api/live/fixtures").then((r) => r.json()),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (initialData?.dataWarning) setDataWarning(initialData.dataWarning);
  }, [initialData?.dataWarning]);

  const fixtures = wsFixtures.length > 0 ? wsFixtures : (initialData?.fixtures ?? []);

  const bySport = new Map<string, Map<string, LiveFixture[]>>();
  for (const f of fixtures) {
    if (!bySport.has(f.sportName)) bySport.set(f.sportName, new Map());
    const byLeague = bySport.get(f.sportName)!;
    if (!byLeague.has(f.leagueName)) byLeague.set(f.leagueName, []);
    byLeague.get(f.leagueName)!.push(f);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="relative">
              <Radio className="w-6 h-6 text-red-500" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
            Live In-Play
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading && wsFixtures.length === 0
              ? "Loading…"
              : `${fixtures.length} match${fixtures.length !== 1 ? "es" : ""} in play`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected
            ? <><Wifi className="w-3.5 h-3.5 text-green-400" /><span>Live updates</span></>
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-accent/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && fixtures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground space-y-3">
          <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center">
            <Radio className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-semibold">No live matches right now</p>
          <p className="text-sm text-center">Check back soon — live markets appear here automatically when matches kick off.</p>
        </div>
      )}

      {/* Fixtures grouped by sport → league */}
      {Array.from(bySport.entries()).map(([sportName, byLeague]) => (
        <div key={sportName} className="space-y-4">
          {bySport.size > 1 && (
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{sportName}</h2>
          )}

          {Array.from(byLeague.entries()).map(([leagueName, leagueFixtures]) => (
            <div key={leagueName} className="space-y-2">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">{leagueName}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/30 text-red-400">
                    {leagueFixtures.length} Live
                  </Badge>
                </div>
                <div className="flex-1 h-px bg-border/40" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
