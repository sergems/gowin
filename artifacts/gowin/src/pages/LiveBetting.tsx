import { useState, useEffect } from "react";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useLiveSocketContext, type LiveFixture, type LiveMarket, type OddsDirection } from "@/contexts/LiveSocketContext";
import type { LiveOdd } from "@/hooks/useLiveSocket";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Radio, Wifi, WifiOff, AlertTriangle, Shield, TrendingUp, TrendingDown, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { LiveMarket as ApiLiveMarket } from "@/contexts/LiveSocketContext";
import { sortOdds } from "@/lib/sortOdds";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { resolveLeagueLogoUrl } from "@/lib/leagueLogoOverrides";

const MAIN_MARKETS = ["1X2", "Double Chance", "Over/Under 2.5"];

/** Parse "85'", "85+2'" etc → numeric minute. Returns null for HT, FT, etc. */
function parseMinute(matchMinute: string | null | undefined): number | null {
  if (!matchMinute) return null;
  const m = matchMinute.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Suspend all betting when: match is ≥ 85', or already finished/FT/AET */
function isLateStage(matchMinute: string | null | undefined): boolean {
  if (!matchMinute) return false;
  const upper = matchMinute.toUpperCase().replace(/'/g, "").trim();
  if (["FT", "FINISHED", "AET", "PEN", "AFTER ET"].includes(upper)) return true;
  const min = parseMinute(matchMinute);
  return min !== null && min >= 85;
}

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

/** Compact inline odds chip — used in the collapsed card row */
function CompactOddsChip({
  fixtureId, market, odd, direction, fixture, suspended,
}: OddsButtonProps) {
  const { addSelection, removeSelection, selections } = useBetSlip();
  const isSelected = selections.some((s) => s.oddsId === odd.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't toggle card expand
    if (suspended) return;
    if (isSelected) removeSelection(odd.id);
    else addSelection({
      oddsId: odd.id, fixtureId, market: market.marketType, selection: odd.selection,
      odds: odd.oddsValue, fixtureName: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
      marketName: market.marketType, competitionName: fixture.leagueName,
      startTime: fixture.startTime, fixtureStatus: fixture.status,
      scoreHome: fixture.scoreHome, scoreAway: fixture.scoreAway,
    });
  };

  if (suspended) {
    return (
      <div className="flex flex-col items-center justify-center w-14 h-9 rounded-md border border-border/20 bg-muted/10 cursor-not-allowed">
        <span className="text-[9px] text-muted-foreground/40 leading-none mb-0.5">{odd.selection}</span>
        <Lock className="w-2.5 h-2.5 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      data-live-odds=""
      {...(!isSelected && { "data-dir": direction ?? undefined })}
      className={[
        "relative flex flex-col items-center justify-center w-14 h-9 rounded-md border text-xs font-bold transition-all duration-200",
        isSelected
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border/40 hover:border-primary/50 hover:bg-primary/5 text-foreground",
      ].join(" ")}
    >
      {!isSelected && direction && (
        <span className="absolute top-0.5 right-0.5">
          {direction === "up"
            ? <TrendingUp className="w-2 h-2 text-green-400" />
            : <TrendingDown className="w-2 h-2 text-red-400" />}
        </span>
      )}
      <span className="text-[9px] font-normal text-muted-foreground/60 leading-none mb-0.5">{odd.selection}</span>
      <span data-live-value="" className="tabular-nums text-[11px]">{odd.oddsValue.toFixed(2)}</span>
    </button>
  );
}

interface FixtureCardProps {
  fixture: LiveFixture;
  getOddsDirection: (fId: number, oId: number) => OddsDirection | null;
  /** True when WS is disconnected (global) OR this fixture is past 85' */
  allSuspended: boolean;
}

function FixtureCard({ fixture, getOddsDirection, allSuspended }: FixtureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useSiteSettings();

  const { coreMarkets } = splitLive1X2(fixture.markets ?? []);
  const allCoreMarkets = coreMarkets.filter((m) => hasValue(m));
  const primaryMarket = allCoreMarkets.find((m) => m.marketType === "1X2") ?? null;
  // Only Double Chance shown in the expanded drawer
  const doubleChanceMarket = allCoreMarkets.find((m) => m.marketType === "Double Chance") ?? null;

  const stats = fixture.stats;
  const sortedPrimary = primaryMarket ? sortOdds(primaryMarket.odds, primaryMarket.marketType) : [];
  const hasExpanded = !!doubleChanceMarket || !!stats;

  return (
    <div
      className={`bg-card border rounded-lg overflow-hidden transition-all cursor-pointer
        ${expanded ? "border-primary/30" : "border-border hover:border-border/80"}`}
    >
      {/* ── Compact row (always visible) ────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Live pulse + minute */}
        <div className="shrink-0 flex flex-col items-center w-9">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mb-0.5" />
          <span className="text-[10px] font-bold text-green-400 tabular-nums leading-none">
            {fixture.matchMinute ?? "LIVE"}
          </span>
        </div>

        {/* Home team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Logo src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} size={18} />
          <span className="text-xs font-semibold truncate">{fixture.homeTeam.name}</span>
        </div>

        {/* Score */}
        <div className="shrink-0 px-2 text-sm font-black tabular-nums text-center w-12">
          {fixture.scoreHome ?? 0} : {fixture.scoreAway ?? 0}
        </div>

        {/* Away team */}
        <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
          <span className="text-xs font-semibold truncate text-right">{fixture.awayTeam.name}</span>
          <Logo src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} size={18} />
        </div>

        {/* 1X2 odds chips (or lock icons if suspended) */}
        <div className="shrink-0 flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
          {primaryMarket && sortedPrimary.length > 0 ? (
            sortedPrimary.map((odd) => (
              <CompactOddsChip
                key={odd.id}
                fixtureId={fixture.id}
                market={primaryMarket}
                odd={odd}
                direction={allSuspended ? null : getOddsDirection(fixture.id, odd.id)}
                fixture={fixture}
                suspended={allSuspended}
              />
            ))
          ) : (
            /* No primary market — show 3 locked placeholders */
            ["H", "D", "A"].map((lbl) => (
              <div key={lbl} className="flex flex-col items-center justify-center w-14 h-9 rounded-md border border-border/20 bg-muted/10">
                <span className="text-[9px] text-muted-foreground/30">{lbl}</span>
                <Lock className="w-2.5 h-2.5 text-muted-foreground/20" />
              </div>
            ))
          )}
        </div>

        {/* Expand chevron — only show if there's something to expand */}
        {hasExpanded && (
          <div className="shrink-0 flex items-center justify-center ml-1 w-5">
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        )}
      </div>

      {/* ── Expanded panel: Double Chance + stats only ───────────────── */}
      {expanded && hasExpanded && (
        <div className="border-t border-border/30 px-3 pb-3 pt-2 space-y-3">
          {doubleChanceMarket && (
            <MarketSection
              fixture={fixture}
              market={doubleChanceMarket}
              getOddsDirection={getOddsDirection}
              suspended={allSuspended}
            />
          )}

          {stats && (
            <div className={doubleChanceMarket ? "pt-2 border-t border-border/20" : ""}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold mb-2">{t("live.match_stats")}</p>
              <div className="space-y-1.5">
                {stats.possessionHome != null && <StatRow label={t("live.stat_possession")} home={stats.possessionHome} away={stats.possessionAway} />}
                {stats.shotsHome != null && <StatRow label={t("live.stat_shots")} home={String(stats.shotsHome)} away={String(stats.shotsAway ?? 0)} />}
                {stats.shotsOnTargetHome != null && <StatRow label={t("live.stat_on_target")} home={String(stats.shotsOnTargetHome)} away={String(stats.shotsOnTargetAway ?? 0)} />}
                {stats.cornersHome != null && <StatRow label={t("live.stat_corners")} home={String(stats.cornersHome)} away={String(stats.cornersAway ?? 0)} />}
                {stats.yellowCardsHome != null && <StatRow label={t("live.stat_yellow_cards")} home={String(stats.yellowCardsHome)} away={String(stats.yellowCardsAway ?? 0)} />}
                {stats.redCardsHome != null && <StatRow label={t("live.stat_red_cards")} home={String(stats.redCardsHome)} away={String(stats.redCardsAway ?? 0)} />}
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
        leagueLogo: resolveLeagueLogoUrl(f.leagueName, f.leagueLogo) ?? null,
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
  const { fixtures: wsFixtures, connected, allSuspended, getOddsDirection } = useLiveSocketContext();
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

  const allFixtures = wsFixtures.length > 0 ? wsFixtures : (initialData?.fixtures ?? []);

  // Live In-Play is football (soccer) only — filter out any other sport that
  // slipped through, and only show fixtures that actually have live odds available.
  const fixtures = allFixtures.filter((f) => {
    const sport = (f.sportName ?? "Football").toLowerCase();
    if (sport !== "football") return false;
    // Must have at least one market with a real live odds value
    const hasLiveOdds = (f.markets ?? []).some(
      (m) => !m.suspended && m.odds.some((o) => o.oddsValue > 1),
    );
    return hasLiveOdds;
  });

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
          <div className="space-y-1.5">
            {group.fixtures.map((f) => (
              <FixtureCard
                key={f.id}
                fixture={f}
                getOddsDirection={getOddsDirection}
                allSuspended={allSuspended || isLateStage(f.matchMinute)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
