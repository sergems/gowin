import { useState, useEffect } from "react";
import { useListFixtures } from "@workspace/api-client-react";
import type { ListFixturesParams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { fmtUTCTime, utcDateLabel } from "@/lib/formatUTC";
import { CalendarDays, CheckCircle2, Shield, Globe, Radio } from "lucide-react";

function Logo({ src, alt, size = 24 }: { src: string | null | undefined; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Shield className="text-muted-foreground shrink-0" style={{ width: size, height: size }} />;
  return (
    <img src={src} alt={alt} width={size} height={size}
      className="object-contain shrink-0" style={{ width: size, height: size }}
      onError={() => setFailed(true)} />
  );
}

// ── Finished result card ───────────────────────────────────────────────────────

function ResultCard({ fixture }: { fixture: any }) {
  const hasScore = fixture.scoreHome !== null && fixture.scoreAway !== null;
  return (
    <Link href={`/fixtures/${fixture.id}`}>
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-all cursor-pointer hover:bg-accent/10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <Logo src={fixture.league?.countryLogo} alt={fixture.league?.countryName ?? ""} size={14} />
              <Logo src={fixture.league?.logo} alt={fixture.league?.name ?? ""} size={14} />
              <span className="text-xs text-muted-foreground truncate">{fixture.league?.name}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{fmtUTCTime(fixture.startTime)}</span>
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

// ── Live score card ────────────────────────────────────────────────────────────

function LiveCard({ fixture }: { fixture: any }) {
  const homeScore = fixture.scoreHome ?? 0;
  const awayScore = fixture.scoreAway ?? 0;
  const homeLeading = homeScore > awayScore;
  const awayLeading = awayScore > homeScore;
  return (
    <Link href={`/fixtures/${fixture.id}`}>
      <div className="bg-card border border-red-500/30 rounded-xl overflow-hidden hover:border-red-500/60 transition-all cursor-pointer hover:bg-accent/10">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Logo src={fixture.league?.countryLogo} alt={fixture.league?.countryName ?? ""} size={14} />
            <Logo src={fixture.league?.logo} alt={fixture.league?.name ?? ""} size={14} />
            <span className="text-xs text-muted-foreground truncate">{fixture.league?.name}</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
          </span>
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
              <span className="text-[10px] text-muted-foreground/60">KO {fmtUTCTime(fixture.startTime)}</span>
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

function groupByLeague(fixtures: any[]) {
  const map = new Map<number, { name: string; countryName?: string; logo?: string | null; countryLogo?: string | null; fixtures: any[] }>();
  for (const f of fixtures) {
    const lid = f.leagueId ?? 0;
    if (!map.has(lid)) {
      map.set(lid, { name: f.league?.name ?? "Unknown", countryName: f.league?.countryName, logo: f.league?.logo, countryLogo: f.league?.countryLogo, fixtures: [] });
    }
    map.get(lid)!.fixtures.push(f);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ── Live section ──────────────────────────────────────────────────────────────

function LiveSection() {
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const { data, isLoading, dataUpdatedAt } = useListFixtures(
    { status: "live", limit: 200 } as any,
    { query: { queryKey: ["fixtures", "live"], refetchInterval: 30 * 1000 } },
  );

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  const fixtures = data?.fixtures ?? [];
  const leagueGroups = groupByLeague(fixtures);
  const timeStr = lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="space-y-6">
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
        <div className="space-y-6">
          {leagueGroups.map((league) => (
            <div key={league.name}>
              <div className="flex items-center gap-2 mb-3">
                <Logo src={league.countryLogo} alt={league.countryName ?? ""} size={14} />
                <Logo src={league.logo} alt={league.name} size={14} />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{league.name}</span>
                <span className="text-[10px] text-muted-foreground/50">{league.fixtures.length}</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {league.fixtures.map((f: any) => <LiveCard key={f.id} fixture={f} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Finished section ──────────────────────────────────────────────────────────

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
    { query: { queryKey: ["results", dateStr] } },
  );

  const fixtures = (data?.fixtures ?? [])
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const leagueGroups = groupByLeague(fixtures);

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
        <div className="space-y-6">
          {leagueGroups.map((group) => (
            <div key={group.name} className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {group.countryName ? `${group.countryName} · ` : ""}{group.name}
                </span>
                <span className="text-xs text-muted-foreground">({group.fixtures.length})</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {group.fixtures.map((f) => <ResultCard key={f.id} fixture={f} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "live" | "finished";

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("live");

  const { data: liveData } = useListFixtures(
    { status: "live", limit: 1 } as any,
    { query: { queryKey: ["fixtures", "live-count-results"], refetchInterval: 30 * 1000, staleTime: 20 * 1000 } },
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
        <button onClick={() => setActiveTab("finished")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "finished"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Finished
        </button>
      </div>

      {activeTab === "live" ? <LiveSection /> : <FinishedSection />}
    </div>
  );
}
