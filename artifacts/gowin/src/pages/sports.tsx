import { useState } from "react";
import { useSearch } from "wouter";
import { useListFixtures } from "@workspace/api-client-react";
import type { ListFixturesParams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ChevronDown, ChevronLeft, CalendarDays, Shield, Trophy } from "lucide-react";
import { fmtUTCTime, utcDateKey, utcDateLabel } from "@/lib/formatUTC";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { sortOdds } from "@/lib/sortOdds";

// ── Date helpers (UTC-aware) ──────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────────────────────

function Logo({ src, alt, size = 24 }: { src: string | null | undefined; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Shield className="text-muted-foreground shrink-0" style={{ width: size, height: size }} />;
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

// ── Odds button ───────────────────────────────────────────────────────────────

function OddsButton({
  oddsId, fixtureId, market, selection, oddsValue, fixtureName, competitionName, startTime,
}: {
  oddsId: number;
  fixtureId: number;
  market: string;
  selection: string;
  oddsValue: number;
  fixtureName: string;
  competitionName?: string;
  startTime?: string;
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
          addSelection({ oddsId, fixtureId, market, selection, odds: oddsValue, fixtureName, marketName: market, competitionName, startTime });
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

// ── Fixture card ──────────────────────────────────────────────────────────────

function FixtureCard({ fixture }: { fixture: any }) {
  const isLive = fixture.status === "live";
  const isFinished = fixture.status === "finished";
  const showScore = isLive || isFinished;
  const markets: any[] = fixture.markets ?? [];
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
              <Logo src={fixture.league?.countryLogo} alt={fixture.league?.countryName ?? ""} size={14} />
              <Logo src={fixture.league?.logo} alt={fixture.league?.name ?? ""} size={14} />
              <span className="text-xs text-muted-foreground truncate">{fixture.league?.name}</span>
            </div>
            <div className="shrink-0">
              {isLive ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
                </span>
              ) : isFinished ? (
                <span className="text-xs text-muted-foreground">FT</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="w-3 h-3" />
                  {fmtUTCTime(fixture.startTime)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Logo src={fixture.homeTeam?.logo} alt={fixture.homeTeam?.name ?? ""} size={28} />
              <span className="font-semibold text-sm truncate">{fixture.homeTeam?.name}</span>
            </div>
            <div className="shrink-0">
              {showScore ? (
                <div className="flex items-center gap-2 text-lg font-black">
                  <span>{fixture.scoreHome ?? 0}</span>
                  <span className="text-muted-foreground text-xs font-normal">:</span>
                  <span>{fixture.scoreAway ?? 0}</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-lg bg-accent/50 text-xs font-bold text-muted-foreground">VS</div>
              )}
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
                {sortOdds(activeMarket.odds, activeMarket.marketType).map((odd: any) => (
                  <OddsButton
                    key={odd.id}
                    oddsId={odd.id}
                    fixtureId={fixture.id}
                    market={activeMarket.marketType}
                    selection={odd.selection}
                    oddsValue={odd.oddsValue}
                    fixtureName={fixtureName}
                    competitionName={fixture.league?.name}
                    startTime={fixture.startTime}
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FootballPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const selectedLeagueId = params.get("leagueId") ? Number(params.get("leagueId")) : null;
  const selectedLeagueName = params.get("leagueName") ? decodeURIComponent(params.get("leagueName")!) : null;

  const { data: fixturesData, isLoading } = useListFixtures(
    (selectedLeagueId
      ? { leagueId: selectedLeagueId, status: "upcoming", limit: 50, withMarkets: true }
      : { status: "upcoming", limit: 20, withMarkets: true }) as ListFixturesParams,
    { query: { queryKey: ["fixtures", "sports", selectedLeagueId] } },
  );

  // Server already filters startTime > NOW(); client-side guard covers stale cache on first render
  const now = new Date();
  const fixtures = (fixturesData?.fixtures ?? []).filter(
    (f) => new Date(f.startTime) > now,
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        {selectedLeagueName && (
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-start">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            ⚽ {selectedLeagueName ?? "All Fixtures"}
          </h1>
          {selectedLeagueName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {fixturesData?.total ?? 0} upcoming matches
            </p>
          )}
        </div>
      </div>

      {/* Fixtures */}
      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-accent/40 animate-pulse" />
          ))}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="font-bold text-lg mb-1">No upcoming fixtures</p>
          <p className="text-muted-foreground text-sm">
            {selectedLeagueId
              ? "No scheduled matches for this league."
              : "Select a league from the sidebar to browse fixtures."}
          </p>
        </div>
      ) : (() => {
        const groups = new Map<string, typeof fixtures>();
        for (const f of fixtures) {
          const key = utcDateKey(f.startTime);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(f);
        }
        return (
          <div className="space-y-6">
            {[...groups.entries()].map(([dateKey, dayFixtures]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">{utcDateLabel(dateKey)}</span>
                  </div>
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {dayFixtures.length} match{dayFixtures.length !== 1 ? "es" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {dayFixtures.map((fixture) => (
                    <FixtureCard key={fixture.id} fixture={fixture} />
                  ))}
                </div>
              </div>
            ))}

            {!selectedLeagueId && fixtures.length === 20 && (
              <p className="text-center text-xs text-muted-foreground mt-6">
                Showing 20 fixtures — select a specific league from the sidebar to see all matches.
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
