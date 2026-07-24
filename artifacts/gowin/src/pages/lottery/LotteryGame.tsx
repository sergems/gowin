import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock, Shuffle, Trophy, Ticket, CheckCircle2, Star, Zap } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayoutConfig {
  excludedBonus: Record<string, string>;
  includedBonus: Record<string, string>;
  bonusOnly: string;
  withBonus: Record<string, string>;
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
  nextDrawAt: string | null;
  color: string;
  emoji: string;
  description: string | null;
  payoutConfig: PayoutConfig | null;
}

interface LotteryDraw {
  id: number;
  drawDate: string;
  winningNumbers: number[];
  bonusNumbers: number[];
  jackpot: number;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseOdds(odds: string): number {
  const [n, d] = odds.split("/").map(Number);
  if (!isFinite(n!) || !isFinite(d!) || d === 0) return 1;
  return (n! + d!) / d!;
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!targetDate) return;
    function tick() {
      const diff = new Date(targetDate!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NumberBall({
  n, selected, bonus = false, color, onClick, size = "md",
}: {
  n: number; selected: boolean; bonus?: boolean; color: string;
  onClick?: () => void; size?: "sm" | "md";
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

/** Flexible number picker — user can select 1 to `maxCount` numbers */
function FlexiblePicker({
  maxNum, maxCount, selected, color, onToggle, label,
}: {
  maxNum: number; maxCount: number; selected: number[];
  color: string; onToggle: (n: number) => void; label?: string;
}) {
  const nums = Array.from({ length: maxNum }, (_, i) => i + 1);
  const full = selected.length >= maxCount;
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Badge
            variant="outline"
            className="transition-colors"
            style={selected.length > 0 ? { borderColor: color, color } : {}}
          >
            {selected.length} of {maxCount} max
          </Badge>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {nums.map((n) => {
          const sel = selected.includes(n);
          return (
            <NumberBall
              key={n}
              n={n}
              selected={sel}
              color={color}
              onClick={() => {
                if (sel || !full) onToggle(n);
              }}
            />
          );
        })}
      </div>
      {full && (
        <p className="text-xs text-muted-foreground mt-2">
          Maximum {maxCount} numbers selected. Deselect one to change.
        </p>
      )}
    </div>
  );
}

/** Single-select bonus ball picker */
function BonusPicker({
  maxNum, selected, color, onSelect,
}: {
  maxNum: number; selected: number | null; color: string; onSelect: (n: number | null) => void;
}) {
  const nums = Array.from({ length: maxNum }, (_, i) => i + 1);
  return (
    <div className="flex flex-wrap gap-2">
      {nums.map((n) => (
        <NumberBall
          key={n}
          n={n}
          selected={selected === n}
          color={color}
          onClick={() => onSelect(selected === n ? null : n)}
        />
      ))}
    </div>
  );
}

/** Prize structure table matching the payout config */
function PayoutTable({ config, color, hasBonusBall }: {
  config: PayoutConfig; color: string; hasBonusBall: boolean;
}) {
  const excEntries = Object.entries(config.excludedBonus ?? {}).sort(([a], [b]) => +a - +b);
  const incEntries = Object.entries(config.includedBonus ?? {}).sort(([a], [b]) => +a - +b);
  const withBonusEntries = Object.entries(config.withBonus ?? {}).sort(([a], [b]) => +a - +b);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden text-sm">
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        <span className="font-bold">Prize Structure</span>
      </div>

      {hasBonusBall && incEntries.length > 0 && (
        <>
          <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
            <p className="text-[10px] font-extrabold uppercase tracking-widest italic" style={{ color }}>
              Included Bonus
            </p>
          </div>
          {incEntries.map(([count, odds]) => (
            <div key={count} className="flex justify-between px-4 py-2 border-b border-border/20">
              <span className="text-muted-foreground">{count} Number{count !== "1" ? "s" : ""}</span>
              <span className="font-bold tabular-nums" style={{ color }}>{odds}</span>
            </div>
          ))}
        </>
      )}

      {excEntries.length > 0 && (
        <>
          <div className="px-4 py-2 bg-muted/40 border-b border-border/30">
            <p className="text-[10px] font-extrabold uppercase tracking-widest italic text-muted-foreground">
              {hasBonusBall ? "Excluded Bonus" : "Payouts"}
            </p>
          </div>
          {excEntries.map(([count, odds]) => (
            <div key={count} className="flex justify-between px-4 py-2 border-b border-border/20">
              <span className="text-muted-foreground">{count} Number{count !== "1" ? "s" : ""}</span>
              <span className="font-bold tabular-nums">{odds}</span>
            </div>
          ))}
        </>
      )}

      {hasBonusBall && config.bonusOnly && (
        <div className="flex justify-between items-center px-4 py-3 border-b border-yellow-500/20 bg-yellow-500/5">
          <span className="font-bold text-yellow-500 flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> Bonus Ball
          </span>
          <span className="font-black text-lg text-yellow-500 tabular-nums">{config.bonusOnly}</span>
        </div>
      )}

      {hasBonusBall && withBonusEntries.map(([count, odds]) => (
        <div key={count} className="flex justify-between px-4 py-2 border-b border-border/20">
          <span className="text-muted-foreground">{count}+ Bonus Ball</span>
          <span className="font-bold tabular-nums text-yellow-500">{odds}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LotteryGame() {
  const { gameId: slug } = useParams<{ gameId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [numbers, setNumbers] = useState<number[]>([]);
  const [includeBonus, setIncludeBonus] = useState(false);
  const [bonusNumber, setBonusNumber] = useState<number | null>(null);
  const [purchased, setPurchased] = useState(false);

  const { data, isLoading } = useQuery<{
    game: LotteryGame;
    recentDraws: LotteryDraw[];
    nextDraw: LotteryDraw | null;
  }>({
    queryKey: ["lottery-game", slug],
    queryFn: () => fetch(`/api/lottery/games/${slug}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const game = data?.game;
  const recentDraws = data?.recentDraws ?? [];
  const countdown = useCountdown(game?.nextDrawAt ?? null);
  const color = game?.color ?? "#4ade80";
  const BONUS_COLOR = "#f59e0b";

  // Reset bonus when game changes or bonus toggled off
  useEffect(() => {
    if (!includeBonus) setBonusNumber(null);
  }, [includeBonus]);

  const toggleNumber = useCallback((n: number) => {
    setNumbers((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (!game || prev.length >= game.mainNumbersCount) return prev;
      return [...prev, n].sort((a, b) => a - b);
    });
  }, [game]);

  const quickPick = () => {
    if (!game) return;
    const pool = Array.from({ length: game.mainNumbersMax }, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5)
      .slice(0, game.mainNumbersCount)
      .sort((a, b) => a - b);
    setNumbers(pool);

    if (includeBonus && game.bonusNumbersCount > 0) {
      const bn = Math.floor(Math.random() * game.bonusNumbersMax) + 1;
      setBonusNumber(bn);
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
        body: JSON.stringify({
          gameId: game!.id,
          numbers,
          bonusNumber: includeBonus && bonusNumber !== null ? bonusNumber : null,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Purchase failed");
      return json;
    },
    onSuccess: (res) => {
      setPurchased(true);
      qc.invalidateQueries({ queryKey: ["wallet-balance"] });
      qc.invalidateQueries({ queryKey: ["lottery-tickets"] });
      toast({
        title: "Ticket purchased! 🎰",
        description: `Good luck! New balance: $${res.newBalance?.toFixed(2)}`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    },
  });

  const isReady = numbers.length >= 1 && (!includeBonus || bonusNumber !== null);

  // Work out the potential odds for the current selection
  const config = game?.payoutConfig ?? null;
  let potentialOdds: string | null = null;
  if (config && numbers.length > 0) {
    const k = String(numbers.length);
    if (includeBonus && config.includedBonus[k]) potentialOdds = config.includedBonus[k]!;
    else if (!includeBonus && config.excludedBonus[k]) potentialOdds = config.excludedBonus[k]!;
  }
  const potentialReturn = potentialOdds && game
    ? (game.ticketPrice * parseOdds(potentialOdds)).toFixed(2)
    : null;

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
        <Link href="/lottery">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Lottery
          </Button>
        </Link>
      </div>
    );
  }

  const hasBonusBall = game.bonusNumbersCount > 0;

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
              {game.description && (
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">{game.description}</p>
              )}
            </div>
          </div>
          <div className="md:ml-auto text-center">
            <div className="flex items-center gap-2 justify-center">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Top prize</p>
            </div>
            <p className="text-3xl font-black tabular-nums mt-1" style={{ color }}>
              {config ? Object.values(config.excludedBonus).at(-1) ?? "—" : "—"}
            </p>
          </div>
        </div>

        {/* Countdown */}
        {game.nextDrawAt && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Next draw: {format(new Date(game.nextDrawAt), "EEEE, MMMM d 'at' HH:mm")}
            </p>
            <div className="flex gap-3">
              {([
                { v: countdown.d, l: "Days" },
                { v: countdown.h, l: "Hours" },
                { v: countdown.m, l: "Mins" },
                { v: countdown.s, l: "Secs" },
              ] as const).map(({ v, l }) => (
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
        {/* ── Left column: pickers + history ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">Pick Your Numbers</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Choose 1–{game.mainNumbersCount} numbers from 1–{game.mainNumbersMax}</p>
              </div>
              <div className="flex gap-2">
                {numbers.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setNumbers([])}>
                    Clear
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={quickPick}>
                  <Shuffle className="w-3.5 h-3.5" /> Quick Pick
                </Button>
              </div>
            </div>

            <FlexiblePicker
              maxNum={game.mainNumbersMax}
              maxCount={game.mainNumbersCount}
              selected={numbers}
              color={color}
              label={`Main Numbers (1–${game.mainNumbersMax})`}
              onToggle={toggleNumber}
            />

            {/* Bonus ball toggle */}
            {hasBonusBall && (
              <div className="border-t border-border/50 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-bonus" className="font-semibold text-sm cursor-pointer">
                      Include Bonus Ball
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Better odds with bonus — worse base odds without
                    </p>
                  </div>
                  <Switch
                    id="include-bonus"
                    checked={includeBonus}
                    onCheckedChange={setIncludeBonus}
                  />
                </div>

                {includeBonus && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Bonus Ball (1–{game.bonusNumbersMax})
                      </p>
                      {bonusNumber !== null && (
                        <Badge variant="outline" style={{ borderColor: BONUS_COLOR, color: BONUS_COLOR }}>
                          {bonusNumber} selected
                        </Badge>
                      )}
                    </div>
                    <BonusPicker
                      maxNum={game.bonusNumbersMax}
                      selected={bonusNumber}
                      color={BONUS_COLOR}
                      onSelect={setBonusNumber}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent winning numbers */}
          {recentDraws.slice(0, 7).length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold text-sm mb-4">Recent Winning Numbers</h3>
              <div className="space-y-3">
                {recentDraws.slice(0, 7).map((draw) => (
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
                          <span className="text-muted-foreground text-xs mx-1">+</span>
                          {(draw.bonusNumbers as number[]).map((n) => (
                            <NumberBall key={`b${n}`} n={n} selected color={BONUS_COLOR} size="sm" />
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prize table */}
          {config && (
            <PayoutTable config={config} color={color} hasBonusBall={hasBonusBall} />
          )}
        </div>

        {/* ── Right column: ticket summary ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-4 sticky top-4">
            <h2 className="font-bold text-sm">Your Ticket</h2>

            {/* Selected numbers display */}
            <div className="rounded-xl bg-background/60 p-3 border border-border/40 min-h-[80px]">
              {numbers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Select at least 1 number above
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {numbers.map((n) => (
                      <NumberBall key={n} n={n} selected color={color} size="sm" />
                    ))}
                  </div>
                  {bonusNumber !== null && includeBonus && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
                      <span className="text-[10px] text-yellow-500 font-bold uppercase">Bonus:</span>
                      <NumberBall n={bonusNumber} selected color={BONUS_COLOR} size="sm" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Ticket price</span>
                <span className="font-medium text-foreground">${game.ticketPrice.toFixed(2)}</span>
              </div>
              {numbers.length > 0 && potentialOdds && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{numbers.length} number{numbers.length !== 1 ? "s" : ""} odds</span>
                  <span className="font-bold" style={{ color }}>{potentialOdds}</span>
                </div>
              )}
              {potentialReturn && (
                <div className="flex justify-between font-semibold border-t border-border/50 pt-2 mt-2">
                  <span>Potential return</span>
                  <span style={{ color }}>${potentialReturn}</span>
                </div>
              )}
              {walletData && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Your balance</span>
                  <span className={`font-medium ${walletData.balance < game.ticketPrice ? "text-destructive" : "text-foreground"}`}>
                    ${walletData.balance.toFixed(2)}
                  </span>
                </div>
              )}
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
                {buyMutation.isPending
                  ? "Processing…"
                  : isReady
                  ? `Buy Ticket — $${game.ticketPrice.toFixed(2)}`
                  : "Select at least 1 number"}
              </Button>
            )}

            <Link href="/lottery/tickets">
              <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground text-xs">
                <Ticket className="w-3.5 h-3.5" /> View my tickets
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
