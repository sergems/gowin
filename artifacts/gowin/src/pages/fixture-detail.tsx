import { useRoute } from "wouter";
import { useGetFixture } from "@workspace/api-client-react";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, CalendarDays, Activity } from "lucide-react";
import { format } from "date-fns";

export default function FixtureDetail() {
  const [, params] = useRoute("/fixtures/:id");
  const fixtureId = params?.id ? parseInt(params.id) : 0;

  const { data: fixture, isLoading } = useGetFixture(fixtureId, {
    query: {
      enabled: !!fixtureId,
    }
  });

  const { selections, addSelection, removeSelection } = useBetSlip();

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-48 bg-accent/50 rounded-xl" />
      <div className="h-64 bg-accent/50 rounded-xl" />
    </div>;
  }

  if (!fixture) {
    return <div>Fixture not found</div>;
  }

  const isSelected = (oddsId: number) => selections.some(s => s.oddsId === oddsId);

  const toggleSelection = (market: any, odds: any) => {
    if (isSelected(odds.id)) {
      removeSelection(odds.id);
    } else {
      addSelection({
        oddsId: odds.id,
        fixtureId: fixture.id,
        fixtureName: `${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}`,
        market: market.marketType,
        marketName: market.marketType.replace(/_/g, ' '),
        selection: odds.selection,
        odds: odds.oddsValue
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-border bg-card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 pointer-events-none" />
        <CardContent className="p-8 relative">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center text-sm font-medium text-muted-foreground bg-background/80 backdrop-blur px-3 py-1.5 rounded-full border border-border">
              <Trophy className="w-4 h-4 mr-2 text-primary" />
              {fixture.league?.name || "League"}
            </div>
            <div className="flex items-center text-sm font-medium bg-background/80 backdrop-blur px-3 py-1.5 rounded-full border border-border">
              {fixture.status === 'live' ? (
                <span className="flex items-center text-primary"><span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2" /> LIVE MATCH</span>
              ) : fixture.status === 'finished' ? (
                <span className="flex items-center text-muted-foreground">MATCH FINISHED</span>
              ) : (
                <span className="flex items-center text-muted-foreground"><CalendarDays className="w-4 h-4 mr-2" /> {format(new Date(fixture.startTime), "PPP 'at' p")}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex-1 text-center">
              <div className="text-3xl font-black tracking-tight">{fixture.homeTeam?.name}</div>
            </div>
            
            <div className="px-8 flex flex-col items-center justify-center">
              {fixture.status === 'live' || fixture.status === 'finished' ? (
                <div className="flex items-center gap-4 text-5xl font-black">
                  <span>{fixture.scoreHome ?? '-'}</span>
                  <span className="text-muted-foreground/30">:</span>
                  <span>{fixture.scoreAway ?? '-'}</span>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-muted-foreground font-bold border border-border">
                  VS
                </div>
              )}
            </div>

            <div className="flex-1 text-center">
              <div className="text-3xl font-black tracking-tight">{fixture.awayTeam?.name}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Markets */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Betting Markets</h2>
        </div>

        {fixture.markets && fixture.markets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fixture.markets.map(market => (
              <Card key={market.id} className="border-border bg-card">
                <CardHeader className="py-4 border-b border-border/50 bg-accent/10">
                  <CardTitle className="text-base uppercase tracking-wider">{market.marketType.replace(/_/g, ' ')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 gap-2">
                    {market.odds.map(odds => {
                      const selected = isSelected(odds.id);
                      return (
                        <Button
                          key={odds.id}
                          variant={selected ? "default" : "outline"}
                          className={`w-full justify-between h-12 transition-all ${
                            selected ? "border-primary" : "hover:border-primary/50"
                          }`}
                          onClick={() => toggleSelection(market, odds)}
                          disabled={fixture.status === 'finished' || fixture.status === 'cancelled'}
                        >
                          <span className="font-medium">{odds.selection}</span>
                          <span className={`font-bold ${selected ? "text-primary-foreground" : "text-primary"}`}>
                            {odds.oddsValue.toFixed(2)}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No markets available for this fixture yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
