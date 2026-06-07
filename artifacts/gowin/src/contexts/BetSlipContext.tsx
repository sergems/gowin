import { createContext, useContext, useState, ReactNode } from "react";
import { usePlaceBet } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { BetSelectionInput } from "@workspace/api-client-react";
import { useAuth } from "./AuthContext";

interface BetSlipItem extends BetSelectionInput {
  fixtureName: string;
  marketName: string;
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
  placeBet: () => Promise<void>;
  isPlacing: boolean;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetSlipItem[]>([]);
  const [stake, setStake] = useState<number>(0);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const placeBetMutation = usePlaceBet();

  const addSelection = (item: BetSlipItem) => {
    setSelections(prev => {
      // Prevent duplicate selections for same market
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

  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);
  const potentialWin = stake * totalOdds;

  const placeBet = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to place a bet.",
        variant: "destructive"
      });
      return;
    }

    if (!(user as any).phoneNumber) {
      toast({
        title: "Phone number required",
        description: "Go to your Profile and add a mobile number before placing bets.",
        variant: "destructive"
      });
      return;
    }
    
    if (selections.length === 0 || stake <= 0) return;

    try {
      await placeBetMutation.mutateAsync({
        data: {
          stake,
          selections: selections.map(({ oddsId, fixtureId, market, selection, odds }) => ({
            oddsId, fixtureId, market, selection, odds
          }))
        }
      });
      
      toast({
        title: "Bet Placed Successfully",
        description: `Your bet has been placed. Potential win: $${potentialWin.toFixed(2)}`
      });
      clearSlip();
    } catch (err: any) {
      toast({
        title: "Failed to place bet",
        description: err.message || "An error occurred.",
        variant: "destructive"
      });
    }
  };

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
      placeBet,
      isPlacing: placeBetMutation.isPending
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
