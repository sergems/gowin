import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Ticket, Clock, Trophy, Zap, Globe } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";

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

function LotteryCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

function formatJackpot(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

function LotteryCard({ game }: { game: LotteryGame }) {
  const drawDate = game.nextDrawAt ? new Date(game.nextDrawAt) : null;
  const isDrawSoon = drawDate && (drawDate.getTime() - Date.now()) < 24 * 60 * 60 * 1000;

  return (
    <Link href={`/lottery/${game.slug}`}>
      <div className="group relative rounded-xl border border-border/50 bg-card hover:border-primary/40 transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-primary/5">
        {/* Glow effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${game.color}10 0%, transparent 70%)` }}
        />

        <div className="p-5 space-y-4 relative">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300"
              style={{ background: `${game.color}20`, border: `1px solid ${game.color}30` }}
            >
              {game.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{game.name}</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Globe className="w-3 h-3" />
                <span>{game.country}</span>
              </div>
            </div>
            {isDrawSoon && (
              <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400 bg-yellow-500/10 shrink-0">
                SOON
              </Badge>
            )}
          </div>

          {/* Jackpot */}
          <div
            className="rounded-lg px-4 py-3 text-center"
            style={{ background: `${game.color}15`, border: `1px solid ${game.color}25` }}
          >
            <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1.5">
              <Trophy className="w-3 h-3" />
              <span>JACKPOT</span>
            </div>
            <div
              className="text-2xl font-black tracking-tight"
              style={{ color: game.color }}
            >
              {formatJackpot(game.jackpot)}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Next Draw</span>
              </div>
              <div className="text-xs font-semibold text-foreground">
                {drawDate ? formatDistanceToNow(drawDate, { addSuffix: true }) : "TBD"}
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <Ticket className="w-3 h-3" />
                <span>Ticket</span>
              </div>
              <div className="text-xs font-semibold text-foreground">
                ${game.ticketPrice.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Pick info */}
          <div className="text-[10px] text-muted-foreground text-center">
            Pick {game.mainNumbersCount} from 1–{game.mainNumbersMax}
            {game.bonusNumbersCount > 0 && ` + ${game.bonusNumbersCount} bonus from 1–${game.bonusNumbersMax}`}
          </div>

          {/* CTA */}
          <div
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-center transition-all duration-300 group-hover:brightness-110"
            style={{ background: `${game.color}25`, color: game.color, border: `1px solid ${game.color}40` }}
          >
            <span className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              Play Now
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LotteryLobby() {
  const { data: games, isLoading } = useQuery<LotteryGame[]>({
    queryKey: ["/api/lottery/games"],
    queryFn: async () => {
      const res = await fetch("/api/lottery/games");
      if (!res.ok) throw new Error("Failed to load games");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(ellipse at 80% 50%, hsl(142 71% 45% / 0.3) 0%, transparent 60%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🎰</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">LIVE</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2">Lottery</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg">
            Play major international lotteries. Pick your numbers, buy your ticket, and win big jackpots.
          </p>
        </div>
      </div>

      {/* Games Grid */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Available Lotteries
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <LotteryCardSkeleton key={i} />)}
          </div>
        ) : !games || games.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <span className="text-5xl mb-4 block">🎰</span>
            <p className="text-lg font-medium">No lottery games available yet</p>
            <p className="text-sm mt-1">Check back soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {games.map((game) => (
              <LotteryCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
