import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { useGetMyWallet, getGetMyWalletQueryKey } from "@workspace/api-client-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSiteSettings } from "../../contexts/SiteSettingsContext";
import { BarChart3, TrendingUp, Ticket, DollarSign, AlertCircle } from "lucide-react";

function StatCard({ label, value, sub, color = "emerald" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-400", blue: "text-blue-400",
    yellow: "text-yellow-400", purple: "text-purple-400", red: "text-red-400",
  };
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colors[color] ?? colors.emerald}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const { formatCurrency, t } = useSiteSettings();
  const { data: wallet } = useGetMyWallet({ query: { queryKey: getGetMyWalletQueryKey() } });

  interface AgentDash {
    commissionRate: number;
    todayBets: number; todayRevenue: number;
    monthBets: number; monthRevenue: number;
    vouchersSold: number; voucherSalesValue: number;
    commissionEarned: number;
    totalBetsPlaced: number; totalStake: number;
    pendingPayouts: number;
  }

  const { data: dash, isLoading, error } = useQuery({
    queryKey: ["agent-dashboard"],
    queryFn: () => api.get<AgentDash>("/api/agent/dashboard").then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="p-6 text-zinc-400">Loading dashboard...</div>;
  if (error || !dash) return (
    <div className="p-6 flex items-center gap-2 text-red-400">
      <AlertCircle className="w-5 h-5" /> Failed to load dashboard
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-emerald-400" />
          Agent Dashboard
        </h1>
        <p className="text-zinc-400 mt-1">
          Welcome back, {(user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName ?? ""}`.trim() : user?.username}
          {" · "}{dash.commissionRate}% commission rate
        </p>
      </div>

      {/* Wallet */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-800/50 rounded-xl p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-emerald-300/70 uppercase tracking-wider mb-1">Wallet Balance</p>
          <p className="text-3xl font-bold text-emerald-400">{formatCurrency(parseFloat(wallet?.balance ?? "0"))}</p>
        </div>
        <DollarSign className="w-10 h-10 text-emerald-600/40" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label={t("agent.today_bets")} value={dash.todayBets} sub={formatCurrency(dash.todayRevenue)} color="blue" />
        <StatCard label={t("agent.monthly_bets")} value={dash.monthBets} sub={formatCurrency(dash.monthRevenue)} color="purple" />
        <StatCard label={t("agent.vouchers_sold")} value={dash.vouchersSold} sub={`${formatCurrency(dash.voucherSalesValue)} ${t("agent.value")}`} />
        <StatCard label={t("agent.commission_earned")} value={formatCurrency(dash.commissionEarned)} color="yellow" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label={t("agent.total_bets")} value={dash.totalBetsPlaced} sub={`${formatCurrency(dash.totalStake)} ${t("agent.total_stake")}`} />
        <StatCard label={t("agent.pending_payouts")} value={formatCurrency(dash.pendingPayouts)} sub={t("agent.won_bets")} color="red" />
      </div>
    </div>
  );
}
