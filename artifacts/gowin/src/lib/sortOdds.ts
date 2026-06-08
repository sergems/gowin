const SELECTION_ORDER: Record<string, string[]> = {
  "1X2": ["Home", "Draw", "Away"],
  "Double Chance": ["1X", "12", "X2"],
  "Both Teams To Score": ["Yes", "No"],
  "Draw No Bet": ["Home", "Away"],
};

export function sortOdds<T extends { selection: string }>(
  odds: T[],
  marketType: string,
): T[] {
  const order = SELECTION_ORDER[marketType];
  if (!order) {
    if (marketType.startsWith("Over/Under") || marketType.startsWith("HT Total")) {
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
    return odds;
  }
  return [...odds].sort(
    (a, b) => (order.indexOf(a.selection) ?? 99) - (order.indexOf(b.selection) ?? 99),
  );
}
