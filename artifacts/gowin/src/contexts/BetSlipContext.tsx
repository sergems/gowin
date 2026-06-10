import { createContext, useContext, useState, ReactNode } from "react";
import { usePlaceBet } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { BetSelectionInput } from "@workspace/api-client-react";
import { useAuth } from "./AuthContext";

interface BetSlipItem extends BetSelectionInput {
  fixtureName: string;
  marketName: string;
  competitionName?: string;
  startTime?: string;
}

export interface PlacedBetDetails {
  code: string;
  stake: number;
  totalOdds: number;
  potentialWin: number;
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
  placeBet: () => Promise<void>;
  isPlacing: boolean;
  bookBet: () => Promise<string | null>;
  isBooking: boolean;
  loadBooking: (code: string) => Promise<void>;
  lastPlacedBet: PlacedBetDetails | null;
  clearLastPlacedBet: () => void;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetSlipItem[]>([]);
  const [stake, setStake] = useState<number>(0);
  const [isBooking, setIsBooking] = useState(false);
  const [lastPlacedBet, setLastPlacedBet] = useState<PlacedBetDetails | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const placeBetMutation = usePlaceBet();

  const addSelection = (item: BetSlipItem) => {
    setSelections(prev => {
      const filtered = prev.filter(s => s.fixtureId !== item.fixtureId || s.market !== item.market);
      return [...filtered, item];
    });
  };

  const removeSelection = (oddsId: number) => {
    setSelections(prev => prev.filter(s => s.oddsId !== oddsId));
  };

  const clearSlip = () => {
    setSelections([]);
    setStake(0);
  };

  const MAX_WIN = 1_000_000;
  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);
  const rawPotentialWin = stake * totalOdds;
  const potentialWin = Math.min(rawPotentialWin, MAX_WIN);
  const isMaxWinCapped = rawPotentialWin > MAX_WIN;

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
            oddsId, fixtureId, market, selection, odds
          }))
        }
      });

      const placed: PlacedBetDetails = {
        code: (result as any).code || "",
        stake,
        totalOdds: selections.length > 0 ? totalOdds : 0,
        potentialWin,
        selections: [...selections],
        placedAt: new Date(),
      };
      setLastPlacedBet(placed);

      toast({ title: "Bet Placed Successfully", description: `Your bet has been placed. Potential win: $${potentialWin.toFixed(2)}` });
      clearSlip();
    } catch (err: any) {
      toast({ title: "Failed to place bet", description: err.message || "An error occurred.", variant: "destructive" });
    }
  };

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
    <BetSlipContext.Provider value={{
      selections,
      addSelection,
      removeSelection,
      clearSlip,
      stake,
      setStake,
      totalOdds: selections.length > 0 ? totalOdds : 0,
      potentialWin: selections.length > 0 ? potentialWin : 0,
      isMaxWinCapped: selections.length > 0 ? isMaxWinCapped : false,
      placeBet,
      isPlacing: placeBetMutation.isPending,
      bookBet,
      isBooking,
      loadBooking,
      lastPlacedBet,
      clearLastPlacedBet,
    }}>
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
