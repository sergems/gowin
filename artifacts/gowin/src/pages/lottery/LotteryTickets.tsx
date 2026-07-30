import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Clock, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  won:     "bg-primary/20 text-primary border-primary/30",
  lost:    "bg-destructive/20 text-destructive border-destructive/30",
};

interface TicketWithGame {
  id: number;
  userId: number;
  gameId: number;
  drawId: number | null;
  numbers: number[];
  bonusNumbers: number[];
  stake: number;
  status: string;
  prizeAmount: number | null;
  potentialWin: string | number | null;
  odds: string | null;
  code: string | null;
  createdAt: string;
  game: {
    name: string;
    slug: string;
    color: string;
    emoji: string;
    mainNumbersMax: number;
  };
  draw: {
    id: number;
    drawDate: string;
    winningNumbers: number[];
    bonusNumbers: number[];
    status: string;
  } | null;
}

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

function TicketCard({ ticket, formatCurrencyFn }: { ticket: TicketWithGame; formatCurrencyFn: (n: number) => string }) {
  const { t } = useSiteSettings();
  const [isOpen, setIsOpen] = useState(false);
  const color = ticket.game.color;
  const winSet = new Set(ticket.draw?.winningNumbers ?? []);
  const bonusWinSet = new Set(ticket.draw?.bonusNumbers ?? []);
  const drawSettled = ticket.draw?.status === "settled";
  const potentialWin = ticket.potentialWin != null ? parseFloat(String(ticket.potentialWin)) : null;

  const borderColor =
    ticket.status === "won"  ? "border-violet-500/40" :
    ticket.status === "lost" ? "border-destructive/30" :
                               "border-violet-500/20";

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-colors ${borderColor}`}>
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }} />

      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(v => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsOpen(v => !v); } }}
        className="w-full p-3.5 hover:bg-accent/20 transition-colors text-left cursor-pointer"
      >
        {/* Row 1: title + payout */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="font-semibold text-sm leading-snug flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            {ticket.game.emoji && <span>{ticket.game.emoji}</span>}
            {ticket.game.name}
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

        {/* Row 2: badges + chevron */}
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
              <div className="px-5 py-4 space-y-3">
                {/* Your numbers */}
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">{t("lottery.your_numbers")}</p>
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

                {/* Winning numbers (if draw settled) */}
                {drawSettled && ticket.draw && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2">{t("lottery.winning_numbers")}</p>
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

              {/* Footer */}
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

export default function LotteryTickets() {
  const { user } = useAuth();
  const { t, formatCurrency } = useSiteSettings();
  const [tab, setTab] = useState<"all" | "pending" | "won" | "lost">("all");

  const { data, isLoading } = useQuery<{ tickets: TicketWithGame[] }>({
    queryKey: ["lottery-tickets"],
    queryFn: async () => {
      const token = localStorage.getItem("gowin_token");
      const r = await fetch("/api/lottery/tickets/my?limit=200", { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  const allTickets = data?.tickets ?? [];
  const filtered = tab === "all" ? allTickets : allTickets.filter((t) => t.status === tab);

  const counts = {
    all: allTickets.length,
    pending: allTickets.filter((t) => t.status === "pending").length,
    won: allTickets.filter((t) => t.status === "won").length,
    lost: allTickets.filter((t) => t.status === "lost").length,
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <Ticket className="w-10 h-10 mx-auto text-muted-foreground/30" />
        <p className="text-muted-foreground">{t("lottery.login_to_view")}</p>
        <Link href="/login"><Button>{t("lottery.login_btn")}</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/lottery">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> {t("lottery.all_lotteries")}
            </button>
          </Link>
          <h1 className="text-xl font-bold">{t("lottery.my_lottery_tickets")}</h1>
        </div>
        <Link href="/lottery">
          <Button size="sm" className="gap-1.5">
            <Ticket className="w-3.5 h-3.5" /> {t("lottery.buy_ticket")}
          </Button>
        </Link>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="won" className="flex-1">Won ({counts.won})</TabsTrigger>
          <TabsTrigger value="lost" className="flex-1">Lost ({counts.lost})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("lottery.no_tickets_yet")}</p>
          <Link href="/lottery">
            <Button variant="outline" size="sm" className="mt-4">{t("lottery.buy_a_ticket")}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => <TicketCard key={t.id} ticket={t} formatCurrencyFn={formatCurrency} />)}
        </div>
      )}
    </div>
  );
}
