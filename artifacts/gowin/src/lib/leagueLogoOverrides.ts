// AllSportsAPI's league_logo for some competitions is out of date (old brand
// crests). Override those specific leagues with a current, locally-hosted crest.
// Keyed by lowercased league name.
const LEAGUE_LOGO_OVERRIDES: Record<string, string> = {
  "premier league": "/league-logos/premier-league.png",
  "championship": "/league-logos/championship.png",
};

export function resolveLeagueLogoUrl(leagueName: string | null | undefined, dbLogo: string | null | undefined): string | null | undefined {
  const key = (leagueName ?? "").toLowerCase().trim();
  return LEAGUE_LOGO_OVERRIDES[key] ?? dbLogo;
}
