import { useState } from "react";
import { useListFixtures } from "@workspace/api-client-react";
import type { ListFixturesParams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { subDays, startOfDay, isToday, isYesterday } from "date-fns";
import { fmtUTCTime } from "@/lib/formatUTC";
import { CalendarDays, CheckCircle2, Shield, Globe } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function dayLabel(date: Date): string {
  if (isToday(date)) return `Today · ${format(date, "EEEE, d MMMM yyyy")}`;
  if (isYesterday(date)) return `Yesterday · ${format(date, "EEEE, d MMMM yyyy")}`;
  return format(date, "EEEE, d MMMM yyyy");
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ fixture }: { fixture: any }) {
  const hasScore = fixture.scoreHome !== null && fixture.scoreAway !== null;

  return (
    <Link href={`/fixtures/${fixture.id}`}>
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-all cursor-pointer hover:bg-accent/10">
        <div className="p-4">
          {/* League + time */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <Logo src={fixture.league?.countryLogo} alt={fixture.league?.countryName ?? ""} size={14} />
              <Logo src={fixture.league?.logo} alt={fixture.league?.name ?? ""} size={14} />
              <span className="text-xs text-muted-foreground truncate">{fixture.league?.name}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{fmtUTCTime(fixture.startTime)}</span>
              {fixture.status === "finished" && (
                <span className="text-xs font-semibold text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded ml-1">FT</span>
              )}
              {fixture.status === "live" && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
                </span>
              )}
            </div>
          </div>

          {/* Teams + score */}
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

// ── Main page ─────────────────────────────────────────────────────────────────

const DAY_TABS = [
  { label: "Today", daysAgo: 0 },
  { label: "Yesterday", daysAgo: 1 },
  { label: "2 days ago", daysAgo: 2 },
];

export default function ResultsPage() {
  const [selectedDaysAgo, setSelectedDaysAgo] = useState(0);

  const targetDate = startOfDay(subDays(new Date(), selectedDaysAgo));
  const dateStr = dateKey(targetDate);

  const { data, isLoading } = useListFixtures(
    { dateFrom: dateStr, dateTo: dateStr, limit: 500 } as ListFixturesParams,
    { query: { queryKey: ["results", dateStr] } },
  );

  const now = new Date();
  const fixtures = (data?.fixtures ?? [])
    .filter((f) => new Date(f.startTime) <= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Group by league
  const leagueMap = new Map<number, { name: string; countryName?: string; logo?: string | null; fixtures: any[] }>();
  for (const f of fixtures) {
    const lid = f.leagueId ?? 0;
    if (!leagueMap.has(lid)) {
      leagueMap.set(lid, {
        name: f.league?.name ?? "Unknown",
        countryName: f.league?.countryName ?? undefined,
        logo: f.league?.logo,
        fixtures: [],
      });
    }
    leagueMap.get(lid)!.fixtures.push(f);
  }
  const leagueGroups = Array.from(leagueMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-primary" />
          Results
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dayLabel(targetDate)}</p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {DAY_TABS.map((tab) => (
          <button
            key={tab.daysAgo}
            onClick={() => setSelectedDaysAgo(tab.daysAgo)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              selectedDaysAgo === tab.daysAgo
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-accent/40 animate-pulse" />
          ))}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="font-bold text-lg mb-1">No results yet</p>
          <p className="text-muted-foreground text-sm">
            No matches have finished for this day.
          </p>
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
                {group.fixtures.map((f) => (
                  <ResultCard key={f.id} fixture={f} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
