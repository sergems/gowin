import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Shuffle, Trophy, Ticket, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
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
  color: string;
  emoji: string;
  description: string | null;
}
interface LotteryDraw {
  id: number;
  drawDate: string;
  winningNumbers: number[];
  bonusNumbers: number[];
  jackpot: number;
  status: string;
}

function fmtJackpot(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(2)}`;
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!targetDate) return;
    function tick() {
      const diff = new Date(targetDate!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

function NumberBall({
  n,
  selected,
  bonus = false,
  color,
  onClick,
  size = "md",
}: {
  n: number;
  selected: boolean;
  bonus?: boolean;
  color: string;
  onClick?: () => void;
  size?: "sm" | "md";
}) {
  const base = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${base} rounded-full font-bold flex items-center justify-center border-2 transition-all duration-150 shrink-0
        ${selected
          ? "text-white scale-110 shadow-lg"
          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground hover:scale-105"
        }
        ${!onClick ? "cursor-default" : "cursor-pointer"}
      `}
      style={selected ? { backgroundColor: color, borderColor: color, boxShadow: `0 0 12px ${color}66` } : {}}
    >
      {n}
    </button>
  );
}

function NumberPicker({
  max,
  count,
  selected,
  color,
  onToggle,
  label,
}: {
  max: number;
  count: number;
  selected: number[];
  color: string;
  onToggle: (n: number) => void;
  label?: string;
}) {
  const nums = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Badge
            variant="outline"
            style={selected.length === count ? { borderColor: color, color } : {}}
          >
            {selected.length} / {count} selected
          </Badge>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {nums.map((n) => (
          <NumberBall
            key={n}
            n={n}
            selected={selected.includes(n)}
            color={color}
            onClick={() => onToggle(n)}
          />
        ))}
      </div>
    </div>
  );
}

export default function LotteryGame() {
  const { gameId: slug } = useParams<{ gameId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [numbers, setNumbers] = useState<number[]>([]);
  const [bonusNumbers, setBonusNumbers] = useState<number[]>([]);
  const [purchased, setPurchased] = useState(false);

  const { data, isLoading } = useQuery<{ game: LotteryGame; recentDraws: LotteryDraw[] }>({
    queryKey: ["lottery-game", slug],
    queryFn: () => fetch(`/api/lottery/games/${slug}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const game = data?.game;
  const recentDraws = data?.recentDraws ?? [];
  const countdown = useCountdown(game?.nextDrawAt ?? null);

  const toggleNumber = useCallback((n: number, max: number, count: number, selected: number[], setSelected: (v: number[]) => void) => {
    if (selected.includes(n)) {
      setSelected(selected.filter((x) => x !== n));
    } else if (selected.length < count) {
      setSelected([...selected, n].sort((a, b) => a - b));
    }
  }, []);

  const quickPick = () => {
    if (!game) return;
    const pool = Array.from({ length: game.mainNumbersMax }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    setNumbers(pool.slice(0, game.mainNumbersCount).sort((a, b) => a - b));

    if (game.bonusNumbersCount > 0) {
      const bpool = Array.from({ length: game.bonusNumbersMax }, (_, i) => i + 1);
      for (let i = bpool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bpool[i], bpool[j]] = [bpool[j]!, bpool[i]!];
      }
      setBonusNumbers(bpool.slice(0, game.bonusNumbersCount).sort((a, b) => a - b));
    }
  };

  const { data: walletData } = useQuery<{ balance: number }>({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const token = localStorage.getItem("gowin_token");
      const r = await fetch("/api/wallet", { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    enabled: !!user,
    staleTime: 10_000,
  });

  const buyMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("gowin_token");
      const r = await fetch("/api/lottery/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug, numbers, bonusNumbers }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Purchase failed");
      return data;
    },
    onSuccess: () => {
      setPurchased(true);
      qc.invalidateQueries({ queryKey: ["wallet-balance"] });
      qc.invalidateQueries({ queryKey: ["lottery-tickets"] });
      toast({ title: "Ticket purchased! 🎰", description: "Good luck! Check your tickets page for results.", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    },
  });

  const isReady = game
    ? numbers.length === game.mainNumbersCount &&
      (game.bonusNumbersCount === 0 || bonusNumbers.length === game.bonusNumbersCount)
    : false;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-muted-foreground">
        <p>Lottery game not found.</p>
        <Link href="/lottery"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" /> Back to Lottery</Button></Link>
      </div>
    );
  }

  const color = game.color;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Link href="/lottery">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Lotteries
        </button>
      </Link>

      {/* Hero banner */}
      <div
        className="rounded-2xl overflow-hidden border p-6 md:p-8 relative"
        style={{ borderColor: `${color}40`, background: `linear-gradient(135deg, ${color}18 0%, transparent 70%)` }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <span className="text-5xl leading-none">{game.emoji}</span>
            <div>
              <h1 className="text-2xl font-extrabold">{game.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{game.country}</p>
            </div>
          </div>
          <div className="md:ml-auto text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Jackpot</p>
            <p className="text-4xl font-black tabular-nums" style={{ color }}>{fmtJackpot(game.jackpot)}</p>
          </div>
        </div>

        {/* Countdown */}
        {game.nextDrawAt && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Next draw: {format(new Date(game.nextDrawAt), "EEEE, MMMM d 'at' HH:mm")}
            </p>
            <div className="flex gap-3">
              {[
                { v: countdown.d, l: "Days" },
                { v: countdown.h, l: "Hours" },
                { v: countdown.m, l: "Mins" },
                { v: countdown.s, l: "Secs" },
              ].map(({ v, l }) => (
                <div key={l} className="text-center bg-background/60 rounded-lg px-3 py-2 min-w-[56px] border border-border/40">
                  <p className="text-xl font-black tabular-nums" style={{ color }}>{String(v).padStart(2, "0")}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6">
        {/* Number picker */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Pick Your Numbers</h2>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={quickPick}>
                <Shuffle className="w-3.5 h-3.5" /> Quick Pick
              </Button>
            </div>

            <NumberPicker
              max={game.mainNumbersMax}
              count={game.mainNumbersCount}
              selected={numbers}
              color={color}
              label={`Main Numbers (1–${game.mainNumbersMax})`}
              onToggle={(n) => toggleNumber(n, game.mainNumbersMax, game.mainNumbersCount, numbers, setNumbers)}
            />

            {game.bonusNumbersCount > 0 && (
              <div className="border-t border-border/50 pt-4">
                <NumberPicker
                  max={game.bonusNumbersMax}
                  count={game.bonusNumbersCount}
                  selected={bonusNumbers}
                  color="#f59e0b"
                  label={`Bonus Numbers (1–${game.bonusNumbersMax})`}
                  onToggle={(n) => toggleNumber(n, game.bonusNumbersMax, game.bonusNumbersCount, bonusNumbers, setBonusNumbers)}
                />
              </div>
            )}
          </div>

          {/* Recent results */}
          {recentDraws.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold text-sm mb-4">Recent Winning Numbers</h3>
              <div className="space-y-3">
                {recentDraws.map((draw) => (
                  <div key={draw.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{format(new Date(draw.drawDate), "MMM d, yyyy")}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{draw.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {(draw.winningNumbers as number[]).map((n) => (
                        <NumberBall key={n} n={n} selected color={color} size="sm" />
                      ))}
                      {(draw.bonusNumbers as number[]).length > 0 && (
                        <>
                          <span className="text-muted-foreground text-xs">+</span>
                          {(draw.bonusNumbers as number[]).map((n) => (
                            <NumberBall key={n} n={n} selected color="#f59e0b" size="sm" />
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ticket summary */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-4 sticky top-4">
            <h2 className="font-bold text-sm">Your Ticket</h2>

            {/* Selected numbers display */}
            <div className="rounded-xl bg-background/60 p-3 border border-border/40 min-h-[80px]">
              {numbers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Select {game.mainNumbersCount} numbers above</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {numbers.map((n) => (
                    <NumberBall key={n} n={n} selected color={color} size="sm" />
                  ))}
                  {bonusNumbers.map((n) => (
                    <NumberBall key={`b${n}`} n={n} selected color="#f59e0b" size="sm" />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Ticket price</span>
                <span className="font-medium text-foreground">${game.ticketPrice.toFixed(2)}</span>
              </div>
              {walletData && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Your balance</span>
                  <span className={`font-medium ${walletData.balance < game.ticketPrice ? "text-destructive" : "text-foreground"}`}>
                    ${walletData.balance.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border/50 pt-2 mt-2">
                <span>Jackpot</span>
                <span style={{ color }}>{fmtJackpot(game.jackpot)}</span>
              </div>
            </div>

            {purchased ? (
              <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Ticket purchased! Good luck! 🍀</span>
              </div>
            ) : !user ? (
              <Link href="/login">
                <Button className="w-full">Login to Play</Button>
              </Link>
            ) : (
              <Button
                className="w-full font-bold"
                disabled={!isReady || buyMutation.isPending}
                onClick={() => buyMutation.mutate()}
                style={isReady ? { backgroundColor: color } : {}}
              >
                {buyMutation.isPending ? "Processing…" : isReady ? `Buy Ticket — $${game.ticketPrice.toFixed(2)}` : "Select your numbers"}
              </Button>
            )}

            <Link href="/lottery/tickets">
              <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground text-xs">
                <Ticket className="w-3.5 h-3.5" /> View my tickets
              </Button>
            </Link>
          </div>

          {/* Prize tiers info */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Prize Tiers</h3>
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                { label: `Match ${game.mainNumbersCount}${game.bonusNumbersCount > 0 ? `+${game.bonusNumbersCount}` : ""}`, prize: "Jackpot", highlight: true },
                { label: `Match ${game.mainNumbersCount}${game.bonusNumbersCount > 0 ? "+0" : ""}`, prize: "1% of Jackpot" },
                { label: "Match 4+", prize: "$200× ticket" },
                { label: "Match 3+", prize: "$50× ticket" },
                { label: "Match 2+", prize: "$5× ticket" },
              ].map(({ label, prize, highlight }) => (
                <div key={label} className={`flex justify-between py-1.5 px-2 rounded-lg ${highlight ? "bg-primary/10" : ""}`}>
                  <span className={highlight ? "font-semibold text-primary" : "text-muted-foreground"}>{label}</span>
                  <span className={highlight ? "font-bold text-primary" : "font-medium"}>{prize}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
