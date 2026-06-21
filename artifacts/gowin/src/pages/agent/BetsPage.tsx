import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface BetSelection {
  id: number;
  market: string;
  selection: string;
  odds: number;
}

interface Bet {
  id: number;
  code: string;
  stake: number;
  totalOdds: number;
  potentialWin: number;
  status: "pending" | "won" | "lost" | "void";
  createdAt: string;
  selections: BetSelection[];
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  won:     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  lost:    "bg-red-500/10 text-red-400 border border-red-500/30",
  void:    "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30",
};

export default function AgentBetsPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["agent-bets"],
    queryFn: () => api.get<{ bets: Bet[] }>("/api/agent/bets?limit=200").then((r) => r.data),
  });

  const bets: Bet[] = data?.bets ?? [];

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const totalStake = bets.reduce((s, b) => s + b.stake, 0);
  const pending = bets.filter((b) => b.status === "pending").length;
  const won = bets.filter((b) => b.status === "won").length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="w-7 h-7 text-emerald-400" />
          My Bets
        </h1>
        <p className="text-zinc-400 mt-1">All bets placed through your account</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Total Bets</p>
          <p className="text-2xl font-bold text-white">{bets.length}</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Total Staked</p>
          <p className="text-2xl font-bold text-emerald-400">${totalStake.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Pending / Won</p>
          <p className="text-2xl font-bold text-yellow-400">{pending} <span className="text-zinc-500 text-lg">/</span> <span className="text-emerald-400">{won}</span></p>
        </div>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-400">Loading bets…</div>
        ) : bets.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">No bets placed yet.</div>
        ) : (
          <div className="divide-y divide-zinc-700/50">
            {bets.map((bet) => {
              const isOpen = expanded.has(bet.id);
              return (
                <div key={bet.id}>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-700/30 transition-colors text-left"
                    onClick={() => toggle(bet.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-zinc-400">{bet.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[bet.status]}`}>
                          {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {bet.selections.length} {bet.selections.length === 1 ? "selection" : "selections"}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(bet.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-white">${bet.stake.toFixed(2)}</div>
                      <div className="text-xs text-zinc-500">@{bet.totalOdds.toFixed(2)} → <span className="text-emerald-400">${bet.potentialWin.toFixed(2)}</span></div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 bg-zinc-900/40">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-zinc-500 border-b border-zinc-700/50">
                            <th className="py-2 text-left font-medium">Market</th>
                            <th className="py-2 text-left font-medium">Selection</th>
                            <th className="py-2 text-right font-medium">Odds</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700/30">
                          {bet.selections.map((s) => (
                            <tr key={s.id} className="text-zinc-300">
                              <td className="py-1.5">{s.market}</td>
                              <td className="py-1.5 font-medium text-white">{s.selection}</td>
                              <td className="py-1.5 text-right text-emerald-400">{Number(s.odds).toFixed(2)}</td>
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
    </div>
  );
}
