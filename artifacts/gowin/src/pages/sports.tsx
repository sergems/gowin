import { useListSports, useListLeagues, useListFixtures } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useRoute } from "wouter";
import { Trophy, CalendarDays } from "lucide-react";
import { format } from "date-fns";

export default function SportsHub() {
  const [match, params] = useRoute("/sports/:sportId");
  const sportId = match && params.sportId ? parseInt(params.sportId) : undefined;

  const { data: sportsData } = useListSports();
  const { data: leaguesData } = useListLeagues(sportId ? { sportId } : undefined);
  const { data: fixturesData, isLoading: isLoadingFixtures } = useListFixtures({
    sportId,
  });

  const sports = sportsData || [];
  const leagues = leaguesData || [];
  const fixtures = fixturesData?.fixtures || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Sports</h1>
        <p className="text-muted-foreground">Browse all available sports and leagues</p>
      </div>

      {/* Sports Navigation */}
      <div className="flex flex-wrap gap-2">
        <Link href="/sports">
          <div className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${!sportId ? 'bg-primary text-primary-foreground' : 'bg-accent/50 hover:bg-accent'}`}>
            All Sports
          </div>
        </Link>
        {sports.map(sport => (
          <Link key={sport.id} href={`/sports/${sport.id}`}>
            <div className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${sportId === sport.id ? 'bg-primary text-primary-foreground' : 'bg-accent/50 hover:bg-accent flex items-center'}`}>
              {sport.name}
            </div>
          </Link>
        ))}
      </div>

      {/* Leagues Navigation (if sport is selected) */}
      {sportId && leagues.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {leagues.map(league => (
            <div key={league.id} className="px-3 py-1.5 rounded-md bg-accent/30 text-xs font-medium border border-border">
              {league.name}
            </div>
          ))}
        </div>
      )}

      {/* Fixtures List */}
      <div>
        <h2 className="text-xl font-bold mb-4">Available Fixtures</h2>
        {isLoadingFixtures ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-32 bg-accent/50 rounded-xl animate-pulse" />
            <div className="h-32 bg-accent/50 rounded-xl animate-pulse" />
          </div>
        ) : fixtures.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No fixtures found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fixtures.map(fixture => (
              <Link key={fixture.id} href={`/fixtures/${fixture.id}`}>
                <Card className="hover:bg-accent/40 transition-colors border-border bg-card cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center text-xs font-medium text-muted-foreground bg-background/50 px-2 py-1 rounded">
                        <Trophy className="w-3 h-3 mr-1" />
                        {fixture.league?.name || "League"}
                      </div>
                      <div className="flex items-center text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        {fixture.status === 'live' ? (
                          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-1.5" /> LIVE</span>
                        ) : (
                          <span className="flex items-center text-muted-foreground"><CalendarDays className="w-3 h-3 mr-1" /> {format(new Date(fixture.startTime), "MMM d, HH:mm")}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-center">
                        <div className="font-bold text-lg">{fixture.homeTeam?.name}</div>
                      </div>
                      
                      <div className="px-6 flex flex-col items-center justify-center">
                        {fixture.status === 'live' || fixture.status === 'finished' ? (
                          <div className="flex items-center gap-3 text-2xl font-black">
                            <span>{fixture.scoreHome ?? '-'}</span>
                            <span className="text-muted-foreground text-sm">:</span>
                            <span>{fixture.scoreAway ?? '-'}</span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-muted-foreground text-xs font-bold">
                            VS
                          </div>
                        )}
                      </div>

                      <div className="flex-1 text-center">
                        <div className="font-bold text-lg">{fixture.awayTeam?.name}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
