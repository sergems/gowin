import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Save, Loader2, Info } from "lucide-react";

interface UpMarketsConfig {
  enabled1UP: boolean;
  enabled2UP: boolean;
  percentage1UP: number;
  percentage2UP: number;
}

interface StatsRow {
  selection: string;
  bet_count: number;
  total_stake: string;
  total_payout: string;
  profit_loss: string;
}

interface StatsData {
  bySelection: StatsRow[];
  totals: {
    total_bets: number;
    total_stake: string;
    total_payout: string;
    profit_loss: string;
    bets_1up: number;
    bets_2up: number;
  };
}

async function fetchConfig(token: string | null): Promise<UpMarketsConfig> {
  const res = await fetch("/api/admin/up-markets", {
    credentials: "include",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error("Failed to load config");
  return res.json();
}

async function putConfig(config: UpMarketsConfig, token: string | null): Promise<UpMarketsConfig> {
  const res = await fetch("/api/admin/up-markets", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
    },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to save config");
  return res.json();
}

async function fetchStats(token: string | null): Promise<StatsData> {
  const res = await fetch("/api/admin/up-markets/stats", {
    credentials: "include",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

function fmtCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? "0.00" : n.toFixed(2);
}

export default function AdminUpMarkets() {
  const { token } = useAuth();
  const { t } = useSiteSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const configQuery = useQuery<UpMarketsConfig>({
    queryKey: ["admin-up-markets-config"],
    queryFn: () => fetchConfig(token),
  });

  const statsQuery = useQuery<StatsData>({
    queryKey: ["admin-up-markets-stats"],
    queryFn: () => fetchStats(token),
  });

  const saveMutation = useMutation({
    mutationFn: (cfg: UpMarketsConfig) => putConfig(cfg, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-up-markets-config"] });
      toast({ title: t("admin.up_markets.saved"), description: t("admin.up_markets.saved_desc") });
    },
    onError: () => {
      toast({ title: t("admin.up_markets.save_failed"), variant: "destructive" });
    },
  });

  const [enabled1UP, setEnabled1UP] = useState(true);
  const [enabled2UP, setEnabled2UP] = useState(true);
  const [pct1UP, setPct1UP] = useState("45");
  const [pct2UP, setPct2UP] = useState("75");

  // Seed form state from query once loaded
  const cfg = configQuery.data;
  useEffect(() => {
    if (cfg) {
      setEnabled1UP(cfg.enabled1UP);
      setEnabled2UP(cfg.enabled2UP);
      setPct1UP(String(cfg.percentage1UP));
      setPct2UP(String(cfg.percentage2UP));
    }
  }, [cfg]);

  function handleSave() {
    const p1 = parseFloat(pct1UP);
    const p2 = parseFloat(pct2UP);
    if (isNaN(p1) || p1 <= 0 || p1 > 100 || isNaN(p2) || p2 <= 0 || p2 > 100) {
      toast({ title: "Percentages must be between 1 and 100", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ enabled1UP, enabled2UP, percentage1UP: p1, percentage2UP: p2 });
  }

  const isSaving = saveMutation.isPending;

  const home1UP = (2.50 * (parseFloat(pct1UP) || 0) / 100).toFixed(2);
  const away1UP = (3.20 * (parseFloat(pct1UP) || 0) / 100).toFixed(2);
  const home2UP = (2.50 * (parseFloat(pct2UP) || 0) / 100).toFixed(2);
  const away2UP = (3.20 * (parseFloat(pct2UP) || 0) / 100).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("admin.up_markets.title")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("admin.up_markets.desc")}</p>
        </div>
      </div>

      {/* Config card */}
      <div className="border rounded-lg p-6 space-y-6 bg-card">
        {configQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 1UP toggle */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{t("admin.up_markets.enable_1up_title")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t("admin.up_markets.enable_1up_desc")}</p>
              </div>
              <Switch checked={enabled1UP} onCheckedChange={setEnabled1UP} />
            </div>

            {/* 2UP toggle */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{t("admin.up_markets.enable_2up_title")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t("admin.up_markets.enable_2up_desc")}</p>
              </div>
              <Switch checked={enabled2UP} onCheckedChange={setEnabled2UP} />
            </div>

            <Separator />

            {/* Percentage inputs */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pct1up">{t("admin.up_markets.pct_1up_label")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="pct1up"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={pct1UP}
                    onChange={(e) => setPct1UP(e.target.value)}
                    className="w-24"
                    disabled={!enabled1UP}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("admin.up_markets.pct_1up_desc")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pct2up">{t("admin.up_markets.pct_2up_label")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="pct2up"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={pct2UP}
                    onChange={(e) => setPct2UP(e.target.value)}
                    className="w-24"
                    disabled={!enabled2UP}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("admin.up_markets.pct_2up_desc")}</p>
              </div>
            </div>

            {/* Live preview */}
            <div className="bg-muted rounded-md p-4 text-sm space-y-1.5">
              <p className="font-medium">Live example (base odds: Home 2.50 / Away 3.20)</p>
              {enabled1UP && (
                <p className="text-muted-foreground">
                  Home 1UP: <span className="font-mono text-foreground">{home1UP}</span>
                  <span className="mx-2">|</span>
                  Away 1UP: <span className="font-mono text-foreground">{away1UP}</span>
                </p>
              )}
              {enabled2UP && (
                <p className="text-muted-foreground">
                  Home 2UP: <span className="font-mono text-foreground">{home2UP}</span>
                  <span className="mx-2">|</span>
                  Away 2UP: <span className="font-mono text-foreground">{away2UP}</span>
                </p>
              )}
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("admin.up_markets.saving")}</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />{t("admin.up_markets.save")}</>
              )}
            </Button>
          </>
        )}
      </div>

      {/* How it works */}
      <div className="border rounded-lg p-6 space-y-3 bg-card">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">{t("admin.up_markets.how_title")}</h2>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li>{t("admin.up_markets.how_1up")}</li>
          <li>{t("admin.up_markets.how_2up")}</li>
          <li>{t("admin.up_markets.how_away_1up")}</li>
          <li>{t("admin.up_markets.how_away_2up")}</li>
        </ul>
        <p className="text-sm font-medium text-foreground">{t("admin.up_markets.how_settle")}</p>
      </div>

      {/* Stats */}
      <div className="border rounded-lg p-6 space-y-4 bg-card">
        <h2 className="font-semibold">{t("admin.up_markets.stats_title")}</h2>
        {statsQuery.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : statsQuery.data ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.up_markets.stats_sel")}</TableHead>
                <TableHead className="text-right">{t("admin.up_markets.stats_bets")}</TableHead>
                <TableHead className="text-right">{t("admin.up_markets.stats_stake")}</TableHead>
                <TableHead className="text-right">{t("admin.up_markets.stats_payout")}</TableHead>
                <TableHead className="text-right">{t("admin.up_markets.stats_pl")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statsQuery.data.bySelection.map((row) => (
                <TableRow key={row.selection}>
                  <TableCell className="font-medium">{row.selection}</TableCell>
                  <TableCell className="text-right">{row.bet_count}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(row.total_stake)}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(row.total_payout)}</TableCell>
                  <TableCell
                    className={`text-right font-mono ${parseFloat(row.profit_loss) >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {fmtCurrency(row.profit_loss)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell>{t("admin.up_markets.stats_total")}</TableCell>
                <TableCell className="text-right">{statsQuery.data.totals.total_bets}</TableCell>
                <TableCell className="text-right">{fmtCurrency(statsQuery.data.totals.total_stake)}</TableCell>
                <TableCell className="text-right">{fmtCurrency(statsQuery.data.totals.total_payout)}</TableCell>
                <TableCell
                  className={`text-right font-mono ${parseFloat(statsQuery.data.totals.profit_loss) >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {fmtCurrency(statsQuery.data.totals.profit_loss)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        )}
      </div>
    </div>
  );
}
