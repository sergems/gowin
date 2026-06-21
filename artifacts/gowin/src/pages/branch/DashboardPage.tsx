import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { BarChart3, Users, TrendingUp, Ticket, DollarSign, AlertCircle } from "lucide-react";

function StatCard({ label, value, sub, color = "emerald" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    red: "text-red-400",
  };
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colors[color] ?? colors.emerald}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function BranchDashboardPage() {
  interface BranchDash {
    totalAgents: number; activeAgents: number;
    totalBets: number; totalStake: number;
    dailyRevenue: number; monthlyRevenue: number;
    voucherSales: number; voucherSalesValue: number;
    allocatedVouchers: number; pendingPayouts: number;
  }
  interface BranchInfo { branch: { name: string; city: string; country: string; status: string } }

  const { data: dash, isLoading, error } = useQuery({
    queryKey: ["branch-dashboard"],
    queryFn: () => api.get<BranchDash>("/api/branch/dashboard").then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: branchInfo } = useQuery({
    queryKey: ["branch-info"],
    queryFn: () => api.get<BranchInfo>("/api/branch/info").then((r) => r.data),
  });

  if (isLoading) return <div className="p-6 text-zinc-400">Loading dashboard...</div>;
  if (error || !dash) return (
    <div className="p-6 flex items-center gap-2 text-red-400">
      <AlertCircle className="w-5 h-5" /> Failed to load dashboard
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-emerald-400" />
          Branch Dashboard
        </h1>
        {branchInfo?.branch && (
          <p className="text-zinc-400 mt-1">
            {branchInfo.branch.name} — {branchInfo.branch.city}, {branchInfo.branch.country}
            <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium ${branchInfo.branch.status === "active" ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
              {branchInfo.branch.status}
            </span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Agents" value={dash.totalAgents} sub={`${dash.activeAgents} active`} color="blue" />
        <StatCard label="Total Bets" value={dash.totalBets?.toLocaleString()} sub={`$${dash.totalStake?.toFixed(2)} total stake`} />
        <StatCard label="Today Revenue" value={`$${dash.dailyRevenue?.toFixed(2)}`} color="yellow" />
        <StatCard label="Monthly Revenue" value={`$${dash.monthlyRevenue?.toFixed(2)}`} color="purple" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Vouchers Sold" value={dash.voucherSales} sub={`$${dash.voucherSalesValue?.toFixed(2)} value`} color="emerald" />
        <StatCard label="Allocated Vouchers" value={dash.allocatedVouchers} sub="Available in inventory" color="blue" />
        <StatCard label="Pending Payouts" value={`$${dash.pendingPayouts?.toFixed(2)}`} sub="Won bets awaiting payout" color="red" />
      </div>
    </div>
  );
}
