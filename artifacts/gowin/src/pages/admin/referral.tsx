import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Save, RotateCcw, Users, DollarSign, Gift, Info } from "lucide-react";

interface ReferralConfig {
  enabled: boolean;
  signupBonus: number;
  referrerRewardPercent: number;
  maxReferralDeposits: number;
  rolloverMultiplier: number;
}

const DEFAULT: ReferralConfig = {
  enabled: true,
  signupBonus: 2,
  referrerRewardPercent: 5,
  maxReferralDeposits: 5,
  rolloverMultiplier: 5,
};

export default function AdminReferralSettings() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ReferralConfig>(DEFAULT);

  const { data: config, isLoading } = useQuery<ReferralConfig>({
    queryKey: ["admin-referral-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referral-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load referral settings");
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: ReferralConfig) => {
      const res = await fetch("/api/admin/referral-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setForm(data);
      queryClient.invalidateQueries({ queryKey: ["admin-referral-settings"] });
      toast({ title: "Saved", description: "Referral settings updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetToDefaults = () => {
    setForm(DEFAULT);
    toast({ title: "Reset", description: "Values reset to defaults. Click Save to apply." });
  };

  const update = (field: keyof ReferralConfig, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Referral Program Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control the referral program rewards and bonus wallet requirements
          </p>
        </div>
        <Badge variant={form.enabled ? "default" : "secondary"} className="mt-1">
          {form.enabled ? "Active" : "Disabled"}
        </Badge>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Referral Program</p>
              <p className="text-sm text-muted-foreground">
                When disabled, no new referral bonuses will be issued
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => update("enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rewards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Reward Amounts
          </CardTitle>
          <CardDescription>Configure what users earn through the referral program</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>New User Signup Bonus ($)</Label>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                step={0.5}
                value={form.signupBonus}
                onChange={(e) => update("signupBonus", parseFloat(e.target.value) || 0)}
                className="w-36"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Credited to the bonus wallet of the new user who signs up via a referral link
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Referrer Reward Percentage (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.referrerRewardPercent}
                onChange={(e) => update("referrerRewardPercent", parseFloat(e.target.value) || 0)}
                className="w-36"
              />
              <span className="text-sm text-muted-foreground">% of each deposit</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The referrer earns this percentage of each qualifying deposit made by their referred user
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Maximum Rewarded Deposits</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={50}
                step={1}
                value={form.maxReferralDeposits}
                onChange={(e) => update("maxReferralDeposits", parseInt(e.target.value) || 1)}
                className="w-36"
              />
              <span className="text-sm text-muted-foreground">deposits per referred user</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The referrer earns rewards for this many deposits from each referred user (then stops)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rollover */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Bonus Wallet Requirements
          </CardTitle>
          <CardDescription>Rollover rules that apply to all referral bonuses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rollover Multiplier (×)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={50}
                step={1}
                value={form.rolloverMultiplier}
                onChange={(e) => update("rolloverMultiplier", parseInt(e.target.value) || 1)}
                className="w-36"
              />
              <span className="text-sm text-muted-foreground">× bonus amount must be wagered</span>
            </div>
            <p className="text-xs text-muted-foreground">
              E.g. a $2 bonus with 5× rollover requires $10 in bets before the bonus can be withdrawn
            </p>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Rollover tracks how much more the user must wager before their bonus balance is eligible for withdrawal.
              It decreases automatically as bets are settled.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">📊 Preview with current settings</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>New user signup bonus:</span>
              <span className="font-medium text-foreground">${form.signupBonus.toFixed(2)} (requires ${(form.signupBonus * form.rolloverMultiplier).toFixed(2)} in bets to withdraw)</span>
            </div>
            <div className="flex justify-between">
              <span>Example: referred user deposits $100:</span>
              <span className="font-medium text-foreground">Referrer earns ${(100 * form.referrerRewardPercent / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Max referrer earnings per user:</span>
              <span className="font-medium text-foreground">Up to {form.maxReferralDeposits} deposits</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={resetToDefaults} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </Button>
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
