import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Users, Gift, Copy, Share2, DollarSign, TrendingUp, Info, CheckCircle } from "lucide-react";

interface ReferralStats {
  referralCode: string | null;
  referredCount: number;
  totalRewards: number;
  totalDepositsRewarded: number;
}

interface ReferralConfig {
  enabled: boolean;
  signupBonus: number;
  referrerRewardPercent: number;
  maxReferralDeposits: number;
  rolloverMultiplier: number;
}

export default function ReferralPage() {
  const { token } = useAuth();
  const { toast, } = useToast();
  const { t } = useSiteSettings();
  const [copied, setCopied] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ["referral-stats"],
    queryFn: async () => {
      const res = await fetch("/api/user/referral", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load referral stats");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: config } = useQuery<ReferralConfig>({
    queryKey: ["referral-config-public"],
    queryFn: async () => {
      const res = await fetch("/api/referral-config");
      if (!res.ok) throw new Error("Failed to load referral config");
      return res.json();
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = stats?.referralCode ? `${origin}/register?ref=${stats.referralCode}` : "";

  const copyCode = async () => {
    if (!stats?.referralCode) return;
    await navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    toast({ title: t("referral.copied"), description: t("referral.copied_desc"), variant: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast({ title: t("referral.link_copied"), description: t("referral.link_copied_desc"), variant: "success" });
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      await navigator.share({ title: "Join GoWin", text: `Sign up with my referral link and get a ${config?.signupBonus ?? 2} welcome bonus!`, url: referralLink });
    } else {
      await copyLink();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("referral.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("referral.desc")}</p>
      </div>

      {/* How it works */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {t("referral.how_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl mb-1">🔗</div>
              <div className="font-medium text-sm">{t("referral.step1_title")}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("referral.step1_desc")}</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl mb-1">👤</div>
              <div className="font-medium text-sm">{t("referral.step2_title")}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("referral.step2_desc_pre")}{" "}
                <strong>{config ? `${config.signupBonus}` : "2"} {t("referral.step2_desc_post")}</strong>
              </div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl mb-1">💰</div>
              <div className="font-medium text-sm">
                {t("referral.step3_title_pre")} {config ? `${config.referrerRewardPercent}%` : "5%"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {config ? `${config.referrerRewardPercent}%` : "5%"} {t("referral.step3_desc_pre")} {config?.maxReferralDeposits ?? 5} {t("referral.step3_desc_post")}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm">
            <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-muted-foreground">
              {t("referral.bonus_info_pre")} <strong>{t("referral.bonus_wallet")}</strong> {t("referral.must_wager").replace("×", (config?.rolloverMultiplier ?? 5) + "×")} {t("referral.bonus_info_post")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral code + link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("referral.your_code")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statsLoading ? (
            <div className="h-12 bg-muted animate-pulse rounded-lg" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-xl tracking-widest font-bold text-center">
                  {stats?.referralCode ?? "—"}
                </div>
                <Button variant="outline" size="icon" onClick={copyCode} disabled={!stats?.referralCode}>
                  {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("referral.referral_link")}</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground truncate font-mono">
                    {referralLink || "—"}
                  </div>
                  <Button variant="outline" size="sm" onClick={copyLink} disabled={!referralLink}>
                    <Copy className="h-3 w-3 mr-1" /> {t("referral.copy")}
                  </Button>
                  <Button size="sm" onClick={shareLink} disabled={!referralLink}>
                    <Share2 className="h-3 w-3 mr-1" /> {t("referral.share")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{statsLoading ? "—" : stats?.referredCount ?? 0}</div>
              <div className="text-xs text-muted-foreground">{t("referral.friends_referred")}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {statsLoading ? "—" : `$${(stats?.totalRewards ?? 0).toFixed(2)}`}
              </div>
              <div className="text-xs text-muted-foreground">{t("referral.total_earned")}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{statsLoading ? "—" : stats?.totalDepositsRewarded ?? 0}</div>
              <div className="text-xs text-muted-foreground">{t("referral.deposits_rewarded")}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fine print */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" /> {t("referral.terms_title")}
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>{t("referral.terms_1")}</li>
            <li>{t("referral.terms_2_pre")}{config?.signupBonus ?? 2}{t("referral.terms_2_post")}</li>
            <li>{t("referral.terms_3_pre")} {config?.referrerRewardPercent ?? 5}{t("referral.terms_3_mid")} {config?.maxReferralDeposits ?? 5} {t("referral.terms_3_post")}</li>
            <li>{t("referral.terms_4_pre")} {config?.rolloverMultiplier ?? 5}× {t("referral.terms_4_post")}</li>
            <li>{t("referral.terms_5")}</li>
            <li>{t("referral.terms_6")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
