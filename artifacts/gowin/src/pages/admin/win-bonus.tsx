import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { Sparkles, RotateCcw, Save, Loader2 } from "lucide-react";
import type { WinBonusConfig, WinBonusTier } from "@/contexts/BetSlipContext";

async function fetchConfig(): Promise<WinBonusConfig> {
  const res = await fetch("/api/admin/win-bonus", {
    credentials: "include",
    headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
  });
  if (!res.ok) throw new Error("Failed to load config");
  return res.json();
}

async function saveConfig(config: WinBonusConfig): Promise<WinBonusConfig> {
  const res = await fetch("/api/admin/win-bonus", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
    },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to save config");
  }
  return res.json();
}

const DEFAULT_BONUS_TABLE: WinBonusTier[] = [
  { selections: 10, bonusPercent: 10 },
  { selections: 11, bonusPercent: 15 },
  { selections: 12, bonusPercent: 17 },
  { selections: 13, bonusPercent: 20 },
  { selections: 14, bonusPercent: 22 },
  { selections: 15, bonusPercent: 25 },
  { selections: 16, bonusPercent: 30 },
  { selections: 17, bonusPercent: 35 },
  { selections: 18, bonusPercent: 40 },
  { selections: 19, bonusPercent: 45 },
  { selections: 20, bonusPercent: 50 },
  { selections: 21, bonusPercent: 75 },
  { selections: 22, bonusPercent: 85 },
  { selections: 23, bonusPercent: 90 },
  { selections: 24, bonusPercent: 95 },
  { selections: 25, bonusPercent: 100 },
  { selections: 26, bonusPercent: 150 },
  { selections: 27, bonusPercent: 200 },
  { selections: 28, bonusPercent: 250 },
  { selections: 29, bonusPercent: 300 },
  { selections: 30, bonusPercent: 350 },
  { selections: 31, bonusPercent: 400 },
  { selections: 32, bonusPercent: 450 },
  { selections: 33, bonusPercent: 500 },
  { selections: 34, bonusPercent: 550 },
  { selections: 35, bonusPercent: 600 },
  { selections: 36, bonusPercent: 650 },
  { selections: 37, bonusPercent: 700 },
  { selections: 38, bonusPercent: 1025 },
  { selections: 39, bonusPercent: 1050 },
  { selections: 40, bonusPercent: 1075 },
  { selections: 41, bonusPercent: 1100 },
  { selections: 42, bonusPercent: 1125 },
  { selections: 43, bonusPercent: 1150 },
  { selections: 44, bonusPercent: 1175 },
  { selections: 45, bonusPercent: 1200 },
  { selections: 46, bonusPercent: 1215 },
  { selections: 47, bonusPercent: 1225 },
  { selections: 48, bonusPercent: 1235 },
  { selections: 49, bonusPercent: 1245 },
  { selections: 50, bonusPercent: 1250 },
];

export default function WinBonusPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serverConfig, isLoading } = useQuery<WinBonusConfig>({
    queryKey: ["admin-win-bonus-config"],
    queryFn: fetchConfig,
  });

  const [local, setLocal] = useState<WinBonusConfig | null>(null);
  const config = local ?? serverConfig ?? null;

  // Initialise local state once server data arrives
  if (serverConfig && !local) {
    setLocal({ ...serverConfig });
  }

  const mutation = useMutation({
    mutationFn: saveConfig,
    onSuccess: (saved) => {
      setLocal(saved);
      queryClient.invalidateQueries({ queryKey: ["admin-win-bonus-config"] });
      queryClient.invalidateQueries({ queryKey: ["win-bonus-config"] });
      toast({ title: "Win Bonus settings saved", description: "Changes are live immediately." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  function updateField<K extends keyof WinBonusConfig>(key: K, value: WinBonusConfig[K]) {
    setLocal((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateTierBonus(selections: number, bonusPercent: number) {
    setLocal((prev) => {
      if (!prev) return prev;
      const updated = prev.bonusTable.map((t) =>
        t.selections === selections ? { ...t, bonusPercent } : t,
      );
      return { ...prev, bonusTable: updated };
    });
  }

  function handleResetTable() {
    setLocal((prev) => (prev ? { ...prev, bonusTable: [...DEFAULT_BONUS_TABLE] } : prev));
    toast({ title: "Bonus table reset to defaults", description: "Click Save to apply." });
  }

  function handleSave() {
    if (!config) return;
    mutation.mutate(config);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Win Bonus Promotion</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure the Multi Bet Win Bonus. All changes take effect immediately for new bets.
            Existing bets always use the values stored at placement time.
          </p>
        </div>
        <Button onClick={handleSave} disabled={mutation.isPending} className="shrink-0">
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Changes</>
          )}
        </Button>
      </div>

      <Separator />

      {/* Enable / Disable */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="font-semibold">Enable Win Bonus</p>
          <p className="text-sm text-muted-foreground">
            When disabled, no bonus is applied to any bet. The betslip will not show the bonus section.
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(v) => updateField("enabled", v)}
        />
      </div>

      {/* Promotion text */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Promotional Text</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="promo-title">Title</Label>
            <Input
              id="promo-title"
              value={config.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Up to 1250% Win Bonus"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-desc">Description</Label>
          <Textarea
            id="promo-desc"
            value={config.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={3}
            placeholder="Describe the promotion…"
          />
        </div>
      </div>

      <Separator />

      {/* Qualifying rules */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Qualifying Rules</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="min-qual-sel">Min qualifying selections to unlock bonus</Label>
            <Input
              id="min-qual-sel"
              type="number"
              min={1}
              max={50}
              value={config.minQualifyingSelections}
              onChange={(e) => updateField("minQualifyingSelections", parseInt(e.target.value) || 10)}
            />
            <p className="text-[11px] text-muted-foreground">Bonus activates at this many qualifying selections.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-sel">Maximum selections per betslip</Label>
            <Input
              id="max-sel"
              type="number"
              min={1}
              max={200}
              value={config.maxSelections}
              onChange={(e) => updateField("maxSelections", parseInt(e.target.value) || 50)}
            />
            <p className="text-[11px] text-muted-foreground">Users cannot add more than this many selections.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-odds">Minimum qualifying odds (exclusive)</Label>
            <Input
              id="min-odds"
              type="number"
              min={1}
              step={0.01}
              value={config.minQualifyingOdds}
              onChange={(e) => updateField("minQualifyingOdds", parseFloat(e.target.value) || 1.4)}
            />
            <p className="text-[11px] text-muted-foreground">
              Selections with odds <strong>greater than</strong> this value count toward the bonus.
              e.g. 1.40 means odds of 1.41+ qualify.
            </p>
          </div>
        </div>
      </div>

      {/* Max payout */}
      <div className="space-y-2">
        <Label htmlFor="max-payout">Maximum payout (USD)</Label>
        <Input
          id="max-payout"
          type="number"
          min={1}
          value={config.maxPayout}
          onChange={(e) => updateField("maxPayout", parseFloat(e.target.value) || 1_000_000)}
          className="max-w-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Final payout (Base Win + Bonus) is capped at this amount. "Maximum payout applied" notice appears in the betslip when this limit is reached.
        </p>
      </div>

      <Separator />

      {/* Bonus table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Bonus Table</h2>
            <p className="text-sm text-muted-foreground">
              Edit the bonus percentage for each qualifying selection count.
              Bonus is calculated on the Base Win (Stake × Combined Odds).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetTable}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Qualifying Selections</TableHead>
                <TableHead>Bonus %</TableHead>
                <TableHead className="text-muted-foreground text-xs">Example: $1,000 base win</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.bonusTable
                .slice()
                .sort((a, b) => a.selections - b.selections)
                .map((tier) => (
                  <TableRow key={tier.selections}>
                    <TableCell className="font-medium tabular-nums">{tier.selections}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={tier.bonusPercent}
                          onChange={(e) =>
                            updateTierBonus(tier.selections, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 h-7 text-sm"
                        />
                        <span className="text-muted-foreground text-sm">%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm tabular-nums">
                      + ${(1000 * (tier.bonusPercent / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      {" "}→ ${(1000 + 1000 * (tier.bonusPercent / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 })} total
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={mutation.isPending} size="lg">
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Changes</>
          )}
        </Button>
      </div>
    </div>
  );
}
