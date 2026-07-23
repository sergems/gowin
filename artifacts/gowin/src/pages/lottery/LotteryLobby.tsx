import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Ticket, Clock, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface LotteryGame {
  id: number;
  name: string;
  slug: string;
  country: string;
  mainNumbersCount: number;
  mainNumbersMax: number;
  bonusNumbersCount: number;
  bonusNumbersMax: number;
  ticketPrice: number;
  jackpot: number;
  nextDrawAt: string | null;
  isActive: boolean;
  color: string;
  emoji: string;
  description: string | null;
}

function fmtJackpot(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(2)}`;
}

function GameCard({ game }: { game: LotteryGame }) {
  const glowStyle = { boxShadow: `0 0 30px ${game.color}22, 0 0 60px ${game.color}11` };
  const borderStyle = { borderColor: `${game.color}40` };

  return (
    <div
      className="relative rounded-2xl border bg-card overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group"
      style={{ ...glowStyle, ...borderStyle }}
    >
      {/* Header gradient */}
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(to right, ${game.color}, ${game.color}88)` }}
      />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl leading-none">{game.emoji}</span>
            <div>
              <h3 className="font-bold text-base leading-tight">{game.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{game.country}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: `${game.color}50`, color: game.color }}>
            {game.mainNumbersCount}/{game.mainNumbersMax}
            {game.bonusNumbersCount > 0 && ` +${game.bonusNumbersCount}`}
          </Badge>
        </div>

        {/* Jackpot */}
        <div className="text-center py-3 rounded-xl bg-background/60 border border-border/40">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
            Jackpot
          </p>
          <p
            className="text-2xl font-extrabold tabular-nums leading-none"
            style={{ color: game.color }}
          >
            {fmtJackpot(game.jackpot)}
          </p>
          <div className="flex items-center justify-center gap-1 mt-1.5">
            <Sparkles className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/60">Estimated jackpot</span>
          </div>
        </div>

        {/* Next draw */}
        {game.nextDrawAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Next draw: <span className="text-foreground font-medium">{format(new Date(game.nextDrawAt), "EEE, MMM d 'at' HH:mm")}</span></span>
          </div>
        )}

        {/* Description */}
        {game.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{game.description}</p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <Ticket className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold">${game.ticketPrice.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground">/ ticket</span>
          </div>
          <Link href={`/lottery/${game.slug}`}>
            <Button
              size="sm"
              className="font-semibold transition-all"
              style={{ backgroundColor: game.color, color: "#fff" }}
            >
              Play Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}

export default function LotteryLobby() {
  const { user } = useAuth();
  const { formatCurrency } = useSiteSettings();

  const { data, isLoading } = useQuery<{ games: LotteryGame[] }>({
    queryKey: ["lottery-games"],
    queryFn: () => fetch("/api/lottery/games").then((r) => r.json()),
    staleTime: 60_000,
  });

  const games = data?.games ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-background border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Lottery</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">
            Win Life-Changing Jackpots
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
            Play the world's biggest lotteries. Pick your lucky numbers, buy your ticket, and you could be our next jackpot winner.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-black text-primary tabular-nums">
            {games.length > 0 ? fmtJackpot(Math.max(...games.map((g) => g.jackpot))) : "—"}
          </div>
          <p className="text-xs text-muted-foreground">Biggest current jackpot</p>
          {user && (
            <Link href="/lottery/tickets">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Ticket className="w-3.5 h-3.5" /> My Tickets
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Games grid */}
      <div>
        <h2 className="text-lg font-bold mb-4">Choose Your Lottery</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No lottery games available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {games.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
        )}
      </div>
    </div>
  );
}
