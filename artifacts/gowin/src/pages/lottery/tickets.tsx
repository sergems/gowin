import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Ticket, Trophy, XCircle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import api from "@/lib/api";
import { format } from "date-fns";

interface LotteryTicket {
  id: number;
  userId: number;
  gameId: number;
  drawId: number | null;
  numbers: number[];
  bonusNumbers: number[];
  stake: number;
  status: "pending" | "won" | "lost";
  prizeAmount: number | null;
  createdAt: string;
  game: {
    id: number;
    name: string;
    slug: string;
    emoji: string;
    color: string;
    mainNumbersCount: number;
    bonusNumbersCount: number;
  } | null;
  draw: {
    id: number;
    drawDate: string;
    winningNumbers: number[];
    bonusNumbers: number[];
    jackpot: number;
    status: string;
  } | null;
}

interface TicketsResponse {
  tickets: LotteryTicket[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_STYLES: Record<string, { cls: string; icon: typeof Ticket; label: string }> = {
  pending: { cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: Clock, label: "Pending" },
  won:     { cls: "bg-primary/15 text-primary border-primary/30",          icon: Trophy, label: "Won" },
  lost:    { cls: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle, label: "Lost" },
};

function TicketCard({ ticket }: { ticket: LotteryTicket }) {
  const { formatCurrency } = useSiteSettings();
  const status = STATUS_STYLES[ticket.status] ?? STATUS_STYLES.pending;
  const StatusIcon = status.icon;
  const game = ticket.game;
  const draw = ticket.draw;

  const winningSet = new Set(draw?.winningNumbers ?? []);
  const bonusWinSet = new Set(draw?.bonusNumbers ?? []);

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all ${
      ticket.status === "won" ? "border-primary/30 shadow-md shadow-primary/5" :
      ticket.status === "lost" ? "border-border/30 opacity-75" :
      "border-border/50"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-2">
          {game && <span className="text-lg">{game.emoji}</span>}
          <div>
            <div className="font-semibold text-sm text-foreground">{game?.name ?? "Lucky Numbers Ticket"}</div>
            <div className="text-xs text-muted-foreground">#{ticket.id} · {format(new Date(ticket.createdAt), "PP")}</div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-xs flex items-center gap-1 ${status.cls}`}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-3">
        {/* Numbers */}
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Your Numbers</div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {ticket.numbers.map((n) => {
              const isWin = winningSet.has(n);
              return (
                <span
                  key={n}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isWin ? "text-white scale-110" : draw ? "text-muted-foreground bg-muted/30" : "text-foreground bg-muted/30"
                  }`}
                  style={isWin && game ? { background: game.color, boxShadow: `0 0 8px ${game.color}60` } : {}}
                >
                  {n}
                </span>
              );
            })}
            {ticket.bonusNumbers.map((n) => {
              const isWin = bonusWinSet.has(n);
              return (
                <span
                  key={`b${n}`}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                    isWin ? "text-white scale-110" : "text-muted-foreground bg-muted/20 border-border/40"
                  }`}
                  style={isWin ? { background: "#f59e0b", boxShadow: "0 0 8px #f59e0b60" } : {}}
                >
                  {n}
                </span>
              );
            })}
          </div>
        </div>

        {/* Winning numbers if draw settled */}
        {draw && draw.status === "settled" && draw.winningNumbers.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Winning Numbers</div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {draw.winningNumbers.map((n) => (
                <span key={n} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: game?.color ?? "#4ade80" }}>
                  {n}
                </span>
              ))}
              {draw.bonusNumbers.map((n) => (
                <span key={`b${n}`} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#f59e0b" }}>
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="text-xs text-muted-foreground">
            Stake: <span className="text-foreground font-medium">${ticket.stake.toFixed(2)}</span>
            {draw && <span className="ml-2">· Draw: {format(new Date(draw.drawDate), "PP")}</span>}
          </div>
          {ticket.status === "won" && ticket.prizeAmount && (
            <span className="text-sm font-black text-primary">
              +${ticket.prizeAmount.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="w-8 h-8 rounded-full" />)}
      </div>
      <Skeleton className="h-4 w-48" />
    </div>
  );
}

export default function LotteryTickets() {
  const [tab, setTab] = useState<"all" | "pending" | "won" | "lost">("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery<TicketsResponse>({
    queryKey: ["/api/lottery/tickets/my", tab, page],
    queryFn: async () => {
      const token = localStorage.getItem("gowin_token");
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await fetch(`/api/lottery/tickets/my?${params}`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed to load tickets");
      return res.json();
    },
  });

  const filteredTickets = tab === "all"
    ? (data?.tickets ?? [])
    : (data?.tickets ?? []).filter((t) => t.status === tab);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/lottery">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            My Lucky Numbers Tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total tickets</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setPage(1); }}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="won">Won</TabsTrigger>
          <TabsTrigger value="lost">Lost</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <TicketSkeleton key={i} />)}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No {tab !== "all" ? tab : ""} tickets yet</p>
          <Link href="/lottery">
            <Button variant="outline" className="mt-4">Browse Lotteries</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.total / limit)}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(data.total / limit)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
