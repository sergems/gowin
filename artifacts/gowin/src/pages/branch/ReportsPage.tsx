import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";

export default function BranchReportsPage() {
  interface DailySale { date: string; bets: number; revenue: number; }
  interface AgentPerf { agentId: number; agentName: string; betsPlaced: number; totalStake: number; vouchersSold: number; commission: number; }
  interface BranchReports { dailySales: DailySale[]; agentPerformance: AgentPerf[]; }

  const { data, isLoading } = useQuery({
    queryKey: ["branch-reports"],
    queryFn: () => api.get<BranchReports>("/api/branch/reports").then((r) => r.data),
  });

  if (isLoading) return <div className="p-6 text-zinc-400">Loading reports...</div>;

  const dailySales: DailySale[] = data?.dailySales ?? [];
  const agentPerformance: AgentPerf[] = data?.agentPerformance ?? [];

  const totalRevenue = dailySales.reduce((s, d) => s + d.revenue, 0);
  const totalBets = dailySales.reduce((s, d) => s + d.bets, 0);
  const maxRevenue = Math.max(...dailySales.map((d) => d.revenue), 1);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-emerald-400" />
          Branch Reports
        </h1>
        <p className="text-zinc-400 mt-1">Last 30 days activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">30-Day Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Total Bets</p>
          <p className="text-2xl font-bold text-blue-400">{totalBets.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Active Agents</p>
          <p className="text-2xl font-bold text-purple-400">{agentPerformance.length}</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">Daily Revenue (Last 30 Days)</h2>
        <div className="flex items-end gap-1 h-40">
          {dailySales.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full bg-emerald-600/70 hover:bg-emerald-500 rounded-t transition-all cursor-pointer relative"
                style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: d.revenue > 0 ? "4px" : "0" }}
                title={`${d.date}: $${d.revenue.toFixed(2)}`}
              >
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {d.date}<br />${d.revenue.toFixed(2)} · {d.bets} bet{d.bets !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>{dailySales[0]?.date}</span>
          <span>{dailySales[dailySales.length - 1]?.date}</span>
        </div>
      </div>

      {/* Agent performance */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-white">Agent Performance</h2>
        </div>
        {agentPerformance.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">No agent activity yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Agent</th>
                <th className="px-5 py-3 text-right">Bets</th>
                <th className="px-5 py-3 text-right">Stake</th>
                <th className="px-5 py-3 text-right">Vouchers</th>
                <th className="px-5 py-3 text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700/50">
              {agentPerformance.sort((a, b) => b.totalStake - a.totalStake).map((a) => (
                <tr key={a.agentId} className="hover:bg-zinc-700/30">
                  <td className="px-5 py-3 font-medium text-white">{a.agentName}</td>
                  <td className="px-5 py-3 text-right text-zinc-300">{a.betsPlaced}</td>
                  <td className="px-5 py-3 text-right text-emerald-400">${a.totalStake.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-zinc-300">{a.vouchersSold}</td>
                  <td className="px-5 py-3 text-right text-yellow-400">${a.commission.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
