import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Activity, Wifi, Database, Clock, TrendingUp, Users } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

interface ApiMonitorStats {
  hits: number;
  misses: number;
  hitRate: number;
  apiRequestsToday: number;
  apiRequestsThisMonth: number;
  lastFixtureSync: string | null;
  lastOddsSync: string | null;
  lastStatsSync: string | null;
  lastResultsSync: string | null;
  lastError: string | null;
  lastErrorTime: number | null;
  failCount: number;
  wsConnections: number;
  todayKey: string;
}

const DAILY_LIMIT = 5000;

function formatTime(iso: string | null, neverLabel: string): string {
  if (!iso) return neverLabel;
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return d.toLocaleTimeString();
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
  warn,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <Card className={warn ? "border-yellow-400/40" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={["text-2xl font-bold mt-1 tabular-nums", accent ? "text-primary" : warn ? "text-yellow-400" : ""].join(" ")}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={["p-2 rounded-md", warn ? "bg-yellow-400/10" : "bg-muted/40"].join(" ")}>
            <Icon className={["w-4 h-4", warn ? "text-yellow-400" : "text-muted-foreground"].join(" ")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApiMonitorPage() {
  const { t } = useSiteSettings();
  const [token] = useState(() => localStorage.getItem("gowin_token") ?? "");

  const { data: stats, isLoading, error } = useQuery<ApiMonitorStats>({
    queryKey: ["api-monitor"],
    queryFn: async () => {
      const res = await fetch("/api/admin/api-monitor", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load monitor data");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const approachingLimit = stats ? stats.apiRequestsToday >= DAILY_LIMIT * 0.8 : false;
  const usagePct = stats ? Math.min(100, Math.round((stats.apiRequestsToday / DAILY_LIMIT) * 100)) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.monitor.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.monitor.desc")}</p>
        </div>
        <Badge variant="outline" className="text-xs">{t("admin.monitor.auto_refresh")}</Badge>
      </div>

      {/* Warning banner */}
      {approachingLimit && (
        <div className="flex items-center gap-3 rounded-md border border-yellow-400/30 bg-yellow-400/10 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">{t("admin.monitor.limit_warning")}</p>
            <p className="text-xs text-yellow-400/80">
              {stats?.apiRequestsToday.toLocaleString()} / {DAILY_LIMIT.toLocaleString()} ({usagePct}%). {t("admin.monitor.consider_reducing")}
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {stats?.lastError && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">{t("admin.monitor.error_title")}</p>
            <p className="text-xs text-destructive/80">{stats.lastError}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("admin.monitor.fail_count")}: {stats.failCount} — {t("admin.monitor.last")}:{" "}
              {stats.lastErrorTime ? new Date(stats.lastErrorTime).toLocaleTimeString() : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : error ? (
        <div className="text-center py-10 text-muted-foreground">{t("admin.monitor.failed_load")}</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title={t("admin.monitor.requests_today")}
              value={stats.apiRequestsToday.toLocaleString()}
              sub={`${t("admin.monitor.limit")}: ${DAILY_LIMIT.toLocaleString()}`}
              icon={TrendingUp}
              warn={approachingLimit} />
            <StatCard
              title={t("admin.monitor.requests_month")}
              value={stats.apiRequestsThisMonth.toLocaleString()}
              icon={Activity} />
            <StatCard
              title={t("admin.monitor.cache_hit")}
              value={`${stats.hitRate}%`}
              sub={`${stats.hits} ${t("admin.monitor.hits")} / ${stats.misses} ${t("admin.monitor.misses")}`}
              icon={Database}
              accent={stats.hitRate >= 70} />
            <StatCard
              title={t("admin.monitor.ws_users")}
              value={stats.wsConnections}
              sub={t("admin.monitor.connected")}
              icon={Users}
              accent={stats.wsConnections > 0} />
          </div>

          {/* Daily usage bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.monitor.daily_usage")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.apiRequestsToday.toLocaleString()} {t("admin.monitor.used")}</span>
                  <span>{DAILY_LIMIT.toLocaleString()} {t("admin.monitor.limit").toLowerCase()}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={["h-full rounded-full transition-all", usagePct >= 80 ? "bg-yellow-400" : "bg-primary"].join(" ")}
                    style={{ width: `${usagePct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{usagePct}{t("admin.monitor.pct_of_limit")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Sync timestamps */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t("admin.monitor.sync_workers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/50">
                {[
                  { labelKey: "admin.monitor.live_fixtures", subKey: "admin.monitor.every_15s", ts: stats.lastFixtureSync, icon: Activity },
                  { labelKey: "admin.monitor.live_odds", subKey: "admin.monitor.every_10s", ts: stats.lastOddsSync, icon: Database },
                  { labelKey: "admin.monitor.match_stats", subKey: "admin.monitor.every_30s", ts: stats.lastStatsSync, icon: TrendingUp },
                  { labelKey: "admin.monitor.settled_results", subKey: "admin.monitor.every_60s", ts: stats.lastResultsSync, icon: Clock },
                ].map(({ labelKey, subKey, ts, icon: Icon }) => (
                  <div key={labelKey} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-muted/40">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t(labelKey as any)}</p>
                        <p className="text-xs text-muted-foreground">{t(subKey as any)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={["w-2 h-2 rounded-full", ts ? "bg-green-400" : "bg-muted-foreground/30"].join(" ")} />
                      <span className="text-xs text-muted-foreground tabular-nums">{formatTime(ts, t("admin.monitor.never"))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* WS section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                {t("admin.monitor.ws_server")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={["w-3 h-3 rounded-full", stats.wsConnections > 0 ? "bg-green-400 animate-pulse" : "bg-muted-foreground/30"].join(" ")} />
                <div>
                  <p className="text-sm">
                    {stats.wsConnections > 0
                      ? `${stats.wsConnections} client${stats.wsConnections === 1 ? "" : "s"} receiving live updates`
                      : t("admin.monitor.ws_no_clients")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("admin.monitor.ws_broadcasting")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
