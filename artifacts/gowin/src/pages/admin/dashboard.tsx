import { useGetAdminStats, useGetRecentBets, useGetTopFixtures } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Trophy, DollarSign, ListTodo, Building2, Target } from "lucide-react";
import { format } from "date-fns";
import { fmtUTCDateTimeAdmin } from "@/lib/formatUTC";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

export default function AdminDashboard() {
  const { formatCurrency, t } = useSiteSettings();
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-accent/50 rounded-xl animate-pulse" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Users",     value: (stats as any).totalUsers,           icon: Users,      color: "bg-primary/20 text-primary" },
            { label: "Branches",        value: (stats as any).totalBranches,        icon: Building2,  color: "bg-emerald-500/20 text-emerald-400" },
            { label: "Branch Admins",   value: (stats as any).totalBranchAdmins,    icon: Users,      color: "bg-blue-500/20 text-blue-400" },
            { label: "Agents",          value: (stats as any).totalAgents,          icon: Target,     color: "bg-violet-500/20 text-violet-400" },
            { label: t("dashboard.total_turnover"),  value: formatCurrency((stats as any).totalTurnover),  icon: DollarSign, color: "bg-primary/20 text-primary" },
            { label: "Active Fixtures", value: (stats as any).totalActiveFixtures,  icon: Activity,   color: "bg-orange-500/20 text-orange-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1 truncate">{label}</p>
                    <h3 className="text-2xl font-black">{value}</h3>
                  </div>
                  <div className={`p-2 rounded-md shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                      <div className="font-bold">{formatCurrency(bet.stake)}</div>
                      <div className="text-xs text-muted-foreground">Win: {formatCurrency(bet.potentialWin)}</div>
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
                        <span>{fmtUTCDateTimeAdmin(item.fixture.startTime)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{formatCurrency(item.totalStake)}</div>
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
