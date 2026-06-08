import { useGetAdminStats, useGetRecentBets, useGetTopFixtures } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Trophy, DollarSign, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { data: stats, isLoading: isStatsLoading } = useGetAdminStats();
  const { data: recentBets, isLoading: isBetsLoading } = useGetRecentBets();
  const { data: topFixtures, isLoading: isFixturesLoading } = useGetTopFixtures();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and statistics</p>
      </div>

      {isStatsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-accent/50 rounded-xl animate-pulse" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Users</p>
                  <h3 className="text-3xl font-black">{stats.totalUsers}</h3>
                </div>
                <div className="p-2 bg-primary/20 rounded-md">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Turnover</p>
                  <h3 className="text-3xl font-black">${stats.totalTurnover.toFixed(2)}</h3>
                </div>
                <div className="p-2 bg-primary/20 rounded-md">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Payout</p>
                  <h3 className="text-3xl font-black">${stats.totalPayout.toFixed(2)}</h3>
                </div>
                <div className="p-2 bg-destructive/20 rounded-md">
                  <DollarSign className="w-5 h-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Active Fixtures</p>
                  <h3 className="text-3xl font-black">{stats.totalActiveFixtures}</h3>
                </div>
                <div className="p-2 bg-primary/20 rounded-md">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border bg-card flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              <CardTitle>Recent Bets</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {isBetsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-accent/50 rounded-lg animate-pulse" />)}
              </div>
            ) : recentBets?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No recent bets</div>
            ) : (
              <div className="space-y-3">
                {recentBets?.map((bet: any) => (
                  <div key={bet.id} className="flex justify-between items-center p-3 rounded-md bg-accent/20 border border-border/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{bet.user?.username || `User #${bet.userId}`}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{bet.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(bet.createdAt), "MMM d, HH:mm")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${bet.stake.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Win: ${bet.potentialWin.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <CardTitle>Top Fixtures (By Volume)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {isFixturesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-accent/50 rounded-lg animate-pulse" />)}
              </div>
            ) : topFixtures?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No top fixtures</div>
            ) : (
              <div className="space-y-3">
                {topFixtures?.map((item: any) => (
                  <div key={item.fixture.id} className="flex justify-between items-center p-3 rounded-md bg-accent/20 border border-border/50">
                    <div>
                      <div className="font-medium">
                        {item.fixture.homeTeam?.name} vs {item.fixture.awayTeam?.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                        <span className="uppercase text-[10px] bg-background px-1.5 py-0.5 rounded">{item.fixture.status}</span>
                        <span>{format(new Date(item.fixture.startTime), "MMM d, HH:mm")}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">${item.totalStake.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{item.totalBets} bets</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
