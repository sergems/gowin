const SELECTION_ORDER: Record<string, string[]> = {
  "1X2": ["Home", "Draw", "Away"],
  "1UP": ["Home 1UP", "Away 1UP"],
  "2UP": ["Home 2UP", "Away 2UP"],
  "Double Chance": ["1X", "12", "X2"],
  "Both Teams To Score": ["Yes", "No"],
  "Draw No Bet": ["Home", "Away"],
  "Half-Time Result": ["Home", "Draw", "Away"],
  "European Handicap": ["Home", "Draw", "Away"],
  "Home Win Either Half": ["Yes", "No"],
  "Away Win Either Half": ["Yes", "No"],
};

// Markets where the "hot" flame indicator makes sense (main match-result market
// per sport) — picking a side in a 3-way draw-inclusive market is a stronger
// signal than e.g. an Over/Under line, so we only flag the outright favorite here.
const HOT_MARKET_TYPES = new Set(["1X2", "Moneyline", "Match Winner"]);

/** Odds below this are considered a clear enough favorite to deserve a flame. */
const HOT_ODDS_THRESHOLD = 2.0;

/**
 * Returns true when `odd` is the standout favorite (lowest odds, with no tie)
 * in its market, and that market is one where "likely to win" is meaningful.
 */
export function isHotFavorite<T extends { selection: string; oddsValue: number }>(
  odd: T,
  marketOdds: T[],
  marketType: string,
): boolean {
  if (!HOT_MARKET_TYPES.has(marketType)) return false;

  // Only finite, positive odds can meaningfully be compared — malformed/missing
  // values (NaN, 0, negative) must never be treated as the strongest favorite.
  const valid = marketOdds.filter((o) => Number.isFinite(o.oddsValue) && o.oddsValue > 0);
  if (valid.length < 2) return false;
  if (!Number.isFinite(odd.oddsValue) || odd.oddsValue <= 0) return false;

  const sorted = [...valid].sort((a, b) => a.oddsValue - b.oddsValue);
  const lowest = sorted[0];
  const secondLowest = sorted[1];
  if (!lowest || lowest.oddsValue >= HOT_ODDS_THRESHOLD) return false;
  if (secondLowest && secondLowest.oddsValue === lowest.oddsValue) return false; // no clear favorite

  return odd === lowest || (odd.selection === lowest.selection && odd.oddsValue === lowest.oddsValue);
}

const SHORT_1X2_LABELS: Record<string, string> = {
  Home: "1",
  Draw: "X",
  Away: "2",
};

/**
 * Compact selection label for tight 3-way odds buttons (mirrors the classic
 * "1 / X / 2" convention). Falls back to the full selection name for any
 * market/selection outside the plain Home/Draw/Away trio.
 */
export function shortSelectionLabel(selection: string, marketType: string): string {
  if (marketType !== "1X2") return selection;
  return SHORT_1X2_LABELS[selection] ?? selection;
}

export function sortOdds<T extends { selection: string }>(
  odds: T[],
  marketType: string,
): T[] {
  const order = SELECTION_ORDER[marketType];
  if (!order) {
    if (
      marketType.startsWith("Over/Under") ||
      marketType.startsWith("HT Total")
    ) {
      return [...odds].sort((a, b) => {
        const aOver = a.selection.startsWith("Over");
        const bOver = b.selection.startsWith("Over");
        return aOver === bOver ? 0 : aOver ? -1 : 1;
      });
    }
    if (marketType.startsWith("Asian Handicap")) {
      return [...odds].sort((a, b) => {
        const aHome = a.selection.toLowerCase().startsWith("home");
        const bHome = b.selection.toLowerCase().startsWith("home");
        return aHome === bHome ? 0 : aHome ? -1 : 1;
      });
    }
    if (marketType === "Half-Time/Full-Time") {
      const HT_FT_ORDER = [
        "Home/Home", "Home/Draw", "Home/Away",
        "Draw/Home", "Draw/Draw", "Draw/Away",
        "Away/Home", "Away/Draw", "Away/Away",
      ];
      return [...odds].sort(
        (a, b) => (HT_FT_ORDER.indexOf(a.selection) ?? 99) - (HT_FT_ORDER.indexOf(b.selection) ?? 99),
      );
    }
    return odds;
  }
  return [...odds].sort(
    (a, b) => (order.indexOf(a.selection) ?? 99) - (order.indexOf(b.selection) ?? 99),
  );
}
