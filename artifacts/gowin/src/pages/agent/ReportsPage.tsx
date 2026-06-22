import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { useSiteSettings } from "../../contexts/SiteSettingsContext";
import { BarChart3, TrendingUp } from "lucide-react";

export default function AgentReportsPage() {
  const { formatCurrency, t } = useSiteSettings();
  interface DailyRow { date: string; bets: number; stake: number; commission: number; }
  interface AgentReports { dailyActivity: DailyRow[]; commissionRate: number; }

  const { data, isLoading } = useQuery({
    queryKey: ["agent-reports"],
    queryFn: () => api.get<AgentReports>("/api/agent/reports").then((r) => r.data),
  });

  if (isLoading) return <div className="p-6 text-zinc-400">Loading reports...</div>;

  const daily: DailyRow[] = data?.dailyActivity ?? [];
  const commissionRate: number = data?.commissionRate ?? 0;

  const totalStake = daily.reduce((s, d) => s + d.stake, 0);
  const totalBets = daily.reduce((s, d) => s + d.bets, 0);
  const totalCommission = daily.reduce((s, d) => s + d.commission, 0);
  const maxStake = Math.max(...daily.map((d) => d.stake), 1);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-emerald-400" />
          My Reports
        </h1>
        <p className="text-zinc-400 mt-1">Last 30 days · {commissionRate}% commission rate</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{t("agent.total_stake_label")}</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalStake)}</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Total Bets</p>
          <p className="text-2xl font-bold text-blue-400">{totalBets}</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{t("agent.commission_label")}</p>
          <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalCommission)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">Daily Stake (Last 30 Days)</h2>
        <div className="flex items-end gap-1 h-36">
          {daily.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center group">
              <div
                className="w-full bg-emerald-600/70 hover:bg-emerald-500 rounded-t transition-all relative"
                style={{ height: `${(d.stake / maxStake) * 100}%`, minHeight: d.stake > 0 ? "4px" : "0" }}
                title={`${d.date}: ${formatCurrency(d.stake)}`}>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  {d.date}<br />{formatCurrency(d.stake)} · {d.bets} {d.bets !== 1 ? t("reports.bets_plural") : t("reports.bets")}<br />💰 {formatCurrency(d.commission)} {t("reports.comm")}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>{daily[0]?.date}</span>
          <span>{daily[daily.length - 1]?.date}</span>
        </div>
      </div>

      {/* Daily table */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-white">Daily Breakdown</h2>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-800">
              <tr className="border-b border-zinc-700 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-right">Bets</th>
                <th className="px-5 py-3 text-right">Stake</th>
                <th className="px-5 py-3 text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700/50">
              {[...daily].reverse().filter((d) => d.bets > 0).map((d) => (
                <tr key={d.date} className="hover:bg-zinc-700/30">
                  <td className="px-5 py-2.5 text-zinc-300">{d.date}</td>
                  <td className="px-5 py-2.5 text-right text-zinc-400">{d.bets}</td>
                  <td className="px-5 py-2.5 text-right text-emerald-400">{formatCurrency(d.stake)}</td>
                  <td className="px-5 py-2.5 text-right text-yellow-400">{formatCurrency(d.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
