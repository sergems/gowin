import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Ticket, Clock, Zap, Globe, Timer } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

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
  logoUrl: string | null;
  description: string | null;
}

// ── Countdown display ────────────────────────────────────────────────────────

const HOUR = 3_600_000;
const pad = (n: number) => String(n).padStart(2, "0");

function DrawTimer({ drawDate }: { drawDate: Date | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!drawDate) return;
    // Always tick every second — overhead is negligible for ~12 cards
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [drawDate]);

  if (!drawDate) return <span className="text-muted-foreground">TBD</span>;

  const ms = drawDate.getTime() - now;

  if (ms <= 0) {
    return <span className="text-green-400 font-semibold animate-pulse">Drawing now</span>;
  }

  const hh = Math.floor(ms / HOUR);
  const mm = Math.floor((ms % HOUR) / 60_000);
  const ss = Math.floor((ms % 60_000) / 1_000);

  // ≤ 3 hours: "HH:MM:SS" in red — Closing in
  if (ms <= 3 * HOUR) {
    return (
      <span className="text-rose-400 font-mono font-bold tabular-nums">
        {hh > 0 ? `${hh}:` : ""}{pad(mm)}:{pad(ss)}
      </span>
    );
  }

  // ≤ 18 hours: "Xh MMm" live countdown in amber
  if (ms <= 18 * HOUR) {
    return (
      <span className="text-amber-400 font-mono font-semibold tabular-nums">
        {hh}h {pad(mm)}m
      </span>
    );
  }

  // > 18 hours: smart static text
  const drawDay = drawDate.toDateString();
  const today = new Date().toDateString();
  const tomorrow = new Date(Date.now() + 86_400_000).toDateString();
  const time = drawDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (drawDay === today) return <span>Today at {time}</span>;
  if (drawDay === tomorrow) return <span>Tomorrow at {time}</span>;
  return <span>{formatDistanceToNow(drawDate, { addSuffix: true })}</span>;
}

/** Returns urgency tier based on ms remaining */
function urgency(drawDate: Date | null): "closing" | "soon" | null {
  if (!drawDate) return null;
  const ms = drawDate.getTime() - Date.now();
  if (ms <= 0) return null;
  if (ms <= 3 * HOUR) return "closing";
  if (ms <= 18 * HOUR) return "soon";
  return null;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

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

// ── Card ──────────────────────────────────────────────────────────────────────

function LotteryCard({ game }: { game: LotteryGame }) {
  const drawDate = game.nextDrawAt ? new Date(game.nextDrawAt) : null;

  // Live urgency badge — re-evaluates every second so badge switches automatically
  const [, tick] = useState(0);
  useEffect(() => {
    if (!drawDate) return;
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, [drawDate]);

  const tier = urgency(drawDate);
  const ms = drawDate ? drawDate.getTime() - Date.now() : Infinity;

  return (
    <Link href={`/lottery/${game.slug}`}>
      <div className="group relative rounded-xl border border-border/50 bg-card hover:border-primary/40 transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-primary/5">
        {/* Glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${game.color}10 0%, transparent 70%)` }}
        />

        {/* Urgency pulse overlay when ≤ 3 h */}
        {tier === "closing" && (
          <div className="absolute inset-0 rounded-xl border-2 border-rose-500/50 animate-pulse pointer-events-none" />
        )}

        <div className="p-5 space-y-4 relative">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300 overflow-hidden"
              style={{ background: `${game.color}20`, border: `1px solid ${game.color}30` }}
            >
              {game.logoUrl ? (
                <img
                  src={game.logoUrl}
                  alt={game.name}
                  className="w-full h-full object-contain p-0.5"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    const fallback = img.nextSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <span className="text-2xl" style={{ display: game.logoUrl ? "none" : "flex" }}>
                {game.emoji}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                {game.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Globe className="w-3 h-3" />
                <span>{game.country}</span>
              </div>
            </div>
            {tier === "closing" && (
              <Badge className="text-[10px] bg-rose-500/20 text-rose-400 border-rose-500/40 shrink-0 animate-pulse">
                CLOSING
              </Badge>
            )}
            {tier === "soon" && (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/10 shrink-0">
                SOON
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {/* Next Draw cell — switches label + colour when close */}
            <div
              className={`rounded-lg px-3 py-2 text-center transition-colors ${
                tier === "closing"
                  ? "bg-rose-500/10 border border-rose-500/20"
                  : tier === "soon"
                  ? "bg-amber-500/10 border border-amber-500/20"
                  : "bg-muted/30"
              }`}
            >
              <div
                className={`text-[10px] mb-0.5 flex items-center justify-center gap-1 ${
                  tier === "closing"
                    ? "text-rose-400"
                    : tier === "soon"
                    ? "text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                {tier === "closing" ? (
                  <Timer className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                <span>
                  {tier === "closing"
                    ? "Closing in"
                    : tier === "soon"
                    ? "Closes in"
                    : "Next Draw"}
                </span>
              </div>
              <div className="text-xs font-semibold">
                <DrawTimer drawDate={drawDate} />
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
            {game.bonusNumbersCount > 0 &&
              ` + ${game.bonusNumbersCount} bonus from 1–${game.bonusNumbersMax}`}
          </div>

          {/* CTA */}
          <div
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-center transition-all duration-300 group-hover:brightness-110"
            style={{
              background: `${game.color}25`,
              color: game.color,
              border: `1px solid ${game.color}40`,
            }}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LotteryLobby() {
  const { data: games, isLoading } = useQuery<LotteryGame[]>({
    queryKey: ["/api/lottery/games"],
    queryFn: async () => {
      const res = await fetch("/api/lottery/games");
      if (!res.ok) throw new Error("Failed to load games");
      const data = await res.json();
      return data.games;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // refresh every minute so nextDrawAt stays current
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <LotteryCardSkeleton key={i} />
            ))}
          </div>
        ) : !games || games.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <span className="text-5xl mb-4 block">🎰</span>
            <p className="text-lg font-medium">No games available yet</p>
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
