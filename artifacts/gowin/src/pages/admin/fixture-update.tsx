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
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Clock, Search, RefreshCw, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  upcoming: "border-border text-muted-foreground",
  live:     "border-red-500/50 text-red-400 bg-red-500/10",
  finished: "border-emerald-500/40 text-emerald-400",
  cancelled:"border-border text-muted-foreground opacity-60",
};

function localNow() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}

function todayLocal(): string {
  return localNow().toISOString().slice(0, 10);
}

function displayTimeOf(startTimeIso: string): Date {
  return new Date(new Date(startTimeIso).getTime() + 2 * 60 * 60 * 1000);
}

function fmtDisplay(startTimeIso: string) {
  const d = displayTimeOf(startTimeIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function toDatetimeLocalValue(startTimeIso: string) {
  const d = displayTimeOf(startTimeIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
  const { t } = useSiteSettings();

  const [selectedDate, setSelectedDate] = useState<string>(todayLocal);
  const [search, setSearch] = useState("");
  const [editFixture, setEditFixture] = useState<any>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editScoreHome, setEditScoreHome] = useState("");
  const [editScoreAway, setEditScoreAway] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: fixturesData, isLoading, refetch } = useListFixtures(
    { limit: 500, status: "upcoming" } as any,
    { query: { queryKey: ["fixtures", "fixture-update-upcoming"], staleTime: 30_000 } },
  );

  const allFixtures: any[] = fixturesData?.fixtures ?? [];

  const filtered = useMemo(() => {
    let list = allFixtures.filter((f) => {
      const dDate = displayTimeOf(f.startTime).toISOString().slice(0, 10);
      return dDate === selectedDate;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) =>
        f.homeTeam?.name?.toLowerCase().includes(q) ||
        f.awayTeam?.name?.toLowerCase().includes(q) ||
        f.league?.name?.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return list;
  }, [allFixtures, selectedDate, search]);

  function openEdit(f: any) {
    setEditFixture(f);
    setEditStartTime(toDatetimeLocalValue(f.startTime));
    setEditStatus(f.status);
    setEditScoreHome(f.scoreHome != null ? String(f.scoreHome) : "");
    setEditScoreAway(f.scoreAway != null ? String(f.scoreAway) : "");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editFixture) return;
    setSaving(true);
    try {
      const displayMs = new Date(editStartTime + ":00Z").getTime();
      const storedUtc = new Date(displayMs - 2 * 60 * 60 * 1000).toISOString();
      const body: Record<string, unknown> = {
        status: editStatus,
        startTime: storedUtc,
      };
      if (editScoreHome !== "") body.scoreHome = parseInt(editScoreHome, 10);
      if (editScoreAway !== "") body.scoreAway = parseInt(editScoreAway, 10);
      await patchFixture(editFixture.id, body);
      toast({ title: t("fixture_update.updated"), description: `${editFixture.homeTeam?.name} vs ${editFixture.awayTeam?.name}` });
      queryClient.invalidateQueries({ queryKey: getListFixturesQueryKey() });
      refetch();
      setEditFixture(null);
    } catch (err: any) {
      toast({ title: t("fixture_update.error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const isToday = selectedDate === todayLocal();
  const displayDateLabel = isToday
    ? t("fixture_update.today")
    : new Date(selectedDate + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-1 flex items-center gap-2">
          <Clock className="w-7 h-7 text-primary" />
          {t("nav.fixture_update")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("fixture_update.desc")}
        </p>
      </div>

      {/* Date nav + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Date navigator */}
        <div className="flex items-center gap-1 bg-accent/20 border border-border rounded-lg px-1 h-10 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate((d) => shiftDate(d, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={() => setSelectedDate(todayLocal())}
            className="px-3 text-sm font-semibold min-w-[110px] text-center hover:text-primary transition-colors"
          >
            {displayDateLabel}
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate((d) => shiftDate(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("fixture_update.search_ph")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

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
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{t("fixture_update.col_match")}</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">{t("fixture_update.col_league")}</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{t("fixture_update.col_kickoff")}</span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{t("fixture_update.col_status")}</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{t("fixture_update.col_actions")}</th>
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
                    {t("fixture_update.empty").replace("{date}", displayDateLabel)}
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-accent/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm leading-tight">
                        {f.homeTeam?.name} <span className="text-muted-foreground font-normal text-xs">vs</span> {f.awayTeam?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-[160px] truncate">
                      {f.league?.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground/80">{fmtDisplay(f.startTime)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] uppercase ${STATUS_COLORS[f.status] ?? ""}`}>
                        {f.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openEdit(f)}
                      >
                        {t("fixture_update.edit")}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-border/40 text-xs text-muted-foreground bg-accent/5">
            {filtered.length} {filtered.length !== 1 ? t("fixture_update.fixtures") : t("fixture_update.fixture")}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editFixture} onOpenChange={(o) => !o && setEditFixture(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("fixture_update.edit_title")} #{editFixture?.id}</DialogTitle>
          </DialogHeader>
          {editFixture && (
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="p-3 bg-accent/20 rounded-lg border border-border text-center font-bold text-sm">
                {editFixture.homeTeam?.name} vs {editFixture.awayTeam?.name}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">{t("fixture_update.kickoff_label")}</Label>
                <Input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("fixture_update.current")} <span className="font-mono">{fmtDisplay(editFixture.startTime)}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">{t("fixture_update.status_label")}</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">{t("fixture_update.status_upcoming")}</SelectItem>
                    <SelectItem value="live">{t("fixture_update.status_live")}</SelectItem>
                    <SelectItem value="finished">{t("fixture_update.status_finished")}</SelectItem>
                    <SelectItem value="cancelled">{t("fixture_update.status_cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("fixture_update.home_score")}</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="—"
                    value={editScoreHome}
                    onChange={(e) => setEditScoreHome(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("fixture_update.away_score")}</Label>
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
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? t("common.saving") : t("fixture_update.save")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
