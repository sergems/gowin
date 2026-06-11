import { useState } from "react";
import { useRoute } from "wouter";
import { useGetFixture } from "@workspace/api-client-react";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { sortOdds } from "@/lib/sortOdds";
import { Trophy, CalendarDays, Activity, ChevronLeft } from "lucide-react";
import { fmtUTCDateTimeLong } from "@/lib/formatUTC";
import { Link } from "wouter";

// ── Market category definitions ───────────────────────────────────────────────

const CATEGORIES: { label: string; types: string[]; prefix?: string }[] = [
  {
    label: "Popular",
    types: ["1X2", "Double Chance", "Draw No Bet", "Both Teams To Score", "Over/Under 2.5"],
  },
  {
    label: "Goals",
    types: [
      "Over/Under 0.5", "Over/Under 1.5", "Over/Under 2.5", "Over/Under 3.5", "Over/Under 4.5",
      "Both Teams To Score", "Correct Score",
    ],
  },
  {
    label: "Match",
    types: ["1X2", "Double Chance", "Draw No Bet", "European Handicap", "Half-Time Result", "Half-Time/Full-Time"],
  },
  {
    label: "Half-Time",
    types: ["Half-Time Result", "HT Total Goals 0.5", "HT Total Goals 1.5", "HT Total Goals 2.5", "Half-Time/Full-Time"],
  },
  {
    label: "Either Half",
    types: ["Home Win Either Half", "Away Win Either Half"],
  },
  {
    label: "Handicap",
    types: ["Asian Handicap 0", "Asian Handicap -1", "Asian Handicap +1", "Asian Handicap -1.5", "Asian Handicap +1.5", "European Handicap", "Draw No Bet"],
  },
  {
    label: "Corners",
    types: [
      "Over/Under Corners 7.5", "Over/Under Corners 8.5", "Over/Under Corners 9.5",
      "Over/Under Corners 10.5", "Over/Under Corners 11.5", "Over/Under Corners 12.5",
    ],
  },
  {
    label: "Cards",
    types: ["Over/Under Yellow Cards"],
  },
];

// ── Odds button ────────────────────────────────────────────────────────────────

function OddsButton({
  oddsId, fixtureId, market, selection, oddsValue, fixtureName, competitionName, startTime, disabled,
}: {
  oddsId: number;
  fixtureId: number;
  market: string;
  selection: string;
  oddsValue: number;
  fixtureName: string;
  competitionName?: string;
  startTime?: string;
  disabled?: boolean;
}) {
  const { selections, addSelection, removeSelection } = useBetSlip();
  const selected = selections.some((s) => s.oddsId === oddsId);

  return (
    <button
      onClick={() => {
        if (selected) removeSelection(oddsId);
        else addSelection({ oddsId, fixtureId, market, selection, odds: oddsValue, fixtureName, marketName: market, competitionName, startTime });
      }}
      disabled={disabled}
      className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all w-full
        ${disabled ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
          : selected
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "bg-background border-border hover:border-primary hover:text-primary text-foreground"
        }`}
    >
      <span className="text-left">{selection}</span>
      <span className={`font-bold ml-3 shrink-0 ${selected ? "text-primary-foreground" : "text-primary"}`}>
        {oddsValue.toFixed(2)}
      </span>
    </button>
  );
}

// ── Market card ────────────────────────────────────────────────────────────────

function MarketCard({ market, fixtureId, fixtureName, competitionName, startTime, disabled }: {
  market: any;
  fixtureId: number;
  fixtureName: string;
  competitionName?: string;
  startTime?: string;
  disabled?: boolean;
}) {
  const odds: any[] = sortOdds(market.odds ?? [], market.marketType);
  const isWide = odds.length >= 3 && odds.length <= 4;
  const isGrid2 = odds.length === 2;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/50 bg-accent/20">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {market.marketType}
        </p>
      </div>
      <div className={`p-3 ${isWide || isGrid2 ? "grid grid-cols-" + Math.min(odds.length, 3) + " gap-2" : "space-y-2"}`}
        style={isWide || isGrid2 ? { gridTemplateColumns: `repeat(${Math.min(odds.length, 3)}, minmax(0, 1fr))` } : {}}>
        {odds.map((odd: any) => (
          <OddsButton
            key={odd.id}
            oddsId={odd.id}
            fixtureId={fixtureId}
            market={market.marketType}
            selection={odd.selection}
            oddsValue={parseFloat(odd.oddsValue ?? odd.odds_value ?? odd.oddsvalue ?? "0")}
            fixtureName={fixtureName}
            competitionName={competitionName}
            startTime={startTime}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FixtureDetail() {
  const [, params] = useRoute("/fixtures/:id");
  const fixtureId = params?.id ? parseInt(params.id) : 0;
  const [activeTab, setActiveTab] = useState("Popular");

  const { data: fixture, isLoading } = useGetFixture(fixtureId, {
    query: { enabled: !!fixtureId },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 bg-accent/50 rounded-xl animate-pulse" />
        <div className="h-10 bg-accent/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-accent/40 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!fixture) {
    return <div className="py-20 text-center text-muted-foreground">Fixture not found</div>;
  }

  const markets: any[] = (fixture as any).markets ?? [];
  const fixtureName = `${fixture.homeTeam?.name ?? "Home"} vs ${fixture.awayTeam?.name ?? "Away"}`;
  const isFinished = fixture.status === "finished" || fixture.status === "cancelled";
  const isLive = fixture.status === "live";

  // Build category → markets mapping
  const marketsByType = new Map<string, any>();
  for (const m of markets) marketsByType.set(m.marketType, m);

  // Filter out categories with no markets, build "All" tab
  const availableCategories = CATEGORIES.filter((cat) =>
    cat.types.some((t) => {
      if (t.startsWith("Asian Handicap")) {
        return markets.some((m) => m.marketType.startsWith("Asian Handicap"));
      }
      return marketsByType.has(t);
    })
  );

  // Build tab list: Popular + available categories + All
  const tabs = ["Popular", ...availableCategories.filter((c) => c.label !== "Popular").map((c) => c.label), "All"];
  const uniqueTabs = [...new Set(tabs)];

  function getMarketsForTab(tab: string): any[] {
    if (tab === "All") return markets;
    const cat = CATEGORIES.find((c) => c.label === tab);
    if (!cat) return [];
    return cat.types.flatMap((t) => {
      if (t.startsWith("Asian Handicap")) {
        return markets.filter((m) => m.marketType.startsWith("Asian Handicap"));
      }
      const m = marketsByType.get(t);
      return m ? [m] : [];
    }).filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);
  }

  const visibleMarkets = getMarketsForTab(activeTab);

  return (
    <div className="space-y-5 pb-8">
      {/* Back link */}
      <button onClick={() => window.history.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero card */}
      <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative p-6 md:p-8">
          {/* League + status row */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/60 px-3 py-1.5 rounded-full border border-border">
              <Trophy className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{fixture.league?.name ?? "League"}</span>
            </div>
            <div className="text-sm bg-background/60 px-3 py-1.5 rounded-full border border-border">
              {isLive ? (
                <span className="flex items-center gap-2 font-semibold text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
                </span>
              ) : isFinished ? (
                <span className="text-muted-foreground font-medium">Full Time</span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="w-4 h-4" />
                  {fmtUTCDateTimeLong(fixture.startTime)}
                </span>
              )}
            </div>
          </div>

          {/* Teams + score */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex flex-col items-center gap-3 text-center min-w-0">
              {fixture.homeTeam?.logo && (
                <img src={fixture.homeTeam.logo} alt="" className="w-16 h-16 object-contain" />
              )}
              <p className="text-base md:text-2xl font-black leading-tight break-words w-full">{fixture.homeTeam?.name}</p>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-1">
              {isLive || isFinished ? (
                <div className="flex items-center gap-4 text-5xl font-black">
                  <span>{fixture.scoreHome ?? 0}</span>
                  <span className="text-muted-foreground/30 text-2xl">:</span>
                  <span>{fixture.scoreAway ?? 0}</span>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-muted-foreground border border-border">
                  VS
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center gap-3 text-center min-w-0">
              {fixture.awayTeam?.logo && (
                <img src={fixture.awayTeam.logo} alt="" className="w-16 h-16 object-contain" />
              )}
              <p className="text-base md:text-2xl font-black leading-tight break-words w-full">{fixture.awayTeam?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Markets section */}
      {markets.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-lg">Betting Markets</h2>
            <span className="text-xs text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">{markets.length}</span>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {uniqueTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                  ${activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Market grid */}
          {visibleMarkets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  fixtureId={fixture.id}
                  fixtureName={fixtureName}
                  competitionName={(fixture as any).league?.name}
                  startTime={fixture.startTime}
                  disabled={isFinished || isLive}
                />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No markets in this category.
            </div>
          )}
        </div>
      ) : (
        <div className="py-14 text-center border border-dashed border-border rounded-xl">
          <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No markets available for this fixture.</p>
        </div>
      )}
    </div>
  );
}
