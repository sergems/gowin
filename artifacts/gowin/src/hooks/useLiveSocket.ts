import { useEffect, useReducer, useRef, useCallback } from "react";

export interface LiveOdd {
  id: number;
  selection: string;
  oddsValue: number;
}

export interface LiveMarket {
  id: number;
  marketType: string;
  suspended: boolean;
  odds: LiveOdd[];
}

export interface LiveStats {
  possessionHome?: string;
  possessionAway?: string;
  shotsHome?: number;
  shotsAway?: number;
  shotsOnTargetHome?: number;
  shotsOnTargetAway?: number;
  cornersHome?: number;
  cornersAway?: number;
  yellowCardsHome?: number;
  yellowCardsAway?: number;
  redCardsHome?: number;
  redCardsAway?: number;
}

export interface LiveFixture {
  id: number;
  externalId: string | null;
  homeTeam: { id: number; name: string; logo: string | null };
  awayTeam: { id: number; name: string; logo: string | null };
  leagueId: number;
  leagueName: string;
  leagueLogo: string | null;
  countryName: string | null;
  sportId: number;
  sportName: string;
  scoreHome: number | null;
  scoreAway: number | null;
  matchMinute: string | null;
  status: string;
  startTime: string;
  markets: LiveMarket[];
  stats: LiveStats | null;
  lastUpdated: number;
}

interface LiveState {
  fixtures: Map<number, LiveFixture>;
  prevOdds: Map<string, number>;
  changedOddsKeys: Set<string>;
  connected: boolean;
}

type LiveAction =
  | { type: "CONNECTED"; fixtures: LiveFixture[] }
  | { type: "FIXTURE_UPDATE"; fixtures: LiveFixture[] }
  | { type: "ODDS_UPDATE"; updates: Array<{ fixtureId: number; markets: LiveMarket[] }> }
  | { type: "STATS_UPDATE"; updates: Array<{ fixtureId: number; stats: LiveStats }> }
  | { type: "DISCONNECTED" }
  | { type: "CLEAR_CHANGED" };

function oddsKey(fixtureId: number, oddsId: number) {
  return `${fixtureId}:${oddsId}`;
}

function reducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case "CONNECTED": {
      const fixtures = new Map(action.fixtures.map((f) => [f.id, f]));
      const prevOdds = new Map<string, number>();
      for (const f of action.fixtures) {
        for (const m of f.markets) {
          for (const o of m.odds) prevOdds.set(oddsKey(f.id, o.id), o.oddsValue);
        }
      }
      return { ...state, fixtures, prevOdds, connected: true };
    }

    case "FIXTURE_UPDATE": {
      const fixtures = new Map(state.fixtures);
      for (const f of action.fixtures) fixtures.set(f.id, f);
      return { ...state, fixtures };
    }

    case "ODDS_UPDATE": {
      const fixtures = new Map(state.fixtures);
      const prevOdds = new Map(state.prevOdds);
      const changedOddsKeys = new Set<string>();

      for (const { fixtureId, markets } of action.updates) {
        const existing = fixtures.get(fixtureId);
        if (!existing) continue;
        for (const m of markets) {
          for (const o of m.odds) {
            const key = oddsKey(fixtureId, o.id);
            const prev = prevOdds.get(key);
            if (prev !== undefined && prev !== o.oddsValue) changedOddsKeys.add(key);
            prevOdds.set(key, o.oddsValue);
          }
        }
        fixtures.set(fixtureId, { ...existing, markets });
      }

      return { ...state, fixtures, prevOdds, changedOddsKeys };
    }

    case "STATS_UPDATE": {
      const fixtures = new Map(state.fixtures);
      for (const { fixtureId, stats } of action.updates) {
        const existing = fixtures.get(fixtureId);
        if (existing) fixtures.set(fixtureId, { ...existing, stats });
      }
      return { ...state, fixtures };
    }

    case "DISCONNECTED":
      return { ...state, connected: false };

    case "CLEAR_CHANGED":
      return { ...state, changedOddsKeys: new Set() };

    default:
      return state;
  }
}

export function useLiveSocket() {
  const [state, dispatch] = useReducer(reducer, {
    fixtures: new Map(),
    prevOdds: new Map(),
    changedOddsKeys: new Set(),
    connected: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "CONNECTED") {
          dispatch({ type: "CONNECTED", fixtures: msg.payload.fixtures ?? [] });
        } else if (msg.type === "LIVE_FIXTURE_UPDATE") {
          dispatch({ type: "FIXTURE_UPDATE", fixtures: msg.payload.fixtures ?? [] });
        } else if (msg.type === "LIVE_ODDS_UPDATE") {
          dispatch({ type: "ODDS_UPDATE", updates: msg.payload.updates ?? [] });
          setTimeout(() => dispatch({ type: "CLEAR_CHANGED" }), 1500);
        } else if (msg.type === "LIVE_STATS_UPDATE") {
          dispatch({ type: "STATS_UPDATE", updates: msg.payload.updates ?? [] });
        }
      } catch { /* ignore malformed frames */ }
    };

    ws.onclose = () => {
      dispatch({ type: "DISCONNECTED" });
      if (mountedRef.current) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const getFixtures = (): LiveFixture[] => Array.from(state.fixtures.values());

  const isOddsChanged = (fixtureId: number, oddsId: number): boolean =>
    state.changedOddsKeys.has(oddsKey(fixtureId, oddsId));

  return { fixtures: getFixtures(), connected: state.connected, isOddsChanged };
}
