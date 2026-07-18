import { useGetAdminStats, useGetRecentBets } from "@workspace/api-client-react";
import { Users, Activity, DollarSign, Building2, Target, ShieldCheck, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const STATUS_STYLE: Record<string, string> = {
  pending:    "bg-amber-500/15 text-amber-400 border-amber-500/25",
  won:        "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  lost:       "bg-red-500/15 text-red-400 border-red-500/25",
  cashed_out: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  cancelled:  "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

export default function AdminDashboard() {
  const { formatCurrency, t } = useSiteSettings();
  const { data: stats, isLoading: isStatsLoading } = useGetAdminStats();
  const { data: recentBets, isLoading: isBetsLoading } = useGetRecentBets();

  const statCards = stats ? [
    {
      label: t("dashboard.total_users"),
      value: (stats as any).totalUsers,
      icon: Users,
      accent: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      label: t("dashboard.branches"),
      value: (stats as any).totalBranches,
      icon: Building2,
      accent: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: t("dashboard.branch_admins"),
      value: (stats as any).totalBranchAdmins,
      icon: ShieldCheck,
      accent: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: t("dashboard.agents"),
      value: (stats as any).totalAgents,
      icon: Target,
      accent: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
    },
    {
      label: t("dashboard.total_turnover"),
      value: formatCurrency((stats as any).totalTurnover),
      icon: TrendingUp,
      accent: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
      wide: true,
    },
    {
      label: t("dashboard.active_fixtures"),
      value: (stats as any).totalActiveFixtures,
      icon: Activity,
      accent: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{t("admin.dashboard.title")}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t("admin.dashboard.desc")}</p>
      </div>

      {/* Stat cards */}
      {isStatsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-zinc-800/60 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ label, value, icon: Icon, accent, bg, border }) => (
            <div key={label} className={`bg-zinc-900 border ${border} rounded-2xl p-4 flex flex-col gap-3`}>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${accent}`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-0.5 truncate">{label}</p>
                <p className={`text-xl font-black leading-none ${accent}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Bets table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-white">{t("dashboard.recent_bets")}</h2>
        </div>

        {isBetsLoading ? (
          <div className="p-5 space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-zinc-800/60 rounded-lg animate-pulse" />)}
          </div>
        ) : !recentBets?.length ? (
          <div className="py-12 text-center text-sm text-zinc-500">{t("dashboard.no_recent_bets")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">User</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest hidden md:table-cell">Email</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest hidden sm:table-cell">Date</th>
                  <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Stake</th>
                  <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest hidden lg:table-cell">To Win</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {recentBets.map((bet: any) => (
                  <tr key={bet.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-2.5">
                      <span className="font-semibold text-white text-xs">{bet.user?.username || `#${bet.userId}`}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="text-xs text-zinc-500 truncate max-w-[160px] block">{bet.user?.email || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-wide uppercase ${STATUS_STYLE[bet.status] ?? STATUS_STYLE.cancelled}`}>
                        {bet.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <span className="text-xs text-zinc-500">{format(new Date(bet.createdAt), "MMM d, HH:mm")}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="text-xs font-bold text-white">{formatCurrency(bet.stake)}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right hidden lg:table-cell">
                      <span className="text-xs text-zinc-400">{formatCurrency(bet.potentialWin)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
