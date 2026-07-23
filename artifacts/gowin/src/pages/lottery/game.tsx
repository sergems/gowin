import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Clock, Shuffle, Plus, Minus, Trophy, Ticket, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import api from "@/lib/api";
import { format, formatDistanceToNow, differenceInSeconds } from "date-fns";

interface LotteryDraw {
  id: number;
  gameId: number;
  drawDate: string;
  winningNumbers: number[];
  bonusNumbers: number[];
  jackpot: number;
  status: string;
}

interface LotteryGameDetail {
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
  recentDraws: LotteryDraw[];
  nextDraw: LotteryDraw | null;
}

function formatJackpot(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

// Countdown timer hook
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!targetDate) return;
    const calc = () => Math.max(0, differenceInSeconds(new Date(targetDate), new Date()));
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;
  return { days, hours, mins, secs, total: timeLeft };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center">
        <span className="text-2xl font-black tabular-nums text-foreground">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// Number ball component
function NumberBall({
  num,
  selected,
  onClick,
  disabled,
  color,
  isWinning,
}: {
  num: number;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  color: string;
  isWinning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled && !selected}
      className={`
        w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm font-bold transition-all duration-200
        flex items-center justify-center shrink-0
        ${selected
          ? "scale-110 text-white shadow-lg"
          : isWinning
          ? "ring-2 text-white"
          : disabled
          ? "text-muted-foreground/40 cursor-not-allowed bg-muted/20"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
        }
      `}
      style={
        selected
          ? { background: color, boxShadow: `0 0 12px ${color}60` }
          : isWinning
          ? { background: `${color}30`, borderColor: color, color: color }
          : {}
      }
    >
      {num}
    </button>
  );
}

export default function LotteryGame() {
  const { gameId: slug } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const { formatCurrency } = useSiteSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedMain, setSelectedMain] = useState<number[]>([]);
  const [selectedBonus, setSelectedBonus] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showPrizeBreakdown, setShowPrizeBreakdown] = useState(false);

  const { data: game, isLoading } = useQuery<LotteryGameDetail>({
    queryKey: [`/api/lottery/games/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/lottery/games/${slug}`);
      if (!res.ok) throw new Error("Game not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const countdown = useCountdown(game?.nextDrawAt ?? null);

  const quickPick = useCallback(() => {
    if (!game) return;
    const mainPool = Array.from({ length: game.mainNumbersMax }, (_, i) => i + 1);
    const shuffled = mainPool.sort(() => Math.random() - 0.5).slice(0, game.mainNumbersCount);
    setSelectedMain(shuffled.sort((a, b) => a - b));

    if (game.bonusNumbersCount > 0) {
      const bonusPool = Array.from({ length: game.bonusNumbersMax }, (_, i) => i + 1);
      const bonusPicked = bonusPool.sort(() => Math.random() - 0.5).slice(0, game.bonusNumbersCount);
      setSelectedBonus(bonusPicked.sort((a, b) => a - b));
    }
  }, [game]);

  function toggleMain(num: number) {
    if (!game) return;
    setSelectedMain((prev) => {
      if (prev.includes(num)) return prev.filter((n) => n !== num);
      if (prev.length >= game.mainNumbersCount) return prev;
      return [...prev, num].sort((a, b) => a - b);
    });
  }

  function toggleBonus(num: number) {
    if (!game) return;
    setSelectedBonus((prev) => {
      if (prev.includes(num)) return prev.filter((n) => n !== num);
      if (prev.length >= game.bonusNumbersCount) return prev;
      return [...prev, num].sort((a, b) => a - b);
    });
  }

  const totalStake = game ? game.ticketPrice * quantity : 0;
  const isReady =
    game &&
    selectedMain.length === game.mainNumbersCount &&
    selectedBonus.length === game.bonusNumbersCount;

  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!game) throw new Error("No game");
      // Buy multiple tickets
      const results = [];
      for (let i = 0; i < quantity; i++) {
        const nums = i === 0
          ? { numbers: selectedMain, bonusNumbers: selectedBonus }
          : (() => {
              const mainPool = Array.from({ length: game.mainNumbersMax }, (_, j) => j + 1);
              const main = mainPool.sort(() => Math.random() - 0.5).slice(0, game.mainNumbersCount).sort((a, b) => a - b);
              const bonus = game.bonusNumbersCount > 0
                ? Array.from({ length: game.bonusNumbersMax }, (_, j) => j + 1).sort(() => Math.random() - 0.5).slice(0, game.bonusNumbersCount).sort((a, b) => a - b)
                : [];
              return { numbers: main, bonusNumbers: bonus };
            })();
        const { data } = await api.post("/api/lottery/tickets", {
          gameId: game.id,
          ...nums,
          stake: game.ticketPrice,
        });
        results.push(data);
      }
      return results;
    },
    onSuccess: () => {
      toast({ title: "🎰 Tickets purchased!", description: `${quantity} ticket(s) entered for ${game?.name}` });
      queryClient.invalidateQueries({ queryKey: ["/api/lottery/tickets/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      // Reset
      setSelectedMain([]);
      setSelectedBonus([]);
      setQuantity(1);
    },
    onError: (err: Error) => {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">Lottery game not found</p>
        <Link href="/lottery">
          <Button variant="outline" className="mt-4">← Back to Lottery</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Link href="/lottery">
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Lottery
        </button>
      </Link>

      {/* Hero Banner */}
      <div
        className="relative rounded-2xl overflow-hidden border p-6 md:p-8"
        style={{ background: `linear-gradient(135deg, ${game.color}20 0%, ${game.color}08 100%)`, borderColor: `${game.color}30` }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background: `${game.color}25`, border: `1px solid ${game.color}40` }}
            >
              {game.emoji}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground">{game.name}</h1>
              <p className="text-muted-foreground text-sm">{game.country}</p>
              {game.description && <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">{game.description}</p>}
            </div>
          </div>

          <div className="md:ml-auto text-center">
            <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1.5">
              <Trophy className="w-3 h-3" />
              <span>EST. JACKPOT</span>
            </div>
            <div className="text-3xl md:text-4xl font-black" style={{ color: game.color }}>
              {formatJackpot(game.jackpot)}
            </div>
          </div>
        </div>

        {/* Countdown */}
        {game.nextDrawAt && (
          <div className="mt-6 pt-6 border-t border-border/30">
            <div className="text-xs text-muted-foreground mb-3 text-center flex items-center justify-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Next draw: {format(new Date(game.nextDrawAt), "PPP 'at' p")}</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <CountdownUnit value={countdown.days} label="Days" />
              <span className="text-xl font-black text-muted-foreground/50 pb-5">:</span>
              <CountdownUnit value={countdown.hours} label="Hrs" />
              <span className="text-xl font-black text-muted-foreground/50 pb-5">:</span>
              <CountdownUnit value={countdown.mins} label="Min" />
              <span className="text-xl font-black text-muted-foreground/50 pb-5">:</span>
              <CountdownUnit value={countdown.secs} label="Sec" />
            </div>
          </div>
        )}
      </div>

      {/* Number picker */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-foreground">Pick Your Numbers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select {game.mainNumbersCount} main numbers from 1–{game.mainNumbersMax}
              {game.bonusNumbersCount > 0 && ` + ${game.bonusNumbersCount} bonus from 1–${game.bonusNumbersMax}`}
            </p>
          </div>
          <Button onClick={quickPick} variant="outline" size="sm" className="gap-2">
            <Shuffle className="w-3.5 h-3.5" />
            Quick Pick
          </Button>
        </div>

        {/* Main numbers */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>Main Numbers</span>
            <Badge
              variant="outline"
              className="text-[10px]"
              style={selectedMain.length === game.mainNumbersCount ? { borderColor: `${game.color}60`, color: game.color } : {}}
            >
              {selectedMain.length} / {game.mainNumbersCount}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: game.mainNumbersMax }, (_, i) => i + 1).map((num) => (
              <NumberBall
                key={num}
                num={num}
                selected={selectedMain.includes(num)}
                onClick={() => toggleMain(num)}
                disabled={selectedMain.length >= game.mainNumbersCount}
                color={game.color}
              />
            ))}
          </div>
        </div>

        {/* Bonus numbers */}
        {game.bonusNumbersCount > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>Bonus Numbers</span>
              <Badge
                variant="outline"
                className="text-[10px]"
                style={selectedBonus.length === game.bonusNumbersCount ? { borderColor: "#f59e0b60", color: "#f59e0b" } : {}}
              >
                {selectedBonus.length} / {game.bonusNumbersCount}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: game.bonusNumbersMax }, (_, i) => i + 1).map((num) => (
                <NumberBall
                  key={num}
                  num={num}
                  selected={selectedBonus.includes(num)}
                  onClick={() => toggleBonus(num)}
                  disabled={selectedBonus.length >= game.bonusNumbersCount}
                  color="#f59e0b"
                />
              ))}
            </div>
          </div>
        )}

        {/* Selected display */}
        {(selectedMain.length > 0 || selectedBonus.length > 0) && (
          <div className="rounded-lg bg-muted/30 border border-border/40 p-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Your pick:</span>
            {selectedMain.map((n) => (
              <span
                key={n}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: game.color }}
              >{n}</span>
            ))}
            {selectedBonus.map((n) => (
              <span
                key={`b${n}`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "#f59e0b" }}
              >{n}</span>
            ))}
          </div>
        )}

        {/* Quantity + total */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t border-border/30">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Tickets:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-8 text-center font-bold text-foreground">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                disabled={quantity >= 10}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="font-black text-lg" style={{ color: game.color }}>${totalStake.toFixed(2)}</span>
          </div>
        </div>

        {/* Buy button */}
        {!user ? (
          <Link href="/login">
            <Button className="w-full h-12 text-base font-bold gap-2">
              <Ticket className="w-5 h-5" />
              Login to Buy Ticket
            </Button>
          </Link>
        ) : (
          <Button
            className="w-full h-12 text-base font-bold gap-2"
            disabled={!isReady || buyMutation.isPending}
            onClick={() => buyMutation.mutate()}
            style={isReady ? { background: game.color, color: "white" } : {}}
          >
            <Ticket className="w-5 h-5" />
            {buyMutation.isPending ? "Processing…" : `Buy ${quantity} Ticket${quantity > 1 ? "s" : ""} — $${totalStake.toFixed(2)}`}
          </Button>
        )}

        {!isReady && (
          <p className="text-xs text-muted-foreground text-center">
            {selectedMain.length < game.mainNumbersCount
              ? `Select ${game.mainNumbersCount - selectedMain.length} more main number${game.mainNumbersCount - selectedMain.length !== 1 ? "s" : ""}`
              : `Select ${game.bonusNumbersCount - selectedBonus.length} more bonus number${game.bonusNumbersCount - selectedBonus.length !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {/* Prize breakdown (mock) */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
          onClick={() => setShowPrizeBreakdown((v) => !v)}
        >
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Info className="w-4 h-4 text-primary" />
            Prize Breakdown
          </div>
          {showPrizeBreakdown ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showPrizeBreakdown && (
          <div className="border-t border-border/30 px-5 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left pb-3">Match</th>
                  <th className="text-right pb-3">Prize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr>
                  <td className="py-2.5 font-medium text-foreground">{game.mainNumbersCount} + {game.bonusNumbersCount > 0 ? `${game.bonusNumbersCount} Bonus` : "0"}</td>
                  <td className="py-2.5 text-right font-bold" style={{ color: game.color }}>JACKPOT — {formatJackpot(game.jackpot)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-muted-foreground">{game.mainNumbersCount} + 0</td>
                  <td className="py-2.5 text-right text-muted-foreground">$1,000,000</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-muted-foreground">{Math.max(2, game.mainNumbersCount - 1)} + {game.bonusNumbersCount > 0 ? "1 Bonus" : "0"}</td>
                  <td className="py-2.5 text-right text-muted-foreground">$50,000</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-muted-foreground">{Math.max(2, game.mainNumbersCount - 1)} + 0</td>
                  <td className="py-2.5 text-right text-muted-foreground">$100</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-muted-foreground">{Math.max(1, game.mainNumbersCount - 2)} + 0</td>
                  <td className="py-2.5 text-right text-muted-foreground">$7</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11px] text-muted-foreground/60 mt-3">* Prize breakdown shown is indicative. Actual prizes depend on number of winners.</p>
          </div>
        )}
      </div>

      {/* Recent draws */}
      {game.recentDraws.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Recent Winning Numbers
          </h3>
          <div className="space-y-3">
            {game.recentDraws.map((draw) => (
              <div key={draw.id} className="rounded-lg bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground mb-2">
                  {format(new Date(draw.drawDate), "PPP")} — Jackpot: {formatJackpot(draw.jackpot)}
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(draw.winningNumbers as number[]).map((n) => (
                    <span
                      key={n}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: game.color }}
                    >{n}</span>
                  ))}
                  {(draw.bonusNumbers as number[]).map((n) => (
                    <span
                      key={`b${n}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: "#f59e0b" }}
                    >{n}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
