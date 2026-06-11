import { useState, useMemo } from "react";
import { useListFixtures } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListFixturesQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, Search, RefreshCw, CalendarDays, Minus } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  upcoming: "border-border text-muted-foreground",
  live:     "border-red-500/50 text-red-400 bg-red-500/10",
  finished: "border-emerald-500/40 text-emerald-400",
  cancelled:"border-border text-muted-foreground opacity-60",
};

function fmtUTC(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

async function patchFixture(id: number, body: Record<string, unknown>) {
  const res = await fetch(`/api/fixtures/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export default function FixtureUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editFixture, setEditFixture] = useState<any>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editScoreHome, setEditScoreHome] = useState("");
  const [editScoreAway, setEditScoreAway] = useState("");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState<number | null>(null);

  const { data: fixturesData, isLoading, refetch } = useListFixtures(
    { limit: 500, status: statusFilter !== "all" ? (statusFilter as any) : undefined } as any,
    { query: { queryKey: ["fixtures", "fixture-update", statusFilter], staleTime: 30_000 } },
  );

  const allFixtures: any[] = fixturesData?.fixtures ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return allFixtures;
    const q = search.toLowerCase();
    return allFixtures.filter((f) =>
      f.homeTeam?.name?.toLowerCase().includes(q) ||
      f.awayTeam?.name?.toLowerCase().includes(q) ||
      f.league?.name?.toLowerCase().includes(q),
    );
  }, [allFixtures, search]);

  function openEdit(f: any) {
    setEditFixture(f);
    setEditStartTime(toDatetimeLocalValue(f.startTime));
    setEditStatus(f.status);
    setEditScoreHome(f.scoreHome != null ? String(f.scoreHome) : "");
    setEditScoreAway(f.scoreAway != null ? String(f.scoreAway) : "");
  }

  async function applyMinus2h(fixture: any) {
    setApplying(fixture.id);
    try {
      const corrected = new Date(new Date(fixture.startTime).getTime() - 2 * 60 * 60 * 1000);
      await patchFixture(fixture.id, { startTime: corrected.toISOString() });
      toast({ title: "−2h applied", description: `${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name} → ${fmtUTC(corrected.toISOString())}` });
      queryClient.invalidateQueries({ queryKey: getListFixturesQueryKey() });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setApplying(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editFixture) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        status: editStatus,
        startTime: new Date(editStartTime + ":00Z").toISOString(),
      };
      if (editScoreHome !== "") body.scoreHome = parseInt(editScoreHome, 10);
      if (editScoreAway !== "") body.scoreAway = parseInt(editScoreAway, 10);
      await patchFixture(editFixture.id, body);
      toast({ title: "Fixture updated", description: `${editFixture.homeTeam?.name} vs ${editFixture.awayTeam?.name}` });
      queryClient.invalidateQueries({ queryKey: getListFixturesQueryKey() });
      refetch();
      setEditFixture(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-1 flex items-center gap-2">
          <Clock className="w-7 h-7 text-primary" />
          Fixture Update
        </h1>
        <p className="text-muted-foreground text-sm">
          Manually correct game times and statuses. Use <span className="font-mono font-bold text-amber-400">−2h</span> to fix games stored in UTC+2 instead of UTC.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search team or league…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="finished">Finished</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/20 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Match</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">League</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Kickoff (UTC)</span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 bg-accent/40 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No fixtures found
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-accent/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm leading-tight">
                        {f.homeTeam?.name} <span className="text-muted-foreground font-normal text-xs">vs</span> {f.awayTeam?.name}
                      </div>
                      {(f.status === "live" || f.status === "finished") && f.scoreHome != null && (
                        <div className={`text-xs font-bold mt-0.5 tabular-nums ${f.status === "live" ? "text-red-400" : "text-muted-foreground"}`}>
                          {f.scoreHome} – {f.scoreAway}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-[160px] truncate">
                      {f.league?.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground/80">{fmtUTC(f.startTime)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] uppercase ${STATUS_COLORS[f.status] ?? ""}`}>
                        {f.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 font-mono font-bold"
                          disabled={applying === f.id}
                          onClick={() => applyMinus2h(f)}
                          title="Subtract 2 hours (UTC+2 → UTC fix)"
                        >
                          {applying === f.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Minus className="w-3 h-3" />
                              2h
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openEdit(f)}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-border/40 text-xs text-muted-foreground bg-accent/5">
            {filtered.length} fixture{filtered.length !== 1 ? "s" : ""} shown
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editFixture} onOpenChange={(o) => !o && setEditFixture(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fixture #{editFixture?.id}</DialogTitle>
          </DialogHeader>
          {editFixture && (
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="p-3 bg-accent/20 rounded-lg border border-border text-center font-bold text-sm">
                {editFixture.homeTeam?.name} vs {editFixture.awayTeam?.name}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Kickoff time (UTC)</Label>
                <Input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter the kickoff time in UTC. Current stored: <span className="font-mono">{fmtUTC(editFixture.startTime)}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="finished">Finished</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Home score</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="—"
                    value={editScoreHome}
                    onChange={(e) => setEditScoreHome(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Away score</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="—"
                    value={editScoreAway}
                    onChange={(e) => setEditScoreAway(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditFixture(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
