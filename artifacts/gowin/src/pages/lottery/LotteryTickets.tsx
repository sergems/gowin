import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Trophy, Clock, XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";

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

function NumberBall({ n, matched, color, size = "sm" }: { n: number; matched?: boolean; color: string; size?: "sm" | "xs" }) {
  const base = size === "xs" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <div
      className={`${base} rounded-full font-bold flex items-center justify-center border-2 shrink-0 transition-all
        ${matched ? "text-white" : "bg-background text-muted-foreground border-border"}`}
      style={matched ? { backgroundColor: color, borderColor: color, boxShadow: `0 0 8px ${color}55` } : {}}
    >
      {n}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "won") return (
    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
      <Trophy className="w-3 h-3" /> Won
    </Badge>
  );
  if (status === "lost") return (
    <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
      <XCircle className="w-3 h-3" /> Lost
    </Badge>
  );
  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
      <Clock className="w-3 h-3" /> Pending draw
    </Badge>
  );
}

function TicketCard({ ticket }: { ticket: TicketWithGame }) {
  const color = ticket.game.color;
  const winSet = new Set(ticket.draw?.winningNumbers ?? []);
  const bonusWinSet = new Set(ticket.draw?.bonusNumbers ?? []);

  return (
    <div
      className="rounded-2xl border bg-card overflow-hidden"
      style={{ borderColor: ticket.status === "won" ? "#22c55e40" : ticket.status === "lost" ? "#ef444440" : "hsl(var(--border))" }}
    >
      <div
        className="h-1 w-full"
        style={{ background: ticket.status === "won" ? "#22c55e" : ticket.status === "lost" ? "#ef4444" : color }}
      />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">{ticket.game.emoji}</span>
            <div>
              <p className="font-semibold text-sm">{ticket.game.name}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(ticket.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Your numbers */}
        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5">Your numbers</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {ticket.numbers.map((n) => (
              <NumberBall key={n} n={n} matched={ticket.draw ? winSet.has(n) : false} color={color} />
            ))}
            {ticket.bonusNumbers.length > 0 && (
              <>
                <span className="text-muted-foreground text-xs">+</span>
                {ticket.bonusNumbers.map((n) => (
                  <NumberBall key={`b${n}`} n={n} matched={ticket.draw ? bonusWinSet.has(n) : false} color="#f59e0b" />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Winning numbers (if draw settled) */}
        {ticket.draw && ticket.draw.status === "settled" && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Winning numbers</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              {ticket.draw.winningNumbers.map((n) => (
                <NumberBall key={n} n={n} matched={ticket.numbers.includes(n)} color={color} />
              ))}
              {ticket.draw.bonusNumbers.length > 0 && (
                <>
                  <span className="text-muted-foreground text-xs">+</span>
                  {ticket.draw.bonusNumbers.map((n) => (
                    <NumberBall key={`b${n}`} n={n} matched={ticket.bonusNumbers.includes(n)} color="#f59e0b" />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Prize / draw info */}
        <div className="flex items-center justify-between text-sm pt-1 border-t border-border/30">
          <span className="text-muted-foreground text-xs">Stake: ${ticket.stake.toFixed(2)}</span>
          {ticket.status === "won" && ticket.prizeAmount != null && (
            <span className="font-bold text-emerald-400 text-sm">+ ${ticket.prizeAmount.toFixed(2)}</span>
          )}
          {ticket.draw?.drawDate && (
            <span className="text-xs text-muted-foreground">Draw: {format(new Date(ticket.draw.drawDate), "MMM d")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LotteryTickets() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"all" | "pending" | "won" | "lost">("all");

  const { data, isLoading } = useQuery<{ tickets: TicketWithGame[] }>({
    queryKey: ["lottery-tickets"],
    queryFn: async () => {
      const token = localStorage.getItem("gowin_token");
      const r = await fetch("/api/lottery/tickets", { headers: { Authorization: `Bearer ${token}` } });
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
        <p className="text-muted-foreground">Login to view your lottery tickets.</p>
        <Link href="/login"><Button>Login</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/lottery">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> All Lotteries
            </button>
          </Link>
          <h1 className="text-xl font-bold">My Lottery Tickets</h1>
        </div>
        <Link href="/lottery">
          <Button size="sm" className="gap-1.5">
            <Ticket className="w-3.5 h-3.5" /> Buy Ticket
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
          <p className="text-sm">No {tab === "all" ? "" : tab} tickets yet.</p>
          <Link href="/lottery">
            <Button variant="outline" size="sm" className="mt-4">Buy a ticket</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}
    </div>
  );
}
