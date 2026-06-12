import { useState, useEffect } from "react";
import { useListFixtures } from "@workspace/api-client-react";
import type { ListFixturesParams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { fmtUTCTime, utcDateLabel } from "@/lib/formatUTC";
import { CalendarDays, CheckCircle2, Shield, Globe, Radio, ChevronDown, Trophy } from "lucide-react";

const INITIAL_SHOW = 4;

// ── Importance ordering (mirrors home page) ─────────────────────────────────────
const COUNTRY_PRIORITY = ["England", "Spain", "Germany", "Italy", "France", "Netherlands", "Portugal", "Turkey", "Congo DR"];

const UEFA_MATCHERS = [
  (n: string) => /world cup/i.test(n),
  (n: string) => /champions league/i.test(n) && !/caf|afc/i.test(n),
  (n: string) => /europa league/i.test(n) && !/conference/i.test(n),
  (n: string) => /conference/i.test(n),
  (n: string) => /super cup/i.test(n) && /uefa/i.test(n),
];

function isUEFALeague(name: string) { return UEFA_MATCHERS.some((t) => t(name)); }
function uefaOrder(name: string) { const i = UEFA_MATCHERS.findIndex((t) => t(name)); return i === -1 ? 99 : i; }
function isInternational(c: string | null | undefined) { return !c || c === "World" || c === "International"; }

function Logo({ src, alt, size = 24 }: { src: string | null | undefined; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Shield className="text-muted-foreground shrink-0" style={{ width: size, height: size }} />;
  return (
    <img src={src} alt={alt} width={size} height={size}
      className="object-contain shrink-0" style={{ width: size, height: size }}
      onError={() => setFailed(true)} />
  );
}

function FlagImg({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  return <img src={src} alt={alt} width={16} height={11} className="object-cover rounded-sm shrink-0 w-4" style={{ height: 11 }} onError={() => setFailed(true)} />;
}

// ── Finished result card ────────────────────────────────────────────────────────

function ResultCard({ fixture }: { fixture: any }) {
  const hasScore = fixture.scoreHome !== null && fixture.scoreAway !== null;
  return (
    <Link href={`/fixtures/${fixture.id}`}>
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-all cursor-pointer hover:bg-accent/10">
        <div className="p-4">
          <div className="flex items-center justify-end mb-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{fmtUTCTime(fixture.displayTime ?? fixture.startTime)}</span>
              <span className="text-xs font-semibold text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded ml-1">FT</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Logo src={fixture.homeTeam?.logo} alt={fixture.homeTeam?.name ?? ""} size={28} />
              <span className="font-semibold text-sm truncate">{fixture.homeTeam?.name}</span>
            </div>
            <div className="shrink-0 min-w-[60px] text-center">
              {hasScore ? (
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-xl font-black ${fixture.scoreHome > fixture.scoreAway ? "text-primary" : "text-foreground"}`}>
                    {fixture.scoreHome}
                  </span>
                  <span className="text-muted-foreground text-sm font-normal">–</span>
                  <span className={`text-xl font-black ${fixture.scoreAway > fixture.scoreHome ? "text-primary" : "text-foreground"}`}>
                    {fixture.scoreAway}
                  </span>
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
      </div>
    </Link>
  );
}

// ── Live score card ─────────────────────────────────────────────────────────────

function LiveCard({ fixture }: { fixture: any }) {
  const homeScore = fixture.scoreHome ?? 0;
  const awayScore = fixture.scoreAway ?? 0;
  const homeLeading = homeScore > awayScore;
  const awayLeading = awayScore > homeScore;
  return (
    <Link href={`/fixtures/${fixture.id}`}>
      <div className="bg-card border border-red-500/30 rounded-xl overflow-hidden hover:border-red-500/60 transition-all cursor-pointer hover:bg-accent/10">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
          </span>
          <span className="text-[10px] text-muted-foreground/60">KO {fmtUTCTime(fixture.displayTime ?? fixture.startTime)}</span>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <Logo src={fixture.homeTeam?.logo} alt={fixture.homeTeam?.name ?? ""} size={36} />
              <span className={`text-xs font-semibold text-center truncate w-full ${homeLeading ? "text-foreground" : "text-muted-foreground"}`}>
                {fixture.homeTeam?.name}
              </span>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-black tabular-nums ${homeLeading ? "text-foreground" : "text-muted-foreground"}`}>{homeScore}</span>
                <span className="text-muted-foreground/40 font-bold text-xl">:</span>
                <span className={`text-3xl font-black tabular-nums ${awayLeading ? "text-foreground" : "text-muted-foreground"}`}>{awayScore}</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <Logo src={fixture.awayTeam?.logo} alt={fixture.awayTeam?.name ?? ""} size={36} />
              <span className={`text-xs font-semibold text-center truncate w-full ${awayLeading ? "text-foreground" : "text-muted-foreground"}`}>
                {fixture.awayTeam?.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Grouping helpers ────────────────────────────────────────────────────────────

type LeagueGroup = {
  leagueId: number;
  leagueName: string;
  leagueLogo: string | null | undefined;
  countryName: string | null | undefined;
  countryLogo: string | null | undefined;
  fixtures: any[];
};

type CountryGroup = {
  countryName: string;
  countryLogo: string | null | undefined;
  isUEFA?: boolean;
  isInternational?: boolean;
  leagues: LeagueGroup[];
};

function groupByCountryLeague(fixtures: any[]): CountryGroup[] {
  // 1. Collect leagues
  const leagueMap = new Map<number, LeagueGroup>();
  for (const f of fixtures) {
    const lid = f.leagueId ?? 0;
    if (!leagueMap.has(lid)) {
      leagueMap.set(lid, {
        leagueId: lid,
        leagueName: f.league?.name ?? "Unknown",
        leagueLogo: f.league?.leagueLogo,
        countryName: f.league?.countryName,
        countryLogo: f.league?.countryLogo,
        fixtures: [],
      });
    }
    leagueMap.get(lid)!.fixtures.push(f);
  }

  const all = Array.from(leagueMap.values());

  // 2. Split into UEFA / International / Countries
  const uefaLeagues = all.filter((l) => isUEFALeague(l.leagueName));
  const intlLeagues  = all.filter((l) => !isUEFALeague(l.leagueName) && isInternational(l.countryName));
  const countryLeagues = all.filter((l) => !isUEFALeague(l.leagueName) && !isInternational(l.countryName));

  uefaLeagues.sort((a, b) => uefaOrder(a.leagueName) - uefaOrder(b.leagueName));
  intlLeagues.sort((a, b) => a.leagueName.localeCompare(b.leagueName));

  // 3. Group country leagues by countryName, then sort by priority
  const countryMap = new Map<string, CountryGroup>();
  for (const l of countryLeagues) {
    const cn = l.countryName ?? "Other";
    if (!countryMap.has(cn)) {
      countryMap.set(cn, { countryName: cn, countryLogo: l.countryLogo, leagues: [] });
    }
    countryMap.get(cn)!.leagues.push(l);
  }
  countryMap.forEach((cg) => cg.leagues.sort((a, b) => a.leagueName.localeCompare(b.leagueName)));

  const priorityMap = new Map(COUNTRY_PRIORITY.map((n, i) => [n, i]));
  const sortedCountries = Array.from(countryMap.values()).sort((a, b) => {
    const ai = priorityMap.has(a.countryName) ? priorityMap.get(a.countryName)! : COUNTRY_PRIORITY.length;
    const bi = priorityMap.has(b.countryName) ? priorityMap.get(b.countryName)! : COUNTRY_PRIORITY.length;
    return ai !== bi ? ai - bi : a.countryName.localeCompare(b.countryName);
  });

  // 4. Assemble result
  const result: CountryGroup[] = [];
  if (uefaLeagues.length > 0)  result.push({ countryName: "UEFA Competitions", countryLogo: null, isUEFA: true, leagues: uefaLeagues });
  if (intlLeagues.length > 0)  result.push({ countryName: "International", countryLogo: null, isInternational: true, leagues: intlLeagues });
  result.push(...sortedCountries);
  return result;
}

// ── League block with show-more toggle ─────────────────────────────────────────

function LeagueBlock({
  league,
  renderCard,
  gridCols = "grid-cols-1 xl:grid-cols-2",
}: {
  league: LeagueGroup;
  renderCard: (f: any) => React.ReactNode;
  gridCols?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? league.fixtures : league.fixtures.slice(0, INITIAL_SHOW);
  const hidden = league.fixtures.length - INITIAL_SHOW;

  return (
    <div className="space-y-2">
      {/* League header */}
      <div className="flex items-center gap-2 px-0.5">
        <Logo src={league.leagueLogo} alt={league.leagueName} size={14} />
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{league.leagueName}</span>
        <span className="text-xs text-muted-foreground/60 tabular-nums">{league.fixtures.length}</span>
      </div>

      {/* Cards */}
      <div className={`grid ${gridCols} gap-3`}>
        {visible.map((f) => renderCard(f))}
      </div>

      {/* Show more / less toggle */}
      {league.fixtures.length > INITIAL_SHOW && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/50 rounded-lg hover:border-border hover:bg-accent/10 transition-all"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}

// ── Country section ─────────────────────────────────────────────────────────────

function CountrySection({
  country,
  renderCard,
  gridCols,
}: {
  country: CountryGroup;
  renderCard: (f: any) => React.ReactNode;
  gridCols?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const total = country.leagues.reduce((s, l) => s + l.fixtures.length, 0);

  const isUEFA = country.isUEFA;
  const isIntl = country.isInternational;

  return (
    <div className={`rounded-xl border overflow-hidden ${isUEFA ? "border-primary/30" : "border-border"}`}>
      {/* Header — click to collapse */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
          isUEFA
            ? "bg-primary/10 hover:bg-primary/15"
            : "bg-accent/20 hover:bg-accent/30"
        }`}
      >
        {isUEFA ? (
          <Trophy className="w-4 h-4 text-primary shrink-0" />
        ) : isIntl ? (
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <FlagImg src={country.countryLogo} alt={country.countryName} />
        )}
        <span className={`text-sm font-bold flex-1 text-left ${isUEFA ? "text-primary" : ""}`}>
          {isUEFA ? "⭐ " : ""}{isUEFA ? "Featured Competitions" : country.countryName}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{total}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
      </button>

      {!collapsed && (
        <div className="divide-y divide-border/30">
          {country.leagues.map((league) => (
            <div key={league.leagueId} className="px-4 py-4">
              <LeagueBlock league={league} renderCard={renderCard} gridCols={gridCols} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Live section ───────────────────────────────────────────────────────────────

function LiveSection() {
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const { data, isLoading, dataUpdatedAt } = useListFixtures(
    { status: "live", limit: 200 } as any,
    { query: { queryKey: ["fixtures", "live"], refetchInterval: 30 * 1000, placeholderData: (prev: any) => prev } },
  );

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  const fixtures = data?.fixtures ?? [];
  const countryGroups = groupByCountryLeague(fixtures);
  const timeStr = lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading…" : `${fixtures.length} match${fixtures.length !== 1 ? "es" : ""} in play`}
        </p>
        <div className="text-right">
          <p className="text-xs font-mono text-muted-foreground">{timeStr}</p>
          <p className="text-[10px] text-muted-foreground/50">auto-refresh 30s</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-accent/20 animate-pulse" />)}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center mb-4">
            <Radio className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="font-bold text-lg mb-1">No live matches right now</p>
          <p className="text-sm text-muted-foreground">Check back during match times — scores refresh every 30 seconds</p>
        </div>
      ) : (
        <div className="space-y-3">
          {countryGroups.map((cg) => (
            <CountrySection
              key={cg.countryName}
              country={cg}
              renderCard={(f) => <LiveCard key={f.id} fixture={f} />}
              gridCols="grid-cols-1 xl:grid-cols-2"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Finished section ───────────────────────────────────────────────────────────

const DAY_TABS = [
  { label: "Today", daysAgo: 0 },
  { label: "Yesterday", daysAgo: 1 },
  { label: "2 days ago", daysAgo: 2 },
];

function FinishedSection() {
  const [selectedDaysAgo, setSelectedDaysAgo] = useState(0);

  const dateStr = new Date(Date.now() - selectedDaysAgo * 86_400_000).toISOString().slice(0, 10);

  const { data, isLoading } = useListFixtures(
    { dateFrom: dateStr, dateTo: dateStr, status: "finished", limit: 500 } as ListFixturesParams,
    { query: { queryKey: ["results", "finished", dateStr] } },
  );

  const fixtures = (data?.fixtures ?? [])
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const countryGroups = groupByCountryLeague(fixtures);

  return (
    <div className="space-y-5">
      {/* Day tabs */}
      <div className="flex gap-0 border-b border-border">
        {DAY_TABS.map((tab) => (
          <button key={tab.daysAgo} onClick={() => setSelectedDaysAgo(tab.daysAgo)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              selectedDaysAgo === tab.daysAgo
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center pr-1">{utcDateLabel(dateStr)}</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-accent/40 animate-pulse" />)}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="font-bold text-lg mb-1">No results yet</p>
          <p className="text-sm text-muted-foreground">No matches have finished for this day.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {countryGroups.map((cg) => (
            <CountrySection
              key={cg.countryName}
              country={cg}
              renderCard={(f) => <ResultCard key={f.id} fixture={f} />}
              gridCols="grid-cols-1 xl:grid-cols-2"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = "live" | "finished";

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("finished");

  const { data: liveData } = useListFixtures(
    { status: "live", limit: 1 } as any,
    { query: { queryKey: ["fixtures", "live-count-results"] } },
  );
  const liveCount = liveData?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-primary" />
          Results
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Live scores and finished matches</p>
      </div>

      {/* Top-level tabs */}
      <div className="flex gap-0 border-b border-border">
        <button onClick={() => setActiveTab("finished")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "finished"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Finished
        </button>
        <button onClick={() => setActiveTab("live")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "live"
              ? "border-red-500 text-red-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}>
          <Radio className="w-3.5 h-3.5" />
          Live
          {liveCount > 0 && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">
              {liveCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "live" ? <LiveSection /> : <FinishedSection />}
    </div>
  );
}
