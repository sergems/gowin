import { useState, useEffect } from "react";
import { useRoute, useSearch, useLocation } from "wouter";
import { useGetFixture, getGetFixtureQueryKey } from "@workspace/api-client-react";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { sortOdds, isHotFavorite, shortSelectionLabel } from "@/lib/sortOdds";
import { Trophy, CalendarDays, Activity, ChevronLeft, Globe, Shield, Flame } from "lucide-react";
import { fmtUTCDateTimeLong } from "@/lib/formatUTC";

// ── Country flag helpers (mirrors sports.tsx) ─────────────────────────────────

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
  "congo dr":"cd","democratic republic of congo":"cd","dr congo":"cd",
};

function countryFlagUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  const iso2 = COUNTRY_ISO2[name.toLowerCase().trim()];
  return iso2 ? `https://flagcdn.com/20x15/${iso2}.png` : null;
}

function TeamLogo({
  logo, name, countryName, size = 64,
}: {
  logo?: string | null; name?: string | null; countryName?: string | null; size?: number;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [flagFailed, setFlagFailed] = useState(false);

  // Reset failed states if the source URLs change (e.g. component re-used with different team)
  useEffect(() => { setLogoFailed(false); }, [logo]);
  useEffect(() => { setFlagFailed(false); }, [countryName]);

  const flagUrl = countryFlagUrl(countryName);

  if (logo && !logoFailed) {
    return (
      <img
        src={logo}
        alt={name ?? ""}
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
        onError={() => setLogoFailed(true)}
      />
    );
  }
  if (flagUrl && !flagFailed) {
    return (
      <img
        src={flagUrl}
        alt={countryName ?? ""}
        width={size}
        height={Math.round(size * 0.75)}
        className="object-cover rounded"
        style={{ width: size, height: Math.round(size * 0.75) }}
        onError={() => setFlagFailed(true)}
      />
    );
  }
  return <Shield className="text-muted-foreground/40" style={{ width: size, height: size }} />;
}

// ── Market category definitions ───────────────────────────────────────────────

const CATEGORIES: { label: string; types?: string[]; prefix?: string }[] = [
  {
    label: "Popular",
    types: [
      "1X2",
      "1UP",
      "2UP",
      "Both Teams To Score",
      "Over/Under 2.5",
      "Over/Under 1.5",
      "Double Chance",
      "Draw No Bet",
    ],
  },
  {
    label: "Match",
    types: [
      "1X2",
      "1UP",
      "2UP",
      "Double Chance",
      "Draw No Bet",
      "Both Teams To Score",
      "European Handicap",
      "Home Win Either Half",
      "Away Win Either Half",
    ],
  },
  {
    label: "Goals",
    types: [
      "Over/Under 0.5",
      "Over/Under 1",
      "Over/Under 1.5",
      "Over/Under 2",
      "Over/Under 2.5",
      "Over/Under 3",
      "Over/Under 3.5",
      "Over/Under 4",
      "Over/Under 4.5",
      "Over/Under 5",
      "Over/Under 5.5",
      "Both Teams To Score",
    ],
  },
  {
    label: "Half Time",
    types: [
      "Half-Time Result",
      "Half-Time/Full-Time",
      "HT Total Goals 0.5",
      "HT Total Goals 1.5",
      "HT Total Goals 2.5",
    ],
  },
  {
    label: "Handicap",
    prefix: "Asian Handicap",
  },
  {
    label: "Corners",
    prefix: "Over/Under Corners",
  },
  {
    label: "Cards",
    types: ["Over/Under Yellow Cards"],
  },
  {
    label: "Correct Score",
    types: ["Correct Score"],
  },
];

// ── Odds button ────────────────────────────────────────────────────────────────

function OddsButton({
  oddsId, fixtureId, market, selection, oddsValue, fixtureName, competitionName, startTime, disabled, hot,
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
  hot?: boolean;
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
      className={`flex items-center justify-between gap-1.5 px-2.5 py-3 rounded-lg border text-sm font-medium transition-all w-full min-w-0
        ${disabled ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
          : selected
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "bg-background border-border hover:border-primary hover:text-primary text-foreground"
        }`}
    >
      <span className="text-left truncate min-w-0">{shortSelectionLabel(selection, market)}</span>
      <span className={`font-bold shrink-0 flex items-center gap-0.5 ${selected ? "text-primary-foreground" : "text-primary"}`}>
        {hot && <Flame className={`w-3 h-3 shrink-0 ${selected ? "text-primary-foreground" : "text-orange-500"}`} />}
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
  const count = odds.length;

  // Choose grid layout based on number of selections
  let gridClass = "space-y-2";
  if (count === 2) gridClass = "grid grid-cols-2 gap-2";
  else if (count === 3) gridClass = "grid grid-cols-3 gap-2";
  else if (count >= 4 && count <= 6) gridClass = "grid grid-cols-3 gap-2";
  else if (count > 6) gridClass = "grid grid-cols-3 gap-2";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/50 bg-accent/20">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {market.marketType}
        </p>
      </div>
      <div className={`p-3 ${gridClass}`}>
        {odds.map((odd: any) => {
          const oddsValue = parseFloat(odd.oddsValue ?? odd.odds_value ?? odd.oddsvalue ?? "0");
          const normalizedOdds = odds.map((o: any) => ({
            ...o,
            oddsValue: parseFloat(o.oddsValue ?? o.odds_value ?? o.oddsvalue ?? "0"),
          }));
          return (
            <OddsButton
              key={odd.id}
              oddsId={odd.id}
              fixtureId={fixtureId}
              market={market.marketType}
              selection={odd.selection}
              oddsValue={oddsValue}
              fixtureName={fixtureName}
              competitionName={competitionName}
              startTime={startTime}
              disabled={disabled}
              hot={isHotFavorite({ ...odd, oddsValue }, normalizedOdds, market.marketType)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FixtureDetail() {
  const [, params] = useRoute("/fixtures/:id");
  const fixtureId = params?.id ? parseInt(params.id) : 0;
  const [activeTab, setActiveTab] = useState("Popular");
  const rawSearch = useSearch();
  const [, navigate] = useLocation();
  const fromParam = new URLSearchParams(rawSearch).get("from");
  const handleBack = () => {
    if (fromParam) {
      navigate(fromParam);
    } else {
      window.history.back();
    }
  };

  const { data: fixture, isLoading } = useGetFixture(fixtureId, {
    query: {
      enabled: !!fixtureId,
      queryKey: getGetFixtureQueryKey(fixtureId),
      // Keeps 1UP/2UP (and other) odds in sync with admin config changes
      refetchInterval: 20 * 1000,
    },
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

  // Only include markets that actually have odds
  const marketsWithOdds = markets.filter((m) => (m.odds ?? []).length > 0);
  const marketsByType = new Map<string, any>();
  for (const m of marketsWithOdds) marketsByType.set(m.marketType, m);

  // Split 1X2 market into core (Home/Draw/Away) + virtual 1UP and 2UP markets
  const _UP_SELS = new Set(["Home 1UP", "Home 2UP", "Away 1UP", "Away 2UP"]);
  const _raw1X2 = marketsByType.get("1X2");
  if (_raw1X2) {
    const _coreOdds = (_raw1X2.odds ?? []).filter((o: any) => !_UP_SELS.has(o.selection));
    const _oneUpOdds = (_raw1X2.odds ?? []).filter((o: any) => o.selection === "Home 1UP" || o.selection === "Away 1UP");
    const _twoUpOdds = (_raw1X2.odds ?? []).filter((o: any) => o.selection === "Home 2UP" || o.selection === "Away 2UP");
    const _core1X2 = { ..._raw1X2, odds: _coreOdds };
    marketsByType.set("1X2", _core1X2);
    const _idx = marketsWithOdds.findIndex((m: any) => m.marketType === "1X2");
    if (_idx !== -1) marketsWithOdds[_idx] = _core1X2;
    if (_oneUpOdds.length > 0) {
      const _mkt1UP = { ..._raw1X2, id: String(_raw1X2.id) + "_1up", marketType: "1UP", odds: _oneUpOdds };
      marketsByType.set("1UP", _mkt1UP);
      marketsWithOdds.push(_mkt1UP);
    }
    if (_twoUpOdds.length > 0) {
      const _mkt2UP = { ..._raw1X2, id: String(_raw1X2.id) + "_2up", marketType: "2UP", odds: _twoUpOdds };
      marketsByType.set("2UP", _mkt2UP);
      marketsWithOdds.push(_mkt2UP);
    }
  }

  function getMarketsForCategory(cat: (typeof CATEGORIES)[number]): any[] {
    if (cat.prefix) return marketsWithOdds.filter((m) => m.marketType.startsWith(cat.prefix!));
    if (cat.types) {
      return cat.types
        .map((t) => marketsByType.get(t))
        .filter(Boolean)
        .filter((m, i, arr) => arr.findIndex((x: any) => x.id === m.id) === i);
    }
    return [];
  }

  // Build visible tabs — only include categories that have at least 1 market with odds
  const availableCategories = CATEGORIES.filter((cat) => getMarketsForCategory(cat).length > 0);
  const tabLabels = ["Popular", ...availableCategories.filter((c) => c.label !== "Popular").map((c) => c.label), "All"];
  const uniqueTabs = [...new Set(tabLabels)].filter((tab) => {
    if (tab === "All") return marketsWithOdds.length > 0;
    if (tab === "Popular") return getMarketsForCategory(CATEGORIES[0]).length > 0;
    return availableCategories.some((c) => c.label === tab);
  });

  function getMarketsForTab(tab: string): any[] {
    if (tab === "All") return marketsWithOdds;
    const cat = CATEGORIES.find((c) => c.label === tab);
    if (!cat) return [];
    return getMarketsForCategory(cat);
  }

  const visibleMarkets = getMarketsForTab(activeTab);

  // Ensure active tab is valid
  const resolvedTab = uniqueTabs.includes(activeTab) ? activeTab : (uniqueTabs[0] ?? "All");

  return (
    <div className="space-y-5 pb-8">
      {/* Back link */}
      <button onClick={handleBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
                  {fmtUTCDateTimeLong(fixture.displayTime ?? fixture.startTime)}
                </span>
              )}
            </div>
          </div>

          {/* Teams + score */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex flex-col items-center gap-3 text-center min-w-0">
              <TeamLogo
                logo={fixture.homeTeam?.logo}
                name={fixture.homeTeam?.name}
                countryName={fixture.league?.countryName}
                size={64}
              />
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
              <TeamLogo
                logo={fixture.awayTeam?.logo}
                name={fixture.awayTeam?.name}
                countryName={fixture.league?.countryName}
                size={64}
              />
              <p className="text-base md:text-2xl font-black leading-tight break-words w-full">{fixture.awayTeam?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Markets section */}
      {marketsWithOdds.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-lg">Betting Markets</h2>
            <span className="text-xs text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">{marketsWithOdds.length}</span>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {uniqueTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                  ${resolvedTab === tab
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
                  startTime={fixture.displayTime ?? fixture.startTime}
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
