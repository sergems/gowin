import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import {
  BarChart3, Building2, Users, TrendingUp, DollarSign,
  AlertCircle, ChevronDown, Activity, Ticket, Trophy,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface Branch {
  id: number;
  name: string;
  code: string;
  city: string;
  country: string;
  status: "active" | "suspended";
  balance: number;
}

interface PerformanceData {
  branch: Branch;
  kpis: {
    totalAgents: number;
    activeAgents: number;
    totalBets: number;
    totalStake: number;
    dailyRevenue: number;
    dailyBets: number;
    monthlyRevenue: number;
    monthlyBets: number;
    pendingPayouts: number;
    wonBets: number;
    voucherSales: number;
    voucherSalesValue: number;
  };
  dailySales: { date: string; bets: number; revenue: number }[];
  agentPerformance: {
    agentId: number;
    agentName: string;
    username: string;
    disabled: boolean;
    betsPlaced: number;
    totalStake: number;
    vouchersSold: number;
    commissionRate: number;
    commission: number;
  }[];
}

function MiniBarChart({ data }: { data: { date: string; revenue: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  const recent = data.slice(-30);
  return (
    <div className="flex items-end gap-0.5 h-20 w-full">
      {recent.map((d) => {
        const pct = Math.max((d.revenue / max) * 100, d.revenue > 0 ? 4 : 0);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full rounded-sm bg-emerald-500/70 group-hover:bg-emerald-400 transition-colors"
              style={{ height: `${pct}%`, minHeight: d.revenue > 0 ? "3px" : "1px" }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-[9px] text-white px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {format(parseISO(d.date), "MMM d")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BranchPerformancePage() {
  const { formatCurrency, t } = useSiteSettings();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ["admin-branches"],
    queryFn: () => api.get<{ branches: Branch[] }>("/api/admin/branches").then(r => r.data),
  });

  const { data: perf, isLoading: perfLoading, error } = useQuery<PerformanceData>({
    queryKey: ["branch-performance", selectedBranchId],
    queryFn: () => api.get<PerformanceData>(`/api/admin/branches/${selectedBranchId}/performance`).then(r => r.data),
    enabled: selectedBranchId !== null,
  });

  const branches = branchesData?.branches ?? [];

  const kpiCards = perf ? [
    { label: "Total Stake", value: formatCurrency(perf.kpis.totalStake), sub: `${perf.kpis.totalBets} bets`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Today's Revenue", value: formatCurrency(perf.kpis.dailyRevenue), sub: `${perf.kpis.dailyBets} bets today`, icon: TrendingUp, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
    { label: "Monthly Revenue", value: formatCurrency(perf.kpis.monthlyRevenue), sub: `${perf.kpis.monthlyBets} bets this month`, icon: Activity, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    { label: "Pending Payouts", value: formatCurrency(perf.kpis.pendingPayouts), sub: `${perf.kpis.wonBets} winning bets`, icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    { label: "Agents", value: `${perf.kpis.activeAgents} / ${perf.kpis.totalAgents}`, sub: "active / total", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Vouchers Sold", value: String(perf.kpis.voucherSales), sub: formatCurrency(perf.kpis.voucherSalesValue) + " total value", icon: Ticket, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  ] : [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Branch Performance</h1>
          <p className="text-sm text-zinc-400 mt-0.5">View detailed performance metrics for any branch</p>
        </div>
      </div>

      {/* Branch Selector */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Select Branch</label>
        {branchesLoading ? (
          <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
        ) : (
          <div className="relative">
            <select
              value={selectedBranchId ?? ""}
              onChange={e => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 pr-10"
            >
              <option value="">— Choose a branch —</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code}) · {b.city}, {b.country} {b.status === "suspended" ? "⚠ SUSPENDED" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Loading */}
      {perfLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load branch performance data.
        </div>
      )}

      {/* Performance Data */}
      {perf && !perfLoading && (
        <>
          {/* Branch info banner */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4">
            <Building2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-white text-lg">{perf.branch.name}</span>
              <span className="font-mono text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-md tracking-wider">{perf.branch.code}</span>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold tracking-wide border ${perf.branch.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-red-500/15 text-red-400 border-red-500/25"}`}>
                {perf.branch.status.toUpperCase()}
              </span>
              <span className="text-sm text-zinc-500">{perf.branch.city}, {perf.branch.country}</span>
            </div>
            <div className="ml-auto text-right hidden sm:block">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Balance</p>
              <p className="text-lg font-black text-emerald-400">{formatCurrency(perf.branch.balance)}</p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {kpiCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className={`bg-zinc-900 border rounded-2xl px-4 py-4 flex items-start gap-3 ${bg}`}>
                <div className={`w-8 h-8 rounded-lg ${bg} border flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest truncate">{label}</p>
                  <p className={`text-xl font-black ${color} leading-tight mt-0.5`}>{value}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Revenue Chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Daily Revenue — Last 30 Days</h2>
            </div>
            {perf.dailySales.every(d => d.revenue === 0) ? (
              <p className="text-sm text-zinc-500 text-center py-8">No revenue data for the last 30 days.</p>
            ) : (
              <>
                <MiniBarChart data={perf.dailySales} />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-zinc-600">{perf.dailySales[0]?.date ? format(parseISO(perf.dailySales[0].date), "MMM d") : ""}</span>
                  <span className="text-[10px] text-zinc-600">{perf.dailySales[perf.dailySales.length - 1]?.date ? format(parseISO(perf.dailySales[perf.dailySales.length - 1].date), "MMM d") : ""}</span>
                </div>
              </>
            )}
          </div>

          {/* Agent Performance */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-white">Agent Performance</h2>
              <span className="ml-auto text-xs text-zinc-500">{perf.agentPerformance.length} agent{perf.agentPerformance.length !== 1 ? "s" : ""}</span>
            </div>

            {perf.agentPerformance.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">No agents assigned to this branch.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Agent</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest hidden sm:table-cell">Bets</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Turnover</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest hidden md:table-cell">Vouchers</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest hidden lg:table-cell">Commission Rate</th>
                      <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {perf.agentPerformance
                      .slice()
                      .sort((a, b) => b.totalStake - a.totalStake)
                      .map((agent) => (
                        <tr key={agent.agentId} className={`hover:bg-zinc-800/30 transition-colors ${agent.disabled ? "opacity-50" : ""}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                                {agent.agentName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white">{agent.agentName}</p>
                                <p className="text-[10px] text-zinc-500">@{agent.username}</p>
                              </div>
                              {agent.disabled && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 font-semibold">SUSPENDED</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right hidden sm:table-cell">
                            <span className="text-xs text-zinc-300">{agent.betsPlaced}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs font-bold text-white">{formatCurrency(agent.totalStake)}</span>
                          </td>
                          <td className="px-3 py-3 text-right hidden md:table-cell">
                            <span className="text-xs text-zinc-400">{agent.vouchersSold}</span>
                          </td>
                          <td className="px-3 py-3 text-right hidden lg:table-cell">
                            <span className="text-xs text-zinc-400">{agent.commissionRate}%</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-xs font-semibold text-emerald-400">{formatCurrency(agent.commission)}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!selectedBranchId && !branchesLoading && (
        <div className="text-center py-20 text-zinc-600">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a branch above to view its performance</p>
        </div>
      )}
    </div>
  );
}
