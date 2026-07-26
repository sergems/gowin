import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Clock, Zap, Globe, Timer, ChevronDown, ChevronRight, ChevronLeft, Star } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { countryFlagUrl } from "@/lib/countryFlags";

// ── Banner slider ─────────────────────────────────────────────────────────────

interface SlideItem { id: number; url: string; sortOrder: number; }

function BannerSlider() {
  const { data: slides = [] } = useQuery<SlideItem[]>({
    queryKey: ["slides"],
    queryFn: () => fetch("/api/slides").then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [slides.length, paused, next]);

  useEffect(() => { setCurrent(0); }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden select-none rounded-xl"
      style={{ aspectRatio: "956 / 412" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <img
          key={slide.id}
          src={slide.url}
          alt={`Banner ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
          draggable={false}
        />
      ))}

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all ${i === current ? "bg-white w-4 h-1.5" : "bg-white/50 w-1.5 h-1.5"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
  drawTime: string | null;
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

  if (ms <= 30 * 60_000) {
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
  if (ms <= 30 * 60_000) return "closing";
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
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer border-t border-border/30 first:border-t-0 group">
        {/* Logo / emoji */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 overflow-hidden"
          style={{ background: `${game.color}22`, border: `1px solid ${game.color}35` }}
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
                if (fallback) fallback.style.display = "";
              }}
            />
          ) : null}
          <span style={{ display: game.logoUrl ? "none" : "" }}>{game.emoji}</span>
        </div>

        {/* Name + pick info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground truncate leading-tight">{game.name}</span>
            {tier === "closing" && (
              <span className="text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                CLOSING
              </span>
            )}
            {tier === "soon" && (
              <span className="text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded-full shrink-0">
                SOON
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground/70 leading-tight">
            Pick {game.mainNumbersCount} of {game.mainNumbersMax}
            {game.bonusNumbersCount > 0 && ` + ${game.bonusNumbersCount} bonus`}
          </span>
        </div>

        {/* Next draw timer */}
        <div className="shrink-0 text-right hidden sm:block min-w-[72px]">
          <div
            className={`text-[10px] flex items-center justify-end gap-0.5 mb-0.5 ${
              tier === "closing" ? "text-rose-400" : tier === "soon" ? "text-amber-400" : "text-muted-foreground/60"
            }`}
          >
            {tier === "closing" ? <Timer className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
            <span className="text-[10px]">{tier === "closing" ? "Closing" : "Draw"}</span>
          </div>
          <div className={`text-xs font-bold tabular-nums ${tier === "closing" ? "text-rose-400" : tier === "soon" ? "text-amber-400" : "text-foreground/80"}`}>
            <DrawTimer drawDate={drawDate} />
          </div>
        </div>

        {/* Bet Now button */}
        <div
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-all group-hover:brightness-110"
          style={{
            background: game.color,
            color: "white",
            boxShadow: `0 2px 8px ${game.color}40`,
          }}
        >
          <Zap className="w-3 h-3" />
          Bet Now
        </div>
      </div>
    </Link>
  );
}

// ── Popular card ─────────────────────────────────────────────────────────────

const POPULAR_SLUGS = [
  "uk-49s-lunchtime",
  "uk-49s-teatime",
  "french-5-49",
  "mega-millions",
] as const;

function PopularCard({ game }: { game: LotteryGame }) {
  const drawDate = game.nextDrawAt ? new Date(game.nextDrawAt) : null;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!drawDate) return;
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, [drawDate]);

  const tier = urgency(drawDate);

  const msLeft = drawDate ? drawDate.getTime() - Date.now() : null;
  let countdownLabel = "";
  if (msLeft !== null && msLeft > 0) {
    const hh = Math.floor(msLeft / 3_600_000);
    const mm = Math.floor((msLeft % 3_600_000) / 60_000);
    const ss = Math.floor((msLeft % 60_000) / 1_000);
    if (hh > 0) countdownLabel = `${hh}h ${pad(mm)}m`;
    else countdownLabel = `${pad(mm)}:${pad(ss)}`;
  } else if (msLeft !== null && msLeft <= 0) {
    countdownLabel = "Drawing now";
  }

  const flagUrl = countryFlagUrl(game.country);

  return (
    <Link href={`/lottery/${game.slug}`}>
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 select-none"
        style={{
          minWidth: 170,
          width: 170,
          boxShadow: `0 4px 24px ${game.color}40, 0 1px 4px #0008`,
          border: `1px solid ${game.color}35`,
        }}
      >
        {/* Colour header */}
        <div
          className="relative flex flex-col items-center justify-center gap-2 pt-5 pb-4 px-3"
          style={{ background: `linear-gradient(145deg, ${game.color}cc 0%, ${game.color}55 100%)` }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: `radial-gradient(circle at 80% 20%, white 0%, transparent 60%)` }}
          />

          {/* Logo → country flag image → emoji */}
          {game.logoUrl ? (
            <img
              src={game.logoUrl}
              alt={game.name}
              className="w-14 h-10 object-contain drop-shadow-lg relative z-10"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                const fb = e.currentTarget.nextSibling as HTMLElement | null;
                if (fb) fb.style.display = "";
              }}
            />
          ) : flagUrl ? (
            <img
              src={flagUrl}
              alt={game.country}
              className="object-cover rounded drop-shadow-lg relative z-10"
              style={{ width: 80, height: 60 }}
            />
          ) : (
            <span className="text-4xl leading-none drop-shadow-lg relative z-10">{game.emoji}</span>
          )}

          {tier === "closing" && (
            <span className="absolute top-2 right-2 text-[9px] font-bold bg-rose-500/80 text-white px-1.5 py-0.5 rounded-full animate-pulse z-10">
              CLOSING
            </span>
          )}
          {tier === "soon" && (
            <span className="absolute top-2 right-2 text-[9px] font-bold bg-amber-500/80 text-white px-1.5 py-0.5 rounded-full z-10">
              SOON
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2 px-3 py-3 bg-card flex-1">
          <div>
            <p className="font-bold text-sm leading-tight text-foreground line-clamp-2">{game.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{game.country}</p>
          </div>

          {countdownLabel && (
            <div
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg"
              style={{
                background: `${game.color}18`,
                color: tier === "closing" ? "#f87171" : tier === "soon" ? "#fbbf24" : game.color,
              }}
            >
              {tier === "closing" ? <Timer className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0" />}
              <span className="tabular-nums truncate">{countdownLabel}</span>
            </div>
          )}

          <button
            className="w-full mt-auto rounded-lg py-1.5 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
            style={{ background: game.color, boxShadow: `0 2px 10px ${game.color}50` }}
          >
            Play Now
          </button>
        </div>
      </div>
    </Link>
  );
}

function PopularSection({ games }: { games: LotteryGame[] }) {
  const featured = POPULAR_SLUGS
    .map((slug) => games.find((g) => g.slug === slug))
    .filter((g): g is LotteryGame => g !== undefined);
  if (featured.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Popular</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {featured.map((game) => <PopularCard key={game.id} game={game} />)}
      </div>
    </div>
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

function compareDrawTime(a: LotteryGame, b: LotteryGame): number {
  // Sort by actual next draw datetime; games with no upcoming draw go last
  const aTime = a.nextDrawAt ? new Date(a.nextDrawAt).getTime() : Infinity;
  const bTime = b.nextDrawAt ? new Date(b.nextDrawAt).getTime() : Infinity;
  if (aTime !== bTime) return aTime - bTime;
  // Fall back to recurring draw time, then name
  const aDraw = a.drawTime ?? "99:99";
  const bDraw = b.drawTime ?? "99:99";
  return aDraw.localeCompare(bDraw) || a.name.localeCompare(b.name);
}

function earliestDrawMs(games: LotteryGame[]): number {
  return games.reduce((best, g) => {
    const t = g.nextDrawAt ? new Date(g.nextDrawAt).getTime() : Infinity;
    return t < best ? t : best;
  }, Infinity);
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

  // Fixed priority: UK → France → Russia → USA → Europe → rest (alphabetical)
  const COUNTRY_PRIORITY: Record<string, number> = {
    "united kingdom": 0,
    "france": 1,
    "russia": 2,
    "united states": 3,
    "europe": 4,
  };

  const grouped = (() => {
    const map = new Map<string, LotteryGame[]>();
    for (const g of [...(games ?? [])].sort(compareDrawTime)) {
      if (!map.has(g.country)) map.set(g.country, []);
      map.get(g.country)!.push(g);
    }
    return [...map.entries()].sort(([a], [b]) => {
      const pa = COUNTRY_PRIORITY[a.toLowerCase()] ?? 5;
      const pb = COUNTRY_PRIORITY[b.toLowerCase()] ?? 5;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
  })();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <BannerSlider />
      {!isLoading && games && games.length > 0 && <PopularSection games={games} />}
      {isLoading ? (
        <LotterySkeleton />
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <span className="text-5xl mb-4 block">🎰</span>
          <p className="text-lg font-medium">No games available yet</p>
          <p className="text-sm mt-1">Check back soon</p>
        </div>
      ) : (
        grouped.map(([country, countryGames]) => (
          <CountryGroup
            key={country}
            country={country}
            games={countryGames}
            defaultOpen={false}
          />
        ))
      )}
    </div>
  );
}
