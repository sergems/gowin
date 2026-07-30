import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Search, CheckCircle2, XCircle, Clock, AlertTriangle, Banknote, Receipt, ChevronDown, ChevronUp, Ticket } from "lucide-react";
import { format } from "date-fns";

// ── Sports bet types ──────────────────────────────────────────────────────────
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

// ── Lottery ticket types ──────────────────────────────────────────────────────
interface LotteryTicketInfo {
  id: number; code: string | null; stake: number; potentialWin: number | null; prizeAmount: number | null;
  status: "pending" | "won" | "lost"; createdAt: string;
  userId: number; username: string | null; firstName: string | null; lastName: string | null;
  numbers: number[]; bonusNumbers: number[]; odds: string | null; playType: string | null; bonusMode: string | null;
  game: { name: string; emoji: string; color: string; slug: string } | null;
  draw: { drawDate: string; winningNumbers: number[]; bonusNumbers: number[]; status: string } | null;
}

interface ClaimInfo { id: number; status: string; }

const STATUS_ICON: Record<string, React.ReactElement> = {
  won:     <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  lost:    <XCircle className="w-5 h-5 text-red-400" />,
  pending: <Clock className="w-5 h-5 text-amber-400" />,
  void:    <XCircle className="w-5 h-5 text-zinc-400" />,
};
const STATUS_COLOR: Record<string, string> = {
  won: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  lost: "text-red-400 bg-red-500/10 border-red-500/30",
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  void: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
};
const CLAIM_STATUS_COLOR: Record<string, string> = {
  pending: "text-amber-400", approved: "text-blue-400", paid: "text-emerald-400", rejected: "text-red-400",
};

// ── Number ball for lottery display ──────────────────────────────────────────
function NumberBall({ n, matched, color }: { n: number; matched?: boolean; color: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center border-2 shrink-0"
      style={
        matched
          ? { backgroundColor: color, borderColor: color, color: "#fff", boxShadow: `0 0 6px ${color}55` }
          : { background: "transparent", borderColor: "#52525b", color: "#a1a1aa" }
      }
    >
      {n}
    </div>
  );
}

export default function PayoutPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { t } = useSiteSettings();

  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [ticketType, setTicketType] = useState<"sports" | "lottery" | null>(null);
  const [bet, setBet] = useState<BetInfo | null>(null);
  const [lotteryTicket, setLotteryTicket] = useState<LotteryTicketInfo | null>(null);
  const [claim, setClaim] = useState<ClaimInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const STATUS_LABEL: Record<string, string> = {
    won: t("status.won"), lost: t("status.lost"), pending: t("status.pending"), void: t("status.void"),
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSearching(true);
    setBet(null); setLotteryTicket(null); setClaim(null);
    setNotFound(false); setShowDetails(false); setTicketType(null);
    try {
      const res = await fetch(`/api/payout/ticket/${code.trim().toUpperCase()}`, { headers });
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setTicketType(data.ticketType);
      if (data.ticketType === "lottery") {
        setLotteryTicket(data.lotteryTicket);
      } else {
        setBet(data.bet);
      }
      setClaim(data.claim);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleClaim = async () => {
    const claimCode = bet?.code ?? lotteryTicket?.code;
    if (!claimCode) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/payout/ticket/${claimCode}/claim`, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      setClaim(data.claim);
      const payout = bet?.potentialWin ?? lotteryTicket?.prizeAmount ?? lotteryTicket?.potentialWin ?? 0;
      toast({ title: t("payout.claim_label"), description: `$${payout.toFixed(2)} ${t("payout.claim_pending_desc")}` });
    } catch (err: any) {
      toast({ title: t("clerk.action_failed"), description: err.message, variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  const currentStatus = bet?.status ?? lotteryTicket?.status;
  const playerName = bet
    ? ([bet.firstName, bet.lastName].filter(Boolean).join(" ") || bet.username || `User #${bet.userId}`)
    : lotteryTicket
    ? ([lotteryTicket.firstName, lotteryTicket.lastName].filter(Boolean).join(" ") || lotteryTicket.username || `User #${lotteryTicket.userId}`)
    : "";

  return (
    <div className="p-4 max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Banknote className="w-7 h-7 text-emerald-400" /> {t("nav.payout_desk")}
        </h1>
        <p className="text-zinc-400 text-sm mt-1">{t("payout.verify_desc")}</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder={t("payout.enter_code_ph")}
          className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-white font-mono text-sm uppercase tracking-wider focus:outline-none focus:border-emerald-500 placeholder:normal-case placeholder:tracking-normal"
        />
        <button
          type="submit"
          disabled={searching || !code.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <Search className="w-4 h-4" />
          {searching ? t("payout.searching") : t("payout.find")}
        </button>
      </form>

      {/* Not found */}
      {notFound && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-4 flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">{t("payout.not_found")}</p>
            <p className="text-xs text-red-300/70">{t("payout.not_found_desc")}</p>
          </div>
        </div>
      )}

      {/* ── Sports bet result ─────────────────────────────────────────────────── */}
      {ticketType === "sports" && bet && (
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
              {STATUS_LABEL[bet.status] ?? bet.status}
            </span>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 divide-x divide-zinc-700 border-b border-zinc-700">
            {[
              { label: t("betslip.stake"), value: `$${bet.stake.toFixed(2)}`, color: "text-white" },
              { label: t("bets.odds"), value: `×${bet.totalOdds.toFixed(2)}`, color: "text-zinc-300" },
              { label: t("payout.payout_label"), value: `$${bet.potentialWin.toFixed(2)}`, color: "text-emerald-400 font-black" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
                <p className={`text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Player */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-700/50">
            <span className="text-xs text-zinc-500">{t("payout.player")}</span>
            <span className="text-sm font-medium text-zinc-200">{playerName}</span>
          </div>

          {/* Selections toggle */}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs text-zinc-400 hover:bg-zinc-700/30 transition-colors border-b border-zinc-700/50"
          >
            <span className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              {bet.selections.length} {bet.selections.length !== 1 ? t("payout.selections") : t("payout.selection")}
            </span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <div className="bg-zinc-900/40 border-b border-zinc-700/50 divide-y divide-zinc-700/30">
              {bet.selections.map(s => {
                const settled = s.fixtureStatus === "finished";
                const live    = s.fixtureStatus === "live";
                const hasScore = s.scoreHome !== null && s.scoreAway !== null;
                return (
                  <div key={s.id} className="px-5 py-2.5">
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
                            {settled ? t("payout.ft") : live ? t("payout.live_badge") : t("payout.upcoming")}
                          </span>
                        </div>
                      </div>
                    )}
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
                {t("payout.claim_label")} {
                  claim.status === "pending"  ? t("payout.claim_pending_desc") :
                  claim.status === "approved" ? t("payout.claim_approved_desc") :
                  claim.status === "paid"     ? t("payout.claim_paid_desc") :
                  `status: ${claim.status}`
                }
              </div>
            ) : bet.status === "won" ? (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Banknote className="w-4 h-4" />
                {claiming ? t("payout.processing") : `${t("payout.process_payment")} — $${bet.potentialWin.toFixed(2)}`}
              </button>
            ) : (
              <p className="text-sm text-zinc-500 text-center">
                {bet.status === "pending" ? t("payout.pending_desc") :
                 bet.status === "lost"    ? t("payout.lost_desc") :
                 t("payout.void_desc")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Lottery ticket result ─────────────────────────────────────────────── */}
      {ticketType === "lottery" && lotteryTicket && (
        <div className="bg-zinc-800 border border-violet-500/30 rounded-2xl overflow-hidden">
          {/* Violet accent strip */}
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#8b5cf6,#a78bfa)" }} />

          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b border-zinc-700 ${lotteryTicket.status === "won" ? "bg-violet-900/20" : ""}`}>
            <div className="flex items-center gap-3">
              {STATUS_ICON[lotteryTicket.status] ?? STATUS_ICON.pending}
              <div>
                <div className="flex items-center gap-2">
                  <Ticket className="w-3.5 h-3.5 text-violet-400" />
                  <p className="text-sm font-bold text-white">{lotteryTicket.game?.emoji} {lotteryTicket.game?.name ?? "Lottery"}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-mono text-xs font-bold text-violet-300 tracking-wider">{lotteryTicket.code}</p>
                  <span className="text-[10px] text-zinc-500">{format(new Date(lotteryTicket.createdAt), "d MMM yyyy, HH:mm")}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLOR[lotteryTicket.status] ?? STATUS_COLOR.pending}`}>
                {(STATUS_LABEL[lotteryTicket.status] ?? lotteryTicket.status).toUpperCase()}
              </span>
              <span className="text-[10px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full">LOTTO</span>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 divide-x divide-zinc-700 border-b border-zinc-700">
            {[
              { label: "Stake", value: `$${lotteryTicket.stake.toFixed(2)}`, color: "text-white" },
              { label: "Odds", value: lotteryTicket.odds ?? "—", color: "text-zinc-300" },
              {
                label: "Payout",
                value: lotteryTicket.status === "lost"
                  ? `$0.00`
                  : lotteryTicket.status === "won" && lotteryTicket.prizeAmount != null
                  ? `$${lotteryTicket.prizeAmount.toFixed(2)}`
                  : lotteryTicket.potentialWin != null
                  ? `$${lotteryTicket.potentialWin.toFixed(2)}`
                  : "—",
                color: "text-violet-400 font-black",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
                <p className={`text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Player */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-700/50">
            <span className="text-xs text-zinc-500">{t("payout.player")}</span>
            <span className="text-sm font-medium text-zinc-200">{playerName}</span>
          </div>

          {/* Numbers toggle */}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs text-zinc-400 hover:bg-zinc-700/30 transition-colors border-b border-zinc-700/50"
          >
            <span className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              Numbers picked
            </span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <div className="bg-zinc-900/40 border-b border-zinc-700/50 px-5 py-4 space-y-3">
              {/* Player's numbers */}
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Your numbers</p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {lotteryTicket.numbers.map(n => {
                    const winSet = new Set(lotteryTicket.draw?.winningNumbers ?? []);
                    const drawSettled = lotteryTicket.draw?.status === "settled";
                    return (
                      <NumberBall key={n} n={n} matched={drawSettled && winSet.has(n)} color={lotteryTicket.game?.color ?? "#8b5cf6"} />
                    );
                  })}
                  {lotteryTicket.bonusNumbers.length > 0 && (
                    <>
                      <span className="text-zinc-500 text-xs mx-0.5">+</span>
                      {lotteryTicket.bonusNumbers.map(n => {
                        const bonusWinSet = new Set(lotteryTicket.draw?.bonusNumbers ?? []);
                        const drawSettled = lotteryTicket.draw?.status === "settled";
                        return (
                          <NumberBall key={`b${n}`} n={n} matched={drawSettled && bonusWinSet.has(n)} color="#f59e0b" />
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Winning numbers if draw settled */}
              {lotteryTicket.draw?.status === "settled" && lotteryTicket.draw.winningNumbers.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Winning numbers</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {lotteryTicket.draw.winningNumbers.map(n => (
                      <NumberBall key={n} n={n} matched={lotteryTicket.numbers.includes(n)} color={lotteryTicket.game?.color ?? "#8b5cf6"} />
                    ))}
                    {lotteryTicket.draw.bonusNumbers.length > 0 && (
                      <>
                        <span className="text-zinc-500 text-xs mx-0.5">+</span>
                        {lotteryTicket.draw.bonusNumbers.map(n => (
                          <NumberBall key={`b${n}`} n={n} matched={lotteryTicket.bonusNumbers.includes(n)} color="#f59e0b" />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Draw date if pending */}
              {lotteryTicket.draw && lotteryTicket.draw.status !== "settled" && (
                <p className="text-xs text-zinc-400">
                  Draw: {format(new Date(lotteryTicket.draw.drawDate), "d MMM yyyy, HH:mm")}
                </p>
              )}
            </div>
          )}

          {/* Claim area */}
          <div className="px-5 py-4">
            {claim ? (
              <div className={`flex items-center gap-2 text-sm font-semibold ${CLAIM_STATUS_COLOR[claim.status] ?? "text-zinc-400"}`}>
                <CheckCircle2 className="w-4 h-4" />
                {t("payout.claim_label")} {
                  claim.status === "pending"  ? t("payout.claim_pending_desc") :
                  claim.status === "approved" ? t("payout.claim_approved_desc") :
                  claim.status === "paid"     ? t("payout.claim_paid_desc") :
                  `status: ${claim.status}`
                }
              </div>
            ) : lotteryTicket.status === "won" ? (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Banknote className="w-4 h-4" />
                {claiming ? t("payout.processing") : `${t("payout.process_payment")} — $${(lotteryTicket.prizeAmount ?? lotteryTicket.potentialWin ?? 0).toFixed(2)}`}
              </button>
            ) : (
              <p className="text-sm text-zinc-500 text-center">
                {lotteryTicket.status === "pending"
                  ? "Awaiting draw result — ticket cannot be paid out yet."
                  : "This lottery ticket did not win."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
