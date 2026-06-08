import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListFixtures } from "@workspace/api-client-react";
import type { ListFixturesParams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Globe, CalendarDays, Shield } from "lucide-react";
import { useBetSlip } from "@/contexts/BetSlipContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface LeagueEntry {
  id: number;
  name: string;
  logo: string | null;
  fixtureCount: number;
  groupName?: string;
}

interface CountryEntry {
  name: string;
  logo: string | null;
  leagues: LeagueEntry[];
}

interface FootballCountriesData {
  international: LeagueEntry[];
  countries: CountryEntry[];
}

type OddRow = { id: number; marketId: number; selection: string; oddsValue: number };
type MarketWithOdds = { id: number; fixtureId: number; marketType: string; odds: OddRow[] };

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function FlagLogo({ src, alt, size = 20 }: { src: string | null | undefined; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="shrink-0 text-base leading-none" style={{ fontSize: size * 0.9 }}>🏳️</span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-cover rounded-sm shrink-0"
      style={{ width: size, height: Math.round(size * 0.67) }}
      onError={() => setFailed(true)}
    />
  );
}

// ── Sidebar sections ──────────────────────────────────────────────────────────

function InternationalSection({
  leagues,
  selectedLeagueId,
  onSelect,
}: {
  leagues: LeagueEntry[];
  selectedLeagueId: number | null;
  onSelect: (id: number, name: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (leagues.length === 0) return null;

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/40 transition-colors text-left"
      >
        <Globe className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 text-sm font-semibold">International</span>
        <span className="text-xs text-muted-foreground">{leagues.length}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="pb-1">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => onSelect(league.id, league.name)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-colors text-sm ${
                selectedLeagueId === league.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
              }`}
            >
              <Logo src={league.logo} alt={league.name} size={18} />
              <span className="flex-1 truncate text-xs">{league.name}</span>
              <span className="text-xs text-muted-foreground/60 shrink-0">{league.fixtureCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CountrySection({
  country,
  selectedLeagueId,
  onSelect,
}: {
  country: CountryEntry;
  selectedLeagueId: number | null;
  onSelect: (id: number, name: string) => void;
}) {
  const isActive = country.leagues.some((l) => l.id === selectedLeagueId);
  const [open, setOpen] = useState(isActive);

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/40 transition-colors text-left"
      >
        <FlagLogo src={country.logo} alt={country.name} size={20} />
        <span className="flex-1 text-sm font-medium truncate">{country.name}</span>
        <span className="text-xs text-muted-foreground">{country.leagues.length}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="pb-1">
          {country.leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => onSelect(league.id, league.name)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-colors ${
                selectedLeagueId === league.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
              }`}
            >
              <Logo src={league.logo} alt={league.name} size={18} />
              <span className="flex-1 truncate text-xs">{league.name}</span>
              <span className="text-xs text-muted-foreground/60 shrink-0">{league.fixtureCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Odds button ───────────────────────────────────────────────────────────────

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

// ── Fixture card ──────────────────────────────────────────────────────────────

function FixtureCard({ fixture }: { fixture: any }) {
  const isLive = fixture.status === "live";
  const isFinished = fixture.status === "finished";
  const showScore = isLive || isFinished;
  const markets: MarketWithOdds[] = (fixture as any).markets ?? [];
  const [expanded, setExpanded] = useState(false);
  const [activeMarketIdx, setActiveMarketIdx] = useState(0);

  const market1x2 = markets.find((m) => m.marketType === "1X2") ?? markets[0] ?? null;
  const otherMarkets = markets.filter((m) => m !== market1x2);
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
      {/* Top: team info — links to fixture detail */}
      <Link href={`/fixtures/${fixture.id}`}>
        <div className="p-4 cursor-pointer hover:bg-accent/20 transition-colors">
          {/* League + time */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <Logo src={fixture.league?.countryLogo} alt={fixture.league?.countryName ?? ""} size={14} fallback={<span className="text-xs">🏳️</span>} />
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
                  {format(new Date(fixture.startTime), "d MMM, HH:mm")}
                </span>
              )}
            </div>
          </div>

          {/* Teams */}
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

      {/* Bottom: odds + markets toggle */}
      {markets.length > 0 && (
        <div className="border-t border-border/50">
          {/* Expanded: market tab strip */}
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

          {/* Odds row */}
          {activeMarket && (
            <div className="px-3 pt-3 pb-1" onClick={(e) => e.preventDefault()}>
              {!expanded && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {market1x2?.marketType ?? activeMarket.marketType}
                </p>
              )}
              <div className="flex gap-2">
                {activeMarket.odds.map((odd) => (
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

          {/* Footer: more markets / collapse */}
          <button
            onClick={handleToggle}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {expanded ? (
              <span className="font-medium text-primary">Hide markets ↑</span>
            ) : (
              <>
                <span>
                  {otherMarkets.length > 0
                    ? `+${otherMarkets.length} more market${otherMarkets.length > 1 ? "s" : ""} available`
                    : "View market"}
                </span>
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
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedLeagueName, setSelectedLeagueName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: countriesData, isLoading: isLoadingCountries } = useQuery<FootballCountriesData>({
    queryKey: ["football-countries"],
    queryFn: () => fetch("/api/football/countries").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: fixturesData, isLoading: isLoadingFixtures } = useListFixtures(
    (selectedLeagueId
      ? { leagueId: selectedLeagueId, status: "upcoming", limit: 50, withMarkets: true }
      : { status: "upcoming", limit: 20, withMarkets: true }) as ListFixturesParams,
  );

  const fixtures = fixturesData?.fixtures ?? [];

  const handleLeagueSelect = useCallback((id: number, name: string) => {
    setSelectedLeagueId(id);
    setSelectedLeagueName(name);
    setSidebarOpen(false);
  }, []);

  const totalCountries = countriesData?.countries.length ?? 0;
  const totalLeagues = (countriesData?.international.length ?? 0) + (countriesData?.countries.reduce((s, c) => s + c.leagues.length, 0) ?? 0);

  return (
    <div className="flex flex-col lg:flex-row gap-0 -mx-4 lg:-mx-6 min-h-[calc(100vh-80px)]">
      {/* ── Sidebar ── */}
      <aside className="lg:w-72 xl:w-80 shrink-0 border-r border-border bg-card/40">
        {/* Sidebar header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-base flex items-center gap-2">⚽ Football</h1>
              {!isLoadingCountries && (
                <p className="text-xs text-muted-foreground">{totalCountries} countries · {totalLeagues} leagues</p>
              )}
            </div>
            {/* Mobile toggle */}
            <button
              className="lg:hidden text-sm text-primary font-medium"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              {sidebarOpen ? "Close" : "Browse"}
            </button>
          </div>
        </div>

        {/* Sidebar content */}
        <div className={`overflow-y-auto lg:block ${sidebarOpen ? "block" : "hidden"} lg:max-h-[calc(100vh-130px)] max-h-72`}>
          {isLoadingCountries ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-accent/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <InternationalSection
                leagues={countriesData?.international ?? []}
                selectedLeagueId={selectedLeagueId}
                onSelect={handleLeagueSelect}
              />
              {countriesData?.countries.map((country) => (
                <CountrySection
                  key={country.name}
                  country={country}
                  selectedLeagueId={selectedLeagueId}
                  onSelect={handleLeagueSelect}
                />
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Header bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
          {selectedLeagueId && selectedLeagueName ? (
            <>
              <button
                onClick={() => { setSelectedLeagueId(null); setSelectedLeagueName(null); }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ← Back
              </button>
              <span className="text-muted-foreground">/</span>
              <h2 className="font-bold text-sm truncate">{selectedLeagueName}</h2>
              <span className="ml-auto text-xs text-muted-foreground">{fixturesData?.total ?? 0} fixtures</span>
            </>
          ) : (
            <>
              <h2 className="font-bold text-sm">All Upcoming Fixtures</h2>
              <span className="ml-auto text-xs text-muted-foreground">Select a league from the sidebar</span>
            </>
          )}
        </div>

        {/* Fixtures */}
        <div className="p-4 lg:p-6">
          {isLoadingFixtures ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 rounded-xl bg-accent/40 animate-pulse" />
              ))}
            </div>
          ) : fixtures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-5xl mb-4">⚽</span>
              <p className="font-bold text-lg mb-1">No upcoming fixtures</p>
              <p className="text-muted-foreground text-sm">
                {selectedLeagueId
                  ? "No scheduled matches for this league in the next 14 days."
                  : "Select a league from the sidebar to browse fixtures."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {fixtures.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} />
              ))}
            </div>
          )}

          {/* Pagination hint */}
          {!selectedLeagueId && fixtures.length === 20 && (
            <p className="text-center text-xs text-muted-foreground mt-6">
              Showing 20 fixtures — select a specific league to see all matches.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
