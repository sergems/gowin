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
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
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
  const { t } = useSiteSettings();
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
      toast({ title: t("admin.referral.saved"), description: t("admin.referral.saved_desc") });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetToDefaults = () => {
    setForm(DEFAULT);
    toast({ title: "Reset", description: t("admin.referral.reset_desc") });
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
          <h1 className="text-2xl font-bold">{t("admin.referral.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("admin.referral.desc")}</p>
        </div>
        <Badge variant={form.enabled ? "default" : "secondary"} className="mt-1">
          {form.enabled ? t("admin.referral.active") : t("admin.referral.disabled_label")}
        </Badge>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("admin.referral.enable_title")}</p>
              <p className="text-sm text-muted-foreground">{t("admin.referral.enable_desc")}</p>
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
            {t("admin.referral.rewards_title")}
          </CardTitle>
          <CardDescription>{t("admin.referral.rewards_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>{t("admin.referral.signup_bonus")}</Label>
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
            <p className="text-xs text-muted-foreground">{t("admin.referral.signup_bonus_desc")}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t("admin.referral.referrer_pct")}</Label>
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
              <span className="text-sm text-muted-foreground">{t("admin.referral.referrer_pct_unit")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.referral.referrer_pct_desc")}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t("admin.referral.max_deposits")}</Label>
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
              <span className="text-sm text-muted-foreground">{t("admin.referral.max_deposits_unit")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.referral.max_deposits_desc")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Rollover */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t("admin.referral.rollover_title")}
          </CardTitle>
          <CardDescription>{t("admin.referral.rollover_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("admin.referral.rollover_label")}</Label>
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
              <span className="text-sm text-muted-foreground">{t("admin.referral.rollover_unit")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.referral.rollover_note")}</p>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{t("admin.referral.rollover_info")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">{t("admin.referral.preview")}</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>{t("admin.referral.preview_signup")}</span>
              <span className="font-medium text-foreground">${form.signupBonus.toFixed(2)} (requires ${(form.signupBonus * form.rolloverMultiplier).toFixed(2)} in bets to withdraw)</span>
            </div>
            <div className="flex justify-between">
              <span>{t("admin.referral.preview_example")}</span>
              <span className="font-medium text-foreground">{t("admin.referral.earns")} ${(100 * form.referrerRewardPercent / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("admin.referral.preview_max")}</span>
              <span className="font-medium text-foreground">{t("admin.referral.preview_up_to").replace("{n}", String(form.maxReferralDeposits))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={resetToDefaults} className="gap-2">
          <RotateCcw className="h-4 w-4" /> {t("admin.referral.reset")}
        </Button>
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? t("admin.referral.saving") : t("admin.referral.save")}
        </Button>
      </div>
    </div>
  );
}
