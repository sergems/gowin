import { useState } from "react";
import { useGetMyBets } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Trophy, Clock, CheckCircle2, XCircle, HelpCircle, Printer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { printBetSlip, historyBetToPrintData } from "@/lib/printBetSlip";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  won:     "bg-primary/20 text-primary border-primary/30",
  lost:    "bg-destructive/20 text-destructive border-destructive/30",
  void:    "bg-muted/40 text-muted-foreground border-border",
};

type SelectionOutcome = "won" | "lost" | "pending" | "unknown";

function getSelectionOutcome(sel: any): SelectionOutcome {
  const fixture = sel.fixture;
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

export default function History() {
  const [activeTab, setActiveTab] = useState<"pending" | "won" | "lost" | "void">("pending");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data: betsData, isLoading } = useGetMyBets({
    query: { queryKey: ["myBets", activeTab] },
  });

  const bets = betsData?.bets?.filter((b) => b.status === activeTab) || [];

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">My Bets</h1>
        <p className="text-muted-foreground">View your bet history and track pending wagers</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); setExpanded(new Set()); }} className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="won">Won</TabsTrigger>
          <TabsTrigger value="lost">Lost</TabsTrigger>
          <TabsTrigger value="void">Void</TabsTrigger>
        </TabsList>

        <div className="space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-accent/50 rounded-xl animate-pulse" />
            ))
          ) : bets.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border rounded-xl">
              <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No {activeTab} bets found.</p>
            </div>
          ) : (
            bets.map((bet: any) => {
              const isOpen = expanded.has(bet.id);
              const selCount = bet.selections?.length ?? 0;
              const label = selCount === 1 ? "Single" : `${selCount}-Fold Accumulator`;

              return (
                <div
                  key={bet.id}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Collapsed header */}
                  <button
                    onClick={() => toggle(bet.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[bet.status]}`}>
                        {bet.status.toUpperCase()}
                      </span>

                      <div>
                        <div className="font-semibold text-sm leading-none flex items-center gap-2 flex-wrap">
                          <span>Bet #{bet.id} &nbsp;·&nbsp; <span className="text-muted-foreground font-normal">{label}</span></span>
                          {bet.code && (
                            <span className="font-mono text-xs font-bold tracking-widest bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5">
                              {bet.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(bet.createdAt), "PPP 'at' p")}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-muted-foreground">Stake</div>
                        <div className="font-bold text-sm">${Number(bet.stake).toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {bet.status === "won" ? "Won" : "To Win"}
                        </div>
                        <div className={`font-black text-sm ${bet.status === "won" ? "text-primary" : ""}`}>
                          ${Number(bet.potentialWin).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-muted-foreground ml-1">
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded body */}
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
                                const score =
                                  sel.fixture?.status === "finished" &&
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
                                        : "hover:bg-accent/10"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3 min-w-0">
                                      <SelectionOutcomeIcon outcome={outcome} />
                                      <div className="space-y-0.5 min-w-0">
                                        <div className="font-semibold text-sm">{sel.selection}</div>
                                        <div className="text-sm text-muted-foreground truncate">
                                          {sel.fixture?.homeTeam?.name ?? "—"} vs {sel.fixture?.awayTeam?.name ?? "—"}
                                        </div>
                                        {(sel.fixture?.league?.name || sel.fixture?.startTime) && (
                                          <div className="text-[11px] text-muted-foreground/60 leading-tight">
                                            {[
                                              sel.fixture?.league?.name,
                                              sel.fixture?.startTime
                                                ? format(new Date(sel.fixture.startTime), "d MMM · HH:mm")
                                                : null,
                                            ].filter(Boolean).join("  ·  ")}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                                            {sel.market?.replace(/_/g, " ")}
                                          </span>
                                          {score && (
                                            <span className="text-xs font-mono font-bold text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
                                              {score}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right ml-4 shrink-0">
                                      <div className="text-xs text-muted-foreground mb-0.5">Odds</div>
                                      <div className="font-bold text-primary">{Number(sel.odds).toFixed(2)}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="px-5 py-4 text-sm text-muted-foreground">No selections found.</div>
                          )}

                          {/* Footer summary */}
                          <div className="flex items-center justify-between px-5 py-3.5 bg-accent/10 border-t border-border/60 text-sm">
                            <div className="flex gap-6">
                              <div>
                                <div className="text-xs text-muted-foreground mb-0.5">Stake</div>
                                <div className="font-bold">${Number(bet.stake).toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-0.5">Total Odds</div>
                                <div className="font-bold">{Number(bet.totalOdds).toFixed(2)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-0.5">
                                  {bet.status === "won" ? "Won" : "Potential Win"}
                                </div>
                                <div className={`font-black text-lg ${bet.status === "won" ? "text-primary" : ""}`}>
                                  ${Number(bet.potentialWin).toFixed(2)}
                                </div>
                              </div>
                              <button
                                onClick={() => printBetSlip(historyBetToPrintData(bet))}
                                title="Print bet slip"
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 hover:bg-accent transition-colors shrink-0"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Print</span>
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
    </div>
  );
}
