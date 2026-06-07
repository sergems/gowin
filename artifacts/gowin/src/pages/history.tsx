import { useState } from "react";
import { useGetMyBets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function History() {
  const [activeTab, setActiveTab] = useState<"pending" | "won" | "lost" | "void">("pending");

  const { data: betsData, isLoading } = useGetMyBets({
    query: {
      queryKey: ["myBets", activeTab]
    }
  });

  const bets = betsData?.bets?.filter(b => b.status === activeTab) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">My Bets</h1>
        <p className="text-muted-foreground">View your bet history and track pending wagers</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="won">Won</TabsTrigger>
          <TabsTrigger value="lost">Lost</TabsTrigger>
          <TabsTrigger value="void">Void</TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-32 bg-accent/50 rounded-xl animate-pulse" />
              <div className="h-32 bg-accent/50 rounded-xl animate-pulse" />
            </div>
          ) : bets.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">No {activeTab} bets found.</p>
            </div>
          ) : (
            bets.map((bet: any) => (
              <Card key={bet.id} className="border-border bg-card">
                <CardHeader className="py-4 border-b border-border/50 bg-accent/10 flex flex-row items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{format(new Date(bet.createdAt), "PPP p")}</span>
                    <span className="text-sm font-medium mt-1">Bet ID: #{bet.id}</span>
                  </div>
                  <Badge variant={
                    bet.status === "won" ? "default" :
                    bet.status === "lost" ? "destructive" :
                    bet.status === "pending" ? "secondary" : "outline"
                  } className={bet.status === "won" ? "bg-primary text-primary-foreground" : ""}>
                    {bet.status.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {bet.selections?.map((sel: any) => (
                      <div key={sel.id} className="p-4 flex justify-between items-center hover:bg-accent/20">
                        <div>
                          <div className="font-medium">{sel.selection}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {sel.fixture?.homeTeam?.name} vs {sel.fixture?.awayTeam?.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{sel.market.replace(/_/g, ' ')}</div>
                        </div>
                        <div className="font-bold text-primary">{sel.odds.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-border bg-accent/5 flex justify-between items-center">
                    <div className="flex gap-6">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Stake</div>
                        <div className="font-bold">${bet.stake.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Total Odds</div>
                        <div className="font-bold">{bet.totalOdds.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Potential Win</div>
                      <div className={`font-black text-lg ${bet.status === 'won' ? 'text-primary' : ''}`}>
                        ${bet.potentialWin.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </Tabs>
    </div>
  );
}
