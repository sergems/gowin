import { useState, useEffect } from "react";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useLiveSocket, type LiveFixture, type LiveMarket, type LiveOdd, type OddsDirection } from "@/hooks/useLiveSocket";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Radio, Wifi, WifiOff, AlertTriangle, Shield, TrendingUp, TrendingDown, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { LiveMarket as ApiLiveMarket } from "@/hooks/useLiveSocket";
import { sortOdds } from "@/lib/sortOdds";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { resolveLeagueLogoUrl } from "@/lib/leagueLogoOverrides";

const MAIN_MARKETS = ["1X2", "Double Chance", "Over/Under 2.5"];

const UP_LIVE_SELS = new Set(["Home 1UP", "Home 2UP", "Away 1UP", "Away 2UP"]);

function splitLive1X2(markets: LiveMarket[]): {
  coreMarkets: LiveMarket[];
  virtualUpMarkets: LiveMarket[];
} {
  const coreMarkets: LiveMarket[] = [];
  const virtualUpMarkets: LiveMarket[] = [];
  for (const m of markets) {
    if (m.marketType === "1X2") {
      const odds = m.odds ?? [];
      const core = odds.filter((o) => !UP_LIVE_SELS.has(o.selection));
      const oneUp = odds.filter((o) => o.selection === "Home 1UP" || o.selection === "Away 1UP");
      const twoUp = odds.filter((o) => o.selection === "Home 2UP" || o.selection === "Away 2UP");
      if (core.length > 0) coreMarkets.push({ ...m, odds: core });
      if (oneUp.length > 0) virtualUpMarkets.push({ ...m, id: m.id * 1000 + 1, marketType: "1UP", odds: oneUp });
      if (twoUp.length > 0) virtualUpMarkets.push({ ...m, id: m.id * 1000 + 2, marketType: "2UP", odds: twoUp });
    } else {
      coreMarkets.push(m);
    }
  }
  return { coreMarkets, virtualUpMarkets };
}

// World Cup / international tournaments first, then top European leagues
const COUNTRY_PRIORITY = [
  "World",           // FIFA World Cup, Nations League, etc.
  "Europe",          // UEFA Champions League, Europa League, etc.
  "England",
  "Spain",
  "Germany",
  "Italy",
  "France",
  "Netherlands",
  "Portugal",
  "Turkey",
  "Congo DR",
];

function countryRank(countryName: string | null | undefined): number {
  const idx = COUNTRY_PRIORITY.indexOf(countryName ?? "");
  return idx === -1 ? COUNTRY_PRIORITY.length : idx;
}

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
  suspended?: boolean;
}

function LiveOddsButton({ fixtureId, market, odd, direction, fixture, suspended }: OddsButtonProps) {
  const { addSelection, removeSelection, selections } = useBetSlip();
  const isSelected = selections.some((s) => s.oddsId === odd.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (suspended) return;
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

  if (suspended) {
    return (
      <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg text-xs border border-border/30 bg-muted/20 flex-1 min-w-0 cursor-not-allowed opacity-50">
        <span className="text-[10px] font-normal text-muted-foreground/60 leading-none mb-1 truncate w-full text-center">
          {odd.selection}
        </span>
        <Lock className="w-3 h-3 text-muted-foreground/50" />
      </div>
    );
  }

  const selectedClass = isSelected ? "bg-primary text-primary-foreground border-primary" : "text-foreground";

  return (
    <button
      onClick={handleClick}
      data-live-odds=""
      {...(!isSelected && { "data-dir": direction ?? undefined })}
      {...(isSelected && { "data-selected": "" })}
      className={[
        "relative flex flex-col items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 flex-1 min-w-0",
        selectedClass,
      ].join(" ")}
    >
      {/* Direction arrow — top-right corner */}
      {!isSelected && direction && (
        <span className="absolute top-0.5 right-0.5">
          {direction === "up"
            ? <TrendingUp className="w-2.5 h-2.5 text-green-400" />
            : <TrendingDown className="w-2.5 h-2.5 text-red-400" />}
        </span>
      )}
      <span className="text-[10px] font-normal text-muted-foreground leading-none mb-0.5 truncate w-full text-center">
        {odd.selection}
      </span>
      <span
        data-live-value=""
        className="font-bold tabular-nums"
      >
        {odd.oddsValue.toFixed(2)}
      </span>
    </button>
  );
}

interface MarketSectionProps {
  fixture: LiveFixture;
  market: LiveMarket;
  getOddsDirection: (fId: number, oId: number) => OddsDirection | null;
  suspended?: boolean;
}

function MarketSection({ fixture, market, getOddsDirection, suspended }: MarketSectionProps) {
  const sorted = sortOdds(market.odds, market.marketType);
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {market.marketType}
      </p>
      <div className="flex gap-2">
        {sorted.map((odd) => (
          <LiveOddsButton
            key={odd.id}
            fixtureId={fixture.id}
            market={market}
            odd={odd}
            direction={suspended ? null : getOddsDirection(fixture.id, odd.id)}
            fixture={fixture}
            suspended={suspended}
          />
        ))}
      </div>
    </div>
  );
}

interface FixtureCardProps {
  fixture: LiveFixture;
  getOddsDirection: (fId: number, oId: number) => OddsDirection | null;
  allSuspended: boolean;
}

function FixtureCard({ fixture, getOddsDirection, allSuspended }: FixtureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useSiteSettings();

  // All hooks must come before any computation that can throw
  const { data: fullMarkets, isLoading: loadingMarkets } = useQuery<{ markets: ApiLiveMarket[] }>({
    queryKey: ["live-markets", fixture.id],
    queryFn: () => fetch(`/api/live/fixtures/${fixture.id}/markets`).then((r) => r.json()),
    enabled: expanded,
    staleTime: 10_000,
  });

  const { coreMarkets, virtualUpMarkets } = splitLive1X2(fixture.markets ?? []);

  const mainMarkets = coreMarkets
    .filter((m) => MAIN_MARKETS.includes(m.marketType) && hasValue(m));

  const liveUpMarkets = virtualUpMarkets.filter((m) => hasValue(m));

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
            {t("payout.live_badge")}
          </span>
        </div>
      </div>

      {/* Teams + score */}
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
            <MarketSection
              key={m.id}
              fixture={fixture}
              market={m}
              getOddsDirection={getOddsDirection}
              suspended={allSuspended}
            />
          ))}
        </div>
      )}

      {/* Expand / collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors border-t border-border/30"
      >
        {expanded ? (
          <span className="font-medium text-primary">{t("live.hide_markets")}</span>
        ) : (
          <>
            <span className="font-medium">{t("live.more_markets")}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </>
        )}
      </button>

      {/* Expanded extra markets + stats */}
      {expanded && (
        <div className="border-t border-border/30 px-3 pb-3 space-y-3">
          {/* 1UP / 2UP virtual markets — available immediately from live WebSocket data */}
          {liveUpMarkets.length > 0 && (
            <div className="space-y-3 pt-2">
              {liveUpMarkets.map((m) => (
                <MarketSection
                  key={m.marketType}
                  fixture={fixture}
                  market={m}
                  getOddsDirection={getOddsDirection}
                  suspended={allSuspended}
                />
              ))}
            </div>
          )}

          {loadingMarkets && (
            <div className="space-y-2 pt-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!loadingMarkets && extraMarkets.length > 0 && (
            <div className="space-y-3 pt-2">
              {extraMarkets.map((m) => (
                <MarketSection
                  key={m.id}
                  fixture={fixture}
                  market={m as LiveMarket}
                  getOddsDirection={getOddsDirection}
                  suspended={allSuspended}
                />
              ))}
            </div>
          )}

          {!loadingMarkets && extraMarkets.length === 0 && liveUpMarkets.length === 0 && (
            <p className="text-xs text-muted-foreground/50 italic text-center pt-2">{t("live.no_extra_markets")}</p>
          )}

          {stats && (
            <div className="mt-2 pt-3 border-t border-border/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2">
                {t("live.match_stats")}
              </p>
              <div className="space-y-1.5">
                {stats.possessionHome != null && (
                  <StatRow label={t("live.stat_possession")} home={stats.possessionHome} away={stats.possessionAway} />
                )}
                {stats.shotsHome != null && (
                  <StatRow label={t("live.stat_shots")} home={String(stats.shotsHome)} away={String(stats.shotsAway ?? 0)} />
                )}
                {stats.shotsOnTargetHome != null && (
                  <StatRow label={t("live.stat_on_target")} home={String(stats.shotsOnTargetHome)} away={String(stats.shotsOnTargetAway ?? 0)} />
                )}
                {stats.cornersHome != null && (
                  <StatRow label={t("live.stat_corners")} home={String(stats.cornersHome)} away={String(stats.cornersAway ?? 0)} />
                )}
                {stats.yellowCardsHome != null && (
                  <StatRow label={t("live.stat_yellow_cards")} home={String(stats.yellowCardsHome)} away={String(stats.yellowCardsAway ?? 0)} />
                )}
                {stats.redCardsHome != null && (
                  <StatRow label={t("live.stat_red_cards")} home={String(stats.redCardsHome)} away={String(stats.redCardsAway ?? 0)} />
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

interface LeagueGroup {
  leagueName: string;
  countryName: string | null;
  leagueLogo: string | null;
  fixtures: LiveFixture[];
}

function buildSortedLeagueGroups(fixtures: LiveFixture[]): LeagueGroup[] {
  const map = new Map<string, LeagueGroup>();
  for (const f of fixtures) {
    const key = `${f.leagueName}__${f.countryName ?? ""}`;
    if (!map.has(key)) {
      map.set(key, {
        leagueName: f.leagueName,
        countryName: f.countryName,
        leagueLogo: resolveLeagueLogoUrl(f.leagueName, f.leagueLogo),
        fixtures: [],
      });
    }
    map.get(key)!.fixtures.push(f);
  }
  return Array.from(map.values()).sort((a, b) => {
    const rankDiff = countryRank(a.countryName) - countryRank(b.countryName);
    if (rankDiff !== 0) return rankDiff;
    return a.leagueName.localeCompare(b.leagueName);
  });
}

export default function LiveBetting() {
  const { fixtures: wsFixtures, connected, allSuspended, getOddsDirection } = useLiveSocket();
  const { t } = useSiteSettings();
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
  const leagueGroups = buildSortedLeagueGroups(fixtures);

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
            {t("nav.live")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading && wsFixtures.length === 0
              ? t("common.loading")
              : `${fixtures.length} ${t(fixtures.length !== 1 ? "live.match_plural" : "live.match_singular")} ${t("live.in_play")}`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected
            ? <><Wifi className="w-3.5 h-3.5 text-green-400" /><span>{t("live.live_updates")}</span></>
            : <><WifiOff className="w-3.5 h-3.5 text-muted-foreground/50" /><span>{t("live.reconnecting")}</span></>}
        </div>
      </div>

      {/* Suspension banner — shown immediately on disconnect */}
      {allSuspended && (
        <div className="flex items-center gap-2 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-2.5 text-sm text-orange-400">
          <Lock className="w-4 h-4 shrink-0 animate-pulse" />
          <span className="font-medium">{t("live.suspended_msg")}</span>
          <WifiOff className="w-3.5 h-3.5 ml-auto shrink-0 opacity-60" />
        </div>
      )}

      {/* Data warning (from server) */}
      {!allSuspended && dataWarning && (
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
          <p className="text-lg font-semibold">{t("live.no_live_matches")}</p>
          <p className="text-sm text-center">{t("live.no_matches_live_desc")}</p>
        </div>
      )}

      {/* Fixtures sorted by country priority (World/Europe first) → league name */}
      {leagueGroups.map((group) => (
        <div key={`${group.leagueName}__${group.countryName}`} className="space-y-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-2">
              <Logo src={group.leagueLogo} alt={group.leagueName} size={14} />
              <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">
                {group.leagueName}
              </span>
              {group.countryName && (
                <span className="text-xs text-muted-foreground/40">{group.countryName}</span>
              )}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/30 text-red-400">
                {group.fixtures.length} Live
              </Badge>
            </div>
            <div className="flex-1 h-px bg-border/40" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {group.fixtures.map((f) => (
              <FixtureCard
                key={f.id}
                fixture={f}
                getOddsDirection={getOddsDirection}
                allSuspended={allSuspended}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
