import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetMyWallet, useGetMyTransactions } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, History as HistoryIcon,
  Minus, Ticket, Clock, CheckCircle2, XCircle, Banknote, Phone, AlertTriangle,
  Smartphone, Loader2, ChevronDown, CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

async function postWalletAction(path: string, token: string | null, body: object) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];
const CDF_QUICK_AMOUNTS = [50_000, 100_000, 250_000, 500_000];

const DRC_OPERATOR_NAMES: Record<string, string> = {
  VODACOM_MPESA_COD: "M-Pesa (Vodacom)",
  AIRTEL_COD: "Airtel Money",
  ORANGE_COD: "Orange Money",
};

function operatorLabel(code: string | null) {
  if (!code) return null;
  return DRC_OPERATOR_NAMES[code] ?? code.replace(/_/g, " ");
}

interface Withdrawal {
  id: number;
  amount: number;
  currency: string;
  bankDetails: string;
  phoneNumber: string | null;
  status: string;
  adminNote: string | null;
  pawapayStatus: string | null;
  createdAt: string;
}

interface PawapayConfig {
  enabled: boolean;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  operators: { code: string; name: string; currencies: string[] }[];
}

interface UserProfile {
  phoneNumber: string | null;
  mobileOperator: string | null;
  secondaryPhoneNumber: string | null;
  secondaryMobileOperator: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  pending:    { label: "Pending",    color: "bg-amber-500/15 text-amber-500 border-amber-500/30",       Icon: Clock },
  approved:   { label: "Approved",  color: "bg-blue-500/15 text-blue-500 border-blue-500/30",          Icon: CheckCircle2 },
  rejected:   { label: "Rejected",  color: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
  paid:       { label: "Paid",      color: "bg-primary/15 text-primary border-primary/30",             Icon: Banknote },
  processing: { label: "Processing",color: "bg-violet-500/15 text-violet-500 border-violet-500/30",   Icon: Loader2 },
  completed:  { label: "Completed", color: "bg-primary/15 text-primary border-primary/30",             Icon: CheckCircle2 },
  failed:     { label: "Failed",    color: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ── Account Selector Component ────────────────────────────────────────────
function AccountSelector({
  profile,
  selected,
  onChange,
}: {
  profile: UserProfile;
  selected: "primary" | "secondary";
  onChange: (v: "primary" | "secondary") => void;
}) {
  const hasPrimary = !!profile.phoneNumber && !!profile.mobileOperator;
  const hasSecondary = !!profile.secondaryPhoneNumber && !!profile.secondaryMobileOperator;

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Payment Account</Label>
      <div className="grid gap-2">
        {hasPrimary && (
          <button
            type="button"
            onClick={() => onChange("primary")}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
              selected === "primary"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              selected === "primary" ? "bg-primary/20 text-primary" : "bg-accent text-muted-foreground"
            }`}>
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Primary</p>
              <p className="font-mono text-sm font-semibold truncate">{profile.phoneNumber}</p>
              <p className="text-xs text-muted-foreground">{operatorLabel(profile.mobileOperator)}</p>
            </div>
            {selected === "primary" && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
          </button>
        )}
        {hasSecondary && (
          <button
            type="button"
            onClick={() => onChange("secondary")}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
              selected === "secondary"
                ? "border-blue-500 bg-blue-500/5"
                : "border-border hover:border-blue-500/40"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              selected === "secondary" ? "bg-blue-500/20 text-blue-400" : "bg-accent text-muted-foreground"
            }`}>
              <Phone className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Secondary</p>
              <p className="font-mono text-sm font-semibold truncate">{profile.secondaryPhoneNumber}</p>
              <p className="text-xs text-muted-foreground">{operatorLabel(profile.secondaryMobileOperator)}</p>
            </div>
            {selected === "secondary" && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
          </button>
        )}
        {!hasPrimary && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-500">No payment account set</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set your phone number and mobile operator in{" "}
                <Link href="/profile" className="text-primary underline">your profile</Link> to deposit and withdraw.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Wallet() {
  const { data: wallet, isLoading: isWalletLoading } = useGetMyWallet();
  const { data: transactionsData, isLoading: isTransactionsLoading } = useGetMyTransactions();
  const { token, user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency, t } = useSiteSettings();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const isRestrictedRole = ["agent", "branch_admin", "payout", "payment_clerk"].includes(user?.role ?? "");

  const [activeTab, setActiveTab] = useState<"mobile" | "voucher" | "withdraw">("mobile");
  const [voucherCode, setVoucherCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCurrency, setWithdrawCurrency] = useState("USD");
  const [withdrawAccountType, setWithdrawAccountType] = useState<"primary" | "secondary">("primary");

  // Mobile Money deposit state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositCurrency, setDepositCurrency] = useState("USD");
  const [depositAccountType, setDepositAccountType] = useState<"primary" | "secondary">("primary");

  const transactions = transactionsData?.transactions || [];

  // Load user profile for phone/operator data
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: withdrawals = [], isLoading: isWithdrawalsLoading } = useQuery<Withdrawal[]>({
    queryKey: ["/api/wallet/withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/wallet/withdrawals", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
  });

  const { data: ppConfig } = useQuery<PawapayConfig>({
    queryKey: ["/api/pawapay/config"],
    queryFn: async () => {
      const res = await fetch("/api/pawapay/config");
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: exchangeRate } = useQuery<{ rate: number; isFallback: boolean }>({
    queryKey: ["/api/pawapay/exchange-rate"],
    queryFn: async () => {
      const res = await fetch("/api/pawapay/exchange-rate");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    enabled: !!ppConfig?.enabled,
  });

  const usdToCdf = exchangeRate?.rate ?? 2800;
  const depositMax = depositCurrency === "CDF"
    ? Math.round((ppConfig?.maxDeposit ?? 10000) * usdToCdf)
    : (ppConfig?.maxDeposit ?? 10000);
  const depositMin = depositCurrency === "CDF"
    ? Math.round((ppConfig?.minDeposit ?? 1) * usdToCdf)
    : (ppConfig?.minDeposit ?? 1);

  const hasPrimaryAccount = !!(profile?.phoneNumber && profile?.mobileOperator);
  const hasSecondaryAccount = !!(profile?.secondaryPhoneNumber && profile?.secondaryMobileOperator);

  const depositMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/pawapay/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          currency: depositCurrency,
          accountType: depositAccountType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deposit initiation failed");
      return data as { depositId: string };
    },
    onSuccess: (data) => {
      navigate(`/wallet/deposit/${data.depositId}`);
    },
    onError: (e: any) => toast({ title: "Deposit failed", description: e.message, variant: "destructive" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wallet/withdrawal-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          currency: withdrawCurrency,
          accountType: withdrawAccountType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdrawal request failed");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Withdrawal requested", description: "Your request has been submitted for review.", variant: "success" });
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/withdrawals"] });
    },
    onError: (e: any) => toast({ title: "Request failed", description: e.message, variant: "destructive" }),
  });

  const handleRedeemVoucher = async () => {
    if (!voucherCode.trim()) return;
    setIsRedeeming(true);
    try {
      const res = await fetch("/api/wallet/redeem-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code: voucherCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redemption failed");
      toast({ title: t("wallet.voucher_redeemed"), description: `${formatCurrency(data.amount)} ${t("wallet.added_to_wallet")}.` });
      setVoucherCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    } catch (e: any) {
      toast({ title: t("wallet.redemption_failed"), description: e.message, variant: "destructive" });
    } finally {
      setIsRedeeming(false);
    }
  };

  // Which account is selected for deposit/withdraw
  const selectedDepositAccount = depositAccountType === "secondary"
    ? { phone: profile?.secondaryPhoneNumber, operator: profile?.secondaryMobileOperator }
    : { phone: profile?.phoneNumber, operator: profile?.mobileOperator };

  const selectedWithdrawAccount = withdrawAccountType === "secondary"
    ? { phone: profile?.secondaryPhoneNumber, operator: profile?.secondaryMobileOperator }
    : { phone: profile?.phoneNumber, operator: profile?.mobileOperator };

  const depositAccountReady = !!(selectedDepositAccount.phone && selectedDepositAccount.operator);
  const withdrawAccountReady = !!(selectedWithdrawAccount.phone && selectedWithdrawAccount.operator);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-0.5">{t("wallet.title")}</h1>
        <p className="text-xs text-muted-foreground">
          {isRestrictedRole ? t("wallet.desc_restricted") : t("wallet.desc")}
        </p>
      </div>

      {/* Balance card */}
      {isWalletLoading ? (
        <div className="h-20 bg-accent/50 rounded-xl animate-pulse" />
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <WalletIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                  {isRestrictedRole ? t("wallet.balance_allocated") : t("wallet.balance")}
                </p>
                <h2 className="text-2xl font-black tracking-tight break-all">{formatCurrency(wallet?.balance ?? 0)}</h2>
                {(wallet?.bonusBalance ?? 0) > 0 && (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Bonus:</span>
                    <span className="font-semibold text-amber-500">{formatCurrency(wallet?.bonusBalance ?? 0)}</span>
                    {(wallet?.bonusRolloverRemaining ?? 0) > 0 && (
                      <span className="text-muted-foreground">(${Number(wallet?.bonusRolloverRemaining ?? 0).toFixed(2)} rollover)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Tabs — hidden for staff */}
      {!isRestrictedRole && (
        <Card>
          <CardHeader className="pb-2">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setActiveTab("mobile")}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === "mobile" ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"}`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" /> Deposit
              </button>
              <button
                onClick={() => setActiveTab("voucher")}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === "voucher" ? "bg-amber-500 text-white" : "bg-accent/50 text-muted-foreground hover:bg-accent"}`}
              >
                <Ticket className="w-3.5 h-3.5 shrink-0" /> Voucher
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === "withdraw" ? "bg-destructive text-destructive-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"}`}
              >
                <Minus className="w-3.5 h-3.5 shrink-0" /> Withdraw
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* ── Mobile Money Deposit ── */}
            {activeTab === "mobile" && (
              <div className="space-y-4">
                {(!ppConfig?.enabled || !ppConfig.depositsEnabled) ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Smartphone className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground">{t("wallet.mm_not_available")}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Smartphone className="w-5 h-5 text-primary shrink-0" />
                      <p className="text-sm text-muted-foreground">{t("wallet.mm_desc")}</p>
                    </div>

                    {/* Currency selector */}
                    <div className="grid grid-cols-2 gap-3">
                      {["USD", "CDF"].map((cur) => (
                        <button
                          key={cur}
                          onClick={() => { setDepositCurrency(cur); setDepositAmount(""); }}
                          className={`py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
                            depositCurrency === cur
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {cur === "CDF" ? "CDF" : "USD ($)"}
                        </button>
                      ))}
                    </div>

                    {/* Exchange rate for CDF */}
                    {depositCurrency === "CDF" && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/40 border border-border text-xs text-muted-foreground">
                        <span>{t("wallet.mm_rate")} <strong className="text-foreground">1 USD = {usdToCdf.toLocaleString(undefined, { maximumFractionDigits: 0 })} CDF</strong></span>
                        {exchangeRate?.isFallback && <span className="text-amber-400">({t("wallet.mm_estimated")})</span>}
                        <span className="ml-auto">Max: <strong className="text-foreground">{depositMax.toLocaleString()} CDF</strong></span>
                      </div>
                    )}

                    {/* Quick amounts */}
                    <div className="flex gap-2 flex-wrap">
                      {(depositCurrency === "CDF" ? CDF_QUICK_AMOUNTS : QUICK_AMOUNTS).map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setDepositAmount(String(amt))}
                          className="px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-primary/10 hover:border-primary/40 transition-colors"
                        >
                          {depositCurrency === "CDF" ? `${amt.toLocaleString()} CDF` : `$${amt}`}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t("wallet.mm_amount")} ({depositCurrency})</Label>
                      <Input
                        type="number" min={depositMin}
                        placeholder={`Min ${depositMin.toLocaleString()} — Max ${depositMax.toLocaleString()}`}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="text-lg font-semibold"
                      />
                    </div>

                    {/* Account selector for deposit */}
                    <AccountSelector
                      profile={profile ?? { phoneNumber: null, mobileOperator: null, secondaryPhoneNumber: null, secondaryMobileOperator: null }}
                      selected={depositAccountType}
                      onChange={(v) => setDepositAccountType(v)}
                    />

                    <Button
                      className="w-full"
                      disabled={!depositAmount || !depositAccountReady || depositMutation.isPending}
                      onClick={() => depositMutation.mutate()}
                    >
                      {depositMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("wallet.mm_initiating")}</>
                      ) : (
                        <><Smartphone className="w-4 h-4 mr-2" /> {t("wallet.mm_deposit_btn")}</>
                      )}
                    </Button>

                    {depositAccountReady && (
                      <p className="text-xs text-muted-foreground text-center">
                        Payment push will be sent to{" "}
                        <strong className="text-foreground font-mono">{selectedDepositAccount.phone}</strong>{" "}
                        via <strong className="text-foreground">{operatorLabel(selectedDepositAccount.operator ?? null)}</strong>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Voucher ── */}
            {activeTab === "voucher" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <Ticket className="w-8 h-8 text-amber-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold mb-1">{t("wallet.redeem_title")}</p>
                  <p className="text-sm text-muted-foreground">{t("wallet.redeem_desc")}</p>
                </div>
                <div className="flex gap-3 w-full max-w-sm">
                  <Input
                    placeholder={t("wallet.voucher_placeholder")}
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleRedeemVoucher()}
                    className="font-mono tracking-widest text-center uppercase"
                    maxLength={20}
                  />
                  <Button
                    onClick={handleRedeemVoucher}
                    disabled={isRedeeming || !voucherCode.trim()}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-6"
                  >
                    {isRedeeming ? t("wallet.redeeming") : t("wallet.redeem")}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Withdraw ── */}
            {activeTab === "withdraw" && (
              <div className="space-y-4">
                {/* Currency selector */}
                <div className="grid grid-cols-2 gap-3">
                  {["USD", "CDF"].map((cur) => (
                    <button
                      key={cur}
                      onClick={() => { setWithdrawCurrency(cur); }}
                      className={`py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
                        withdrawCurrency === cur
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border text-muted-foreground hover:border-destructive/40"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>

                {/* Account selector for withdrawal */}
                <AccountSelector
                  profile={profile ?? { phoneNumber: null, mobileOperator: null, secondaryPhoneNumber: null, secondaryMobileOperator: null }}
                  selected={withdrawAccountType}
                  onChange={(v) => setWithdrawAccountType(v)}
                />

                {/* Quick amounts */}
                <div className="flex gap-2 flex-wrap">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setWithdrawAmount(String(amt))}
                      className="px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                    >
                      {withdrawCurrency === "CDF" ? `${amt.toLocaleString()} CDF` : `$${amt}`}
                    </button>
                  ))}
                </div>

                <Input
                  type="number" min="1"
                  placeholder={t("wallet.withdrawal_amount")}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="text-lg font-semibold"
                />

                <Button
                  variant="destructive"
                  onClick={() => withdrawMutation.mutate()}
                  disabled={withdrawMutation.isPending || !withdrawAmount || !withdrawAccountReady}
                  className="w-full"
                >
                  {withdrawMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("wallet.mm_submitting")}</>
                    : t("wallet.request_withdrawal")}
                </Button>

                {withdrawAccountReady && (
                  <p className="text-xs text-muted-foreground">
                    Payout will be sent to{" "}
                    <strong className="text-foreground font-mono">{selectedWithdrawAccount.phone}</strong>{" "}
                    via <strong className="text-foreground">{operatorLabel(selectedWithdrawAccount.operator ?? null)}</strong>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{t("wallet.withdrawal_desc")}</p>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Withdrawal History */}
      {!isRestrictedRole && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight">{t("wallet.my_withdrawals")}</h2>
          </div>
          {isWithdrawalsLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 bg-accent/50 rounded-lg animate-pulse" />)}</div>
          ) : withdrawals.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground">{t("wallet.no_withdrawals")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="font-bold text-sm">{formatCurrency(w.amount)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium">{w.currency ?? "USD"}</span>
                      <StatusBadge status={w.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{w.phoneNumber ?? w.bankDetails}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(w.createdAt), "PP p")}</p>
                    {w.pawapayStatus && (
                      <p className="text-[10px] text-muted-foreground">PawaPay: <span className="font-mono font-semibold">{w.pawapayStatus}</span></p>
                    )}
                    {w.status === "rejected" && w.adminNote && (
                      <p className="text-[10px] text-destructive mt-0.5">Reason: {w.adminNote}</p>
                    )}
                    {w.status === "rejected" && <p className="text-[10px] text-primary font-medium">{t("wallet.refunded")}</p>}
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-2 ${
                    w.status === "completed" || w.status === "paid" ? "bg-primary/20 text-primary" :
                    w.status === "approved" ? "bg-blue-500/20 text-blue-500" :
                    w.status === "rejected" || w.status === "failed" ? "bg-destructive/20 text-destructive" :
                    w.status === "processing" ? "bg-violet-500/20 text-violet-500" :
                    "bg-amber-500/20 text-amber-500"
                  }`}>
                    {(w.status === "completed" || w.status === "paid") ? <Banknote className="w-4 h-4" /> :
                     w.status === "approved" ? <CheckCircle2 className="w-4 h-4" /> :
                     (w.status === "rejected" || w.status === "failed") ? <XCircle className="w-4 h-4" /> :
                     w.status === "processing" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                     <Clock className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction History */}
      {!isRestrictedRole && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HistoryIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight">{t("wallet.transaction_history")}</h2>
          </div>
          {isTransactionsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-accent/50 rounded-lg animate-pulse" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground">{t("wallet.no_tx_get_started")}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((tx) => {
                const isCredit = ["credit", "bet_won", "bet_refund", "voucher_redeem"].includes(tx.type);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCredit ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
                        {isCredit ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{tx.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(tx.createdAt), "PP p")} · <span className="uppercase opacity-70">{tx.type.replace(/_/g, " ")}</span>
                        </p>
                      </div>
                    </div>
                    <div className={`text-sm font-bold shrink-0 ml-2 ${isCredit ? "text-primary" : "text-destructive"}`}>
                      {isCredit ? "+" : "−"}{formatCurrency(Math.abs(Number(tx.amount)))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
