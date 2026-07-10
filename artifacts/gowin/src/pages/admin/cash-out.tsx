import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Save, Loader2, BarChart3, ScrollText, ShieldAlert } from "lucide-react";

interface CashOutConfig {
  enabled: boolean;
  houseMarginPercent: number;
  minMarginPercent: number;
  maxMarginPercent: number;
  minCashOutAmount: number;
  maxCashOutAmount: number;
  minTicketStake: number;
  maxTicketStake: number;
  minOfferAmount: number;
  maxOfferAmount: number;
  enableSingles: boolean;
  enableMultiples: boolean;
  enableSystemBets: boolean;
  enableLiveBets: boolean;
  enablePreMatchBets: boolean;
  allowBeforeMatchStarts: boolean;
  allowDuringMatch: boolean;
  disableMinutesBeforeKickoff: number;
  disableAfterMinute: number;
  disableWhenOddsSuspended: boolean;
  disableAfterRedCard: boolean;
  disableAfterPenalty: boolean;
  disableAfterVar: boolean;
  disableDuringInjuryTime: boolean;
  disableDuringExtraTime: boolean;
  disableDuringPenaltyShootout: boolean;
  refreshIntervalSeconds: number;
  maxOddsDriftPercent: number;
  roundingMode: "none" | "up" | "down" | "nearest";
  roundingIncrement: number;
  largeWinProtectionPercent: number;
  highOddsProtectionPercent: number;
  accumulatorProtectionPercent: number;
  lateMatchProtectionPercent: number;
  riskAdjustmentPercent: number;
  largeWinThreshold: number;
  highOddsThreshold: number;
  accumulatorSelectionsThreshold: number;
  lateMatchMinuteThreshold: number;
  maxCashOutExposure: number;
  maxDailyCashOutLiability: number;
  maxCashOutPerTicket: number;
  maxCashOutPerCustomerPerDay: number;
  enabledSportIds: number[];
  enabledLeagueIds: number[];
  enabledCountries: string[];
  enabledMarkets: string[];
  suspendWhenLosingAfterMinute: number;
  version: number;
}

function csvNumbers(value: number[]): string {
  return value.join(", ");
}
function parseCsvNumbers(value: string): number[] {
  return value.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n));
}
function csvStrings(value: string[]): string {
  return value.join(", ");
}
function parseCsvStrings(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

async function fetchConfig(token: string | null): Promise<CashOutConfig> {
  const res = await fetch("/api/admin/cash-out/settings", {
    credentials: "include",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error("Failed to load Cash Out settings");
  return res.json();
}

async function saveConfig(config: CashOutConfig, token: string | null): Promise<CashOutConfig> {
  const res = await fetch("/api/admin/cash-out/settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to save settings");
  }
  return res.json();
}

async function fetchReports(days: number, token: string | null) {
  const res = await fetch(`/api/admin/cash-out/reports?days=${days}`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error("Failed to load reports");
  return res.json();
}

async function fetchAuditLog(page: number, token: string | null) {
  const res = await fetch(`/api/admin/cash-out/audit-log?page=${page}&limit=25`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error("Failed to load audit log");
  return res.json();
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div>
        <p className="font-medium text-sm">{title}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function AdminCashOutPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { formatCurrency } = useSiteSettings();
  const [days, setDays] = useState(30);
  const [auditPage, setAuditPage] = useState(1);

  const { data: serverConfig, isLoading } = useQuery<CashOutConfig>({
    queryKey: ["admin-cash-out-config"],
    queryFn: () => fetchConfig(token),
    enabled: !!token,
  });

  const { data: reports } = useQuery({
    queryKey: ["admin-cash-out-reports", days],
    queryFn: () => fetchReports(days, token),
    enabled: !!token,
  });

  const { data: auditData } = useQuery({
    queryKey: ["admin-cash-out-audit", auditPage],
    queryFn: () => fetchAuditLog(auditPage, token),
    enabled: !!token,
  });

  const [local, setLocal] = useState<CashOutConfig | null>(null);
  const config = local ?? serverConfig ?? null;
  if (serverConfig && !local) setLocal({ ...serverConfig });

  const mutation = useMutation({
    mutationFn: (cfg: CashOutConfig) => saveConfig(cfg, token),
    onSuccess: (saved) => {
      setLocal(saved);
      queryClient.invalidateQueries({ queryKey: ["admin-cash-out-config"] });
      toast({ title: "Cash Out settings saved", variant: "success" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  function set<K extends keyof CashOutConfig>(key: K, value: CashOutConfig[K]) {
    setLocal((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Cash Out</h1>
          </div>
          <p className="text-sm text-muted-foreground">Full Cash Out configuration, reporting, and audit log.</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Reports</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="w-3.5 h-3.5 mr-1.5" />Audit Log</TabsTrigger>
        </TabsList>

        {/* ── Settings tab ─────────────────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-8 pt-6">
          <div className="flex justify-end">
            <Button onClick={() => mutation.mutate(config)} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
          </div>

          <ToggleRow title="Enable Cash Out" desc="Master switch for the entire Cash Out feature." checked={config.enabled} onChange={(v) => set("enabled", v)} />

          <Separator />
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Margin</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="House Margin %"><Input type="number" step={0.5} value={config.houseMarginPercent} onChange={(e) => set("houseMarginPercent", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Min Margin %"><Input type="number" step={0.5} value={config.minMarginPercent} onChange={(e) => set("minMarginPercent", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Max Margin %"><Input type="number" step={0.5} value={config.maxMarginPercent} onChange={(e) => set("maxMarginPercent", parseFloat(e.target.value) || 0)} /></Field>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Amount Limits</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Min Cash Out Amount"><Input type="number" value={config.minCashOutAmount} onChange={(e) => set("minCashOutAmount", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Max Cash Out Amount" hint="0 = unlimited"><Input type="number" value={config.maxCashOutAmount} onChange={(e) => set("maxCashOutAmount", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Min Ticket Stake"><Input type="number" value={config.minTicketStake} onChange={(e) => set("minTicketStake", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Max Ticket Stake" hint="0 = unlimited"><Input type="number" value={config.maxTicketStake} onChange={(e) => set("maxTicketStake", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Min Offer Amount"><Input type="number" value={config.minOfferAmount} onChange={(e) => set("minOfferAmount", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Max Offer Amount" hint="0 = unlimited"><Input type="number" value={config.maxOfferAmount} onChange={(e) => set("maxOfferAmount", parseFloat(e.target.value) || 0)} /></Field>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Scope Restrictions</h2>
            <p className="text-xs text-muted-foreground">Leave a field empty to allow all. Comma-separated values.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Allowed Sport IDs" hint="e.g. 1, 2, 7 (Football, Basketball, Tennis)">
                <Input value={csvNumbers(config.enabledSportIds)} onChange={(e) => set("enabledSportIds", parseCsvNumbers(e.target.value))} placeholder="All sports" />
              </Field>
              <Field label="Allowed League IDs">
                <Input value={csvNumbers(config.enabledLeagueIds)} onChange={(e) => set("enabledLeagueIds", parseCsvNumbers(e.target.value))} placeholder="All leagues" />
              </Field>
              <Field label="Allowed Countries">
                <Input value={csvStrings(config.enabledCountries)} onChange={(e) => set("enabledCountries", parseCsvStrings(e.target.value))} placeholder="All countries" />
              </Field>
              <Field label="Allowed Markets" hint="e.g. 1X2, Over/Under 2.5, Double Chance">
                <Input value={csvStrings(config.enabledMarkets)} onChange={(e) => set("enabledMarkets", parseCsvStrings(e.target.value))} placeholder="All markets" />
              </Field>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Bet Type Eligibility</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleRow title="Singles" checked={config.enableSingles} onChange={(v) => set("enableSingles", v)} />
              <ToggleRow title="Multiples" checked={config.enableMultiples} onChange={(v) => set("enableMultiples", v)} />
              <ToggleRow title="System Bets" desc="Not currently offered on this platform" checked={config.enableSystemBets} onChange={(v) => set("enableSystemBets", v)} />
              <ToggleRow title="Live Bets" checked={config.enableLiveBets} onChange={(v) => set("enableLiveBets", v)} />
              <ToggleRow title="Pre-Match Bets" checked={config.enablePreMatchBets} onChange={(v) => set("enablePreMatchBets", v)} />
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Timing Rules</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleRow title="Allow Before Match Starts" checked={config.allowBeforeMatchStarts} onChange={(v) => set("allowBeforeMatchStarts", v)} />
              <ToggleRow title="Allow During Match" checked={config.allowDuringMatch} onChange={(v) => set("allowDuringMatch", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Disable X Minutes Before Kickoff" hint="0 = no limit"><Input type="number" value={config.disableMinutesBeforeKickoff} onChange={(e) => set("disableMinutesBeforeKickoff", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Disable After Minute" hint="0 = no limit, suspends all cash-out past this minute"><Input type="number" value={config.disableAfterMinute} onChange={(e) => set("disableAfterMinute", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Suspend When Losing After Minute" hint="0 = disabled. Suspends cash-out if the prediction is currently losing at or after this minute (default 85')"><Input type="number" value={config.suspendWhenLosingAfterMinute ?? 85} onChange={(e) => set("suspendWhenLosingAfterMinute", parseFloat(e.target.value) || 0)} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ToggleRow title="Disable on Suspended Odds" checked={config.disableWhenOddsSuspended} onChange={(v) => set("disableWhenOddsSuspended", v)} />
              <ToggleRow title="Disable After Red Card" checked={config.disableAfterRedCard} onChange={(v) => set("disableAfterRedCard", v)} />
              <ToggleRow title="Disable After Penalty" checked={config.disableAfterPenalty} onChange={(v) => set("disableAfterPenalty", v)} />
              <ToggleRow title="Disable During VAR Review" checked={config.disableAfterVar} onChange={(v) => set("disableAfterVar", v)} />
              <ToggleRow title="Disable During Injury Time" checked={config.disableDuringInjuryTime} onChange={(v) => set("disableDuringInjuryTime", v)} />
              <ToggleRow title="Disable During Extra Time" checked={config.disableDuringExtraTime} onChange={(v) => set("disableDuringExtraTime", v)} />
              <ToggleRow title="Disable During Penalty Shootout" checked={config.disableDuringPenaltyShootout} onChange={(v) => set("disableDuringPenaltyShootout", v)} />
            </div>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5"><ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />Live match-state signals (red card, VAR, injury/extra time, penalty shootout) require live-feed data not yet persisted by this platform — these toggles are ready for when that data becomes available.</p>
          </div>

          <Separator />
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Refresh & Odds Drift</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Refresh Interval (seconds)"><Input type="number" value={config.refreshIntervalSeconds} onChange={(e) => set("refreshIntervalSeconds", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Max Odds Drift %" hint="Reject accept if live offer drifted more than this since last quote"><Input type="number" value={config.maxOddsDriftPercent} onChange={(e) => set("maxOddsDriftPercent", parseFloat(e.target.value) || 0)} /></Field>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Offer Rounding</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rounding Mode">
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={config.roundingMode}
                  onChange={(e) => set("roundingMode", e.target.value as CashOutConfig["roundingMode"])}
                >
                  <option value="none">None</option>
                  <option value="up">Round Up</option>
                  <option value="down">Round Down</option>
                  <option value="nearest">Round Nearest</option>
                </select>
              </Field>
              <Field label="Rounding Increment">
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={config.roundingIncrement}
                  onChange={(e) => set("roundingIncrement", parseFloat(e.target.value))}
                >
                  {[0.01, 0.05, 0.1, 0.5, 1.0].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Advanced Profit Protection</h2>
            <p className="text-xs text-muted-foreground">Additional margin stacked on top of the house margin when a threshold is triggered.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Large Win Protection %"><Input type="number" value={config.largeWinProtectionPercent} onChange={(e) => set("largeWinProtectionPercent", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Large Win Threshold"><Input type="number" value={config.largeWinThreshold} onChange={(e) => set("largeWinThreshold", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="High Odds Protection %"><Input type="number" value={config.highOddsProtectionPercent} onChange={(e) => set("highOddsProtectionPercent", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="High Odds Threshold"><Input type="number" value={config.highOddsThreshold} onChange={(e) => set("highOddsThreshold", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Accumulator Protection %"><Input type="number" value={config.accumulatorProtectionPercent} onChange={(e) => set("accumulatorProtectionPercent", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Accumulator Selections Threshold"><Input type="number" value={config.accumulatorSelectionsThreshold} onChange={(e) => set("accumulatorSelectionsThreshold", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Late Match Protection %"><Input type="number" value={config.lateMatchProtectionPercent} onChange={(e) => set("lateMatchProtectionPercent", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Late Match Minute Threshold"><Input type="number" value={config.lateMatchMinuteThreshold} onChange={(e) => set("lateMatchMinuteThreshold", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Risk Adjustment %"><Input type="number" value={config.riskAdjustmentPercent} onChange={(e) => set("riskAdjustmentPercent", parseFloat(e.target.value) || 0)} /></Field>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Exposure & Liability Caps</h2>
            <p className="text-xs text-muted-foreground">0 = unlimited.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Max Concurrent Cash Out Exposure"><Input type="number" value={config.maxCashOutExposure} onChange={(e) => set("maxCashOutExposure", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Max Daily Cash Out Liability"><Input type="number" value={config.maxDailyCashOutLiability} onChange={(e) => set("maxDailyCashOutLiability", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Max Cash Out Per Ticket"><Input type="number" value={config.maxCashOutPerTicket} onChange={(e) => set("maxCashOutPerTicket", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Max Cash Out Per Customer Per Day"><Input type="number" value={config.maxCashOutPerCustomerPerDay} onChange={(e) => set("maxCashOutPerCustomerPerDay", parseFloat(e.target.value) || 0)} /></Field>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => mutation.mutate(config)} disabled={mutation.isPending} size="lg">
              {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        </TabsContent>

        {/* ── Reports tab ──────────────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-6 pt-6">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Range (days)</Label>
            <Input type="number" className="w-24" value={days} onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 30))} />
          </div>
          {reports ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Total Cash Outs", reports.totalCashOuts],
                ["Total Paid", formatCurrency(reports.totalPaid)],
                ["Total Saved (vs. potential win)", formatCurrency(reports.totalSaved)],
                ["Average Margin Used", `${reports.avgMarginUsed?.toFixed(2)}%`],
                ["Average Offer Amount", formatCurrency(reports.avgOfferAmount)],
                ["Largest Cash Out", formatCurrency(reports.largestCashOut)],
                ["Most Cashed-Out Market", reports.mostCashedOutMarket ?? "—"],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold">{value as any}</p>
                </div>
              ))}
            </div>
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          )}
        </TabsContent>

        {/* ── Audit log tab ────────────────────────────────────────────── */}
        <TabsContent value="audit" className="space-y-4 pt-6">
          {auditData ? (
            <>
              <div className="rounded-md border border-border overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bet</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Stake</TableHead>
                      <TableHead>Potential Win</TableHead>
                      <TableHead>Offer</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData.logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>#{log.betId}</TableCell>
                        <TableCell>{log.username ?? "—"}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(log.stake))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(log.potentialWin))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(log.offerAmount))}</TableCell>
                        <TableCell>{parseFloat(log.marginUsed).toFixed(2)}%</TableCell>
                        <TableCell className="capitalize">{log.status}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Page {auditData.page} · {auditData.total} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={auditData.logs.length < 25} onClick={() => setAuditPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            </>
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
