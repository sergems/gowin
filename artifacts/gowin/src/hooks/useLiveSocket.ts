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

export type OddsDirection = "up" | "down";

export interface LiveOddsUpdatePayload {
  updates: Array<{ fixtureId: number; markets: LiveMarket[] }>;
  seq: number;
}

interface LiveState {
  fixtures: Map<number, LiveFixture>;
  prevOdds: Map<string, number>;
  oddsDirections: Map<string, OddsDirection>;
  connected: boolean;
  /** True while disconnected — all odds must be shown as suspended */
  allSuspended: boolean;
  /** Latest LIVE_ODDS_UPDATE payload — seq increments each update so consumers can useEffect on it */
  latestOddsUpdate: LiveOddsUpdatePayload | null;
}

type LiveAction =
  | { type: "CONNECTED"; fixtures: LiveFixture[] }
  | { type: "FIXTURE_UPDATE"; fixtures: LiveFixture[] }
  | { type: "ODDS_UPDATE"; updates: Array<{ fixtureId: number; markets: LiveMarket[] }> }
  | { type: "STATS_UPDATE"; updates: Array<{ fixtureId: number; stats: LiveStats }> }
  | { type: "DISCONNECTED" }
  | { type: "CLEAR_DIRECTIONS" };

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
      return { ...state, fixtures, prevOdds, connected: true, allSuspended: false };
    }

    case "FIXTURE_UPDATE": {
      // LIVE_FIXTURE_UPDATE is always a full snapshot of all current live
      // fixtures — replace the map entirely so settled fixtures are removed
      const fixtures = new Map(action.fixtures.map((f) => [f.id, f]));
      return { ...state, fixtures };
    }

    case "ODDS_UPDATE": {
      const fixtures = new Map(state.fixtures);
      const prevOdds = new Map(state.prevOdds);
      const oddsDirections = new Map<string, OddsDirection>();

      for (const { fixtureId, markets } of action.updates) {
        const existing = fixtures.get(fixtureId);
        if (!existing) continue;
        for (const m of markets) {
          for (const o of m.odds) {
            const key = oddsKey(fixtureId, o.id);
            const prev = prevOdds.get(key);
            if (prev !== undefined && prev !== o.oddsValue) {
              oddsDirections.set(key, o.oddsValue > prev ? "up" : "down");
            }
            prevOdds.set(key, o.oddsValue);
          }
        }
        fixtures.set(fixtureId, { ...existing, markets });
      }

      const latestOddsUpdate: LiveOddsUpdatePayload = {
        updates: action.updates,
        seq: (state.latestOddsUpdate?.seq ?? 0) + 1,
      };
      return { ...state, fixtures, prevOdds, oddsDirections, latestOddsUpdate };
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
      // Mark allSuspended=true — the UI will lock all odds buttons immediately
      return { ...state, connected: false, allSuspended: true };

    case "CLEAR_DIRECTIONS":
      return { ...state, oddsDirections: new Map() };

    default:
      return state;
  }
}

export function useLiveSocket() {
  const [state, dispatch] = useReducer(reducer, {
    fixtures: new Map(),
    prevOdds: new Map(),
    oddsDirections: new Map(),
    connected: false,
    allSuspended: false,
    latestOddsUpdate: null,
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
          // Clear direction highlights after 1.5 s
          setTimeout(() => dispatch({ type: "CLEAR_DIRECTIONS" }), 1500);
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

  const getOddsDirection = (fixtureId: number, oddsId: number): OddsDirection | null =>
    state.oddsDirections.get(oddsKey(fixtureId, oddsId)) ?? null;

  return {
    fixtures: getFixtures(),
    connected: state.connected,
    allSuspended: state.allSuspended,
    getOddsDirection,
    latestOddsUpdate: state.latestOddsUpdate,
  };
}
