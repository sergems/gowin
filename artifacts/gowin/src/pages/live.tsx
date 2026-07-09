import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListFixtures } from "@workspace/api-client-react";
import { Shield, Radio } from "lucide-react";
import { fmtUTCTime } from "@/lib/formatUTC";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

function Logo({ src, alt, size = 28 }: { src: string | null | undefined; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Shield className="text-muted-foreground shrink-0" style={{ width: size, height: size }} />;
  return (
    <img src={src} alt={alt} width={size} height={size}
      className="object-contain shrink-0" style={{ width: size, height: size }}
      onError={() => setFailed(true)} />
  );
}

function LiveCard({ fixture }: { fixture: any }) {
  const homeScore = fixture.scoreHome ?? 0;
  const awayScore = fixture.scoreAway ?? 0;
  const homeLeading = homeScore > awayScore;
  const awayLeading = awayScore > homeScore;

  return (
    <Link href={`/fixtures/${fixture.id}?from=/live`}>
      <div className="bg-card border border-red-500/30 rounded-xl overflow-hidden hover:border-red-500/60 transition-all cursor-pointer hover:bg-accent/10 group">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Logo src={fixture.league?.countryLogo} alt={fixture.league?.countryName ?? ""} size={14} />
            <Logo src={fixture.league?.logo} alt={fixture.league?.name ?? ""} size={14} />
            <span className="text-xs text-muted-foreground truncate">{fixture.league?.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            {/* Home team */}
            <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <Logo src={fixture.homeTeam?.logo} alt={fixture.homeTeam?.name ?? ""} size={36} />
              <span className={`text-xs font-semibold text-center truncate w-full ${homeLeading ? "text-foreground" : "text-muted-foreground"}`}>
                {fixture.homeTeam?.name}
              </span>
            </div>

            {/* Score */}
            <div className="shrink-0 flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-black tabular-nums ${homeLeading ? "text-foreground" : "text-muted-foreground"}`}>
                  {homeScore}
                </span>
                <span className="text-muted-foreground/40 font-bold text-xl">:</span>
                <span className={`text-3xl font-black tabular-nums ${awayLeading ? "text-foreground" : "text-muted-foreground"}`}>
                  {awayScore}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/60">KO {fmtUTCTime(fixture.displayTime ?? fixture.startTime)}</span>
            </div>

            {/* Away team */}
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

export default function LivePage() {
  const { t } = useSiteSettings();
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const { data, isLoading, dataUpdatedAt } = useListFixtures(
    { status: "live", limit: 200 } as any,
    { query: { queryKey: ["fixtures", "live"], refetchInterval: 30 * 1000 } },
  );

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  const fixtures = data?.fixtures ?? [];

  // Group by sport first (Football always first), then by league alphabetically
  const sportMap = new Map<string, { leagues: Map<number, { name: string; countryName?: string; logo?: string | null; countryLogo?: string | null; fixtures: any[] }> }>();
  for (const f of fixtures) {
    const sportName = f.league?.sport?.name ?? "Football";
    if (!sportMap.has(sportName)) sportMap.set(sportName, { leagues: new Map() });
    const leagueMap = sportMap.get(sportName)!.leagues;
    const lid = f.leagueId ?? 0;
    if (!leagueMap.has(lid)) {
      leagueMap.set(lid, {
        name: f.league?.name ?? "Unknown",
        countryName: f.league?.countryName ?? undefined,
        logo: f.league?.leagueLogo,
        countryLogo: f.league?.countryLogo,
        fixtures: [],
      });
    }
    leagueMap.get(lid)!.fixtures.push(f);
  }

  const SPORT_ICONS: Record<string, string> = { Football: "⚽", Basketball: "🏀", Tennis: "🎾", Cricket: "🏏" };

  const sportGroups = [...sportMap.entries()]
    .sort(([a], [b]) => {
      if (a === "Football") return -1;
      if (b === "Football") return 1;
      return a.localeCompare(b);
    })
    .map(([name, { leagues }]) => ({
      name,
      icon: SPORT_ICONS[name] ?? "🏟️",
      leagueGroups: Array.from(leagues.values()).sort((a, b) => a.name.localeCompare(b.name)),
      count: Array.from(leagues.values()).reduce((s, l) => s + l.fixtures.length, 0),
    }));

  const [selectedSport, setSelectedSport] = useState<string>(() =>
    sportMap.has("Football") ? "Football" : (sportGroups[0]?.name ?? "Football")
  );
  useEffect(() => {
    if (sportGroups.length > 0 && !sportGroups.find((s) => s.name === selectedSport)) {
      const preferred = sportGroups.find((s) => s.name === "Football") ?? sportGroups[0];
      setSelectedSport(preferred.name);
    }
  }, [sportGroups.map((s) => s.name).join(",")]);

  const activeSport = sportGroups.find((s) => s.name === selectedSport);
  const leagueGroups = activeSport?.leagueGroups ?? [];

  const timeStr = lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-500" />
            {t("live.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? t("live.loading") : `${fixtures.length} ${fixtures.length !== 1 ? t("live.matches") : t("live.match")} in play`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{t("live.updated")}</p>
          <p className="text-xs font-mono text-muted-foreground">{timeStr}</p>
          <p className="text-[10px] text-muted-foreground/50">{t("live.auto_refresh")}</p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-accent/20 animate-pulse" />
          ))}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center">
            <Radio className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">{t("live.no_matches")}</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{t("live.no_matches_desc")}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sport tabs — Football always first */}
          {sportGroups.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {sportGroups.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setSelectedSport(s.name)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    selectedSport === s.name
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                  <span className={`tabular-nums ${selectedSport === s.name ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>{s.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-6">
            {leagueGroups.map((league) => (
              <div key={league.name}>
                <div className="flex items-center gap-2 mb-3">
                  <Logo src={league.countryLogo} alt={league.countryName ?? ""} size={16} />
                  <Logo src={league.logo} alt={league.name} size={16} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{league.name}</span>
                  <span className="text-[10px] text-muted-foreground/50 ml-1">
                    {league.fixtures.length} {league.fixtures.length !== 1 ? t("live.matches") : t("live.match")}
                  </span>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {league.fixtures.map((f: any) => <LiveCard key={f.id} fixture={f} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
