import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Clock, Zap, Globe, Timer, ChevronDown, ChevronRight } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { countryFlagUrl } from "@/lib/countryFlags";

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

  if (ms <= 3 * HOUR) {
    return (
      <span className="text-rose-400 font-mono font-bold tabular-nums">
        {hh > 0 ? `${hh}:` : ""}{pad(mm)}:{pad(ss)}
      </span>
    );
  }

  if (ms <= 18 * HOUR) {
    return (
      <span className="text-amber-400 font-mono font-semibold tabular-nums">
        {hh}h {pad(mm)}m
      </span>
    );
  }

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

function urgency(drawDate: Date | null): "closing" | "soon" | null {
  if (!drawDate) return null;
  const ms = drawDate.getTime() - Date.now();
  if (ms <= 0) return null;
  if (ms <= 3 * HOUR) return "closing";
  if (ms <= 18 * HOUR) return "soon";
  return null;
}

// ── Country flag ─────────────────────────────────────────────────────────────

function CountryFlag({ country }: { country: string }) {
  const [failed, setFailed] = useState(false);
  const url = countryFlagUrl(country);
  if (!url || failed) {
    return <Globe className="w-4 h-4 text-muted-foreground shrink-0" />;
  }
  return (
    <img
      src={url}
      alt={country}
      width={20}
      height={15}
      className="object-cover rounded-sm shrink-0"
      style={{ width: 20, height: 15 }}
      onError={() => setFailed(true)}
    />
  );
}

// ── Game row (compact, inside an open country panel) ─────────────────────────

function LotteryGameRow({ game }: { game: LotteryGame }) {
  const drawDate = game.nextDrawAt ? new Date(game.nextDrawAt) : null;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!drawDate) return;
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, [drawDate]);

  const tier = urgency(drawDate);

  return (
    <Link href={`/lottery/${game.slug}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer border-t border-border/40 first:border-t-0">
        {/* Logo / emoji */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden"
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
          <span className="text-lg" style={{ display: game.logoUrl ? "none" : "flex" }}>
            {game.emoji}
          </span>
        </div>

        {/* Name + pick info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground truncate">{game.name}</span>
            {tier === "closing" && (
              <Badge className="text-[10px] bg-rose-500/20 text-rose-400 border-rose-500/40 shrink-0 animate-pulse py-0 px-1.5">
                CLOSING
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Pick {game.mainNumbersCount} from 1–{game.mainNumbersMax}
            {game.bonusNumbersCount > 0 && ` + ${game.bonusNumbersCount} bonus`}
          </span>
        </div>

        {/* Next draw */}
        <div className="shrink-0 text-right hidden sm:block">
          <div
            className={`text-[10px] flex items-center justify-end gap-1 mb-0.5 ${
              tier === "closing"
                ? "text-rose-400"
                : tier === "soon"
                ? "text-amber-400"
                : "text-muted-foreground"
            }`}
          >
            {tier === "closing" ? <Timer className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            <span>{tier === "closing" ? "Closing in" : "Next draw"}</span>
          </div>
          <div className="text-xs font-semibold">
            <DrawTimer drawDate={drawDate} />
          </div>
        </div>

        {/* Play button */}
        <div
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all"
          style={{
            background: `${game.color}20`,
            color: game.color,
            border: `1px solid ${game.color}40`,
          }}
        >
          <Zap className="w-3 h-3" />
          Play
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function LotterySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-accent/40 animate-pulse" />
      ))}
    </div>
  );
}

// ── Country group ─────────────────────────────────────────────────────────────

function CountryGroup({
  country,
  games,
  defaultOpen,
}: {
  country: string;
  games: LotteryGame[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
      >
        <CountryFlag country={country} />
        <span className="flex-1 text-sm font-semibold text-left">{country}</span>
        <span className="text-xs text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded-full mr-1">
          {games.length}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border/50">
          {games.map((game) => (
            <LotteryGameRow key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
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
    refetchInterval: 60 * 1000,
  });

  // Group by country, sort alphabetically (Europe/International last)
  const grouped = (() => {
    const map = new Map<string, LotteryGame[]>();
    for (const g of games ?? []) {
      if (!map.has(g.country)) map.set(g.country, []);
      map.get(g.country)!.push(g);
    }
    return [...map.entries()].sort(([a], [b]) => {
      const intl = new Set(["europe", "international", "world"]);
      const aIntl = intl.has(a.toLowerCase());
      const bIntl = intl.has(b.toLowerCase());
      if (aIntl && !bIntl) return 1;
      if (!aIntl && bIntl) return -1;
      return a.localeCompare(b);
    });
  })();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-2">
      {isLoading ? (
        <LotterySkeleton />
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <span className="text-5xl mb-4 block">🎰</span>
          <p className="text-lg font-medium">No games available yet</p>
          <p className="text-sm mt-1">Check back soon</p>
        </div>
      ) : (
        grouped.map(([country, countryGames], i) => (
          <CountryGroup
            key={country}
            country={country}
            games={countryGames}
            defaultOpen={i === 0}
          />
        ))
      )}
    </div>
  );
}
