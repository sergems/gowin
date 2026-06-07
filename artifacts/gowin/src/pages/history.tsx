import { useState } from "react";
import { useGetMyBets } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Trophy, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  won:     "bg-primary/20 text-primary border-primary/30",
  lost:    "bg-destructive/20 text-destructive border-destructive/30",
  void:    "bg-muted/40 text-muted-foreground border-border",
};

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
                  {/* ── Collapsed header (always visible) ── */}
                  <button
                    onClick={() => toggle(bet.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status pill */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[bet.status]}`}>
                        {bet.status.toUpperCase()}
                      </span>

                      <div>
                        <div className="font-semibold text-sm leading-none">
                          Bet #{bet.id} &nbsp;·&nbsp;
                          <span className="text-muted-foreground font-normal">{label}</span>
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

                  {/* ── Expanded body ── */}
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
                          {/* Selections */}
                          {bet.selections && bet.selections.length > 0 ? (
                            <div className="divide-y divide-border/40">
                              {bet.selections.map((sel: any) => (
                                <div key={sel.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/10 transition-colors">
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-sm">{sel.selection}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {sel.fixture?.homeTeam?.name ?? "—"} vs {sel.fixture?.awayTeam?.name ?? "—"}
                                    </div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground/70">
                                      {sel.market?.replace(/_/g, " ")}
                                    </div>
                                  </div>
                                  <div className="text-right ml-4 shrink-0">
                                    <div className="text-xs text-muted-foreground mb-0.5">Odds</div>
                                    <div className="font-bold text-primary">{Number(sel.odds).toFixed(2)}</div>
                                  </div>
                                </div>
                              ))}
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
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground mb-0.5">
                                {bet.status === "won" ? "Won" : "Potential Win"}
                              </div>
                              <div className={`font-black text-lg ${bet.status === "won" ? "text-primary" : ""}`}>
                                ${Number(bet.potentialWin).toFixed(2)}
                              </div>
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
