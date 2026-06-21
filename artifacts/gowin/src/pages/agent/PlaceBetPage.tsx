import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../../lib/api";
import { useGetMyWallet, getGetMyWalletQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Target, Plus, Trash2, CheckCircle2 } from "lucide-react";

interface Fixture {
  id: number;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  league?: { name: string };
  odds?: OddsEntry[];
}

interface OddsEntry {
  market: string;
  selection: string;
  odds: number;
}

interface Selection {
  fixtureId: number;
  home: string;
  away: string;
  market: string;
  selection: string;
  odds: number;
}

export default function AgentPlaceBetPage() {
  const qc = useQueryClient();
  const { data: wallet, refetch: refetchWallet } = useGetMyWallet({ query: { queryKey: getGetMyWalletQueryKey() } });
  const [selections, setSelections] = useState<Selection[]>([]);
  const [stake, setStake] = useState("");
  const [search, setSearch] = useState("");
  const [lastBet, setLastBet] = useState<any>(null);
  const [error, setError] = useState("");

  const { data: fixturesData, isLoading } = useQuery({
    queryKey: ["agent-fixtures"],
    queryFn: () => api.get<{ fixtures: Fixture[] }>("/api/sports/fixtures?status=upcoming&limit=50").then((r) => r.data),
    staleTime: 60000,
  });

  const placeBetMut = useMutation({
    mutationFn: (body: { selections: Omit<Selection, "home" | "away">[]; stake: number }) =>
      api.post("/api/agent/bets", body).then((r) => r.data),
    onSuccess: (data) => {
      setLastBet(data);
      setSelections([]);
      setStake("");
      setError("");
      qc.invalidateQueries({ queryKey: ["agent-dashboard"] });
      refetchWallet();
    },
    onError: (e: any) => setError(e.response?.data?.error ?? "Failed to place bet"),
  });

  const fixtures: Fixture[] = fixturesData?.fixtures ?? [];
  const filtered = fixtures.filter((f) =>
    !search || f.homeTeam.toLowerCase().includes(search.toLowerCase()) || f.awayTeam.toLowerCase().includes(search.toLowerCase())
  );

  const stakeNum = parseFloat(stake) || 0;
  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialWin = stakeNum * totalOdds;
  const balance = parseFloat(wallet?.balance ?? "0");

  const addSelection = (fixture: Fixture, market: string, selection: string, odds: number) => {
    setSelections((prev) => {
      const without = prev.filter((s) => s.fixtureId !== fixture.id);
      return [...without, { fixtureId: fixture.id, home: fixture.homeTeam, away: fixture.awayTeam, market, selection, odds }];
    });
  };

  const removeSelection = (fixtureId: number) => {
    setSelections((prev) => prev.filter((s) => s.fixtureId !== fixtureId));
  };

  const handlePlace = () => {
    setError("");
    if (selections.length === 0) { setError("Add at least one selection"); return; }
    if (stakeNum <= 0) { setError("Enter a valid stake"); return; }
    if (stakeNum > balance) { setError("Insufficient balance"); return; }
    placeBetMut.mutate({
      selections: selections.map(({ home, away, ...s }) => s),
      stake: stakeNum,
    });
  };

  // Basic odds display — fallback if fixture has no odds
  const defaultMarkets = (f: Fixture): { market: string; selection: string; odds: number }[] => {
    const markets: { market: string; selection: string; odds: number }[] = [];
    if (f.odds && f.odds.length > 0) {
      f.odds.slice(0, 9).forEach((o) => markets.push(o));
    } else {
      markets.push(
        { market: "1X2", selection: "Home", odds: 2.0 },
        { market: "1X2", selection: "Draw", odds: 3.2 },
        { market: "1X2", selection: "Away", odds: 3.5 },
      );
    }
    return markets;
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Target className="w-7 h-7 text-emerald-400" />
          Place Bet
        </h1>
        <p className="text-zinc-400 mt-0.5 text-sm">Balance: <span className="text-emerald-400 font-semibold">${balance.toFixed(2)}</span></p>
      </div>

      {lastBet && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 mb-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-300">Bet Placed Successfully!</p>
            <p className="text-sm text-zinc-300 mt-1">Code: <span className="font-mono text-white">{lastBet.code}</span> · Stake: ${lastBet.bet?.stake} · Potential Win: ${lastBet.bet?.potentialWin}</p>
          </div>
          <button onClick={() => setLastBet(null)} className="ml-auto text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="flex gap-4">
        {/* Fixture list */}
        <div className="flex-1 overflow-hidden">
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 mb-3 focus:outline-none focus:border-emerald-500"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isLoading ? (
            <div className="text-zinc-400 text-center py-8">Loading fixtures...</div>
          ) : filtered.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">No fixtures available</div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.slice(0, 30).map((fixture) => {
                const sel = selections.find((s) => s.fixtureId === fixture.id);
                const markets = defaultMarkets(fixture);
                const byMarket: Record<string, typeof markets> = {};
                markets.forEach((m) => {
                  if (!byMarket[m.market]) byMarket[m.market] = [];
                  byMarket[m.market].push(m);
                });
                return (
                  <div key={fixture.id} className={`bg-zinc-800 border rounded-xl p-3 ${sel ? "border-emerald-600/50" : "border-zinc-700"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-white text-sm">{fixture.homeTeam} vs {fixture.awayTeam}</p>
                        <p className="text-xs text-zinc-500">{fixture.league?.name ?? ""} · {new Date(fixture.startTime).toLocaleString()}</p>
                      </div>
                      {sel && (
                        <button onClick={() => removeSelection(fixture.id)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {Object.entries(byMarket).map(([market, opts]) => (
                      <div key={market} className="mb-1">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{market}</p>
                        <div className="flex gap-1 flex-wrap">
                          {opts.map((o) => {
                            const isActive = sel?.market === market && sel?.selection === o.selection;
                            return (
                              <button key={`${market}-${o.selection}`}
                                onClick={() => addSelection(fixture, market, o.selection, o.odds)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${isActive ? "bg-emerald-600 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"}`}>
                                {o.selection} <span className={`font-mono ml-1 ${isActive ? "text-emerald-200" : "text-zinc-400"}`}>{o.odds}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bet slip */}
        <div className="w-72 shrink-0">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 sticky top-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              Bet Slip <span className="text-xs bg-emerald-600 text-white rounded-full px-2 py-0.5">{selections.length}</span>
            </h3>

            {selections.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">Add selections from the list</p>
            ) : (
              <div className="space-y-2 mb-4">
                {selections.map((s) => (
                  <div key={s.fixtureId} className="bg-zinc-700 rounded-lg p-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-zinc-400">{s.home} vs {s.away}</p>
                        <p className="text-white font-medium">{s.market}: {s.selection}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-mono">{s.odds}</p>
                        <button onClick={() => removeSelection(s.fixtureId)} className="text-zinc-500 hover:text-red-400 text-[10px]">remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selections.length > 0 && (
              <>
                <div className="border-t border-zinc-700 pt-3 mb-3 text-xs space-y-1 text-zinc-400">
                  <div className="flex justify-between"><span>Total Odds</span><span className="text-white font-mono">{totalOdds.toFixed(4)}</span></div>
                </div>
                <label className="text-xs text-zinc-400 block mb-1">Stake ($)</label>
                <input
                  type="number"
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                />
                {stakeNum > 0 && (
                  <div className="text-xs text-zinc-400 mb-3 flex justify-between">
                    <span>Potential Win</span>
                    <span className="text-emerald-400 font-semibold">${potentialWin.toFixed(2)}</span>
                  </div>
                )}
                {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
                <button
                  onClick={handlePlace}
                  disabled={placeBetMut.isPending || selections.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                  {placeBetMut.isPending ? "Placing..." : "Place Bet"}
                </button>
                <button onClick={() => setSelections([])} className="w-full mt-2 text-xs text-zinc-500 hover:text-zinc-300">
                  Clear all
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
