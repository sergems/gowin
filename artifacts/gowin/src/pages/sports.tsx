import { useState } from "react";
import { useSearch, useLocation } from "wouter";
import { useListFixtures, useListLeagues, useListSports } from "@workspace/api-client-react";
import type { ListFixturesParams, League } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ChevronDown, ChevronLeft, ChevronRight, CalendarDays, Shield, Trophy, Globe } from "lucide-react";
import { fmtUTCTime, utcDateKey, utcDateLabel } from "@/lib/formatUTC";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { sortOdds } from "@/lib/sortOdds";

// ── Country flag helpers ──────────────────────────────────────────────────────

const COUNTRY_ISO2: Record<string, string> = {
  "afghanistan":"af","albania":"al","algeria":"dz","angola":"ao","argentina":"ar",
  "armenia":"am","australia":"au","austria":"at","azerbaijan":"az","bahrain":"bh",
  "bangladesh":"bd","belarus":"by","belgium":"be","bolivia":"bo",
  "bosnia":"ba","bosnia and herzegovina":"ba","botswana":"bw","brazil":"br",
  "bulgaria":"bg","cambodia":"kh","cameroon":"cm","canada":"ca","chile":"cl",
  "china":"cn","colombia":"co","costa rica":"cr","croatia":"hr","cyprus":"cy",
  "czech republic":"cz","czechia":"cz","denmark":"dk","ecuador":"ec","egypt":"eg",
  "el salvador":"sv","england":"gb-eng","estonia":"ee","ethiopia":"et","europe":"eu",
  "finland":"fi","france":"fr","georgia":"ge","germany":"de","ghana":"gh",
  "greece":"gr","guatemala":"gt","honduras":"hn","hong kong":"hk","hungary":"hu",
  "iceland":"is","india":"in","indonesia":"id","iran":"ir","iraq":"iq",
  "ireland":"ie","israel":"il","italy":"it","ivory coast":"ci","jamaica":"jm",
  "japan":"jp","jordan":"jo","kazakhstan":"kz","kenya":"ke","kosovo":"xk",
  "kuwait":"kw","latvia":"lv","lebanon":"lb","libya":"ly","lithuania":"lt",
  "luxembourg":"lu","malaysia":"my","malta":"mt","mexico":"mx","moldova":"md",
  "montenegro":"me","morocco":"ma","mozambique":"mz","namibia":"na",
  "netherlands":"nl","new zealand":"nz","nicaragua":"ni","nigeria":"ng",
  "north korea":"kp","north macedonia":"mk","northern ireland":"gb-nir",
  "norway":"no","oman":"om","pakistan":"pk","palestine":"ps","panama":"pa",
  "paraguay":"py","peru":"pe","philippines":"ph","poland":"pl","portugal":"pt",
  "qatar":"qa","romania":"ro","russia":"ru","saudi arabia":"sa","scotland":"gb-sct",
  "senegal":"sn","serbia":"rs","singapore":"sg","slovakia":"sk","slovenia":"si",
  "south africa":"za","south korea":"kr","spain":"es","sudan":"sd","sweden":"se",
  "switzerland":"ch","syria":"sy","taiwan":"tw","tanzania":"tz","thailand":"th",
  "tunisia":"tn","turkey":"tr","uganda":"ug","ukraine":"ua",
  "united arab emirates":"ae","united states":"us","usa":"us","uruguay":"uy",
  "uzbekistan":"uz","venezuela":"ve","vietnam":"vn","wales":"gb-wls",
  "yemen":"ye","zambia":"zm","zimbabwe":"zw",
};

function countryFlagUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  const iso2 = COUNTRY_ISO2[name.toLowerCase().trim()];
  return iso2 ? `https://flagcdn.com/20x15/${iso2}.png` : null;
}

/** Normalise tennis circuit category names into readable labels */
function normaliseTennisCategory(raw: string): string {
  const l = raw.toLowerCase();
  if (l.includes("itf men"))       return "ITF Men's Singles";
  if (l.includes("itf women"))     return "ITF Women's Singles";
  if (l.includes("itf"))           return "ITF";
  if (l.includes("challenger men") || l.includes("atp challenger")) return "ATP Challenger";
  if (l.includes("challenger wom") || l.includes("wta challenger")) return "WTA Challenger";
  if (l.includes("challenger"))    return "Challenger";
  if (l.includes("wta"))           return "WTA";
  if (l.includes("atp"))           return "ATP";
  return raw;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Logo({
  src, alt, size = 24, fallback,
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <>{fallback ?? <Shield className="text-muted-foreground shrink-0" style={{ width: size, height: size }} />}</>;
  }
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

/** Small country flag from flagcdn; renders nothing when no flag is found */
function CountryFlag({ name, size = 20 }: { name: string | null | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);
  const url = countryFlagUrl(name);
  if (!url || failed) return <Globe className="w-4 h-4 text-muted-foreground shrink-0" />;
  return (
    <img
      src={url}
      alt={name ?? ""}
      width={size}
      height={Math.round(size * 0.75)}
      className="object-cover rounded-sm shrink-0"
      style={{ width: size, height: Math.round(size * 0.75) }}
      onError={() => setFailed(true)}
    />
  );
}

// ── Sport metadata ─────────────────────────────────────────────────────────────

function getSportMeta(sportName: string | null | undefined) {
  const n = (sportName ?? "Football").toLowerCase();
  if (n === "basketball") return { icon: "🏀", defaultMarket: "Moneyline", label: "Basketball" };
  if (n === "tennis")     return { icon: "🎾", defaultMarket: "Match Winner", label: "Tennis" };
  if (n === "cricket")    return { icon: "🏏", defaultMarket: "Match Winner", label: "Cricket" };
  return { icon: "⚽", defaultMarket: "1X2", label: "Football" };
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

  const sportMeta = getSportMeta(fixture.sportName);
  const defaultMarket =
    markets.find((m) => m.marketType === sportMeta.defaultMarket) ?? markets[0] ?? null;

  const fixtureName = `${fixture.homeTeam?.name ?? "Home"} vs ${fixture.awayTeam?.name ?? "Away"}`;
  const activeMarket = expanded ? (markets[activeMarketIdx] ?? defaultMarket) : defaultMarket;

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
              <CountryFlag name={fixture.league?.countryName} size={16} />
              <Logo src={fixture.league?.logo} alt={fixture.league?.name ?? ""} size={14} fallback={null} />
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
                  {fmtUTCTime(fixture.displayTime ?? fixture.startTime)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Logo
                src={fixture.homeTeam?.logo}
                alt={fixture.homeTeam?.name ?? ""}
                size={28}
                fallback={<CountryFlag name={fixture.league?.countryName} size={28} />}
              />
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
              <Logo
                src={fixture.awayTeam?.logo}
                alt={fixture.awayTeam?.name ?? ""}
                size={28}
                fallback={<CountryFlag name={fixture.league?.countryName} size={28} />}
              />
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
                  {defaultMarket?.marketType ?? activeMarket.marketType}
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
                    startTime={fixture.displayTime ?? fixture.startTime}
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

// ── League browser (for non-football sports) ──────────────────────────────────

/** Label shown in the group header — cleans up tennis circuit names and cricket */
function groupLabel(sportName: string, rawCountry: string): string {
  const sn = sportName.toLowerCase();
  if (sn === "tennis") return normaliseTennisCategory(rawCountry);
  if (sn === "cricket" && rawCountry.toLowerCase() === "cricket") return "International";
  if (rawCountry.toLowerCase() === "world") return "International";
  return rawCountry;
}

/** True when the group key represents a real country (not a circuit/category) */
function isRealCountry(sportName: string, rawCountry: string): boolean {
  const sn = sportName.toLowerCase();
  if (sn === "tennis") return false;   // tennis uses circuit categories
  const lc = rawCountry.toLowerCase();
  if (lc === "cricket" || lc === "world" || lc === "international") return false;
  return true;
}

function LeagueBrowser({
  sportId,
  sportName,
  onSelectLeague,
}: {
  sportId: number;
  sportName: string;
  onSelectLeague: (id: number, name: string) => void;
}) {
  const { data: rawLeagues = [], isLoading } = useListLeagues({ sportId });
  const leagues = rawLeagues as Array<League & { fixtureCount?: number }>;

  const sportMeta = getSportMeta(sportName);

  // Auto-open all groups on first load so the user sees leagues immediately
  const groupKeys = (() => {
    const keys = new Set<string>();
    for (const l of leagues) keys.add(l.countryName ?? "International");
    return keys;
  })();
  const [openGroups, setOpenGroups] = useState<Set<string>>(groupKeys);

  // Keep openGroups in sync when data loads
  const [initialised, setInitialised] = useState(false);
  if (!initialised && leagues.length > 0) {
    setOpenGroups(new Set([...leagues.map((l) => l.countryName ?? "International")]));
    setInitialised(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-accent/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Trophy className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="font-bold text-lg mb-1">No leagues available</p>
        <p className="text-muted-foreground text-sm">Try syncing fixtures from Admin → Settings.</p>
      </div>
    );
  }

  // Group leagues by their raw countryName key
  const grouped = new Map<string, typeof leagues>();
  for (const league of leagues) {
    const key = league.countryName ?? "International";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(league);
  }

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Sort: "International" / "World" last; otherwise alphabetical by display label
  const entries = [...grouped.entries()].sort(([ka], [kb]) => {
    const la = groupLabel(sportName, ka);
    const lb = groupLabel(sportName, kb);
    const isIntlA = ["International", "World"].includes(la);
    const isIntlB = ["International", "World"].includes(lb);
    if (isIntlA && !isIntlB) return 1;
    if (!isIntlA && isIntlB) return -1;
    return la.localeCompare(lb);
  });

  return (
    <div className="space-y-2">
      {entries.map(([rawKey, groupLeagues]) => {
        const isOpen = openGroups.has(rawKey);
        const label = groupLabel(sportName, rawKey);
        const showFlag = isRealCountry(sportName, rawKey);
        // Use DB logo first, fall back to flagcdn
        const dbLogo = groupLeagues[0]?.countryLogo;
        const flagUrl = showFlag ? (dbLogo || countryFlagUrl(rawKey)) : null;
        const totalFixtures = groupLeagues.reduce((s, l) => s + (l.fixtureCount ?? 0), 0);

        return (
          <div key={rawKey} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(rawKey)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
            >
              {flagUrl ? (
                <img
                  src={flagUrl}
                  alt={label}
                  width={20}
                  height={15}
                  className="object-cover rounded-sm shrink-0"
                  style={{ width: 20, height: 15 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1 text-sm font-semibold text-left">{label}</span>
              <div className="flex items-center gap-2">
                {totalFixtures > 0 && (
                  <span className="text-xs text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded-full">
                    {totalFixtures}
                  </span>
                )}
                <span className="text-xs text-muted-foreground/60">{groupLeagues.length}</span>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {/* League rows */}
            {isOpen && (
              <div className="border-t border-border/50">
                {groupLeagues.map((league) => (
                  <button
                    key={league.id}
                    onClick={() => onSelectLeague(league.id, league.name)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors text-left group border-b border-border/30 last:border-b-0"
                  >
                    <Logo
                      src={league.leagueLogo}
                      alt={league.name}
                      size={20}
                      fallback={
                        <span className="text-base leading-none shrink-0 w-5 h-5 flex items-center justify-center">
                          {sportMeta.icon}
                        </span>
                      }
                    />
                    <span className="flex-1 text-sm text-foreground/90 group-hover:text-primary transition-colors truncate">
                      {league.name}
                    </span>
                    {(league.fixtureCount ?? 0) > 0 && (
                      <span className="text-xs text-muted-foreground/70 shrink-0 tabular-nums">
                        {league.fixtureCount}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SportsPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const selectedLeagueId = params.get("leagueId") ? Number(params.get("leagueId")) : null;
  const selectedLeagueName = params.get("leagueName") ? decodeURIComponent(params.get("leagueName")!) : null;
  const selectedSportId = params.get("sportId") ? Number(params.get("sportId")) : null;
  const selectedSportName = params.get("sportName") ? decodeURIComponent(params.get("sportName")!) : null;

  // Fetch sports list so we can find football's ID for the default (no-param) view
  const { data: sportsData } = useListSports();
  const footballSportId = sportsData?.find((s) => s.name?.toLowerCase() === "football")?.id ?? null;

  const sportMeta = getSportMeta(selectedSportName);

  // Show league browser only for non-football sports (sportId set, no leagueId)
  const showLeagueBrowser = !!selectedSportId && !selectedLeagueId;

  // When no sport or league is selected, default to football so games are never mixed
  const effectiveSportId = selectedSportId ?? (!selectedLeagueId ? footballSportId : null);

  const queryParams: any = { status: "upcoming", withMarkets: true };
  if (selectedLeagueId) {
    queryParams.leagueId = selectedLeagueId;
    queryParams.limit = 200;
  } else if (selectedSportId) {
    queryParams.sportId = selectedSportId;
    queryParams.limit = 50;
  } else if (effectiveSportId) {
    // Default: Football view — filter by football's sport ID
    queryParams.sportId = effectiveSportId;
    queryParams.limit = 50;
  } else {
    queryParams.limit = 20;
  }

  // Don't fetch fixtures until we know which sport to filter by (prevents mixed results on initial render)
  const readyToFetch = !!selectedLeagueId || !!selectedSportId || effectiveSportId !== null;

  const { data: fixturesData, isLoading } = useListFixtures(
    queryParams,
    {
      query: {
        queryKey: ["fixtures", "sports", selectedLeagueId, selectedSportId, effectiveSportId],
        enabled: !showLeagueBrowser && readyToFetch,
      },
    },
  );

  const now = new Date();
  const fixtures = (fixturesData?.fixtures ?? []).filter(
    (f) => new Date(f.startTime) > now,
  );

  const firstFixtureSportName = fixtures[0]?.sportName ?? null;
  const effectiveSportName = selectedSportName ?? firstFixtureSportName;

  // When no params, it's the Football default view
  const isDefaultFootballView = !selectedSportId && !selectedLeagueId;
  const pageTitle = selectedLeagueName ?? (
    selectedSportId
      ? (selectedSportName ? `${sportMeta.icon} ${selectedSportName}` : `${sportMeta.icon} ${sportMeta.label}`)
      : `⚽ Football`
  );

  const handleSelectLeague = (id: number, name: string) => {
    navigate(`/sports?sportId=${selectedSportId}&sportName=${encodeURIComponent(selectedSportName ?? "")}&leagueId=${id}&leagueName=${encodeURIComponent(name)}`);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        {(selectedLeagueName || selectedSportId) && (
          <button
            onClick={() => {
              if (selectedLeagueName && selectedSportId) {
                // League fixture view → back to sport's league browser
                navigate(`/sports?sportId=${selectedSportId}&sportName=${encodeURIComponent(selectedSportName ?? "")}`);
              } else if (selectedLeagueName && !selectedSportId) {
                // Football league view (from home sidebar) → back to football all-fixtures
                navigate("/sports");
              } else {
                // Sport league browser → back to home
                navigate("/");
              }
            }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            {pageTitle}
          </h1>
          {selectedLeagueName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {fixturesData?.total ?? 0} upcoming matches
            </p>
          )}
          {showLeagueBrowser && !selectedLeagueName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a competition to view matches
            </p>
          )}
        </div>
      </div>

      {/* League browser for non-football sports */}
      {showLeagueBrowser ? (
        <LeagueBrowser
          sportId={selectedSportId}
          sportName={selectedSportName ?? ""}
          onSelectLeague={handleSelectLeague}
        />
      ) : isLoading ? (
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
              : selectedSportId
              ? "No upcoming matches for this sport. Try syncing fixtures from Admin → Settings."
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

            {!selectedLeagueId && !selectedSportId && fixtures.length === 20 && (
              <p className="text-center text-xs text-muted-foreground mt-6">
                Showing 20 fixtures — select a specific league or sport to see all matches.
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
