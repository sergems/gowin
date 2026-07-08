import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlaceBet } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { BetSelectionInput } from "@workspace/api-client-react";
import { useAuth } from "./AuthContext";
import { useSiteSettings } from "./SiteSettingsContext";

// ── Win Bonus types ────────────────────────────────────────────────────────────

export interface WinBonusTier {
  selections: number;
  bonusPercent: number;
}

export interface WinBonusConfig {
  enabled: boolean;
  title: string;
  description: string;
  minQualifyingSelections: number;
  maxSelections: number;
  minQualifyingOdds: number;
  maxPayout: number;
  bonusTable: WinBonusTier[];
}

// ── Client-side bonus calculation (mirrors server logic) ───────────────────────

function getBonusPercentage(qualifyingSelections: number, config: WinBonusConfig): number {
  if (qualifyingSelections < config.minQualifyingSelections) return 0;
  const sorted = [...config.bonusTable].sort((a, b) => a.selections - b.selections);
  let bonusPercent = 0;
  for (const entry of sorted) {
    if (qualifyingSelections >= entry.selections) bonusPercent = entry.bonusPercent;
  }
  return bonusPercent;
}

interface BetSlipItem extends BetSelectionInput {
  fixtureName: string;
  marketName: string;
  competitionName?: string;
  startTime?: string;
  fixtureStatus?: string;
  scoreHome?: number | null;
  scoreAway?: number | null;
}

export interface PlacedBetDetails {
  code: string;
  stake: number;
  totalOdds: number;
  potentialWin: number;
  bonusPercentage: number;
  bonusAmount: number;
  baseWin: number;
  qualifyingSelections: number;
  selections: BetSlipItem[];
  placedAt: Date;
}

interface BetSlipContextType {
  selections: BetSlipItem[];
  addSelection: (item: BetSlipItem) => void;
  removeSelection: (oddsId: number) => void;
  clearSlip: () => void;
  stake: number;
  setStake: (amount: number) => void;
  totalOdds: number;
  potentialWin: number;
  isMaxWinCapped: boolean;
  // Win Bonus
  winBonusConfig: WinBonusConfig | null;
  qualifyingSelections: number;
  bonusPercentage: number;
  baseWin: number;
  bonusAmount: number;
  isWinBonusActive: boolean;
  // Actions
  placeBet: () => Promise<void>;
  isPlacing: boolean;
  bookBet: () => Promise<string | null>;
  isBooking: boolean;
  loadBooking: (code: string) => Promise<void>;
  lastPlacedBet: PlacedBetDetails | null;
  clearLastPlacedBet: () => void;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

const DEFAULT_MAX_SELECTIONS = 50;

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetSlipItem[]>([]);
  const [stake, setStake] = useState<number>(0);
  const [isBooking, setIsBooking] = useState(false);
  const [lastPlacedBet, setLastPlacedBet] = useState<PlacedBetDetails | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency, maxWin: siteMaxWin } = useSiteSettings();

  const placeBetMutation = usePlaceBet();

  // ── Win Bonus config ──────────────────────────────────────────────────────────
  const { data: winBonusConfig } = useQuery<WinBonusConfig>({
    queryKey: ["win-bonus-config"],
    queryFn: () => fetch("/api/win-bonus").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const maxSelections = winBonusConfig?.maxSelections ?? DEFAULT_MAX_SELECTIONS;

  const addSelection = (item: BetSlipItem) => {
    setSelections((prev) => {
      // Replace existing selection for same fixture (only one market per fixture)
      const filtered = prev.filter((s) => s.fixtureId !== item.fixtureId);
      // Enforce max selections
      if (filtered.length >= maxSelections) {
        toast({
          title: "Maximum selections reached",
          description: `Maximum of ${maxSelections} selections allowed.`,
          variant: "destructive",
        });
        return prev;
      }
      return [...filtered, item];
    });
  };

  const removeSelection = (oddsId: number) => {
    setSelections((prev) => prev.filter((s) => s.oddsId !== oddsId));
  };

  const clearSlip = () => {
    setSelections([]);
    setStake(0);
  };

  // ── Odds & bonus calculations ─────────────────────────────────────────────────
  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);
  const baseWin = stake * totalOdds;

  const minQualifyingOdds = winBonusConfig?.minQualifyingOdds ?? 1.4;
  const qualifyingSelections =
    selections.length >= 2
      ? selections.filter((s) => s.odds > minQualifyingOdds).length
      : 0;

  const bonusPercentage =
    winBonusConfig?.enabled && selections.length >= 2
      ? getBonusPercentage(qualifyingSelections, winBonusConfig ?? { minQualifyingSelections: 10, bonusTable: [], enabled: false, title: "", description: "", maxSelections: 50, minQualifyingOdds: 1.4, maxPayout: 1_000_000 })
      : 0;

  const rawBonusAmount = baseWin * (bonusPercentage / 100);
  const effectiveMaxPayout = winBonusConfig?.maxPayout ?? siteMaxWin;
  const rawPotentialWin = baseWin + rawBonusAmount;
  const potentialWin = Math.min(rawPotentialWin, effectiveMaxPayout);
  const isMaxWinCapped = rawPotentialWin > effectiveMaxPayout;

  // Clamp bonus amount if payout is capped
  const bonusAmount = isMaxWinCapped ? Math.max(0, potentialWin - baseWin) : rawBonusAmount;
  const isWinBonusActive = bonusPercentage > 0;

  // ── Place bet ─────────────────────────────────────────────────────────────────
  const placeBet = async () => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please login to place a bet.", variant: "destructive" });
      return;
    }
    if (!(user as any).phoneNumber) {
      toast({ title: "Phone number required", description: "Go to your Profile and add a mobile number before placing bets.", variant: "destructive" });
      return;
    }
    if (selections.length === 0 || stake <= 0) return;

    try {
      const result = await placeBetMutation.mutateAsync({
        data: {
          stake,
          selections: selections.map(({ oddsId, fixtureId, market, selection, odds }) => ({
            oddsId, fixtureId, market, selection, odds,
          })),
        },
      });

      const placed: PlacedBetDetails = {
        code: (result as any).code || "",
        stake,
        totalOdds: selections.length > 0 ? totalOdds : 0,
        potentialWin,
        bonusPercentage: (result as any).bonusPercentage ?? bonusPercentage,
        bonusAmount: (result as any).bonusAmount ?? bonusAmount,
        baseWin: (result as any).baseWin ?? baseWin,
        qualifyingSelections: (result as any).qualifyingSelections ?? qualifyingSelections,
        selections: [...selections],
        placedAt: new Date(),
      };
      setLastPlacedBet(placed);

      const winMsg = isWinBonusActive
        ? `Potential win: ${formatCurrency(potentialWin)} (incl. ${bonusPercentage}% bonus!)`
        : `Potential win: ${formatCurrency(potentialWin)}`;

      toast({ title: "Bet Placed Successfully", description: winMsg });
      clearSlip();
    } catch (err: any) {
      toast({ title: "Failed to place bet", description: err.message || "An error occurred.", variant: "destructive" });
    }
  };

  // ── Book bet ──────────────────────────────────────────────────────────────────
  const bookBet = async (): Promise<string | null> => {
    if (selections.length === 0) return null;
    setIsBooking(true);
    try {
      const res = await fetch("/api/bet-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to book bet");
      }
      const data = await res.json();
      return data.code as string;
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setIsBooking(false);
    }
  };

  // ── Load booking ──────────────────────────────────────────────────────────────
  const loadBooking = async (code: string): Promise<void> => {
    const res = await fetch(`/api/bet-bookings/${encodeURIComponent(code.trim().toUpperCase())}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Booking not found");
    }
    const data = await res.json();
    const loaded: BetSlipItem[] = data.selections.map((s: any) => ({
      oddsId: s.oddsId,
      fixtureId: s.fixtureId,
      market: s.market,
      selection: s.selection,
      odds: s.odds,
      fixtureName: s.fixtureName || "Unknown Fixture",
      marketName: s.market,
      competitionName: s.competitionName,
      startTime: s.startTime,
    }));
    setSelections(loaded);
  };

  const clearLastPlacedBet = () => setLastPlacedBet(null);

  return (
    <BetSlipContext.Provider
      value={{
        selections,
        addSelection,
        removeSelection,
        clearSlip,
        stake,
        setStake,
        totalOdds: selections.length > 0 ? totalOdds : 0,
        potentialWin: selections.length > 0 ? potentialWin : 0,
        isMaxWinCapped: selections.length > 0 ? isMaxWinCapped : false,
        winBonusConfig: winBonusConfig ?? null,
        qualifyingSelections,
        bonusPercentage,
        baseWin: selections.length > 0 ? baseWin : 0,
        bonusAmount: selections.length > 0 ? bonusAmount : 0,
        isWinBonusActive: selections.length > 0 ? isWinBonusActive : false,
        placeBet,
        isPlacing: placeBetMutation.isPending,
        bookBet,
        isBooking,
        loadBooking,
        lastPlacedBet,
        clearLastPlacedBet,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error("useBetSlip must be used within a BetSlipProvider");
  }
  return context;
}
