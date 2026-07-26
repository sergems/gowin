import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Clock, Shuffle, Trophy, Ticket, Info, ChevronDown, ChevronUp, Zap, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import api from "@/lib/api";
import { differenceInSeconds } from "date-fns";

// ── Timezone-aware date formatting (uses Intl, no extra deps) ─────────────────
function fmtInTz(dateStr: string, tz: string | null | undefined, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: tz || "UTC", ...opts }).format(new Date(dateStr));
  } catch {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(dateStr));
  }
}

/** "Sun 26 Jul · 1:49 PM" */
function fmtDrawShort(dateStr: string, tz: string | null | undefined): string {
  const d = fmtInTz(dateStr, tz, { weekday: "short", day: "numeric", month: "short" });
  const t = fmtInTz(dateStr, tz, { hour: "numeric", minute: "2-digit", hour12: true });
  return `${d} · ${t}`;
}

/** "July 26th, 2026 at 1:49 PM" — 12-hour */
function fmtDrawLong12(dateStr: string, tz: string | null | undefined): string {
  const d = fmtInTz(dateStr, tz, { year: "numeric", month: "long", day: "numeric" });
  const t = fmtInTz(dateStr, tz, { hour: "numeric", minute: "2-digit", hour12: true });
  return `${d} at ${t}`;
}

/** "July 26th, 2026 at 13:49" — 24-hour */
function fmtDrawLong24(dateStr: string, tz: string | null | undefined): string {
  const d = fmtInTz(dateStr, tz, { year: "numeric", month: "long", day: "numeric" });
  const t = fmtInTz(dateStr, tz, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${d} at ${t}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayoutConfig {
  excludedBonus: Record<string, string>;
  includedBonus: Record<string, string>;
  bonusOnly: string;
  withBonus: Record<string, string>;
}

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
  logoUrl: string | null;
  description: string | null;
  payoutConfig: PayoutConfig;
  enabledPlayTypes: string[];
  minStake: number;
  maxStake: number;
  maxPayout: number;
  recentDraws: LotteryDraw[];
  timezone: string | null;
  nextDraw: LotteryDraw | null;
}

type PlayType = "1" | "2" | "3" | "4" | "5" | "6" | "bonus_only";
type BonusMode = "exclude" | "bonus" | "with_bonus";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatJackpot(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function parseOdds(odds: string): number {
  if (!odds || odds.toLowerCase() === "jackpot") return 0;
  const parts = odds.split("/");
  const num = parseFloat(parts[0] ?? "0");
  const den = parseFloat(parts[1] ?? "1");
  if (!isFinite(num) || !isFinite(den) || den === 0) return 1;
  return (num + den) / den;
}

function fmtOdds(odds: string | undefined): string {
  if (!odds) return "—";
  if (odds.toLowerCase() === "jackpot") return "Jackpot";
  return `${odds}`;
}

function computePotentialWin(oddsStr: string | undefined, stake: number, jackpot: number): number {
  if (!oddsStr) return 0;
  if (oddsStr.toLowerCase() === "jackpot") return jackpot;
  return stake * parseOdds(oddsStr);
}

// ── Countdown ─────────────────────────────────────────────────────────────────

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
        <span className="text-2xl font-black tabular-nums text-foreground">{String(value).padStart(2, "0")}</span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Bonus ball colour — distinct from main-ball colour for clarity ────────────
const BONUS_COLOR = "#ef4444";

// ── Number Ball ───────────────────────────────────────────────────────────────

function NumberBall({
  num, selected, onClick, disabled, color, isBonus = false, isWinning = false,
}: {
  num: number; selected: boolean; onClick: () => void; disabled: boolean;
  color: string; isBonus?: boolean; isWinning?: boolean;
}) {
  const activeColor = isBonus ? BONUS_COLOR : color;
  return (
    <button
      onClick={onClick}
      disabled={disabled && !selected}
      className={`
        w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm font-bold transition-all duration-150
        flex items-center justify-center shrink-0
        ${selected
          ? "scale-110 text-white shadow-lg"
          : isWinning
          ? "ring-2 text-white"
          : disabled
          ? "text-muted-foreground/40 cursor-not-allowed bg-muted/20"
          : isBonus
          ? "text-red-400 bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/40"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-muted/20"
        }
      `}
      style={
        selected
          ? { background: activeColor, boxShadow: `0 0 12px ${activeColor}60` }
          : isWinning
          ? { background: `${activeColor}30`, borderColor: activeColor, color: activeColor }
          : {}
      }
    >
      {num}
    </button>
  );
}

// ── Play Type Selector ────────────────────────────────────────────────────────

const PLAY_TYPE_LABELS: Record<string, string> = {
  "1": "1 Number",
  "2": "2 Numbers",
  "3": "3 Numbers",
  "4": "4 Numbers",
  "5": "5 Numbers",
  "6": "6 Numbers",
  "bonus_only": "Bonus Ball",
};

function PlayTypeSelector({
  value, onChange, enabled, color,
}: {
  value: PlayType; onChange: (v: PlayType) => void; enabled: string[]; color: string;
}) {
  const types: PlayType[] = ["1", "2", "3", "4", "5", "6", "bonus_only"];
  const available = types.filter((t) => enabled.includes(t));

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Play Type</p>
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
        {available.map((pt) => {
          const active = value === pt;
          return (
            <button
              key={pt}
              onClick={() => onChange(pt)}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-150 ${
                active
                  ? "text-white border-transparent shadow-sm"
                  : "text-muted-foreground border-border/50 hover:border-border bg-muted/20 hover:bg-muted/40"
              }`}
              style={active ? { background: color, borderColor: color } : {}}
            >
              {PLAY_TYPE_LABELS[pt]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Bonus Mode Selector ───────────────────────────────────────────────────────

const BONUS_MODE_OPTIONS: { mode: BonusMode; label: string; desc: string }[] = [
  {
    mode: "exclude",
    label: "Excluding Bonus",
    desc: "Bonus ball not counted — all picks must be in the main draw",
  },
  {
    mode: "bonus",
    label: "Including Bonus",
    desc: "Bonus ball counts as part of the draw — your numbers can match it",
  },
  {
    mode: "with_bonus",
    label: "With Bonus Ball",
    desc: "All main numbers must match AND your picked bonus ball must match the drawn bonus ball",
  },
];

function BonusModeSelector({
  value, onChange, hasBonus,
}: {
  value: BonusMode; onChange: (v: BonusMode) => void; hasBonus: boolean;
}) {
  if (!hasBonus) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bonus Mode</p>
      <div className="flex flex-col gap-1.5">
        {BONUS_MODE_OPTIONS.map(({ mode, label, desc }) => {
          const active = value === mode;
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              className={`rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                active
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/50 bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-primary" : "border-muted-foreground/50"}`}>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                <span className={`text-sm font-semibold shrink-0 ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
                <span className="text-xs text-muted-foreground">— {desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Payout Table ──────────────────────────────────────────────────────────────

function PayoutTable({ game }: { game: LotteryGameDetail }) {
  const [open, setOpen] = useState(false);
  const cfg = game.payoutConfig;
  const mainKeys = ["1", "2", "3", "4", "5", "6"].filter(
    (k) => game.enabledPlayTypes.includes(k) && (cfg.excludedBonus?.[k] || cfg.includedBonus?.[k])
  );
  const bonusKeys = Object.keys(cfg.withBonus ?? {}).sort();

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Info className="w-4 h-4 text-primary" />
          Payout Table
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/30 px-5 py-4 space-y-5">
          {/* Excluding Bonus */}
          {mainKeys.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Excluding Bonus</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/20">
                  {mainKeys.map((k) => {
                    const odds = cfg.excludedBonus?.[k];
                    if (!odds) return null;
                    return (
                      <tr key={k}>
                        <td className="py-1.5 text-muted-foreground">{k} {k === "1" ? "Number" : "Numbers"}</td>
                        <td className="py-1.5 text-right font-semibold" style={{ color: game.color }}>{fmtOdds(odds)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Including Bonus (bonus ball counts as part of drawn set) */}
          {game.bonusNumbersCount > 0 && mainKeys.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Including Bonus</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/20">
                  {mainKeys.map((k) => {
                    const odds = cfg.includedBonus?.[k];
                    if (!odds) return null;
                    return (
                      <tr key={k}>
                        <td className="py-1.5 text-muted-foreground">{k} {k === "1" ? "Number" : "Numbers"}</td>
                        <td className="py-1.5 text-right font-semibold text-yellow-500">{fmtOdds(odds)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Including Bonus Ball (all main must match + drawn bonus must be among picks) */}
          {game.bonusNumbersCount > 0 && bonusKeys.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Lotto With Bonus Ball</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/20">
                  {bonusKeys.map((k) => {
                    const odds = cfg.withBonus?.[k];
                    if (!odds) return null;
                    return (
                      <tr key={k}>
                        <td className="py-1.5 text-muted-foreground">{k} {k === "1" ? "Number" : "Numbers"} + Bonus Ball</td>
                        <td className="py-1.5 text-right font-semibold text-yellow-400">{fmtOdds(odds)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bonus Ball */}
          {game.bonusNumbersCount > 0 && game.enabledPlayTypes.includes("bonus_only") && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Bonus Ball</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/20">
                  <tr>
                    <td className="py-1.5 text-muted-foreground">Bonus Ball Only</td>
                    <td className="py-1.5 text-right font-semibold text-yellow-400">{fmtOdds(cfg.bonusOnly)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/60">All payouts include stake. Jackpot is the current prize pool.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LotteryGame() {
  const { gameId: slug } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const { formatCurrency } = useSiteSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [playType, setPlayType] = useState<PlayType>("1");
  const [bonusMode, setBonusMode] = useState<BonusMode>("exclude");
  const [selectedMain, setSelectedMain] = useState<number[]>([]);
  const [selectedBonus, setSelectedBonus] = useState<number | null>(null);
  const [stake, setStake] = useState<string>("");
  const [showPrizeBreakdown, setShowPrizeBreakdown] = useState(false);

  const { data: game, isLoading } = useQuery<LotteryGameDetail>({
    queryKey: [`/api/lottery/games/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/lottery/games/${slug}`);
      if (!res.ok) throw new Error("Game not found");
      const data = await res.json();
      const g = data.game;
      return {
        ...g,
        ticketPrice: Number(g.ticketPrice ?? 0),
        jackpot: Number(g.jackpot ?? 0),
        minStake: Number(g.minStake ?? 1),
        maxStake: Number(g.maxStake ?? 100),
        maxPayout: Number(g.maxPayout ?? 500000),
        enabledPlayTypes: g.enabledPlayTypes ?? ["1","2","3","4","5","6","bonus_only"],
        recentDraws: data.recentDraws ?? [],
        nextDraw: data.nextDraw ?? null,
      };
    },
    enabled: !!slug,
  });

  const countdown = useCountdown(game?.nextDrawAt ?? null);

  // ── Betting cutoff — 15 minutes before draw ───────────────────────────────
  const cutoffIso = game?.nextDraw
    ? new Date(new Date(game.nextDraw.drawDate).getTime() - 15 * 60 * 1000).toISOString()
    : null;
  const cutoffCountdown = useCountdown(cutoffIso);
  // Betting is closed once the cutoff countdown expires (total hits 0)
  const isBettingClosed = cutoffIso !== null && cutoffCountdown.total === 0;
  // Show warning banner in the last 30 minutes before cutoff
  const showCutoffWarning = cutoffIso !== null && cutoffCountdown.total > 0 && cutoffCountdown.total <= 30 * 60;

  // When play type changes, trim selected numbers to new required count
  useEffect(() => {
    if (playType === "bonus_only") {
      setSelectedMain([]);
    } else {
      const count = parseInt(playType);
      setSelectedMain((prev) => prev.slice(0, count));
    }
    setSelectedBonus(null);
  }, [playType]);

  // Clear bonus selection when switching away from bonus_only — none of the main modes need a bonus pick
  useEffect(() => {
    setSelectedBonus(null);
  }, [bonusMode, playType]);

  const isBonusOnly = playType === "bonus_only";
  const requiredMain = isBonusOnly ? 0 : parseInt(playType);
  // bonus_only and with_bonus both require an explicit bonus ball pick
  const needsBonusPick = isBonusOnly || bonusMode === "with_bonus";
  const hasBonus = (game?.bonusNumbersCount ?? 0) > 0;

  // Compute odds string
  const payoutConfig = game?.payoutConfig;
  let oddsStr: string | undefined;
  if (payoutConfig) {
    if (isBonusOnly) {
      oddsStr = payoutConfig.bonusOnly ?? undefined;
    } else if (bonusMode === "bonus") {
      oddsStr = payoutConfig.includedBonus?.[playType] ?? undefined;
    } else if (bonusMode === "with_bonus") {
      oddsStr = payoutConfig.withBonus?.[playType] ?? undefined;
    } else {
      oddsStr = payoutConfig.excludedBonus?.[playType] ?? undefined;
    }
  }

  const stakeAmount = parseFloat(stake) || 0;
  const potentialWin = game && oddsStr && stakeAmount > 0
    ? computePotentialWin(oddsStr, stakeAmount, game.jackpot)
    : 0;

  const isJackpot = oddsStr?.toLowerCase() === "jackpot";

  const isReady =
    !isBettingClosed &&
    selectedMain.length === requiredMain &&
    (!needsBonusPick || !hasBonus || selectedBonus !== null) &&
    stakeAmount > 0 &&
    !!game &&
    stakeAmount >= game.minStake &&
    stakeAmount <= game.maxStake;

  const quickPick = useCallback(() => {
    if (!game) return;
    if (!isBonusOnly) {
      const pool = Array.from({ length: game.mainNumbersMax }, (_, i) => i + 1);
      const picked = pool.sort(() => Math.random() - 0.5).slice(0, requiredMain).sort((a, b) => a - b);
      setSelectedMain(picked);
    }
    // Only auto-pick bonus ball for bonus_only mode
    if (isBonusOnly && hasBonus) {
      const bPool = Array.from({ length: game.bonusNumbersMax }, (_, i) => i + 1);
      setSelectedBonus(bPool[Math.floor(Math.random() * bPool.length)]!);
    }
  }, [game, isBonusOnly, hasBonus, requiredMain]);

  function toggleMain(num: number) {
    if (!game) return;
    setSelectedMain((prev) => {
      if (prev.includes(num)) return prev.filter((n) => n !== num);
      if (prev.length >= requiredMain) return prev;
      return [...prev, num].sort((a, b) => a - b);
    });
  }

  function toggleBonus(num: number) {
    setSelectedBonus((prev) => (prev === num ? null : num));
  }

  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!game) throw new Error("No game");
      const body: Record<string, unknown> = {
        gameId: game.id,
        playType,
        stake: stakeAmount,
        numbers: selectedMain,
      };
      if (!isBonusOnly) {
        body.bonusMode = bonusMode;
      }
      if ((needsBonusPick || bonusMode === "with_bonus") && selectedBonus !== null) {
        body.bonusNumber = selectedBonus;
      }
      const { data } = await api.post("/api/lottery/tickets", body);
      return data;
    },
    onSuccess: (data) => {
      const win = potentialWin > 0
        ? ` • Potential win: ${formatCurrency ? formatCurrency(potentialWin) : `$${potentialWin.toFixed(2)}`}`
        : "";
      toast({
        title: "🎰 Ticket purchased!",
        description: `${PLAY_TYPE_LABELS[playType]} @ ${fmtOdds(oddsStr)} — Stake: $${stakeAmount.toFixed(2)}${win}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lottery/tickets/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      setSelectedMain([]);
      setSelectedBonus(null);
      setStake("");
    },
    onError: (err: Error) => {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────

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
        <p className="text-lg font-medium text-muted-foreground">Game not found</p>
        <Link href="/lottery">
          <Button variant="outline" className="mt-4">← Back to Lucky Numbers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Link href="/lottery">
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Lucky Numbers
        </button>
      </Link>

      {/* Compact Hero Strip */}
      <div
        className="rounded-xl border px-4 py-3 flex items-center gap-3"
        style={{
          background: `linear-gradient(120deg, ${game.color}18 0%, ${game.color}06 100%)`,
          borderColor: `${game.color}30`,
        }}
      >
        {/* Logo */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 overflow-hidden"
          style={{ background: `${game.color}22`, border: `1.5px solid ${game.color}45` }}
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

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-black text-base text-foreground leading-tight">{game.name}</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">{game.country}</span>
            {isBettingClosed && (
              <span className="text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 px-1.5 py-0.5 rounded-full">
                CLOSED
              </span>
            )}
            {showCutoffWarning && !isBettingClosed && (
              <span className="text-[10px] font-bold bg-yellow-500/15 text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5 rounded-full animate-pulse">
                CLOSING SOON
              </span>
            )}
          </div>
          {game.description && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">{game.description}</p>
          )}
        </div>

        {/* Compact countdown */}
        {game.nextDrawAt && (
          <div className="shrink-0 text-right">
            <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 mb-1">
              <Clock className="w-3 h-3" />
              <span className="hidden sm:inline">{fmtDrawShort(game.nextDrawAt, game.timezone)}</span>
              <span className="sm:hidden">Next draw</span>
            </div>
            {countdown.total > 0 ? (
              <div className="flex items-center justify-end gap-0.5 tabular-nums">
                {countdown.days > 0 && (
                  <>
                    <span className="text-sm font-black" style={{ color: game.color }}>{countdown.days}</span>
                    <span className="text-[10px] text-muted-foreground mr-1">d</span>
                  </>
                )}
                <span className="text-sm font-black" style={{ color: game.color }}>{String(countdown.hours).padStart(2, "0")}</span>
                <span className="text-[10px] text-muted-foreground">h</span>
                <span className="text-sm font-black ml-0.5" style={{ color: game.color }}>{String(countdown.mins).padStart(2, "0")}</span>
                <span className="text-[10px] text-muted-foreground">m</span>
                <span className="text-sm font-black ml-0.5 text-muted-foreground/70">{String(countdown.secs).padStart(2, "0")}</span>
                <span className="text-[10px] text-muted-foreground">s</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-green-400 animate-pulse">Drawing now</span>
            )}
          </div>
        )}
      </div>

      {/* Betting Panel */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        {/* ── Betting closed state ─────────────────────────────────────────── */}
        {isBettingClosed ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">Betting Closed</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Bets must be placed at least 15 minutes before the draw. Betting will reopen once the draw result is published.
              </p>
            </div>
            {game.nextDraw && (
              <div className="rounded-lg bg-muted/30 border border-border/40 px-5 py-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Draw time: </span>
                {fmtDrawLong12(game.nextDraw.drawDate, game.timezone)}
              </div>
            )}
          </div>
        ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-foreground text-sm">Place Your Bet</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Choose play type, numbers and stake</p>
            </div>
            <Button onClick={quickPick} variant="outline" size="sm" className="gap-1.5 shrink-0">
              <Shuffle className="w-3.5 h-3.5" />
              Quick Pick
            </Button>
          </div>

          {/* Play Type spans the full card so 1–5 Numbers stay on one line. */}
          <PlayTypeSelector
            value={playType}
            onChange={(v) => setPlayType(v)}
            enabled={game.enabledPlayTypes}
            color={game.color}
          />

          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            {/* ── LEFT: selections ───────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Bonus Mode */}
              {!isBonusOnly && (
                <BonusModeSelector value={bonusMode} onChange={setBonusMode} hasBonus={hasBonus} />
              )}

              {/* Main Number Grid */}
              {!isBonusOnly && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Pick {requiredMain} Number{requiredMain !== 1 ? "s" : ""}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={selectedMain.length === requiredMain ? { borderColor: `${game.color}60`, color: game.color } : {}}
                    >
                      {selectedMain.length} / {requiredMain}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: game.mainNumbersMax }, (_, i) => i + 1).map((num) => (
                      <NumberBall
                        key={num}
                        num={num}
                        selected={selectedMain.includes(num)}
                        onClick={() => toggleMain(num)}
                        disabled={selectedMain.length >= requiredMain}
                        color={game.color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bonus Ball Picker */}
              {hasBonus && needsBonusPick && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">Bonus Ball</p>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={selectedBonus !== null ? { borderColor: "#ef444460", color: "#ef4444" } : {}}
                    >
                      {selectedBonus !== null ? "1 / 1" : "0 / 1"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: game.bonusNumbersMax }, (_, i) => i + 1).map((num) => (
                      <NumberBall
                        key={num}
                        num={num}
                        selected={selectedBonus === num}
                        onClick={() => toggleBonus(num)}
                        disabled={false}
                        color={game.color}
                        isBonus
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bonus ball required hint */}
              {needsBonusPick && hasBonus && selectedBonus === null && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-500 font-medium">
                  ⭐ Select your Bonus Ball above to continue
                </div>
              )}
            </div>

            {/* ── RIGHT: stake + bet, anchored to the bottom of the number grid ── */}
            <div className="w-full md:w-44 shrink-0 flex flex-col gap-3 justify-end">

            {/* Selected numbers summary */}
            {(selectedMain.length > 0 || selectedBonus !== null) && (
              <div className="rounded-lg bg-muted/30 border border-border/40 p-2 flex flex-wrap gap-1 items-center">
                {selectedMain.map((n) => (
                  <span
                    key={n}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: game.color }}
                  >{n}</span>
                ))}
                {selectedBonus !== null && (
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: "#ef4444" }}
                  >{selectedBonus}</span>
                )}
              </div>
            )}

            {/* Stake input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stake</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={game.minStake}
                  max={game.maxStake}
                  step="0.01"
                  placeholder={`${game.minStake.toFixed(2)}`}
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="pl-6 h-9 text-sm"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Min ${game.minStake} · Max ${game.maxStake}</p>
            </div>

            {/* Odds / potential win preview */}
            {oddsStr && stakeAmount > 0 && (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Odds</span>
                  <span className="font-semibold text-primary">{fmtOdds(oddsStr)}</span>
                </div>
                <div className="flex justify-between text-[11px] border-t border-border/30 pt-1">
                  <span className="text-muted-foreground">Win</span>
                  <span className="font-black" style={{ color: game.color }}>
                    {isJackpot ? "Jackpot" : `$${potentialWin.toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}

            {/* Bet Now / Login */}
            {!user ? (
              <Link href="/login">
                <Button className="w-full h-10 text-sm font-bold gap-1.5">
                  <Zap className="w-4 h-4" />
                  Login
                </Button>
              </Link>
            ) : (
              <Button
                className="w-full h-10 text-sm font-bold gap-1.5"
                disabled={!isReady || buyMutation.isPending}
                onClick={() => buyMutation.mutate()}
                style={isReady ? { background: game.color, color: "white" } : {}}
              >
                {buyMutation.isPending ? (
                  <>Processing…</>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    {isReady ? `Bet Now` : "Select numbers"}
                  </>
                )}
              </Button>
            )}

            {/* Validation hint */}
            {!isReady && user && (
              <p className="text-[10px] text-muted-foreground text-center leading-snug">
                {selectedMain.length < requiredMain
                  ? `Pick ${requiredMain - selectedMain.length} more`
                  : needsBonusPick && hasBonus && selectedBonus === null
                  ? "Pick your bonus ball"
                  : stakeAmount <= 0
                  ? "Enter a stake"
                  : stakeAmount < game.minStake
                  ? `Min $${game.minStake.toFixed(2)}`
                  : stakeAmount > game.maxStake
                  ? `Max $${game.maxStake.toFixed(2)}`
                  : ""}
              </p>
            )}
            </div>
          </div>
        </div>
        )}

      {/* Payout Table */}
      <PayoutTable game={game} />

      {/* Recent draws */}
      {game.recentDraws.slice(0, 7).length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Recent Winning Numbers
          </h3>
          <div className="space-y-3">
            {game.recentDraws.slice(0, 7).map((draw) => (
              <div key={draw.id} className="rounded-lg bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground mb-2">
                  {fmtDrawLong24(draw.drawDate, game.timezone)}
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(draw.winningNumbers as number[]).map((n) => (
                    <span
                      key={n}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: game.color }}
                    >{n}</span>
                  ))}
                  {(draw.bonusNumbers as number[]).length > 0 && (
                    <>
                      <span className="text-amber-400/70 text-xs font-bold px-0.5 select-none">✦</span>
                      {(draw.bonusNumbers as number[]).map((n) => (
                        <span
                          key={`b${n}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: "#ef4444", border: "2px solid #ef4444" }}
                        >{n}</span>
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
    </div>
  );
}
