import { useState, useEffect, useRef } from "react";
import { useGetMyBets } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fmtUTCDateTimeShort } from "@/lib/formatUTC";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trophy, Clock, CheckCircle2, XCircle, HelpCircle, Printer, Share2, RotateCcw, Copy, Check, BookMarked, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { printBetSlip, historyBetToPrintData } from "@/lib/printBetSlip";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { CashOutButton } from "@/components/CashOutButton";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  won:        "bg-primary/20 text-primary border-primary/30",
  lost:       "bg-destructive/20 text-destructive border-destructive/30",
  void:       "bg-muted/40 text-muted-foreground border-border",
  cashed_out: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

// ── Lottery ticket types ──────────────────────────────────────────────────────
interface LotteryTicketItem {
  id: number;
  gameId: number;
  drawId: number | null;
  numbers: number[];
  bonusNumbers: number[];
  stake: number;
  status: string;
  prizeAmount: number | null;
  potentialWin: string | null;
  odds: string | null;
  code: string | null;
  playType: string | null;
  bonusMode: string | null;
  createdAt: string;
  game: {
    name: string;
    slug: string;
    color: string;
    emoji: string;
    mainNumbersMax: number;
  } | null;
  draw: {
    id: number;
    drawDate: string;
    winningNumbers: number[];
    bonusNumbers: number[];
    status: string;
  } | null;
  _type: "lottery";
}

interface SportsBetItem {
  _type: "sports";
  [key: string]: any;
}

type HistoryItem = LotteryTicketItem | SportsBetItem;

function LotteryNumberBall({ n, matched, color }: { n: number; matched?: boolean; color: string }) {
  return (
    <div
      className="w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center border-2 shrink-0"
      style={
        matched
          ? { backgroundColor: color, borderColor: color, color: "#fff", boxShadow: `0 0 6px ${color}55` }
          : { backgroundColor: "transparent", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
      }
    >
      {n}
    </div>
  );
}

function LotteryTicketCard({ ticket, isOpen, onToggle, formatCurrencyFn }: {
  ticket: LotteryTicketItem;
  isOpen: boolean;
  onToggle: () => void;
  formatCurrencyFn: (amount: number) => string;
}) {
  const color = ticket.game?.color ?? "#8b5cf6";
  const winSet = new Set(ticket.draw?.winningNumbers ?? []);
  const bonusWinSet = new Set(ticket.draw?.bonusNumbers ?? []);
  const drawSettled = ticket.draw?.status === "settled";
  const potentialWin = ticket.potentialWin ? parseFloat(ticket.potentialWin) : null;

  const borderColor =
    ticket.status === "won"  ? "border-violet-500/40" :
    ticket.status === "lost" ? "border-destructive/30" :
                               "border-violet-500/20";

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-colors ${borderColor}`}>
      {/* Violet top accent strip */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, #8b5cf6, #a78bfa)` }} />

      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        className="w-full p-3.5 hover:bg-accent/20 transition-colors text-left cursor-pointer"
      >
        {/* Row 1: title + amount */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="font-semibold text-sm leading-snug flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            {ticket.game?.emoji && <span>{ticket.game.emoji}</span>}
            {ticket.game?.name ?? "Lottery"}
            <span className="text-muted-foreground font-normal">· #{ticket.id}</span>
          </span>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Payout</div>
            <div className={`font-black text-sm leading-none ${ticket.status === "won" ? "text-violet-400" : ""}`}>
              {ticket.status === "lost"
                ? formatCurrencyFn(0)
                : ticket.status === "won" && ticket.prizeAmount != null
                ? formatCurrencyFn(ticket.prizeAmount)
                : potentialWin != null
                ? formatCurrencyFn(potentialWin)
                : "—"}
            </div>
          </div>
        </div>

        {/* Row 2: status badge + numbers preview */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[ticket.status] ?? STATUS_STYLES.pending}`}>
              {ticket.status.toUpperCase()}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-violet-500/20 text-violet-400 border-violet-500/30">
              LOTTO
            </span>
            {ticket.code && (
              <span className="font-mono text-[10px] font-bold tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded px-1.5 py-0.5">
                {ticket.code}
              </span>
            )}
            {ticket.odds && (
              <span className="text-[10px] text-muted-foreground font-mono">@ {ticket.odds}</span>
            )}
          </div>
          <div className="text-muted-foreground">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {/* Row 3: date */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
          <Clock className="w-3 h-3 shrink-0" />
          {format(new Date(ticket.createdAt), "PPP 'at' p")}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60">
              {/* Numbers */}
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">Your Numbers</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {ticket.numbers.map((n) => (
                      <LotteryNumberBall key={n} n={n} matched={drawSettled ? winSet.has(n) : false} color={color} />
                    ))}
                    {ticket.bonusNumbers.length > 0 && (
                      <>
                        <span className="text-muted-foreground text-xs mx-0.5">+</span>
                        {ticket.bonusNumbers.map((n) => (
                          <LotteryNumberBall key={`b${n}`} n={n} matched={drawSettled ? bonusWinSet.has(n) : false} color="#f59e0b" />
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {drawSettled && ticket.draw && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2">Winning Numbers</p>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {ticket.draw.winningNumbers.map((n) => (
                        <LotteryNumberBall key={n} n={n} matched={ticket.numbers.includes(n)} color={color} />
                      ))}
                      {ticket.draw.bonusNumbers.length > 0 && (
                        <>
                          <span className="text-muted-foreground text-xs mx-0.5">+</span>
                          {ticket.draw.bonusNumbers.map((n) => (
                            <LotteryNumberBall key={`b${n}`} n={n} matched={ticket.bonusNumbers.includes(n)} color="#f59e0b" />
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {!drawSettled && ticket.draw?.drawDate && (
                  <p className="text-xs text-muted-foreground">
                    Draw: {format(new Date(ticket.draw.drawDate), "PPP 'at' p")}
                  </p>
                )}
              </div>

              {/* Summary footer */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-accent/10 border-t border-border/60 text-sm">
                <div className="flex gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Stake</div>
                    <div className="font-bold">{formatCurrencyFn(ticket.stake)}</div>
                  </div>
                  {ticket.odds && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Odds</div>
                      <div className="font-bold font-mono">{ticket.odds}</div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-0.5">Potential Win</div>
                  <div className="font-black text-lg">
                    {potentialWin != null ? formatCurrencyFn(potentialWin) : "—"}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type SelectionOutcome = "won" | "lost" | "pending" | "unknown";

function getSelectionOutcome(sel: any): SelectionOutcome {
  const fixture = sel.fixture;
  const selectionName: string = sel.selection ?? "";
  const isUpSelection =
    selectionName === "Home 1UP" || selectionName === "Home 2UP" ||
    selectionName === "Away 1UP" || selectionName === "Away 2UP";

  // 1UP/2UP: once locked in live (upWon), it is permanently a win regardless
  // of the final score, and regardless of whether the fixture has finished yet —
  // mirrors backend settlement in upMarkets.ts.
  if (isUpSelection && sel.upWon) return "won";

  if (!fixture) return "unknown";
  if (fixture.status === "cancelled") return "unknown";
  if (
    fixture.status !== "finished" ||
    fixture.scoreHome === null ||
    fixture.scoreHome === undefined ||
    fixture.scoreAway === null ||
    fixture.scoreAway === undefined
  ) {
    return "pending";
  }

  const scoreHome: number = fixture.scoreHome;
  const scoreAway: number = fixture.scoreAway;
  const total = scoreHome + scoreAway;
  const market: string = sel.market ?? "";
  const selection: string = sel.selection ?? "";

  if (isUpSelection) {
    const diff = scoreHome - scoreAway;
    const met =
      selection === "Home 1UP" ? diff >= 1 :
      selection === "Home 2UP" ? diff >= 2 :
      selection === "Away 1UP" ? diff <= -1 :
      diff <= -2;
    return met ? "won" : "lost";
  }

  if (market === "1X2" || market === "Match Result") {
    const result =
      scoreHome > scoreAway ? "Home" : scoreAway > scoreHome ? "Away" : "Draw";
    return selection === result ? "won" : "lost";
  }

  if (market === "Double Chance") {
    const homeWin = scoreHome > scoreAway;
    const awayWin = scoreAway > scoreHome;
    const draw = scoreHome === scoreAway;
    let win = false;
    if (selection === "1X") win = homeWin || draw;
    else if (selection === "X2") win = awayWin || draw;
    else if (selection === "12") win = homeWin || awayWin;
    return win ? "won" : "lost";
  }

  if (market === "Both Teams To Score") {
    const bothScored = scoreHome > 0 && scoreAway > 0;
    if (selection === "Yes") return bothScored ? "won" : "lost";
    if (selection === "No") return !bothScored ? "won" : "lost";
  }

  const ouMatch = market.match(/^Over\/Under (\d+(?:\.\d+)?)$/);
  if (ouMatch) {
    const line = parseFloat(ouMatch[1]!);
    if (selection.startsWith("Over")) return total > line ? "won" : "lost";
    if (selection.startsWith("Under")) return total < line ? "won" : "lost";
  }

  return "unknown";
}

function SelectionOutcomeIcon({ outcome }: { outcome: SelectionOutcome }) {
  if (outcome === "won")
    return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
  if (outcome === "lost")
    return <XCircle className="w-5 h-5 text-destructive shrink-0" />;
  if (outcome === "pending")
    return <Clock className="w-5 h-5 text-yellow-400/70 shrink-0" />;
  return <HelpCircle className="w-5 h-5 text-muted-foreground/40 shrink-0" />;
}

interface LiveFixtureData {
  status: string;
  scoreHome: number | null;
  scoreAway: number | null;
  matchMinute: string | null;
}

export default function History() {
  const { formatCurrency, formatCurrencyAt, currency, exchangeRate, t } = useSiteSettings();
  const { shareBet, isSharing, replayBet } = useBetSlip();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "won" | "lost" | "cashed_out">("pending");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [liveFixtures, setLiveFixtures] = useState<Map<number, LiveFixtureData>>(new Map());
  // Share feature state
  const [sharingBetId, setSharingBetId] = useState<number | null>(null);
  const [replayingBetId, setReplayingBetId] = useState<number | null>(null);
  const [sharedCode, setSharedCode] = useState<{ betId: number; code: string } | null>(null);
  const [copiedShareCode, setCopiedShareCode] = useState(false);

  const { data: betsData, isLoading: betsLoading } = useGetMyBets(undefined, {
    query: { queryKey: ["myBets", activeTab] },
  });

  const { data: lotteryData, isLoading: lotteryLoading } = useQuery<{ tickets: LotteryTicketItem[] }>({
    queryKey: ["myLotteryTickets"],
    queryFn: async () => {
      const token = localStorage.getItem("gowin_token");
      const r = await fetch("/api/lottery/tickets/my?limit=200", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return { tickets: [] };
      return r.json();
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const isLoading = betsLoading || lotteryLoading;

  const sportsBets: SportsBetItem[] = (betsData?.bets ?? [])
    .filter((b: any) => b.status === activeTab)
    .map((b: any) => ({ ...b, _type: "sports" }));

  // lottery tickets: "cashed_out" tab has none
  const lotteryTickets: LotteryTicketItem[] = activeTab === "cashed_out"
    ? []
    : (lotteryData?.tickets ?? [])
        .filter((t) => t.status === activeTab)
        .map((t) => ({ ...t, _type: "lottery" as const }));

  // Merge and sort by createdAt descending
  const allItems: HistoryItem[] = [...sportsBets, ...lotteryTickets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const bets = sportsBets; // keep for live polling (uses fixture ids)

  const pendingFixtureIds = activeTab === "pending"
    ? [...new Set(
        bets.flatMap((b: any) => (b.selections ?? []).map((s: any) => s.fixture?.id).filter(Boolean))
      )]
    : [];

  const fixtureIdsKey = pendingFixtureIds.slice().sort().join(",");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!fixtureIdsKey) {
      setLiveFixtures(new Map());
      return;
    }

    async function poll() {
      const ids = fixtureIdsKey.split(",").map(Number).filter(Boolean);
      try {
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/fixtures/${id}`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
          ),
        );
        const map = new Map<number, LiveFixtureData>();
        for (const f of results) {
          if (f?.id != null) {
            map.set(f.id, { status: f.status, scoreHome: f.scoreHome ?? null, scoreAway: f.scoreAway ?? null, matchMinute: f.matchMinute ?? null });
          }
        }
        setLiveFixtures(map);
      } catch { /* non-fatal */ }
    }

    poll();
    intervalRef.current = setInterval(poll, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureIdsKey]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  async function handleShare(betId: number) {
    setSharingBetId(betId);
    const code = await shareBet(betId);
    setSharingBetId(null);
    if (code) setSharedCode({ betId, code });
  }

  async function handleReplay(betId: number) {
    setReplayingBetId(betId);
    await replayBet(betId);
    setReplayingBetId(null);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedShareCode(true);
      setTimeout(() => setCopiedShareCode(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{t("bets.title")}</h1>
        <p className="text-muted-foreground">{t("bets.desc")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); setExpanded(new Set()); }} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="pending">{t("bets.pending")}</TabsTrigger>
          <TabsTrigger value="won">{t("bets.won")}</TabsTrigger>
          <TabsTrigger value="lost">{t("bets.lost")}</TabsTrigger>
          <TabsTrigger value="cashed_out"><span className="sm:hidden">C/O</span><span className="hidden sm:inline">{t("bets.cashed_out")}</span></TabsTrigger>
        </TabsList>

        <div className="space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-accent/50 rounded-xl animate-pulse" />
            ))
          ) : allItems.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border rounded-xl">
              <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("bets.no_bets")}</p>
            </div>
          ) : (
            allItems.map((item) => {
              // ── Lottery ticket card ──────────────────────────────────────
              if (item._type === "lottery") {
                const ticket = item as LotteryTicketItem;
                const key = `lottery-${ticket.id}`;
                return (
                  <LotteryTicketCard
                    key={key}
                    ticket={ticket}
                    isOpen={expanded.has(key)}
                    onToggle={() => toggle(key)}
                    formatCurrencyFn={(amount) => formatCurrency(amount)}
                  />
                );
              }

              // ── Sports bet card ──────────────────────────────────────────
              const bet = item as SportsBetItem;
              const key = `sports-${bet.id}`;
              const isOpen = expanded.has(key);
              const selCount = bet.selections?.length ?? 0;
              const label = selCount === 1 ? t("bets.single") : `${selCount}-Fold Accumulator`;

              const hasLiveSelection = activeTab === "pending" && (bet.selections ?? []).some((s: any) => {
                const live = liveFixtures.get(s.fixture?.id);
                return live?.status === "live";
              });
              // Fixture(s) have finished but the bet itself hasn't been settled yet —
              // distinct grey "awaiting settlement" state, not the active red live state.
              const hasFinishedAwaitingSettlement = !hasLiveSelection && activeTab === "pending" &&
                (bet.selections ?? []).some((s: any) => {
                  const live = liveFixtures.get(s.fixture?.id);
                  return live?.status === "finished" || s.fixture?.status === "finished";
                });

              return (
                <div
                  key={key}
                  className={`rounded-xl border bg-card overflow-hidden transition-colors ${
                    hasLiveSelection
                      ? "border-red-500/30"
                      : hasFinishedAwaitingSettlement
                      ? "border-muted-foreground/30"
                      : "border-border"
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(key);
                      }
                    }}
                    className="w-full p-3.5 hover:bg-accent/20 transition-colors text-left cursor-pointer"
                  >
                    {/* Row 1: bet title + amount */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-semibold text-sm leading-snug">
                        Bet #{bet.id}
                        <span className="text-muted-foreground font-normal"> · {label}</span>
                      </span>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-muted-foreground leading-none mb-0.5">
                          {bet.status === "won"
                            ? t("bets.won")
                            : bet.status === "cashed_out"
                            ? <><span className="sm:hidden">C/O</span><span className="hidden sm:inline">{t("bets.cashed_out")}</span></>
                            : t("bets.to_win")}
                        </div>
                        <div className={`font-black text-sm leading-none ${bet.status === "won" || bet.status === "cashed_out" ? "text-primary" : ""}`}>
                          {bet.status === "cashed_out" && bet.cashOutAmount != null
                            ? formatCurrencyAt(Number(bet.cashOutAmount), bet.cashOutExchangeRate ?? bet.exchangeRate)
                            : formatCurrencyAt(Number(bet.potentialWin), bet.exchangeRate)}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: badges + action buttons */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[bet.status]}`}>
                          {bet.status.toUpperCase()}
                        </span>
                        {bet.code && (
                          <span className="font-mono text-[10px] font-bold tracking-widest bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
                            {bet.code}
                          </span>
                        )}
                        {hasLiveSelection ? (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : hasFinishedAwaitingSettlement && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground bg-accent px-1.5 py-0.5 rounded-full">
                            FT · AWAITING SETTLEMENT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {activeTab === "pending" && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <CashOutButton betId={bet.id} stake={Number(bet.stake)} potentialWin={Number(bet.potentialWin)} />
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: date */}
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      {format(new Date(bet.createdAt), "PPP 'at' p")}
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/60">
                          {bet.selections && bet.selections.length > 0 ? (
                            <div className="divide-y divide-border/40">
                              {bet.selections.map((sel: any) => {
                                const outcome = getSelectionOutcome(sel);
                                const fixtureId = sel.fixture?.id;
                                const live = fixtureId ? liveFixtures.get(fixtureId) : null;
                                const isLive = live?.status === "live";
                                const isFinishedLive = live?.status === "finished";
                                const hasLiveScore = live != null && (live.scoreHome != null || live.scoreAway != null);

                                const score =
                                  hasLiveScore
                                    ? `${live!.scoreHome ?? 0} – ${live!.scoreAway ?? 0}`
                                    : sel.fixture?.status === "finished" &&
                                      sel.fixture?.scoreHome !== null &&
                                      sel.fixture?.scoreAway !== null
                                    ? `${sel.fixture.scoreHome} – ${sel.fixture.scoreAway}`
                                    : null;

                                return (
                                  <div
                                    key={sel.id}
                                    className={`flex items-center justify-between px-5 py-3.5 transition-colors ${
                                      outcome === "won"
                                        ? "bg-emerald-500/5"
                                        : outcome === "lost"
                                        ? "bg-destructive/5"
                                        : isLive
                                        ? "bg-red-500/5"
                                        : "hover:bg-accent/10"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3 min-w-0">
                                      <SelectionOutcomeIcon outcome={outcome} />
                                      <div className="space-y-0.5 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-semibold text-sm">{sel.selection}</span>
                                          {isLive && (
                                            <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded leading-none">
                                              <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                                              {live?.matchMinute ? live.matchMinute : "LIVE"}
                                            </span>
                                          )}
                                          {isFinishedLive && (
                                            <span className="text-[9px] font-bold text-muted-foreground bg-accent px-1.5 py-0.5 rounded leading-none">
                                              FT
                                            </span>
                                          )}
                                          {(sel.selection?.includes("1UP") || sel.selection?.includes("2UP")) && (
                                            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded leading-none">
                                              {sel.selection?.includes("1UP") ? "1UP" : "2UP"}
                                            </span>
                                          )}
                                          {sel.upWon && (
                                            <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded leading-none">
                                              ✓ LOCKED IN
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm text-muted-foreground truncate">
                                          {sel.fixture?.homeTeam?.name ?? "—"} vs {sel.fixture?.awayTeam?.name ?? "—"}
                                        </div>
                                        {(sel.fixture?.league?.name || sel.fixture?.startTime) && (
                                          <div className="text-[11px] text-muted-foreground/60 leading-tight">
                                            {[
                                              sel.fixture?.league?.name,
                                              (sel.fixture?.displayTime ?? sel.fixture?.startTime)
                                                ? fmtUTCDateTimeShort(sel.fixture.displayTime ?? sel.fixture.startTime)
                                                : null,
                                            ].filter(Boolean).join("  ·  ")}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                                            {sel.market?.replace(/_/g, " ")}
                                          </span>
                                          {score && (
                                            <span className={`text-xs font-mono font-bold border rounded px-1.5 py-0.5 ${
                                              isLive
                                                ? "text-red-400 border-red-500/30 bg-red-500/5"
                                                : "text-muted-foreground border-border/60"
                                            }`}>
                                              {score}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right ml-4 shrink-0">
                                      <div className="text-xs text-muted-foreground mb-0.5">{t("bets.odds")}</div>
                                      <div className="font-bold text-primary">{Number(sel.odds).toFixed(2)}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="px-5 py-4 text-sm text-muted-foreground">{t("bets.no_selections")}</div>
                          )}

                          <div className="flex items-center justify-between px-5 py-3.5 bg-accent/10 border-t border-border/60 text-sm">
                            <div className="flex gap-6">
                              <div>
                                <div className="text-xs text-muted-foreground mb-0.5">{t("betslip.stake")}</div>
                                <div className="font-bold">{formatCurrencyAt(Number(bet.stake), bet.exchangeRate)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-0.5">{t("betslip.total_odds")}</div>
                                <div className="font-bold">{Number(bet.totalOdds).toFixed(2)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {bet.status === "cashed_out" && (
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground mb-0.5">{t("bets.cash_out_sacrificed")}</div>
                                  <div className="font-bold text-destructive">
                                    {formatCurrencyAt(Math.max(0, Number(bet.potentialWin) - Number(bet.cashOutAmount ?? 0)), bet.cashOutExchangeRate ?? bet.exchangeRate)}
                                  </div>
                                </div>
                              )}
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-0.5">
                                  {bet.status === "won"
                                    ? t("bets.won")
                                    : bet.status === "cashed_out"
                                    ? <><span className="sm:hidden">C/O</span><span className="hidden sm:inline">{t("bets.cashed_out")}</span></>
                                    : t("betslip.potential_win")}
                                </div>
                                <div className={`font-black text-lg ${bet.status === "won" || bet.status === "cashed_out" ? "text-primary" : ""}`}>
                                  {bet.status === "cashed_out" && bet.cashOutAmount != null
                                    ? formatCurrencyAt(Number(bet.cashOutAmount), bet.cashOutExchangeRate ?? bet.exchangeRate)
                                    : formatCurrencyAt(Number(bet.potentialWin), bet.exchangeRate)}
                                </div>
                              </div>
                              <button
                                onClick={() => printBetSlip(historyBetToPrintData(bet), currency, exchangeRate)}
                                title={t("bets.print")}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 hover:bg-accent transition-colors shrink-0"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t("bets.print")}</span>
                              </button>
                              <button
                                onClick={() => handleShare(bet.id)}
                                disabled={sharingBetId === bet.id || isSharing}
                                title="Share Betslip"
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-border rounded-md px-3 py-2 hover:bg-accent transition-colors shrink-0 disabled:opacity-50"
                              >
                                {sharingBetId === bet.id ? <span className="w-3.5 h-3.5 animate-spin border border-current border-t-transparent rounded-full inline-block" /> : <Share2 className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{t("bets.share")}</span>
                              </button>
                              <button
                                onClick={() => handleReplay(bet.id)}
                                disabled={replayingBetId === bet.id}
                                title="Replay — load upcoming events into bet slip"
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-border rounded-md px-3 py-2 hover:bg-accent transition-colors shrink-0 disabled:opacity-50"
                              >
                                {replayingBetId === bet.id ? <span className="w-3.5 h-3.5 animate-spin border border-current border-t-transparent rounded-full inline-block" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{t("bets.replay")}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </Tabs>

      {/* Share code modal */}
      {sharedCode && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
            <BookMarked className="w-10 h-10 text-primary mx-auto" />
            <div>
              <p className="font-bold text-lg">{t("bets.share_betslip")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("bets.share_betslip_desc")}</p>
            </div>
            <div className="bg-accent rounded-lg px-4 py-3 font-mono text-2xl font-bold tracking-widest select-all">
              {sharedCode.code}
            </div>
            <button
              onClick={() => copyCode(sharedCode.code)}
              className="flex items-center gap-2 mx-auto text-sm text-primary hover:underline"
            >
              {copiedShareCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedShareCode ? t("betslip.copied") : t("betslip.copy_code")}
            </button>
            <p className="text-[11px] text-muted-foreground">{t("bets.share_valid_note")}</p>
            <Button className="w-full" onClick={() => setSharedCode(null)}>{t("betslip.done")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
