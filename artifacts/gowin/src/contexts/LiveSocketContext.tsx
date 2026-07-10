import { createContext, useContext, type ReactNode } from "react";
import { useLiveSocket } from "@/hooks/useLiveSocket";
import type { LiveFixture, LiveMarket, OddsDirection, LiveOddsUpdatePayload } from "@/hooks/useLiveSocket";

export type { LiveFixture, LiveMarket, OddsDirection, LiveOddsUpdatePayload };

export interface LiveSocketContextValue {
  fixtures: LiveFixture[];
  connected: boolean;
  allSuspended: boolean;
  getOddsDirection: (fixtureId: number, oddsId: number) => OddsDirection | null;
  latestOddsUpdate: LiveOddsUpdatePayload | null;
}

const LiveSocketContext = createContext<LiveSocketContextValue | null>(null);

export function LiveSocketProvider({ children }: { children: ReactNode }) {
  const value = useLiveSocket();
  return <LiveSocketContext.Provider value={value}>{children}</LiveSocketContext.Provider>;
}

export function useLiveSocketContext(): LiveSocketContextValue {
  const ctx = useContext(LiveSocketContext);
  if (!ctx) throw new Error("useLiveSocketContext must be used within LiveSocketProvider");
  return ctx;
}
