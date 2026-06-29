import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle2, XCircle, Clock, AlertTriangle, Banknote, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface BetSelection {
  id: number; market: string; selection: string; odds: number; fixtureId: number;
  homeTeam: string | null; awayTeam: string | null;
  fixtureStatus: string | null; scoreHome: number | null; scoreAway: number | null;
}
interface BetInfo {
  id: number; code: string; stake: number; totalOdds: number; potentialWin: number;
  status: "pending" | "won" | "lost" | "void"; createdAt: string; branchId: number | null;
  userId: number; username: string | null; firstName: string | null; lastName: string | null;
  selections: BetSelection[];
}
interface ClaimInfo { id: number; status: string; }

const STATUS_ICON: Record<string, React.ReactElement> = {
  won:     <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  lost:    <XCircle className="w-5 h-5 text-red-400" />,
  pending: <Clock className="w-5 h-5 text-amber-400" />,
  void:    <XCircle className="w-5 h-5 text-zinc-400" />,
};
const STATUS_LABEL: Record<string, string> = { won: "Winner", lost: "Lost", pending: "Pending", void: "Void" };
const STATUS_COLOR: Record<string, string> = {
  won: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  lost: "text-red-400 bg-red-500/10 border-red-500/30",
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  void: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
};
const CLAIM_STATUS_COLOR: Record<string, string> = {
  pending: "text-amber-400", approved: "text-blue-400", paid: "text-emerald-400", rejected: "text-red-400",
};

export default function PayoutPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [bet, setBet] = useState<BetInfo | null>(null);
  const [claim, setClaim] = useState<ClaimInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showSelections, setShowSelections] = useState(false);

  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSearching(true);
    setBet(null);
    setClaim(null);
    setNotFound(false);
    setShowSelections(false);
    try {
      const res = await fetch(`/api/payout/ticket/${code.trim().toUpperCase()}`, { headers });
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setBet(data.bet);
      setClaim(data.claim);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleClaim = async () => {
    if (!bet) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/payout/ticket/${bet.code}/claim`, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      setClaim(data.claim);
      toast({ title: "Payout initiated", description: `$${bet.potentialWin.toFixed(2)} claim submitted for admin approval.` });
    } catch (err: any) {
      toast({ title: "Claim failed", description: err.message, variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  const playerName = bet ? ([bet.firstName, bet.lastName].filter(Boolean).join(" ") || bet.username || `User #${bet.userId}`) : "";

  return (
    <div className="p-4 max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Banknote className="w-7 h-7 text-emerald-400" /> Payout Desk
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Verify a winning ticket and process payment</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter ticket code…"
          className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-white font-mono text-sm uppercase tracking-wider focus:outline-none focus:border-emerald-500 placeholder:normal-case placeholder:tracking-normal"
        />
        <button
          type="submit"
          disabled={searching || !code.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <Search className="w-4 h-4" />
          {searching ? "Searching…" : "Find"}
        </button>
      </form>

      {/* Not found */}
      {notFound && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-4 flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Ticket not found</p>
            <p className="text-xs text-red-300/70">Check the code and try again.</p>
          </div>
        </div>
      )}

      {/* Result */}
      {bet && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden">
          {/* Header strip */}
          <div className={`flex items-center justify-between px-5 py-4 border-b border-zinc-700 ${bet.status === "won" ? "bg-emerald-900/20" : ""}`}>
            <div className="flex items-center gap-3">
              {STATUS_ICON[bet.status]}
              <div>
                <p className="font-mono text-sm font-bold text-white tracking-wider">{bet.code}</p>
                <p className="text-xs text-zinc-400">{format(new Date(bet.createdAt), "d MMM yyyy, HH:mm")}</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLOR[bet.status]}`}>
              {STATUS_LABEL[bet.status]}
            </span>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 divide-x divide-zinc-700 border-b border-zinc-700">
            {[
              { label: "Stake", value: `$${bet.stake.toFixed(2)}`, color: "text-white" },
              { label: "Odds", value: `×${bet.totalOdds.toFixed(2)}`, color: "text-zinc-300" },
              { label: "Payout", value: `$${bet.potentialWin.toFixed(2)}`, color: "text-emerald-400 font-black" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
                <p className={`text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Player */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-700/50">
            <span className="text-xs text-zinc-500">Player</span>
            <span className="text-sm font-medium text-zinc-200">{playerName}</span>
          </div>

          {/* Selections toggle */}
          <button
            onClick={() => setShowSelections(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs text-zinc-400 hover:bg-zinc-700/30 transition-colors border-b border-zinc-700/50"
          >
            <span className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> {bet.selections.length} selection{bet.selections.length !== 1 ? "s" : ""}</span>
            {showSelections ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showSelections && (
            <div className="bg-zinc-900/40 border-b border-zinc-700/50 divide-y divide-zinc-700/30">
              {bet.selections.map(s => {
                const settled = s.fixtureStatus === "finished";
                const live    = s.fixtureStatus === "live";
                const hasScore = s.scoreHome !== null && s.scoreAway !== null;
                return (
                  <div key={s.id} className="px-5 py-2.5">
                    {/* Fixture header */}
                    {s.homeTeam && s.awayTeam && (
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-zinc-300">{s.homeTeam} vs {s.awayTeam}</p>
                        <div className="flex items-center gap-1.5">
                          {settled && hasScore && (
                            <span className="text-xs font-bold text-white bg-zinc-700 px-2 py-0.5 rounded-md">
                              {s.scoreHome} – {s.scoreAway}
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            settled ? "bg-zinc-600 text-zinc-200" :
                            live    ? "bg-emerald-900/60 text-emerald-400" :
                            "bg-amber-900/40 text-amber-400"
                          }`}>
                            {settled ? "FT" : live ? "LIVE" : "Upcoming"}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Selection row */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.market}</span>
                        <p className="text-sm font-semibold text-white">{s.selection}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">@{Number(s.odds).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Claim area */}
          <div className="px-5 py-4">
            {claim ? (
              <div className={`flex items-center gap-2 text-sm font-semibold ${CLAIM_STATUS_COLOR[claim.status] ?? "text-zinc-400"}`}>
                <CheckCircle2 className="w-4 h-4" />
                Claim {claim.status === "pending" ? "submitted — awaiting admin approval" :
                       claim.status === "approved" ? "approved — pending payment" :
                       claim.status === "paid" ? "paid out ✓" : `status: ${claim.status}`}
              </div>
            ) : bet.status === "won" ? (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Banknote className="w-4 h-4" />
                {claiming ? "Processing…" : `Process Payment — $${bet.potentialWin.toFixed(2)}`}
              </button>
            ) : (
              <p className="text-sm text-zinc-500 text-center">
                {bet.status === "pending" ? "Ticket is still pending settlement." :
                 bet.status === "lost" ? "This ticket did not win." :
                 "This ticket cannot be paid out."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
