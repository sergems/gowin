import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
  const { toast } = useToast();
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
      const res = await fetch("/api/user/referral", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // We'll fetch config from the same endpoint or use defaults
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: false, // we show defaults inline
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = stats?.referralCode ? `${origin}/register?ref=${stats.referralCode}` : "";

  const copyCode = async () => {
    if (!stats?.referralCode) return;
    await navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast({ title: "Link copied!", description: "Referral link copied to clipboard." });
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      await navigator.share({ title: "Join GoWin", text: "Sign up with my referral link and get a $2 welcome bonus!", url: referralLink });
    } else {
      await copyLink();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground mt-1">
          Invite friends to GoWin and earn bonus rewards
        </p>
      </div>

      {/* How it works */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl mb-1">🔗</div>
              <div className="font-medium text-sm">1. Share your link</div>
              <div className="text-xs text-muted-foreground mt-1">Send your unique referral link to friends</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl mb-1">👤</div>
              <div className="font-medium text-sm">2. They sign up</div>
              <div className="text-xs text-muted-foreground mt-1">They create an account & get <strong>$2 bonus</strong></div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl mb-1">💰</div>
              <div className="font-medium text-sm">3. You earn 5%</div>
              <div className="text-xs text-muted-foreground mt-1">5% of their first 5 deposits credited to you</div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm">
            <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-muted-foreground">
              All bonuses are credited to your <strong>Bonus Wallet</strong> and must be wagered{" "}
              <strong>5× before withdrawal</strong>.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral code + link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Referral Code</CardTitle>
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
                <p className="text-xs text-muted-foreground">Referral link:</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground truncate font-mono">
                    {referralLink || "—"}
                  </div>
                  <Button variant="outline" size="sm" onClick={copyLink} disabled={!referralLink}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                  <Button size="sm" onClick={shareLink} disabled={!referralLink}>
                    <Share2 className="h-3 w-3 mr-1" /> Share
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
              <div className="text-xs text-muted-foreground">Friends referred</div>
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
              <div className="text-xs text-muted-foreground">Total earned</div>
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
              <div className="text-xs text-muted-foreground">Deposits rewarded</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fine print */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" /> Terms & Conditions
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Your friend must sign up using your referral link or code</li>
            <li>New users receive a $2 welcome bonus instantly on sign-up</li>
            <li>You earn 5% of each of their first 5 deposits</li>
            <li>All bonuses go to the Bonus Wallet and require 5× wagering before withdrawal</li>
            <li>Self-referrals or fraudulent accounts will be disqualified</li>
            <li>GoWin reserves the right to modify or end the referral program at any time</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
