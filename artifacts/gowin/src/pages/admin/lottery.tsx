import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Trophy, ChevronDown, ChevronUp, Check, Loader2, Play, RefreshCw, Globe, Clock, AlertCircle, CheckCircle, XCircle, MinusCircle, Search, Filter, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
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
  isActive: boolean;
  color: string;
  emoji: string;
  description: string | null;
  payoutConfig: PayoutConfig | null;
  minStake: number;
  maxStake: number;
  maxPayout: number;
  enabledPlayTypes: string[];
}

interface LotteryDraw {
  id: number;
  gameId: number;
  drawDate: string;
  winningNumbers: number[];
  bonusNumbers: number[];
  jackpot: number;
  status: string;
  game: { id: number; name: string; slug: string } | null;
}

interface LotteryTicket {
  id: number;
  userId: number;
  stake: number;
  status: string;
  prizeAmount: number | null;
  createdAt: string;
  numbers: number[];
  bonusNumbers: number[];
  game: { id: number; name: string; slug: string; emoji: string } | null;
}

interface ScraperLog {
  id: number;
  gameId: number | null;
  website: string | null;
  status: string;
  message: string | null;
  executionTime: number | null;
  createdAt: string;
  game: { id: number; name: string; emoji: string } | null;
}

interface SettlementLog {
  id: number;
  drawId: number | null;
  gameId: number | null;
  ticketsChecked: number;
  winningTickets: number;
  totalPaid: number;
  executionTime: number | null;
  createdAt: string;
  game: { id: number; name: string; emoji: string; country: string | null; logoUrl: string | null } | null;
  draw: { id: number; drawDate: string; winningNumbers: number[]; bonusNumbers: number[] } | null;
}

const COUNTRY_FLAG: Record<string, string> = {
  "Australia": "au", "Austria": "at", "Belgium": "be", "Brazil": "br",
  "Canada": "ca", "China": "cn", "Croatia": "hr", "Czech Republic": "cz",
  "Denmark": "dk", "Europe": "eu", "Finland": "fi", "France": "fr",
  "Germany": "de", "Greece": "gr", "Hungary": "hu", "Ireland": "ie",
  "Israel": "il", "Italy": "it", "Japan": "jp", "Mexico": "mx",
  "Netherlands": "nl", "New Zealand": "nz", "Norway": "no", "Peru": "pe",
  "Poland": "pl", "Portugal": "pt", "Romania": "ro", "Russia": "ru",
  "Slovakia": "sk", "Slovenia": "si", "South Africa": "za", "Spain": "es",
  "Sweden": "se", "Switzerland": "ch", "Ukraine": "ua", "United Kingdom": "gb",
  "United States": "us",
};

function countryFlagUrl(country: string | null | undefined): string | null {
  if (!country) return null;
  const code = COUNTRY_FLAG[country];
  return code ? `https://flagcdn.com/20x15/${code}.png` : null;
}

interface ScraperInfo {
  id: number;
  name: string;
  slug: string;
  emoji: string;
  isActive: boolean;
  website: string | null;
  scraperClass: string | null;
  drawDays: number[];
  drawTime: string | null;
  timezone: string;
  lastLog: ScraperLog | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Auth helpers ──────────────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem("gowin_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` };
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers ?? {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any).error || res.statusText);
  return json as T;
}

// ── Default payout config ─────────────────────────────────────────────────────

const DEFAULT_PAYOUT_CONFIG: PayoutConfig = {
  excludedBonus: { "1": "13/2", "2": "60/1", "3": "600/1", "4": "10000/1", "5": "100000/1", "6": "jackpot" },
  includedBonus: { "1": "11/2", "2": "50/1", "3": "420/1", "4": "5000/1", "5": "50000/1", "6": "jackpot" },
  bonusOnly: "45/1",
  withBonus: { "1": "344/1", "2": "2805/1", "3": "27645/1", "4": "460045/1" },
};

const ALL_PLAY_TYPES = ["1", "2", "3", "4", "5", "6", "bonus_only"] as const;
const PLAY_TYPE_LABELS: Record<string, string> = {
  "1": "1 Number", "2": "2 Numbers", "3": "3 Numbers", "4": "4 Numbers",
  "5": "5 Numbers", "6": "6 Numbers (Full)", "bonus_only": "Bonus Ball Only",
};

// ── Payout Config Editor ──────────────────────────────────────────────────────

function PayoutConfigEditor({ value, onChange }: {
  value: PayoutConfig;
  onChange: (v: PayoutConfig) => void;
}) {
  const mainKeys = ["1", "2", "3", "4", "5", "6"];
  const bonusKeys = ["1", "2", "3", "4"];

  function setMain(section: "excludedBonus" | "includedBonus", key: string, val: string) {
    onChange({ ...value, [section]: { ...value[section], [key]: val } });
  }

  return (
    <div className="space-y-5 rounded-xl border border-border/50 bg-background/40 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Payout Odds (fractional e.g. 420/1, or "jackpot" for 6-number jackpot)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Excluded Bonus */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground italic">Excluding Bonus Ball</p>
          {mainKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">
                {k} {k === "6" ? "Numbers ★" : k === "1" ? "Number" : "Numbers"}
              </span>
              <Input
                className="h-7 text-xs"
                value={value.excludedBonus?.[k] ?? ""}
                onChange={(e) => setMain("excludedBonus", k, e.target.value)}
                placeholder={k === "6" ? "jackpot" : "e.g. 13/2"}
              />
            </div>
          ))}
        </div>

        {/* Included Bonus */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground italic">Including Bonus Ball</p>
          {mainKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">
                {k} {k === "6" ? "Numbers ★" : k === "1" ? "Number" : "Numbers"}
              </span>
              <Input
                className="h-7 text-xs"
                value={value.includedBonus?.[k] ?? ""}
                onChange={(e) => setMain("includedBonus", k, e.target.value)}
                placeholder={k === "6" ? "jackpot" : "e.g. 11/2"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bonus ball only */}
      <div className="flex items-center gap-3 border-t border-border/30 pt-4">
        <span className="text-xs font-bold text-yellow-500 w-24 shrink-0">Bonus Ball Only</span>
        <Input
          className="h-7 text-xs w-28"
          value={value.bonusOnly ?? ""}
          onChange={(e) => onChange({ ...value, bonusOnly: e.target.value })}
          placeholder="45/1"
        />
      </div>

      {/* N + Bonus Ball (exclude mode enhanced) */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-yellow-500/80">N Numbers + Bonus (exclude mode bonus coincidence)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bonusKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{k} + Bonus</span>
              <Input
                className="h-7 text-xs"
                value={value.withBonus?.[k] ?? ""}
                onChange={(e) => onChange({ ...value, withBonus: { ...value.withBonus, [k]: e.target.value } })}
                placeholder="e.g. 344/1"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Game Form ─────────────────────────────────────────────────────────────────

const DEFAULT_GAME = {
  name: "", slug: "", country: "", mainNumbersCount: 6, mainNumbersMax: 52,
  bonusNumbersCount: 1, bonusNumbersMax: 52, ticketPrice: 2,
  nextDrawAt: "", color: "#4ade80", emoji: "🎰", description: "", isActive: true,
  payoutConfig: DEFAULT_PAYOUT_CONFIG,
  minStake: 1, maxStake: 100, maxPayout: 500000,
  enabledPlayTypes: ["1", "2", "3", "4", "5", "6", "bonus_only"],
};

type GameForm = typeof DEFAULT_GAME & {
  enabledPlayTypes: string[];
};

function GameFormPanel({ initial, onSave, onCancel }: {
  initial?: Partial<GameForm>;
  onSave: (data: GameForm) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<GameForm>({
    ...DEFAULT_GAME,
    ...initial,
    payoutConfig: initial?.payoutConfig ?? DEFAULT_PAYOUT_CONFIG,
  });
  const [saving, setSaving] = useState(false);
  const [showPayout, setShowPayout] = useState(false);

  function set(key: keyof GameForm, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Powerball" required />
        </div>
        <div className="space-y-1.5">
          <Label>Slug (URL key)</Label>
          <Input value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="powerball" required />
        </div>
        <div className="space-y-1.5">
          <Label>Country / Region</Label>
          <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="United States" required />
        </div>
        <div className="space-y-1.5">
          <Label>Ticket Price ($)</Label>
          <Input type="number" min="0.01" step="0.01" value={form.ticketPrice} onChange={(e) => set("ticketPrice", parseFloat(e.target.value))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Main Numbers Count (max picks)</Label>
          <Input type="number" min="1" max="20" value={form.mainNumbersCount} onChange={(e) => set("mainNumbersCount", parseInt(e.target.value))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Main Numbers Max (pool size)</Label>
          <Input type="number" min="1" max="100" value={form.mainNumbersMax} onChange={(e) => set("mainNumbersMax", parseInt(e.target.value))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Bonus Numbers Count</Label>
          <Input type="number" min="0" max="5" value={form.bonusNumbersCount} onChange={(e) => set("bonusNumbersCount", parseInt(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Bonus Numbers Max</Label>
          <Input type="number" min="0" max="100" value={form.bonusNumbersMax} onChange={(e) => set("bonusNumbersMax", parseInt(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Next Draw At</Label>
          <Input type="datetime-local" value={form.nextDrawAt} onChange={(e) => set("nextDrawAt", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <div className="flex gap-2">
            <Input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="w-12 h-9 p-1 cursor-pointer" />
            <Input value={form.color} onChange={(e) => set("color", e.target.value)} className="flex-1" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Emoji</Label>
          <Input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={4} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description (optional)</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </div>

      {/* Stake & payout limits */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Stake & Payout Limits</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Min Stake ($)</Label>
            <Input
              type="number" min="0.01" step="0.01"
              value={form.minStake}
              onChange={(e) => set("minStake", parseFloat(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max Stake ($)</Label>
            <Input
              type="number" min="1" step="1"
              value={form.maxStake}
              onChange={(e) => set("maxStake", parseFloat(e.target.value) || 100)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max Payout ($)</Label>
            <Input
              type="number" min="100" step="100"
              value={form.maxPayout}
              onChange={(e) => set("maxPayout", parseFloat(e.target.value) || 500000)}
            />
          </div>
        </div>
      </div>

      {/* Enabled Play Types */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Enabled Play Types</p>
        <div className="flex flex-wrap gap-2">
          {ALL_PLAY_TYPES.map((pt) => {
            const enabled = (form.enabledPlayTypes ?? []).includes(pt);
            return (
              <button
                key={pt}
                type="button"
                onClick={() => {
                  const current = form.enabledPlayTypes ?? [];
                  set("enabledPlayTypes", enabled ? current.filter((x) => x !== pt) : [...current, pt]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  enabled
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-muted/20 border-border/50 text-muted-foreground"
                }`}
              >
                {PLAY_TYPE_LABELS[pt]}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Toggle which play types are available for this game.</p>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} id="isActive" />
        <Label htmlFor="isActive">Active (visible to players)</Label>
      </div>

      {/* Payout config collapsible */}
      <div>
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowPayout(!showPayout)}
        >
          {showPayout ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Payout Settings (odds per number count)
        </button>
        {showPayout && (
          <div className="mt-3">
            <PayoutConfigEditor
              value={form.payoutConfig}
              onChange={(v) => set("payoutConfig", v)}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Game"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Draw Form Panel ───────────────────────────────────────────────────────────

function DrawFormPanel({ games, onSave, onCancel }: {
  games: LotteryGame[];
  onSave: (data: { gameId: number; drawDate: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [gameId, setGameId] = useState<number>(games[0]?.id ?? 0);
  const [drawDate, setDrawDate] = useState(() => {
    const d = new Date(Date.now() + 3 * 86_400_000);
    return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gameId || !drawDate) return;
    setSaving(true);
    try { await onSave({ gameId, drawDate }); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
      <h3 className="font-bold text-foreground">Schedule New Draw</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Game</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={gameId}
            onChange={(e) => setGameId(parseInt(e.target.value))}
            required
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Draw Date & Time</Label>
          <Input type="datetime-local" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} required />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={saving || !gameId} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? "Creating…" : "Create Draw"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Settle Draw Panel ─────────────────────────────────────────────────────────

function SettleDrawPanel({ draw, onSettle, onCancel }: {
  draw: LotteryDraw;
  onSettle: (winningNumbers: number[], bonusNumbers: number[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [winningInput, setWinningInput] = useState("");
  const [bonusInput, setBonusInput] = useState("");
  const [settling, setSettling] = useState(false);

  async function handleSettle() {
    const winNums = winningInput.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n) && n > 0);
    const bonusNums = bonusInput.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n) && n > 0);
    if (winNums.length === 0) return;
    setSettling(true);
    try { await onSettle(winNums, bonusNums); }
    finally { setSettling(false); }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
      <h3 className="font-bold text-foreground">Settle Draw #{draw.id} — {draw.game?.name}</h3>
      <p className="text-sm text-muted-foreground">
        Enter the winning numbers. Prizes are paid at the odds in each game's payout config.
      </p>
      <div className="space-y-1.5">
        <Label>Winning Numbers (comma or space separated)</Label>
        <Input value={winningInput} onChange={(e) => setWinningInput(e.target.value)} placeholder="e.g. 5, 12, 23, 44, 69" />
      </div>
      <div className="space-y-1.5">
        <Label>Bonus Numbers (optional)</Label>
        <Input value={bonusInput} onChange={(e) => setBonusInput(e.target.value)} placeholder="e.g. 3" />
      </div>
      <div className="flex gap-3">
        <Button onClick={handleSettle} disabled={settling || !winningInput.trim()} className="gap-2">
          {settling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {settling ? "Settling…" : "Settle & Pay Winners"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Settlement Logs Panel ─────────────────────────────────────────────────────

function SettlementLogsPanel({
  logs, total, loading,
}: { logs: SettlementLog[]; total: number; loading: boolean }) {
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table><TableBody>
          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
        </TableBody></Table>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table><TableBody>
          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No settlements yet. Settlement logs appear after the scraper finds and settles a draw.</TableCell></TableRow>
        </TableBody></Table>
      </div>
    );
  }

  // All distinct countries (for the filter bar)
  const allCountries = Array.from(
    new Set(logs.map((l) => l.game?.country ?? "Unknown").filter(Boolean))
  ).sort();

  // Apply optional country filter
  const visible = countryFilter ? logs.filter((l) => (l.game?.country ?? "Unknown") === countryFilter) : logs;

  // Group by date → country
  type CountryGroup = { country: string; logoUrl: string | null; logs: SettlementLog[] };
  type DateGroup   = { dateKey: string; countries: CountryGroup[] };

  const dateMap: Record<string, Record<string, SettlementLog[]>> = {};
  for (const log of visible) {
    const dateKey = format(new Date(log.createdAt), "yyyy-MM-dd");
    const country = log.game?.country ?? "Unknown";
    if (!dateMap[dateKey]) dateMap[dateKey] = {};
    if (!dateMap[dateKey][country]) dateMap[dateKey][country] = [];
    dateMap[dateKey][country].push(log);
  }

  const dateGroups: DateGroup[] = Object.keys(dateMap)
    .sort((a, b) => b.localeCompare(a))
    .map((dateKey) => ({
      dateKey,
      countries: Object.entries(dateMap[dateKey]).map(([country, clogs]) => ({
        country,
        logoUrl: clogs[0]?.game?.logoUrl ?? null,
        logs: clogs,
      })).sort((a, b) => a.country.localeCompare(b.country)),
    }));

  return (
    <div className="space-y-4">
      {/* Header + country filter chips */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">{total} settlement operations recorded</p>
        <div className="flex gap-2 flex-wrap ml-auto">
          <button
            onClick={() => setCountryFilter(null)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              !countryFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            All
          </button>
          {allCountries.map((country) => {
            const flagUrl = countryFlagUrl(country);
            const active = countryFilter === country;
            return (
              <button
                key={country}
                onClick={() => setCountryFilter(active ? null : country)}
                title={country}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {flagUrl
                  ? <img src={flagUrl} alt={country} className="w-4 h-3 object-cover rounded-sm" />
                  : <span className="text-[10px]">🌍</span>
                }
                {country}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date → Country groups */}
      <div className="space-y-8">
        {dateGroups.map(({ dateKey, countries }) => {
          const dayTotal   = countries.reduce((s, c) => s + c.logs.reduce((ss, l) => ss + l.totalPaid, 0), 0);
          const dayWinners = countries.reduce((s, c) => s + c.logs.reduce((ss, l) => ss + l.winningTickets, 0), 0);
          return (
            <div key={dateKey} className="space-y-3">
              {/* ── Date header ── */}
              <div className="flex items-center justify-between px-1 pb-1 border-b border-border/40">
                <span className="text-sm font-semibold text-foreground">
                  {format(new Date(dateKey + "T12:00:00"), "EEEE, MMMM d, yyyy")}
                </span>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{countries.reduce((s, c) => s + c.logs.length, 0)} settlement{countries.reduce((s, c) => s + c.logs.length, 0) !== 1 ? "s" : ""}</span>
                  {dayWinners > 0 && <span className="text-primary font-semibold">{dayWinners} winner{dayWinners !== 1 ? "s" : ""}</span>}
                  {dayTotal > 0 && <span className="text-primary font-semibold">${dayTotal.toFixed(2)} paid</span>}
                </div>
              </div>

              {/* ── Per-country tables ── */}
              <div className="space-y-3 pl-2">
                {countries.map(({ country, logoUrl, logs: cLogs }) => {
                  const flagUrl = countryFlagUrl(country);
                  const cTotal   = cLogs.reduce((s, l) => s + l.totalPaid, 0);
                  const cWinners = cLogs.reduce((s, l) => s + l.winningTickets, 0);
                  return (
                    <div key={country} className="space-y-1">
                      {/* Country header — clicking sets filter */}
                      <button
                        onClick={() => setCountryFilter(countryFilter === country ? null : country)}
                        className="flex items-center gap-2 group"
                      >
                        {flagUrl ? (
                          <img src={flagUrl} alt={country} className="w-5 h-4 object-cover rounded-sm shadow-sm" />
                        ) : logoUrl ? (
                          <img src={logoUrl} alt={country} className="w-5 h-4 object-contain" />
                        ) : (
                          <span className="text-sm">🌍</span>
                        )}
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {country}
                        </span>
                        <span className="text-xs text-muted-foreground">{cLogs.length} settlement{cLogs.length !== 1 ? "s" : ""}</span>
                        {cWinners > 0 && <span className="text-xs text-primary font-semibold">{cWinners} winner{cWinners !== 1 ? "s" : ""}</span>}
                        {cTotal > 0 && <span className="text-xs text-primary font-semibold">${cTotal.toFixed(2)}</span>}
                      </button>

                      <div className="rounded-xl border border-border/50 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>Lottery</TableHead>
                              <TableHead>Winning Numbers</TableHead>
                              <TableHead>Tickets Checked</TableHead>
                              <TableHead>Winners</TableHead>
                              <TableHead>Total Paid</TableHead>
                              <TableHead>Time (ms)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cLogs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                                  {format(new Date(log.createdAt), "p")}
                                </TableCell>
                                <TableCell>
                                  {log.game
                                    ? <span className="text-sm font-medium">{log.game.emoji} {log.game.name}</span>
                                    : <span className="text-xs text-muted-foreground">Unknown</span>}
                                </TableCell>
                                <TableCell>
                                  {log.draw && log.draw.winningNumbers.length > 0 ? (
                                    <div className="flex gap-1 flex-wrap">
                                      {log.draw.winningNumbers.map((n) => (
                                        <span key={n} className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">{n}</span>
                                      ))}
                                      {log.draw.bonusNumbers.map((n) => (
                                        <span key={`b${n}`} className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px] font-bold flex items-center justify-center">{n}</span>
                                      ))}
                                    </div>
                                  ) : <span className="text-xs text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-sm text-center">{log.ticketsChecked}</TableCell>
                                <TableCell>
                                  <span className={`text-sm font-semibold ${log.winningTickets > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                    {log.winningTickets}
                                  </span>
                                </TableCell>
                                <TableCell className={`text-sm font-semibold ${log.totalPaid > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                  ${log.totalPaid.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground font-mono">
                                  {log.executionTime != null ? `${log.executionTime}ms` : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────

export default function AdminLottery() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"games" | "draws" | "tickets" | "scrapers" | "scraper-logs" | "settlement-logs">("games");
  const [showAddGame, setShowAddGame] = useState(false);
  const [editGame, setEditGame] = useState<LotteryGame | null>(null);
  const [settleDraw, setSettleDraw] = useState<LotteryDraw | null>(null);
  const [showAddDraw, setShowAddDraw] = useState(false);
  const [drawSearch, setDrawSearch] = useState("");
  const [drawCountryFilter, setDrawCountryFilter] = useState("All");
  const [collapsedUpcoming, setCollapsedUpcoming] = useState<Set<string>>(new Set());
  const [collapsedSettled, setCollapsedSettled] = useState<Set<string>>(new Set());

  // ── Games ──
  const { data: games = [], isLoading: gamesLoading } = useQuery<LotteryGame[]>({
    queryKey: ["/admin/lottery/games"],
    queryFn: () => apiFetch("/api/admin/lottery/games"),
  });

  const createGame = useMutation({
    mutationFn: (data: GameForm) =>
      apiFetch<LotteryGame>("/api/admin/lottery/games", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/admin/lottery/games"] });
      setShowAddGame(false);
      toast({ title: "Game created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateGame = useMutation({
    mutationFn: ({ id, data }: { id: number; data: GameForm }) =>
      apiFetch<LotteryGame>(`/api/admin/lottery/games/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/admin/lottery/games"] });
      setEditGame(null);
      toast({ title: "Game updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGame = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/lottery/games/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/admin/lottery/games"] });
      toast({ title: "Game deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Draws ──
  const { data: draws = [], isLoading: drawsLoading } = useQuery<LotteryDraw[]>({
    queryKey: ["/admin/lottery/draws"],
    queryFn: () => apiFetch("/api/admin/lottery/draws"),
    enabled: tab === "draws",
  });

  const createDraw = useMutation({
    mutationFn: (data: { gameId: number; drawDate: string }) =>
      apiFetch<LotteryDraw>("/api/admin/lottery/draws", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/admin/lottery/draws"] });
      setShowAddDraw(false);
      toast({ title: "Draw scheduled" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const settleMutation = useMutation({
    mutationFn: ({ drawId, winningNumbers, bonusNumbers }: { drawId: number; winningNumbers: number[]; bonusNumbers: number[] }) =>
      apiFetch(`/api/admin/lottery/draws/${drawId}/settle`, { method: "POST", body: JSON.stringify({ winningNumbers, bonusNumbers }) }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/admin/lottery/draws"] });
      setSettleDraw(null);
      toast({ title: `Draw settled — ${data.settled} ticket(s), ${data.winners} winner(s)` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteDraw = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/lottery/draws/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/admin/lottery/draws"] });
      toast({ title: "Draw removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Build a map of gameId → country for grouping draws
  const gameCountryMap = useMemo(() => {
    const m = new Map<number, string>();
    games.forEach((g) => m.set(g.id, g.country));
    return m;
  }, [games]);

  // All unique countries that appear in draws
  const drawCountries = useMemo(() => {
    const set = new Set<string>();
    draws.forEach((d) => {
      const c = gameCountryMap.get(d.gameId) ?? "Other";
      set.add(c);
    });
    return ["All", ...Array.from(set).sort()];
  }, [draws, gameCountryMap]);

  // Filtered draws
  const filteredDraws = useMemo(() => {
    const q = drawSearch.toLowerCase();
    return draws.filter((d) => {
      const name = (d.game?.name ?? "").toLowerCase();
      const country = (gameCountryMap.get(d.gameId) ?? "").toLowerCase();
      const matchSearch = !q || name.includes(q) || country.includes(q);
      const matchCountry = drawCountryFilter === "All" || (gameCountryMap.get(d.gameId) ?? "Other") === drawCountryFilter;
      return matchSearch && matchCountry;
    });
  }, [draws, drawSearch, drawCountryFilter, gameCountryMap]);

  // Split into upcoming (pending) and settled
  const upcomingDraws = useMemo(() =>
    filteredDraws.filter((d) => d.status !== "settled").sort((a, b) => new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime()),
    [filteredDraws]
  );
  const settledDraws = useMemo(() =>
    filteredDraws.filter((d) => d.status === "settled").sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime()),
    [filteredDraws]
  );

  // Group draws by country
  function groupByCountry(list: LotteryDraw[]) {
    const map = new Map<string, LotteryDraw[]>();
    list.forEach((d) => {
      const c = gameCountryMap.get(d.gameId) ?? "Other";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(d);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }

  // ── Tickets ──
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{ tickets: LotteryTicket[]; total: number }>({
    queryKey: ["/admin/lottery/tickets"],
    queryFn: () => apiFetch("/api/admin/lottery/tickets?limit=100"),
    enabled: tab === "tickets",
  });

  // ── Scrapers ──
  const { data: scrapersData, isLoading: scrapersLoading, refetch: refetchScrapers } = useQuery<{
    games: ScraperInfo[]; registeredScrapers: string[];
  }>({
    queryKey: ["/admin/lottery/scrapers"],
    queryFn: () => apiFetch("/api/admin/lottery/scrapers"),
    enabled: tab === "scrapers",
    refetchInterval: tab === "scrapers" ? 10_000 : false,
  });

  const runScraper = useMutation({
    mutationFn: (gameId: number) =>
      apiFetch<{ status: string; message: string }>(`/api/admin/lottery/scrapers/${gameId}/run`, { method: "POST" }),
    onSuccess: (data) => {
      refetchScrapers();
      qc.invalidateQueries({ queryKey: ["/admin/lottery/scraper-logs"] });
      const variant = data.status === "SUCCESS" ? "default" : "destructive";
      toast({ title: `Scraper: ${data.status}`, description: data.message.slice(0, 120), variant });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const runAllScrapers = useMutation({
    mutationFn: () => apiFetch<{ message: string }>("/api/admin/lottery/scrapers/run-all", { method: "POST" }),
    onSuccess: (data) => {
      toast({ title: "Scrapers triggered", description: data.message });
      setTimeout(() => { refetchScrapers(); qc.invalidateQueries({ queryKey: ["/admin/lottery/scraper-logs"] }); }, 3000);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Scraper Logs ──
  const [scraperLogStatus, setScraperLogStatus] = useState("");
  const { data: scraperLogsData, isLoading: scraperLogsLoading } = useQuery<{ logs: ScraperLog[]; total: number }>({
    queryKey: ["/admin/lottery/scraper-logs", scraperLogStatus],
    queryFn: () => apiFetch(`/api/admin/lottery/scraper-logs?limit=100${scraperLogStatus ? `&status=${scraperLogStatus}` : ""}`),
    enabled: tab === "scraper-logs",
  });

  // ── Settlement Logs ──
  const { data: settlementLogsData, isLoading: settlementLogsLoading } = useQuery<{ logs: SettlementLog[]; total: number }>({
    queryKey: ["/admin/lottery/settlement-logs"],
    queryFn: () => apiFetch("/api/admin/lottery/settlement-logs?limit=100"),
    enabled: tab === "settlement-logs",
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            🎰 Lottery Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage games, draws, and monitor tickets</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="draws">Draws</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="scrapers">🤖 Scrapers</TabsTrigger>
          <TabsTrigger value="scraper-logs">📋 Scraper Logs</TabsTrigger>
          <TabsTrigger value="settlement-logs">💰 Settlement Logs</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── GAMES TAB ── */}
      {tab === "games" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowAddGame(true); setEditGame(null); }} className="gap-2">
              <Plus className="w-4 h-4" /> Add Game
            </Button>
          </div>

          {showAddGame && (
            <GameFormPanel
              onSave={async (data) => { await createGame.mutateAsync(data); }}
              onCancel={() => setShowAddGame(false)}
            />
          )}

          {editGame && (
            <GameFormPanel
              initial={{
                ...editGame,
                description: editGame.description ?? "",
                nextDrawAt: editGame.nextDrawAt ? editGame.nextDrawAt.slice(0, 16) : "",
                payoutConfig: editGame.payoutConfig ?? DEFAULT_PAYOUT_CONFIG,
                minStake: editGame.minStake ?? 1,
                maxStake: editGame.maxStake ?? 100,
                maxPayout: editGame.maxPayout ?? 500000,
                enabledPlayTypes: editGame.enabledPlayTypes ?? ["1","2","3","4","5","6","bonus_only"],
              }}
              onSave={async (data) => { await updateGame.mutateAsync({ id: editGame.id, data }); }}
              onCancel={() => setEditGame(null)}
            />
          )}

          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Pick</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Next Draw</TableHead>
                  <TableHead>Top Odds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gamesLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : games.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No games yet.</TableCell></TableRow>
                ) : (
                  games.map((g) => {
                    const excOdds = Object.values(g.payoutConfig?.excludedBonus ?? {});
                    const topOdds = excOdds.at(-1) ?? "—";
                    return (
                      <TableRow key={g.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{g.emoji}</span>
                            <div>
                              <div className="font-medium text-foreground">{g.name}</div>
                              <div className="text-xs text-muted-foreground">{g.slug}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{g.country}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          1–{g.mainNumbersCount}/{g.mainNumbersMax}
                          {g.bonusNumbersCount > 0 && ` +B/${g.bonusNumbersMax}`}
                        </TableCell>
                        <TableCell>${g.ticketPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {g.nextDrawAt ? format(new Date(g.nextDrawAt), "PP") : "—"}
                        </TableCell>
                        <TableCell className="font-semibold text-primary tabular-nums text-xs">{topOdds}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={g.isActive ? "text-primary border-primary/30" : "text-muted-foreground"}>
                            {g.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditGame(g); setShowAddGame(false); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => { if (confirm(`Delete ${g.name}?`)) deleteGame.mutate(g.id); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── DRAWS TAB ── */}
      {tab === "draws" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={drawSearch}
                onChange={(e) => setDrawSearch(e.target.value)}
                placeholder="Search by game or country…"
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {drawCountries.map((c) => (
                <button
                  key={c}
                  onClick={() => setDrawCountryFilter(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    drawCountryFilter === c
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted/20 border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Button onClick={() => { setShowAddDraw(true); setSettleDraw(null); }} className="gap-2 ml-auto" disabled={games.length === 0}>
              <Plus className="w-4 h-4" /> Add Draw
            </Button>
          </div>

          {showAddDraw && games.length > 0 && (
            <DrawFormPanel
              games={games}
              onSave={async (data) => { await createDraw.mutateAsync(data); }}
              onCancel={() => setShowAddDraw(false)}
            />
          )}

          {settleDraw && (
            <SettleDrawPanel
              draw={settleDraw}
              onSettle={async (w, b) => { await settleMutation.mutateAsync({ drawId: settleDraw.id, winningNumbers: w, bonusNumbers: b }); }}
              onCancel={() => setSettleDraw(null)}
            />
          )}

          {drawsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading draws…</div>
          ) : (
            <>
              {/* ── Upcoming Draws ── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-sm font-bold text-foreground">Upcoming Draws</span>
                  <span className="text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 px-1.5 py-0.5 rounded-full font-semibold">
                    {upcomingDraws.length}
                  </span>
                </div>

                {upcomingDraws.length === 0 ? (
                  <div className="rounded-xl border border-border/50 py-8 text-center text-sm text-muted-foreground">No upcoming draws match your filter.</div>
                ) : (
                  groupByCountry(upcomingDraws).map(([country, countryDraws]) => {
                    const isOpen = !collapsedUpcoming.has(country);
                    return (
                      <div key={country} className="rounded-xl border border-border/50 overflow-hidden">
                        <button
                          onClick={() => setCollapsedUpcoming((prev) => {
                            const next = new Set(prev);
                            next.has(country) ? next.delete(country) : next.add(country);
                            return next;
                          })}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors text-left"
                        >
                          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 text-sm font-semibold">{country}</span>
                          <span className="text-xs text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded-full">
                            {countryDraws.length}
                          </span>
                          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        {isOpen && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Game</TableHead>
                                <TableHead>Draw Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {countryDraws.map((d) => (
                                <TableRow key={d.id}>
                                  <TableCell>
                                    <span className="font-medium text-foreground text-sm">
                                      {games.find((g) => g.id === d.gameId)?.emoji ?? "🎰"} {d.game?.name ?? `Game #${d.gameId}`}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{format(new Date(d.drawDate), "PPp")}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">{d.status}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1 justify-end">
                                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setSettleDraw(d); setShowAddDraw(false); }}>
                                        <Trophy className="w-3 h-3" /> Settle
                                      </Button>
                                      <Button
                                        size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => { if (confirm(`Remove draw for ${d.game?.name}?`)) deleteDraw.mutate(d.id); }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── Settled Draws ── */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-sm font-bold text-foreground">Settled Draws</span>
                  <span className="text-xs bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded-full font-semibold">
                    {settledDraws.length}
                  </span>
                </div>

                {settledDraws.length === 0 ? (
                  <div className="rounded-xl border border-border/50 py-8 text-center text-sm text-muted-foreground">No settled draws match your filter.</div>
                ) : (
                  groupByCountry(settledDraws).map(([country, countryDraws]) => {
                    const isOpen = !collapsedSettled.has(country);
                    return (
                      <div key={country} className="rounded-xl border border-border/50 overflow-hidden">
                        <button
                          onClick={() => setCollapsedSettled((prev) => {
                            const next = new Set(prev);
                            next.has(country) ? next.delete(country) : next.add(country);
                            return next;
                          })}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors text-left"
                        >
                          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 text-sm font-semibold">{country}</span>
                          <span className="text-xs text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded-full">
                            {countryDraws.length}
                          </span>
                          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        {isOpen && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Game</TableHead>
                                <TableHead>Draw Date</TableHead>
                                <TableHead>Winning Numbers</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {countryDraws.map((d) => (
                                <TableRow key={d.id}>
                                  <TableCell>
                                    <span className="font-medium text-foreground text-sm">
                                      {games.find((g) => g.id === d.gameId)?.emoji ?? "🎰"} {d.game?.name ?? `Game #${d.gameId}`}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{format(new Date(d.drawDate), "PPp")}</TableCell>
                                  <TableCell>
                                    {d.winningNumbers.length > 0 ? (
                                      <div className="flex gap-1 flex-wrap">
                                        {d.winningNumbers.map((n) => (
                                          <span key={n} className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">{n}</span>
                                        ))}
                                        {d.bonusNumbers.map((n) => (
                                          <span key={`b${n}`} className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px] font-bold flex items-center justify-center">{n}</span>
                                        ))}
                                      </div>
                                    ) : <span className="text-xs text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex justify-end">
                                      <Button
                                        size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => { if (confirm(`Remove settled draw for ${d.game?.name}?`)) deleteDraw.mutate(d.id); }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SCRAPERS TAB ── */}
      {tab === "scrapers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              Automated scrapers fetch official lottery results every 5 minutes and settle pending tickets.
            </p>
            <Button
              onClick={() => runAllScrapers.mutate()}
              disabled={runAllScrapers.isPending}
              className="gap-2"
            >
              {runAllScrapers.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Run All Scrapers
            </Button>
          </div>

          {scrapersLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading scrapers…</div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lottery</TableHead>
                    <TableHead>Scraper</TableHead>
                    <TableHead><Globe className="w-3.5 h-3.5 inline mr-1" />Website</TableHead>
                    <TableHead><Clock className="w-3.5 h-3.5 inline mr-1" />Schedule</TableHead>
                    <TableHead>Last Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(scrapersData?.games ?? []).map((g) => {
                    const log = g.lastLog;
                    const statusColor =
                      log?.status === "SUCCESS" ? "text-primary border-primary/30" :
                      log?.status === "FAILED" ? "text-destructive border-destructive/30" :
                      log?.status === "DUPLICATE" ? "text-blue-400 border-blue-500/30" :
                      "text-muted-foreground border-border/30";

                    return (
                      <TableRow key={g.id} className={!g.scraperClass ? "opacity-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{g.emoji}</span>
                            <div>
                              <div className="font-medium text-foreground text-sm">{g.name}</div>
                              <Badge variant="outline" className={`text-[10px] mt-0.5 ${g.isActive ? "text-primary border-primary/30" : "text-muted-foreground"}`}>
                                {g.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {g.scraperClass ?? <span className="text-yellow-500 italic">Not configured</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {g.website ? (
                            <a href={g.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate max-w-[160px] block">
                              {g.website.replace(/^https?:\/\//, "")}
                            </a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {g.drawDays.length > 0 ? (
                            <div>
                              <div>{g.drawDays.map((d) => DAY_NAMES[d]).join(", ")}</div>
                              {g.drawTime && <div className="font-mono">{g.drawTime} {g.timezone.split("/")[1] ?? g.timezone}</div>}
                            </div>
                          ) : <span className="italic">Not set</span>}
                        </TableCell>
                        <TableCell>
                          {log ? (
                            <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
                              {log.status}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">Never run</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log ? (
                            <div>
                              <div>{format(new Date(log.createdAt), "PP")}</div>
                              <div className="text-[10px]">{format(new Date(log.createdAt), "p")}</div>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs"
                              disabled={!g.scraperClass || runScraper.isPending}
                              onClick={() => runScraper.mutate(g.id)}
                            >
                              <Play className="w-3 h-3" /> Run Now
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {scrapersData && (
            <p className="text-[11px] text-muted-foreground">
              Registered scrapers: {scrapersData.registeredScrapers.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* ── SCRAPER LOGS TAB ── */}
      {tab === "scraper-logs" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground flex-1">{scraperLogsData?.total ?? 0} total log entries</p>
            <div className="flex gap-2">
              {["", "SUCCESS", "FAILED", "NO_RESULT", "DUPLICATE"].map((s) => (
                <button
                  key={s}
                  onClick={() => setScraperLogStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    scraperLogStatus === s
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted/20 border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s || "All"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Lottery</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scraperLogsLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : (scraperLogsData?.logs ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No logs yet. Run a scraper to see results here.</TableCell></TableRow>
                ) : (
                  (scraperLogsData?.logs ?? []).map((log) => {
                    const StatusIcon =
                      log.status === "SUCCESS" ? CheckCircle :
                      log.status === "FAILED" ? XCircle :
                      log.status === "DUPLICATE" ? MinusCircle :
                      AlertCircle;
                    const iconColor =
                      log.status === "SUCCESS" ? "text-primary" :
                      log.status === "FAILED" ? "text-destructive" :
                      log.status === "DUPLICATE" ? "text-blue-400" :
                      "text-muted-foreground";

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div>{format(new Date(log.createdAt), "PP")}</div>
                          <div>{format(new Date(log.createdAt), "p")}</div>
                        </TableCell>
                        <TableCell>
                          {log.game ? (
                            <span className="text-sm font-medium">{log.game.emoji} {log.game.name}</span>
                          ) : <span className="text-xs text-muted-foreground">Unknown</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                          {log.website?.replace(/^https?:\/\//, "") ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1.5 text-xs font-semibold ${iconColor}`}>
                            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                            {log.status}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                          <span title={log.message ?? ""} className="truncate block">
                            {log.message ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {log.executionTime != null ? `${log.executionTime}ms` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── SETTLEMENT LOGS TAB ── */}
      {tab === "settlement-logs" && (
        <SettlementLogsPanel
          logs={settlementLogsData?.logs ?? []}
          total={settlementLogsData?.total ?? 0}
          loading={settlementLogsLoading}
        />
      )}

      {/* ── TICKETS TAB ── */}
      {tab === "tickets" && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">{ticketsData?.total ?? 0} total tickets</div>
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Numbers</TableHead>
                  <TableHead>Stake</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prize</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketsLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : (ticketsData?.tickets ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tickets yet</TableCell></TableRow>
                ) : (
                  (ticketsData?.tickets ?? []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground text-xs">#{t.id}</TableCell>
                      <TableCell><span className="font-medium text-sm">{t.game?.emoji} {t.game?.name}</span></TableCell>
                      <TableCell className="text-muted-foreground text-xs">#{t.userId}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 items-center">
                          {t.numbers.map((n) => (
                            <span key={n} className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center">{n}</span>
                          ))}
                          {t.bonusNumbers.length > 0 && (
                            <>
                              <span className="text-[9px] text-yellow-500 font-bold">+B</span>
                              {t.bonusNumbers.map((n) => (
                                <span key={`b${n}`} className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-500 text-[9px] font-bold flex items-center justify-center">{n}</span>
                              ))}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">${t.stake.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          t.status === "won" ? "text-primary border-primary/30" :
                          t.status === "lost" ? "text-destructive border-destructive/30" :
                          "text-yellow-400 border-yellow-500/30"
                        }>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={t.status === "won" ? "font-bold text-primary" : "text-muted-foreground"}>
                        {t.prizeAmount ? `$${t.prizeAmount}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(t.createdAt), "PP")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
