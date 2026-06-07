import { useListFixtures } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Trophy, Clock, CalendarDays } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const { data, isLoading } = useListFixtures({
    query: {
      queryKey: ["fixtures", "upcoming"],
    }
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-accent/50 rounded-xl" />
      <div className="h-32 bg-accent/50 rounded-xl" />
      <div className="h-32 bg-accent/50 rounded-xl" />
    </div>;
  }

  const fixtures = data?.fixtures || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Featured Matches</h1>
        <p className="text-muted-foreground">Top upcoming events across all sports</p>
      </div>

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
        {fixtures.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No fixtures available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
