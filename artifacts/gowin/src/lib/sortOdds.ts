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
