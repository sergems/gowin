import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronDown, ChevronRight, Shield, Globe, Trophy } from "lucide-react";

interface LeagueEntry { id: number; name: string; logo: string | null; fixtureCount: number; }
interface CountryEntry { name: string; logo: string | null; leagues: LeagueEntry[]; }
interface FootballData { featured: LeagueEntry[]; international: LeagueEntry[]; countries: CountryEntry[]; }

const COUNTRY_PRIORITY = ["England", "Spain", "Germany", "Italy", "France", "Netherlands", "Portugal", "Turkey", "Congo DR"];

function isChampionsLeague(n: string) { return /champions league/i.test(n) && !/caf|afc/i.test(n); }
function isEuropaLeague(n: string)    { return /europa league/i.test(n) && !/conference/i.test(n); }
function isConferenceLeague(n: string){ return /conference/i.test(n); }
function isSuperCup(n: string)        { return /super cup/i.test(n) && /uefa/i.test(n); }

const UEFA_MATCHERS = [
  { label: "UEFA Champions League",   test: isChampionsLeague },
  { label: "UEFA Europa League",      test: isEuropaLeague },
  { label: "UEFA Conference League",  test: isConferenceLeague },
  { label: "UEFA Super Cup",          test: isSuperCup },
];

function Logo({ src, alt, size = 20 }: { src: string | null | undefined; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Shield className="text-muted-foreground/60 shrink-0" style={{ width: size, height: size }} />;
  return (
    <img src={src} alt={alt} width={size} height={size}
      className="object-contain shrink-0" style={{ width: size, height: size }}
      onError={() => setFailed(true)} />
  );
}

function FlagImg({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Globe className="w-4 h-4 text-muted-foreground shrink-0" />;
  return (
    <img src={src} alt={alt} width={20} height={14}
      className="object-cover rounded-sm shrink-0" style={{ width: 20, height: 14 }}
      onError={() => setFailed(true)} />
  );
}

function LeagueRow({ league, onClick }: { league: LeagueEntry; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors text-left group border-b border-border/30 last:border-b-0"
    >
      <Logo src={league.logo} alt={league.name} size={18} />
      <span className="flex-1 text-sm text-foreground/90 group-hover:text-primary transition-colors truncate">
        {league.name}
      </span>
      {league.fixtureCount > 0 && (
        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
          {league.fixtureCount}
        </span>
      )}
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0" />
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 bg-accent/20 border-b border-border/50">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{children}</span>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [openCountries, setOpenCountries] = useState<Set<string>>(new Set());
  const [intlOpen, setIntlOpen] = useState(false);

  const { data, isLoading } = useQuery<FootballData>({
    queryKey: ["football-countries"],
    queryFn: () => fetch("/api/football/countries").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const goToLeague = (id: number, name: string) =>
    navigate(`/sports?leagueId=${id}&leagueName=${encodeURIComponent(name)}`);

  const toggleCountry = (name: string) =>
    setOpenCountries((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-40 bg-accent/50 rounded animate-pulse mb-4" />
        <div className="h-10 bg-accent/40 rounded-xl animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-accent/30 rounded-xl animate-pulse" />
        ))}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 bg-accent/20 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const { featured = [], international = [], countries = [] } = data ?? {};
  const all = [...featured, ...international];

  const uefaLeagues = UEFA_MATCHERS
    .map(({ label, test }) => {
      const found = all.find((l) => test(l.name));
      return found ? { ...found, name: label } : null;
    })
    .filter(Boolean) as LeagueEntry[];

  const uefaIds = new Set(uefaLeagues.map((l) => l.id));
  const otherInternational = international.filter((l) => !uefaIds.has(l.id));

  const priorityMap = new Map(COUNTRY_PRIORITY.map((n, i) => [n, i]));
  const sortedCountries = [...countries].sort((a, b) => {
    const ai = priorityMap.has(a.name) ? priorityMap.get(a.name)! : COUNTRY_PRIORITY.length;
    const bi = priorityMap.has(b.name) ? priorityMap.get(b.name)! : COUNTRY_PRIORITY.length;
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
  });

  const intlFixtures = otherInternational.reduce((s, l) => s + l.fixtureCount, 0);

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="mb-5">
        <h1 className="text-2xl font-black tracking-tight mb-1">Matches</h1>
        <p className="text-sm text-muted-foreground">Browse competitions and leagues</p>
      </div>

      {/* UEFA Featured Competitions */}
      {uefaLeagues.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SectionHeader>⭐ UEFA Competitions</SectionHeader>
          {uefaLeagues.map((league) => (
            <LeagueRow key={league.id} league={league} onClick={() => goToLeague(league.id, league.name)} />
          ))}
        </div>
      )}

      {/* International */}
      {otherInternational.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setIntlOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
          >
            <Globe className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1 text-sm font-semibold text-left">International</span>
            <div className="flex items-center gap-2">
              {intlFixtures > 0 && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">
                  {intlFixtures}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{otherInternational.length}</span>
              {intlOpen
                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {intlOpen && (
            <div className="border-t border-border/50">
              {otherInternational.map((league) => (
                <LeagueRow key={league.id} league={league} onClick={() => goToLeague(league.id, league.name)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Countries */}
      {sortedCountries.length === 0 && uefaLeagues.length === 0 && (
        <div className="py-14 text-center border border-dashed border-border rounded-xl">
          <Trophy className="w-9 h-9 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No competitions available right now.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Check back later for upcoming matches.</p>
        </div>
      )}

      <div className="space-y-2">
        {sortedCountries.map((country) => {
          const isOpen = openCountries.has(country.name);
          const totalFixtures = country.leagues.reduce((s, l) => s + l.fixtureCount, 0);
          return (
            <div key={country.name} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCountry(country.name)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
              >
                <FlagImg src={country.logo} alt={country.name} />
                <span className="flex-1 text-sm font-semibold text-left">{country.name}</span>
                <div className="flex items-center gap-2">
                  {totalFixtures > 0 && (
                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">
                      {totalFixtures}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{country.leagues.length}</span>
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border/50">
                  {country.leagues.map((league) => (
                    <LeagueRow key={league.id} league={league} onClick={() => goToLeague(league.id, league.name)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
