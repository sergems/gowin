export interface LiveTeam {
  id: number;
  name: string;
  logo: string | null;
}

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
  homeTeam: LiveTeam;
  awayTeam: LiveTeam;
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

export interface CacheStats {
  hits: number;
  misses: number;
  apiRequestsToday: number;
  apiRequestsThisMonth: number;
  lastFixtureSync: string | null;
  lastOddsSync: string | null;
  lastStatsSync: string | null;
  lastResultsSync: string | null;
  lastError: string | null;
  lastErrorTime: number | null;
  failCount: number;
  wsConnections: number;
  hitRate: number;
  todayKey: string;
}

class LiveCache {
  private fixtures: Map<number, LiveFixture> = new Map();
  private _stats: Omit<CacheStats, "hitRate"> = {
    hits: 0,
    misses: 0,
    apiRequestsToday: 0,
    apiRequestsThisMonth: 0,
    lastFixtureSync: null,
    lastOddsSync: null,
    lastStatsSync: null,
    lastResultsSync: null,
    lastError: null,
    lastErrorTime: null,
    failCount: 0,
    wsConnections: 0,
    todayKey: new Date().toISOString().split("T")[0]!,
  };

  setFixtures(fixtures: LiveFixture[]) {
    const next = new Map(fixtures.map((f) => [f.id, f]));
    this.fixtures = next;
    this._stats.lastFixtureSync = new Date().toISOString();
  }

  updateFixture(fixture: LiveFixture) {
    this.fixtures.set(fixture.id, fixture);
  }

  removeFixture(id: number) {
    this.fixtures.delete(id);
  }

  getFixtures(): LiveFixture[] {
    return Array.from(this.fixtures.values());
  }

  getFixture(id: number): LiveFixture | undefined {
    return this.fixtures.get(id);
  }

  isEmpty(): boolean {
    return this.fixtures.size === 0;
  }

  recordHit() {
    this._stats.hits++;
  }

  recordMiss() {
    this._stats.misses++;
  }

  recordApiRequest() {
    const todayKey = new Date().toISOString().split("T")[0]!;
    if (todayKey !== this._stats.todayKey) {
      this._stats.apiRequestsToday = 0;
      this._stats.todayKey = todayKey;
    }
    this._stats.apiRequestsToday++;
    this._stats.apiRequestsThisMonth++;
  }

  recordError(msg: string) {
    this._stats.lastError = msg;
    this._stats.lastErrorTime = Date.now();
    this._stats.failCount++;
  }

  clearError() {
    this._stats.lastError = null;
    this._stats.lastErrorTime = null;
    this._stats.failCount = 0;
  }

  setLastOddsSync(ts: string) {
    this._stats.lastOddsSync = ts;
  }

  setLastStatsSync(ts: string) {
    this._stats.lastStatsSync = ts;
  }

  setLastResultsSync(ts: string) {
    this._stats.lastResultsSync = ts;
  }

  setWsConnections(n: number) {
    this._stats.wsConnections = n;
  }

  isRecentError(): boolean {
    if (!this._stats.lastErrorTime) return false;
    return Date.now() - this._stats.lastErrorTime < 5 * 60 * 1000;
  }

  getStats(): CacheStats {
    const total = this._stats.hits + this._stats.misses;
    const hitRate = total > 0 ? Math.round((this._stats.hits / total) * 100) : 0;
    return { ...this._stats, hitRate };
  }
}

export const liveCache = new LiveCache();
