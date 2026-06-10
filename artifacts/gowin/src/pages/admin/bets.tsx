import { useState } from "react";
import { useListAllBets, useVoidBet, getListAllBetsQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search, CheckCircle2, XCircle, Clock, HelpCircle, Hash } from "lucide-react";

// ── Outcome helper (mirrors autoSettle logic) ─────────────────────────────────
function selectionOutcome(sel: any): "won" | "lost" | "pending" | "unknown" {
  const f = sel.fixture;
  if (!f || f.status === "cancelled") return "unknown";
  if (f.status !== "finished" || f.scoreHome == null || f.scoreAway == null) return "pending";
  const h = f.scoreHome, a = f.scoreAway, total = h + a;
  const m: string = sel.market ?? "", s: string = sel.selection ?? "";
  if (m === "1X2" || m === "Match Result") {
    const r = h > a ? "Home" : a > h ? "Away" : "Draw";
    return s === r ? "won" : "lost";
  }
  if (m === "Double Chance") {
    const win = (s === "1X" && (h >= a)) || (s === "X2" && (a >= h)) || (s === "12" && h !== a);
    return win ? "won" : "lost";
  }
  if (m === "Both Teams To Score") {
    const both = h > 0 && a > 0;
    return (s === "Yes") === both ? "won" : "lost";
  }
  const ou = m.match(/^Over\/Under (\d+(?:\.\d+)?)$/);
  if (ou) {
    const line = parseFloat(ou[1]!);
    if (s.startsWith("Over")) return total > line ? "won" : "lost";
    if (s.startsWith("Under")) return total < line ? "won" : "lost";
  }
  return "unknown";
}

function OutcomeIcon({ outcome }: { outcome: ReturnType<typeof selectionOutcome> }) {
  if (outcome === "won") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (outcome === "lost") return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
  if (outcome === "pending") return <Clock className="w-4 h-4 text-yellow-400/70 shrink-0" />;
  return <HelpCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />;
}

const STATUS_VARIANT: Record<string, any> = {
  won: "default", lost: "destructive", pending: "secondary", void: "outline",
};

// ── Bet Verifier ──────────────────────────────────────────────────────────────
function BetVerifier() {
  const { token } = useAuth();
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: result, isLoading, error } = useQuery<any>({
    queryKey: ["admin-bet-lookup", submitted],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bets/lookup/${submitted}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Lookup failed");
      return res.json();
    },
    enabled: submitted.length === 6,
    retry: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) return;
    setSubmitted(trimmed);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Hash className="w-4 h-4 text-primary" />
        <h2 className="font-bold text-base">Verify Bet by Code</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          placeholder="6-character code (e.g. AB12CD)"
          className="font-mono tracking-widest uppercase max-w-xs"
          maxLength={6}
        />
        <Button type="submit" disabled={code.trim().length !== 6 || isLoading} className="gap-2">
          <Search className="w-4 h-4" />
          {isLoading ? "Looking up…" : "Verify"}
        </Button>
      </form>

      {submitted && !isLoading && (
        <>
          {result === null || error ? (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
              <XCircle className="w-4 h-4 shrink-0" />
              No bet found with code <span className="font-mono font-bold ml-1">{submitted}</span>.
            </div>
          ) : result && (
            <div className="border border-border rounded-xl overflow-hidden">
              {/* Bet header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-accent/20 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-black tracking-widest text-primary">{result.code}</span>
                  <span className="text-muted-foreground text-sm">Bet #{result.id}</span>
                  <Badge variant={STATUS_VARIANT[result.status] ?? "outline"} className="uppercase text-xs">
                    {result.status}
                  </Badge>
                </div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">User</div>
                    <div className="font-semibold">{result.user?.username ?? `User #${result.userId}`}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Stake</div>
                    <div className="font-bold">${Number(result.stake).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{result.status === "won" ? "Won" : "To Win"}</div>
                    <div className={`font-black ${result.status === "won" ? "text-primary" : ""}`}>
                      ${Number(result.potentialWin).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Placed</div>
                    <div className="text-sm">{format(new Date(result.createdAt), "dd MMM yyyy, HH:mm")}</div>
                  </div>
                </div>
              </div>

              {/* Selections */}
              <div className="divide-y divide-border/40">
                {result.selections?.map((sel: any) => {
                  const outcome = selectionOutcome(sel);
                  const score = sel.fixture?.status === "finished" && sel.fixture?.scoreHome != null
                    ? `${sel.fixture.scoreHome} – ${sel.fixture.scoreAway}`
                    : null;
                  return (
                    <div
                      key={sel.id}
                      className={`flex items-center justify-between px-5 py-3 text-sm ${
                        outcome === "won" ? "bg-emerald-500/5" : outcome === "lost" ? "bg-destructive/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <OutcomeIcon outcome={outcome} />
                        <div className="min-w-0">
                          <div className="font-semibold">{sel.selection}</div>
                          <div className="text-muted-foreground text-xs truncate">
                            {sel.fixture?.homeTeam?.name ?? "—"} vs {sel.fixture?.awayTeam?.name ?? "—"}
                            {score && <span className="ml-2 font-mono font-bold text-foreground">[{score}]</span>}
                          </div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground/60 mt-0.5">{sel.market}</div>
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-xs text-muted-foreground">Odds</div>
                        <div className="font-bold text-primary">{Number(sel.odds).toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminBets() {
  const { data, isLoading } = useListAllBets({ query: { queryKey: ["allBets"] } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const voidMutation = useVoidBet();
  const bets = data?.bets || [];

  const handleVoid = async (betId: number) => {
    if (!confirm("Void this bet and refund the stake?")) return;
    try {
      await voidMutation.mutateAsync({ id: betId });
      toast({ title: "Bet Voided", description: "Stake has been refunded." });
      queryClient.invalidateQueries({ queryKey: getListAllBetsQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Bets Management</h1>
        <p className="text-muted-foreground">Monitor betting activity and verify bet slips by code</p>
      </div>

      <BetVerifier />

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-accent/10">
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Bet #</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Stake</TableHead>
                  <TableHead className="text-right">Odds</TableHead>
                  <TableHead className="text-right">To Win</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">Loading…</TableCell>
                  </TableRow>
                ) : bets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No bets found</TableCell>
                  </TableRow>
                ) : bets.map((bet: any) => (
                  <TableRow key={bet.id}>
                    <TableCell>
                      {bet.code
                        ? <span className="font-mono text-xs font-bold tracking-widest bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5">{bet.code}</span>
                        : <span className="text-muted-foreground/40 text-xs">—</span>
                      }
                    </TableCell>
                    <TableCell className="font-medium">#{bet.id}</TableCell>
                    <TableCell>{bet.user?.username || `User #${bet.userId}`}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(bet.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right font-medium">${bet.stake.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{bet.totalOdds.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">${bet.potentialWin.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[bet.status] ?? "outline"}
                        className={`uppercase ${bet.status === "won" ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        {bet.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => handleVoid(bet.id)}
                        disabled={bet.status !== "pending" || voidMutation.isPending}
                        className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                      >
                        Void
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
