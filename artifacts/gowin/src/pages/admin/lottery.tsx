import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Trophy, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
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
  excludedBonus: { "1": "13/2", "2": "60/1", "3": "600/1", "4": "10000/1", "5": "100000/1" },
  includedBonus: { "1": "11/2", "2": "50/1", "3": "420/1", "4": "5000/1", "5": "50000/1" },
  bonusOnly: "45/1",
  withBonus: { "1": "344/1", "2": "2805/1", "3": "27645/1", "4": "460045/1" },
};

// ── Payout Config Editor ──────────────────────────────────────────────────────

function PayoutConfigEditor({ value, onChange }: {
  value: PayoutConfig;
  onChange: (v: PayoutConfig) => void;
}) {
  const mainKeys = ["1", "2", "3", "4", "5"];
  const bonusKeys = ["1", "2", "3", "4"];

  function setMain(section: "excludedBonus" | "includedBonus", key: string, val: string) {
    onChange({ ...value, [section]: { ...value[section], [key]: val } });
  }

  return (
    <div className="space-y-5 rounded-xl border border-border/50 bg-background/40 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payout Odds (fractional, e.g. 13/2)</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Excluded Bonus */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground italic">Classic — Excluded Bonus</p>
          {mainKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{k} number{k !== "1" ? "s" : ""}</span>
              <Input
                className="h-7 text-xs"
                value={value.excludedBonus?.[k] ?? ""}
                onChange={(e) => setMain("excludedBonus", k, e.target.value)}
                placeholder="e.g. 13/2"
              />
            </div>
          ))}
        </div>

        {/* Included Bonus */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground italic">Classic — Included Bonus</p>
          {mainKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{k} number{k !== "1" ? "s" : ""}</span>
              <Input
                className="h-7 text-xs"
                value={value.includedBonus?.[k] ?? ""}
                onChange={(e) => setMain("includedBonus", k, e.target.value)}
                placeholder="e.g. 11/2"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bonus ball */}
      <div className="flex items-center gap-3 border-t border-border/30 pt-4">
        <span className="text-xs font-bold text-yellow-500 w-24 shrink-0">Bonus Ball</span>
        <Input
          className="h-7 text-xs w-28"
          value={value.bonusOnly ?? ""}
          onChange={(e) => onChange({ ...value, bonusOnly: e.target.value })}
          placeholder="45/1"
        />
      </div>

      {/* N + Bonus Ball */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-yellow-500/80">N + Bonus Ball (main match + bonus)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bonusKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{k}+ Bonus</span>
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
  name: "", slug: "", country: "", mainNumbersCount: 5, mainNumbersMax: 50,
  bonusNumbersCount: 0, bonusNumbersMax: 0, ticketPrice: 2,
  nextDrawAt: "", color: "#4ade80", emoji: "🎰", description: "", isActive: true,
  payoutConfig: DEFAULT_PAYOUT_CONFIG,
};

type GameForm = typeof DEFAULT_GAME;

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

// ── Main admin page ───────────────────────────────────────────────────────────

export default function AdminLottery() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"games" | "draws" | "tickets">("games");
  const [showAddGame, setShowAddGame] = useState(false);
  const [editGame, setEditGame] = useState<LotteryGame | null>(null);
  const [settleDraw, setSettleDraw] = useState<LotteryDraw | null>(null);
  const [showAddDraw, setShowAddDraw] = useState(false);

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

  // ── Tickets ──
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{ tickets: LotteryTicket[]; total: number }>({
    queryKey: ["/admin/lottery/tickets"],
    queryFn: () => apiFetch("/api/admin/lottery/tickets?limit=100"),
    enabled: tab === "tickets",
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
        <TabsList>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="draws">Draws</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
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
                nextDrawAt: editGame.nextDrawAt ? editGame.nextDrawAt.slice(0, 16) : "",
                payoutConfig: editGame.payoutConfig ?? DEFAULT_PAYOUT_CONFIG,
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
          <div className="flex justify-end">
            <Button onClick={() => { setShowAddDraw(true); setSettleDraw(null); }} className="gap-2" disabled={games.length === 0}>
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

          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Draw Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Winning Numbers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drawsLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : draws.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No draws yet.</TableCell></TableRow>
                ) : (
                  draws.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell><span className="font-medium text-foreground">{d.game?.name ?? `Game #${d.gameId}`}</span></TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(d.drawDate), "PPp")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          d.status === "settled" ? "text-primary border-primary/30" : "text-yellow-400 border-yellow-500/30"
                        }>
                          {d.status}
                        </Badge>
                      </TableCell>
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
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {d.status === "pending" && (
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setSettleDraw(d)}>
                              <Trophy className="w-3 h-3" /> Settle
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
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
