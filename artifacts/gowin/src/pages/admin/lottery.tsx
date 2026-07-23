import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Ticket, BarChart3, Plus, Edit2, Play, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

function authHeaders() {
  const t = localStorage.getItem("gowin_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Game {
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
  ticketCount: number;
}
interface DrawRow {
  id: number;
  gameName: string;
  gameSlug: string;
  drawDate: string;
  winningNumbers: number[];
  bonusNumbers: number[];
  jackpot: number;
  status: string;
}
interface TicketRow {
  id: number;
  userId: number;
  gameName: string;
  numbers: number[];
  bonusNumbers: number[];
  stake: number;
  status: string;
  prizeAmount: number | null;
  createdAt: string;
}

// ── Game edit dialog ───────────────────────────────────────────────────────────
function EditGameDialog({ game, onClose }: { game: Game; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [jackpot, setJackpot] = useState(String(game.jackpot));
  const [nextDrawAt, setNextDrawAt] = useState(game.nextDrawAt ? game.nextDrawAt.slice(0, 16) : "");
  const [isActive, setIsActive] = useState(game.isActive);

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/lottery/games/${game.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ jackpot: parseFloat(jackpot), nextDrawAt: nextDrawAt || null, isActive }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lottery-games"] });
      toast({ title: "Game updated", variant: "success" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {game.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Jackpot ($)</Label>
            <Input type="number" value={jackpot} onChange={(e) => setJackpot(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Next Draw Date/Time</Label>
            <Input type="datetime-local" value={nextDrawAt} onChange={(e) => setNextDrawAt(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-primary" />
            <Label htmlFor="active">Active (visible to players)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Draw dialog ─────────────────────────────────────────────────────────
function CreateDrawDialog({ games, onClose }: { games: Game[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [gameId, setGameId] = useState(games[0]?.id ?? 0);
  const [drawDate, setDrawDate] = useState("");
  const [numbersStr, setNumbersStr] = useState("");
  const [bonusStr, setBonusStr] = useState("");
  const [jackpot, setJackpot] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const winningNumbers = numbersStr.split(/[,\s]+/).map(Number).filter((n) => !isNaN(n) && n > 0);
      const bonusNumbers = bonusStr ? bonusStr.split(/[,\s]+/).map(Number).filter((n) => !isNaN(n) && n > 0) : [];
      const r = await fetch("/api/admin/lottery/draws", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ gameId: Number(gameId), drawDate, winningNumbers, bonusNumbers, jackpot }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lottery-draws"] });
      toast({ title: "Draw created", variant: "success" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const selectedGame = games.find((g) => g.id === Number(gameId));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enter Draw Result</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Lottery Game</Label>
            <select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={gameId} onChange={(e) => setGameId(Number(e.target.value))}>
              {games.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Draw Date/Time</Label>
            <Input type="datetime-local" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>
              Winning Numbers (comma-separated, {selectedGame?.mainNumbersCount} numbers 1–{selectedGame?.mainNumbersMax})
            </Label>
            <Input placeholder="e.g. 5, 12, 23, 34, 45" value={numbersStr} onChange={(e) => setNumbersStr(e.target.value)} />
          </div>
          {selectedGame && selectedGame.bonusNumbersCount > 0 && (
            <div className="space-y-2">
              <Label>Bonus Numbers ({selectedGame.bonusNumbersCount} numbers 1–{selectedGame.bonusNumbersMax})</Label>
              <Input placeholder="e.g. 7" value={bonusStr} onChange={(e) => setBonusStr(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Jackpot amount ($)</Label>
            <Input type="number" placeholder="500000000" value={jackpot} onChange={(e) => setJackpot(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !drawDate || !numbersStr || !jackpot}>
            {mutation.isPending ? "Saving…" : "Create Draw"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Admin Lottery page ────────────────────────────────────────────────────
export default function AdminLottery() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [showCreateDraw, setShowCreateDraw] = useState(false);

  const { data: gamesData, isLoading: gamesLoading } = useQuery<{ games: Game[] }>({
    queryKey: ["admin-lottery-games"],
    queryFn: () => fetch("/api/admin/lottery/games", { headers: authHeaders() }).then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: drawsData } = useQuery<{ draws: DrawRow[] }>({
    queryKey: ["admin-lottery-draws"],
    queryFn: () => fetch("/api/admin/lottery/draws", { headers: authHeaders() }).then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: ticketsData } = useQuery<{ tickets: TicketRow[] }>({
    queryKey: ["admin-lottery-tickets"],
    queryFn: () => fetch("/api/admin/lottery/tickets", { headers: authHeaders() }).then((r) => r.json()),
    staleTime: 30_000,
  });

  const settleMutation = useMutation({
    mutationFn: async (drawId: number) => {
      const r = await fetch(`/api/admin/lottery/draws/${drawId}/settle`, {
        method: "POST",
        headers: authHeaders(),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: (data, drawId) => {
      qc.invalidateQueries({ queryKey: ["admin-lottery-draws"] });
      qc.invalidateQueries({ queryKey: ["admin-lottery-tickets"] });
      toast({ title: `Draw settled — ${data.winners} winner(s), $${data.totalPayout.toFixed(2)} paid out`, variant: "success" });
    },
    onError: (e: any) => toast({ title: "Settle failed", description: e.message, variant: "destructive" }),
  });

  const games = gamesData?.games ?? [];
  const draws = drawsData?.draws ?? [];
  const tickets = ticketsData?.tickets ?? [];

  const totalJackpots = games.reduce((s, g) => s + g.jackpot, 0);
  const totalTickets = tickets.length;
  const totalWon = tickets.filter((t) => t.status === "won").length;
  const revenue = tickets.reduce((s, t) => s + t.stake, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎰 Lottery Management</h1>
        <Button onClick={() => setShowCreateDraw(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Enter Draw Result
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Games", value: games.filter((g) => g.isActive).length, icon: Trophy, color: "text-primary" },
          { label: "Total Tickets", value: totalTickets, icon: Ticket, color: "text-blue-400" },
          { label: "Winners", value: totalWon, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Revenue", value: `$${revenue.toFixed(2)}`, icon: BarChart3, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 flex items-center gap-3">
              <Icon className={`w-5 h-5 shrink-0 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="games">
        <TabsList>
          <TabsTrigger value="games">Games ({games.length})</TabsTrigger>
          <TabsTrigger value="draws">Draws ({draws.length})</TabsTrigger>
          <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
        </TabsList>

        {/* ── Games tab ── */}
        <TabsContent value="games">
          <Card>
            <CardHeader><CardTitle className="text-base">Lottery Games</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Jackpot</TableHead>
                    <TableHead>Ticket Price</TableHead>
                    <TableHead>Next Draw</TableHead>
                    <TableHead>Tickets Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gamesLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                  ) : games.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        <span className="mr-2">{g.emoji}</span>{g.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{g.country}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {g.mainNumbersCount}/{g.mainNumbersMax}
                        {g.bonusNumbersCount > 0 && ` +${g.bonusNumbersCount}/${g.bonusNumbersMax}`}
                      </TableCell>
                      <TableCell className="font-semibold" style={{ color: g.color }}>
                        ${Number(g.jackpot).toLocaleString()}
                      </TableCell>
                      <TableCell>${g.ticketPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {g.nextDrawAt ? format(new Date(g.nextDrawAt), "MMM d, HH:mm") : "—"}
                      </TableCell>
                      <TableCell>{g.ticketCount}</TableCell>
                      <TableCell>
                        <Badge variant={g.isActive ? "default" : "outline"} className={g.isActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                          {g.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setEditGame(g)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Draws tab ── */}
        <TabsContent value="draws">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Draw Results</CardTitle>
              <Button size="sm" onClick={() => setShowCreateDraw(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Enter Result
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead>Draw Date</TableHead>
                    <TableHead>Winning Numbers</TableHead>
                    <TableHead>Jackpot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draws.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No draws yet. Enter a result above.</TableCell></TableRow>
                  )}
                  {draws.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.gameName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(d.drawDate), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 items-center">
                          {d.winningNumbers.map((n) => (
                            <span key={n} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{n}</span>
                          ))}
                          {d.bonusNumbers.map((n) => (
                            <span key={`b${n}`} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">{n}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">${Number(d.jackpot).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "settled" ? "default" : "outline"} className={d.status === "settled" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            disabled={settleMutation.isPending}
                            onClick={() => settleMutation.mutate(d.id)}
                          >
                            <Play className="w-3 h-3" /> Settle
                          </Button>
                        )}
                        {d.status === "settled" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tickets tab ── */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader><CardTitle className="text-base">All Tickets</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Numbers</TableHead>
                    <TableHead>Stake</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No tickets yet.</TableCell></TableRow>
                  )}
                  {tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground text-sm">#{t.id}</TableCell>
                      <TableCell className="font-medium text-sm">{t.gameName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.userId}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-0.5">
                          {t.numbers.map((n) => (
                            <span key={n} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[9px] font-bold">{n}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">${t.stake.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          t.status === "won" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          : t.status === "lost" ? "border-destructive/30 text-destructive bg-destructive/10"
                          : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                        }>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={t.prizeAmount ? "font-semibold text-emerald-400" : "text-muted-foreground text-sm"}>
                        {t.prizeAmount ? `$${t.prizeAmount.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{format(new Date(t.createdAt), "MMM d, HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editGame && <EditGameDialog game={editGame} onClose={() => setEditGame(null)} />}
      {showCreateDraw && <CreateDrawDialog games={games} onClose={() => setShowCreateDraw(false)} />}
    </div>
  );
}
