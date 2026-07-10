import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useState, useMemo } from "react";
import { History, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";

interface BetSelection { id: number; market: string; selection: string; odds: number; }
interface Bet {
  id: number; code: string; stake: number; totalOdds: number; potentialWin: number;
  status: "pending" | "won" | "lost" | "void" | "cashed_out"; createdAt: string; selections: BetSelection[];
  exchangeRate?: number | null; cashOutAmount?: number | null; cashOutExchangeRate?: number | null;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "text-amber-400  bg-amber-500/10  border-amber-500/30",
  won:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  lost:    "text-red-400    bg-red-500/10    border-red-500/30",
  void:    "text-zinc-400   bg-zinc-500/10   border-zinc-500/30",
};

export default function AgentBetsPage() {
  const { token } = useAuth();
  const { formatCurrency, formatCurrencyAt } = useSiteSettings();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const { data, isLoading } = useQuery({
    queryKey: ["agent-bets"],
    queryFn: () => fetch("/api/agent/bets?limit=500", { headers }).then(r => r.json()),
  });

  const allBets: Bet[] = data?.bets ?? [];

  const filtered = useMemo(() => {
    return allBets.filter(b => {
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchSearch = !q || b.code?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [allBets, statusFilter, search]);

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const totalStake = allBets.reduce((s, b) => s + b.stake, 0);
  const pending = allBets.filter(b => b.status === "pending").length;
  const won = allBets.filter(b => b.status === "won").length;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" /> My Bets
        </h1>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>{allBets.length} total</span>
          <span>·</span>
          <span className="text-amber-400">{pending} pending</span>
          <span>·</span>
          <span className="text-emerald-400">{won} won</span>
          <span>·</span>
          <span>{formatCurrency(totalStake)} staked</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ticket code…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="void">Void</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-zinc-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            {allBets.length === 0 ? "No bets placed yet." : "No bets match your filters."}
          </div>
        ) : (
          <div className="divide-y divide-zinc-700/50">
            {/* Column header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/50">
              <span>Ticket</span>
              <span className="text-right">Stake</span>
              <span className="text-right">Odds</span>
              <span className="text-right">Payout</span>
              <span className="text-right">Status</span>
            </div>
            {filtered.map(bet => {
              const isOpen = expanded.has(bet.id);
              return (
                <div key={bet.id}>
                  <button
                    className="w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-4 py-2.5 hover:bg-zinc-700/30 transition-colors text-left"
                    onClick={() => toggle(bet.id)}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      {isOpen ? <ChevronUp className="w-3 h-3 text-zinc-500 shrink-0" /> : <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />}
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-zinc-300 truncate block">{bet.code}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(bet.createdAt).toLocaleDateString()} · {bet.selections.length} sel</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-white text-right">{formatCurrencyAt(bet.stake, bet.exchangeRate)}</span>
                    <span className="text-xs text-zinc-400 text-right">×{bet.totalOdds.toFixed(2)}</span>
                    <span className="text-xs font-semibold text-emerald-400 text-right">{formatCurrencyAt(bet.potentialWin, bet.exchangeRate)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border text-right ${STATUS_STYLE[bet.status]}`}>
                      {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 pt-0 bg-zinc-900/40 border-t border-zinc-700/30">
                      <table className="w-full text-xs mt-2">
                        <thead>
                          <tr className="text-[10px] text-zinc-500 border-b border-zinc-700/50">
                            <th className="pb-1.5 text-left font-medium">Market</th>
                            <th className="pb-1.5 text-left font-medium">Selection</th>
                            <th className="pb-1.5 text-right font-medium">Odds</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700/20">
                          {bet.selections.map(s => (
                            <tr key={s.id} className="text-zinc-300">
                              <td className="py-1 text-zinc-400">{s.market}</td>
                              <td className="py-1 font-medium text-white">{s.selection}</td>
                              <td className="py-1 text-right text-emerald-400">@{Number(s.odds).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-[10px] text-zinc-600 text-center">Showing {filtered.length} of {allBets.length} bets</p>
      )}
    </div>
  );
}
