import { useState, useEffect } from "react";
import { useListFixtures } from "@workspace/api-client-react";
import type { ListFixturesParams } from "@workspace/api-client-react";
import { fmtUTCTime, utcDateLabel } from "@/lib/formatUTC";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { CalendarDays, CheckCircle2, Shield, Globe, Radio, ChevronDown, Trophy } from "lucide-react";
import { resolveLeagueLogoUrl } from "@/lib/leagueLogoOverrides";
import { resolveCountryFlagUrl } from "@/lib/countryFlags";

const INITIAL_SHOW = 4;

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

// ── Sport metadata ─────────────────────────────────────────────────────────────

const SPORT_META: Record<string, { icon: string; useFootballGrouping: boolean }> = {
  Football:   { icon: "⚽", useFootballGrouping: true },
  Basketball: { icon: "🏀", useFootballGrouping: false },
  Tennis:     { icon: "🎾", useFootballGrouping: false },
  Cricket:    { icon: "🏏", useFootballGrouping: false },
};

// ── Small UI helpers ───────────────────────────────────────────────────────────

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

// ── Result / Live cards ────────────────────────────────────────────────────────

function ResultCard({ fixture }: { fixture: any }) {
  const hasScore = fixture.scoreHome !== null && fixture.scoreAway !== null;
  const homeWin = hasScore && fixture.scoreHome > fixture.scoreAway;
  const awayWin = hasScore && fixture.scoreAway > fixture.scoreHome;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Logo src={fixture.homeTeam?.logo} alt={fixture.homeTeam?.name ?? ""} size={20} />
        <span className={`text-xs font-semibold truncate ${homeWin ? "text-foreground" : "text-muted-foreground"}`}>
          {fixture.homeTeam?.name}
        </span>
      </div>
      <div className="shrink-0 flex items-center gap-1 px-2">
        {hasScore ? (
          <>
            <span className={`text-sm font-black tabular-nums w-4 text-center ${homeWin ? "text-foreground" : "text-muted-foreground"}`}>{fixture.scoreHome}</span>
            <span className="text-muted-foreground/50 text-xs">–</span>
            <span className={`text-sm font-black tabular-nums w-4 text-center ${awayWin ? "text-foreground" : "text-muted-foreground"}`}>{fixture.scoreAway}</span>
          </>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground px-1">vs</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className={`text-xs font-semibold truncate text-right ${awayWin ? "text-foreground" : "text-muted-foreground"}`}>
          {fixture.awayTeam?.name}
        </span>
        <Logo src={fixture.awayTeam?.logo} alt={fixture.awayTeam?.name ?? ""} size={20} />
      </div>
      <div className="shrink-0 flex items-center gap-1 pl-1 border-l border-border/50 ml-1">
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">{fmtUTCTime(fixture.displayTime ?? fixture.startTime)}</span>
        <span className="text-[9px] font-bold text-muted-foreground bg-accent/60 px-1 py-px rounded">FT</span>
      </div>
    </div>
  );
}

function LiveCard({ fixture }: { fixture: any }) {
  const homeScore = fixture.scoreHome ?? 0;
  const awayScore = fixture.scoreAway ?? 0;
  const homeLeading = homeScore > awayScore;
  const awayLeading = awayScore > homeScore;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-card">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Logo src={fixture.homeTeam?.logo} alt={fixture.homeTeam?.name ?? ""} size={20} />
        <span className={`text-xs font-semibold truncate ${homeLeading ? "text-foreground" : "text-muted-foreground"}`}>
          {fixture.homeTeam?.name}
        </span>
      </div>
      <div className="shrink-0 flex items-center gap-1 px-2">
        <span className={`text-sm font-black tabular-nums w-4 text-center ${homeLeading ? "text-foreground" : "text-muted-foreground"}`}>{homeScore}</span>
        <span className="text-muted-foreground/50 text-xs">:</span>
        <span className={`text-sm font-black tabular-nums w-4 text-center ${awayLeading ? "text-foreground" : "text-muted-foreground"}`}>{awayScore}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className={`text-xs font-semibold truncate text-right ${awayLeading ? "text-foreground" : "text-muted-foreground"}`}>
          {fixture.awayTeam?.name}
        </span>
        <Logo src={fixture.awayTeam?.logo} alt={fixture.awayTeam?.name ?? ""} size={20} />
      </div>
      <div className="shrink-0 pl-1 border-l border-border/50 ml-1">
        <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-px rounded-full">
          <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />LIVE
        </span>
      </div>
    </div>
  );
}

// ── Grouping logic ─────────────────────────────────────────────────────────────

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

function groupByCountryLeague(fixtures: any[], useFootballGrouping: boolean): CountryGroup[] {
  const leagueMap = new Map<number, LeagueGroup>();
  for (const f of fixtures) {
    const lid = f.leagueId ?? 0;
    if (!leagueMap.has(lid)) {
      leagueMap.set(lid, {
        leagueId: lid,
        leagueName: f.league?.name ?? "Unknown",
        leagueLogo: resolveLeagueLogoUrl(f.league?.name, f.league?.leagueLogo),
        countryName: f.league?.countryName,
        countryLogo: f.league?.countryLogo,
        fixtures: [],
      });
    }
    leagueMap.get(lid)!.fixtures.push(f);
  }

  const all = Array.from(leagueMap.values());

  if (!useFootballGrouping) {
    // For non-football sports: group all leagues under one "International" bucket
    // (since countryName tends to be category names, not real countries)
    const byCategory = new Map<string, CountryGroup>();
    for (const l of all) {
      const cat = l.countryName ?? "International";
      if (!byCategory.has(cat)) {
        byCategory.set(cat, { countryName: cat, countryLogo: resolveCountryFlagUrl(cat, l.countryLogo), leagues: [] });
      }
      byCategory.get(cat)!.leagues.push(l);
    }
    byCategory.forEach((cg) => cg.leagues.sort((a, b) => a.leagueName.localeCompare(b.leagueName)));
    return [...byCategory.values()].sort((a, b) => a.countryName.localeCompare(b.countryName));
  }

  // Football grouping: UEFA first, then international, then by country
  const uefaLeagues    = all.filter((l) => isUEFALeague(l.leagueName));
  const intlLeagues    = all.filter((l) => !isUEFALeague(l.leagueName) && isInternational(l.countryName));
  const countryLeagues = all.filter((l) => !isUEFALeague(l.leagueName) && !isInternational(l.countryName));

  uefaLeagues.sort((a, b) => uefaOrder(a.leagueName) - uefaOrder(b.leagueName));
  intlLeagues.sort((a, b) => a.leagueName.localeCompare(b.leagueName));

  const countryMap = new Map<string, CountryGroup>();
  for (const l of countryLeagues) {
    const cn = l.countryName ?? "Other";
    if (!countryMap.has(cn)) countryMap.set(cn, { countryName: cn, countryLogo: resolveCountryFlagUrl(cn, l.countryLogo), leagues: [] });
    countryMap.get(cn)!.leagues.push(l);
  }
  countryMap.forEach((cg) => cg.leagues.sort((a, b) => a.leagueName.localeCompare(b.leagueName)));

  const priorityMap = new Map(COUNTRY_PRIORITY.map((n, i) => [n, i]));
  const sortedCountries = Array.from(countryMap.values()).sort((a, b) => {
    const ai = priorityMap.has(a.countryName) ? priorityMap.get(a.countryName)! : COUNTRY_PRIORITY.length;
    const bi = priorityMap.has(b.countryName) ? priorityMap.get(b.countryName)! : COUNTRY_PRIORITY.length;
    return ai !== bi ? ai - bi : a.countryName.localeCompare(b.countryName);
  });

  const result: CountryGroup[] = [];
  if (uefaLeagues.length > 0)  result.push({ countryName: "UEFA Competitions", countryLogo: null, isUEFA: true, leagues: uefaLeagues });
  if (intlLeagues.length > 0)  result.push({ countryName: "International", countryLogo: null, isInternational: true, leagues: intlLeagues });
  result.push(...sortedCountries);
  return result;
}

// ── Sport tab selector ─────────────────────────────────────────────────────────

function SportTabs({
  sports,
  selected,
  onSelect,
}: {
  sports: Array<{ name: string; count: number }>;
  selected: string;
  onSelect: (s: string) => void;
}) {
  if (sports.length <= 1) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {sports.map((s) => {
        const meta = SPORT_META[s.name];
        const isActive = selected === s.name;
        return (
          <button
            key={s.name}
            onClick={() => onSelect(s.name)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            <span>{meta?.icon ?? "🏟️"}</span>
            <span>{s.name}</span>
            <span className={`tabular-nums ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
              {s.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── League block ───────────────────────────────────────────────────────────────

function LeagueBlock({
  league,
  renderCard,
  gridCols = "grid-cols-1 xl:grid-cols-2",
}: {
  league: LeagueGroup;
  renderCard: (f: any) => React.ReactNode;
  gridCols?: string;
}) {
  const { t } = useSiteSettings();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? league.fixtures : league.fixtures.slice(0, INITIAL_SHOW);
  const hidden = league.fixtures.length - INITIAL_SHOW;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-0.5">
        <Logo src={league.leagueLogo} alt={league.leagueName} size={14} />
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{league.leagueName}</span>
        <span className="text-xs text-muted-foreground/60 tabular-nums">{league.fixtures.length}</span>
      </div>
      <div className={`grid ${gridCols} gap-3`}>
        {visible.map((f) => renderCard(f))}
      </div>
      {league.fixtures.length > INITIAL_SHOW && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/50 rounded-lg hover:border-border hover:bg-accent/10 transition-all"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          {expanded ? t("results.show_less") : t("results.show_more").replace("{n}", String(hidden))}
        </button>
      )}
    </div>
  );
}

// ── Country section ───────────────────────────────────────────────────────────

function CountrySection({
  country,
  renderCard,
  gridCols,
}: {
  country: CountryGroup;
  renderCard: (f: any) => React.ReactNode;
  gridCols?: string;
}) {
  const { t } = useSiteSettings();
  const [collapsed, setCollapsed] = useState(false);
  const total = country.leagues.reduce((s, l) => s + l.fixtures.length, 0);
  const isUEFA = country.isUEFA;
  const isIntl = country.isInternational;

  return (
    <div className={`rounded-xl border overflow-hidden ${isUEFA ? "border-primary/30" : "border-border"}`}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
          isUEFA ? "bg-primary/10 hover:bg-primary/15" : "bg-accent/20 hover:bg-accent/30"
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
          {isUEFA ? `⭐ ${t("results.featured")}` : country.countryName}
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

// ── Sport-separated fixture view ──────────────────────────────────────────────

function SportFixtureView({
  fixtures,
  renderCard,
}: {
  fixtures: any[];
  renderCard: (f: any) => React.ReactNode;
}) {
  // Compute available sports — Football always first, rest sorted by count desc
  const sportCounts = new Map<string, number>();
  for (const f of fixtures) {
    const name = f.league?.sport?.name ?? f.sportName ?? "Football";
    sportCounts.set(name, (sportCounts.get(name) ?? 0) + 1);
  }
  const sports = [...sportCounts.entries()]
    .sort(([nameA, a], [nameB, b]) => {
      if (nameA === "Football") return -1;
      if (nameB === "Football") return 1;
      return b - a;
    })
    .map(([name, count]) => ({ name, count }));

  const [selectedSport, setSelectedSport] = useState<string>(() =>
    sportCounts.has("Football") ? "Football" : (sports[0]?.name ?? "Football")
  );

  // Reset selection when available sports change — prefer Football
  useEffect(() => {
    if (sports.length > 0 && !sports.find((s) => s.name === selectedSport)) {
      const preferred = sports.find((s) => s.name === "Football") ?? sports[0];
      setSelectedSport(preferred.name);
    }
  }, [sports.map((s) => s.name).join(",")]);

  const filtered = fixtures.filter((f) => (f.league?.sport?.name ?? f.sportName ?? "Football") === selectedSport);
  const meta = SPORT_META[selectedSport];
  const countryGroups = groupByCountryLeague(filtered, meta?.useFootballGrouping ?? true);

  return (
    <div className="space-y-4">
      <SportTabs sports={sports} selected={selectedSport} onSelect={setSelectedSport} />

      {countryGroups.length === 0 ? null : (
        <div className="space-y-3">
          {countryGroups.map((cg) => (
            <CountrySection
              key={cg.countryName}
              country={cg}
              renderCard={renderCard}
              gridCols="grid-cols-1 xl:grid-cols-2"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Live section ───────────────────────────────────────────────────────────────

function LiveSection() {
  const { t } = useSiteSettings();
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const { data, isLoading, dataUpdatedAt } = useListFixtures(
    { status: "live", limit: 200 } as any,
    { query: { queryKey: ["fixtures", "live"], refetchInterval: 30 * 1000, placeholderData: (prev: any) => prev } },
  );

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  const fixtures = data?.fixtures ?? [];
  const timeStr = lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? t("results.loading") : `${fixtures.length} ${t("results.matches_in_play")}`}
        </p>
        <div className="text-right">
          <p className="text-xs font-mono text-muted-foreground">{timeStr}</p>
          <p className="text-[10px] text-muted-foreground/50">{t("results.auto_refresh")}</p>
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
          <p className="font-bold text-lg mb-1">{t("results.no_live")}</p>
          <p className="text-sm text-muted-foreground">{t("results.no_live_desc")}</p>
        </div>
      ) : (
        <SportFixtureView
          fixtures={fixtures}
          renderCard={(f) => <LiveCard key={f.id} fixture={f} />}
        />
      )}
    </div>
  );
}

// ── Finished section ──────────────────────────────────────────────────────────

function FinishedSection() {
  const { t } = useSiteSettings();
  const [selectedDaysAgo, setSelectedDaysAgo] = useState(0);

  const DAY_TABS = [
    { label: t("results.today"),     daysAgo: 0 },
    { label: t("results.yesterday"), daysAgo: 1 },
    { label: t("results.2days"),     daysAgo: 2 },
  ];

  const dateStr = new Date(Date.now() - selectedDaysAgo * 86_400_000).toISOString().slice(0, 10);

  const { data, isLoading } = useListFixtures(
    { dateFrom: dateStr, dateTo: dateStr, status: "finished", limit: 500 } as ListFixturesParams,
    { query: { queryKey: ["results", "finished", dateStr] } },
  );

  const fixtures = (data?.fixtures ?? [])
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="space-y-5">
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
          <p className="font-bold text-lg mb-1">{t("results.no_results")}</p>
          <p className="text-sm text-muted-foreground">{t("results.no_results_desc")}</p>
        </div>
      ) : (
        <SportFixtureView
          fixtures={fixtures}
          renderCard={(f) => <ResultCard key={f.id} fixture={f} />}
        />
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Tab = "live" | "finished";

export default function ResultsPage() {
  const { t } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<Tab>("finished");

  const { data: liveData } = useListFixtures(
    { status: "live", limit: 1 } as any,
    { query: { queryKey: ["fixtures", "live-count-results"] } },
  );
  const liveCount = liveData?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-primary" />
          {t("results.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("results.desc")}</p>
      </div>

      <div className="flex gap-0 border-b border-border">
        <button onClick={() => setActiveTab("finished")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "finished"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t("results.finished")}
        </button>
        <button onClick={() => setActiveTab("live")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "live"
              ? "border-red-500 text-red-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}>
          <Radio className="w-3.5 h-3.5" />
          {t("results.live")}
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
