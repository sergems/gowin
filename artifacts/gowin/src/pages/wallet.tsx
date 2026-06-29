import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetMyWallet, useGetMyTransactions } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, History as HistoryIcon,
  Minus, Ticket, Clock, CheckCircle2, XCircle, Banknote, Phone, AlertTriangle,
  Smartphone, Loader2, ChevronDown,
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

const DRC_OPERATORS = [
  { code: "ORANGE_CD",   name: "Orange Money",     currencies: ["CDF", "USD"] },
  { code: "AIRTEL_CD",   name: "Airtel Money",      currencies: ["CDF"] },
  { code: "VODACOM_CD",  name: "M-Pesa (Vodacom)", currencies: ["CDF", "USD"] },
  { code: "AFRICELL_CD", name: "Africell Money",   currencies: ["CDF"] },
];

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

export default function Wallet() {
  const { data: wallet, isLoading: isWalletLoading } = useGetMyWallet();
  const { data: transactionsData, isLoading: isTransactionsLoading } = useGetMyTransactions();
  const { token, user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency, t } = useSiteSettings();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const isRestrictedRole = ["agent", "branch_admin", "payout", "payment_clerk"].includes(user?.role ?? "");

  // Active tab: "mobile" | "voucher" | "withdraw"
  const [activeTab, setActiveTab] = useState<"mobile" | "voucher" | "withdraw">("mobile");

  // Voucher state
  const [voucherCode, setVoucherCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCurrency, setWithdrawCurrency] = useState("USD");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawOperator, setWithdrawOperator] = useState("");

  // Mobile Money deposit state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositCurrency, setDepositCurrency] = useState("USD");
  const [depositPhone, setDepositPhone] = useState((user as any)?.phoneNumber ?? "");
  const [depositOperator, setDepositOperator] = useState("");

  const transactions = transactionsData?.transactions || [];

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

  const depositMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/pawapay/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          currency: depositCurrency,
          phoneNumber: depositPhone.trim(),
          operator: depositOperator,
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
          phoneNumber: withdrawPhone.trim() || (user as any)?.phoneNumber,
          operator: withdrawOperator || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdrawal request failed");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Withdrawal requested", description: "Your request has been submitted for review." });
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

  const filteredOperators = DRC_OPERATORS.filter((op) => op.currencies.includes(depositCurrency));
  const withdrawOperators = DRC_OPERATORS.filter((op) => op.currencies.includes(withdrawCurrency));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{t("wallet.title")}</h1>
        <p className="text-muted-foreground">
          {isRestrictedRole ? t("wallet.desc_restricted") : t("wallet.desc")}
        </p>
      </div>

      {/* Balance card */}
      {isWalletLoading ? (
        <div className="h-32 bg-accent/50 rounded-xl animate-pulse" />
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <WalletIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {isRestrictedRole ? t("wallet.balance_allocated") : t("wallet.balance")}
                </p>
                <h2 className="text-5xl font-black tracking-tight">{formatCurrency(parseFloat(wallet?.balance ?? "0"))}</h2>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Tabs — hidden for staff */}
      {!isRestrictedRole && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab("mobile")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "mobile" ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"}`}
              >
                <Smartphone className="w-4 h-4" /> Mobile Money
              </button>
              <button
                onClick={() => setActiveTab("voucher")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "voucher" ? "bg-amber-500 text-white" : "bg-accent/50 text-muted-foreground hover:bg-accent"}`}
              >
                <Ticket className="w-4 h-4" /> {t("wallet.deposit_voucher")}
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "withdraw" ? "bg-destructive text-destructive-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"}`}
              >
                <Minus className="w-4 h-4" /> {t("wallet.withdraw")}
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
                    <p className="text-muted-foreground">Mobile money deposits are not currently available.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Smartphone className="w-5 h-5 text-primary shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Deposit directly to your wallet via mobile money. Funds appear instantly after confirmation.
                      </p>
                    </div>

                    {/* Currency selector */}
                    <div className="grid grid-cols-2 gap-3">
                      {["USD", "CDF"].map((cur) => (
                        <button
                          key={cur}
                          onClick={() => { setDepositCurrency(cur); setDepositOperator(""); }}
                          className={`py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
                            depositCurrency === cur
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {cur}
                        </button>
                      ))}
                    </div>

                    {/* Quick amounts */}
                    <div className="flex gap-2 flex-wrap">
                      {QUICK_AMOUNTS.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setDepositAmount(String(amt))}
                          className="px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-primary/10 hover:border-primary/40 transition-colors"
                        >
                          {depositCurrency === "CDF" ? `${amt.toLocaleString()} FC` : `$${amt}`}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Amount ({depositCurrency})</Label>
                      <Input
                        type="number" min="1"
                        placeholder={`Min ${ppConfig.minDeposit} — Max ${ppConfig.maxDeposit}`}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="text-lg font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone Number</Label>
                      <Input
                        type="tel"
                        placeholder="e.g. 243812345678"
                        value={depositPhone}
                        onChange={(e) => setDepositPhone(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Enter your full number with country code (243…)</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Mobile Money Operator</Label>
                      <select
                        value={depositOperator}
                        onChange={(e) => setDepositOperator(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Select operator…</option>
                        {filteredOperators.map((op) => (
                          <option key={op.code} value={op.code}>{op.name}</option>
                        ))}
                      </select>
                    </div>

                    <Button
                      className="w-full"
                      disabled={!depositAmount || !depositPhone || !depositOperator || depositMutation.isPending}
                      onClick={() => depositMutation.mutate()}
                    >
                      {depositMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initiating…</>
                      ) : (
                        <><Smartphone className="w-4 h-4 mr-2" /> Deposit via Mobile Money</>
                      )}
                    </Button>
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
                      onClick={() => { setWithdrawCurrency(cur); setWithdrawOperator(""); }}
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

                {/* Phone */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-accent/30">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Payment to</p>
                    <p className="font-semibold text-sm">
                      {(user as any)?.phoneNumber ?? (
                        <span className="text-amber-500 text-sm flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> No phone on profile
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Override phone */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Override phone (optional)</Label>
                  <Input
                    type="tel"
                    placeholder={(user as any)?.phoneNumber ?? "243812345678"}
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                  />
                </div>

                {/* Operator */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Mobile Money Operator</Label>
                  <select
                    value={withdrawOperator}
                    onChange={(e) => setWithdrawOperator(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select operator…</option>
                    {withdrawOperators.map((op) => (
                      <option key={op.code} value={op.code}>{op.name}</option>
                    ))}
                  </select>
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2 flex-wrap">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setWithdrawAmount(String(amt))}
                      className="px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                    >
                      {withdrawCurrency === "CDF" ? `${amt.toLocaleString()} FC` : `$${amt}`}
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
                  disabled={withdrawMutation.isPending || !withdrawAmount || (!(user as any)?.phoneNumber && !withdrawPhone.trim())}
                  className="w-full"
                >
                  {withdrawMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : t("wallet.request_withdrawal")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("wallet.withdrawal_desc")}</p>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Withdrawal History */}
      {!isRestrictedRole && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Banknote className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">{t("wallet.my_withdrawals")}</h2>
          </div>
          {isWithdrawalsLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 bg-accent/50 rounded-lg animate-pulse" />)}</div>
          ) : withdrawals.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">{t("wallet.no_withdrawals")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-lg">{formatCurrency(w.amount)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium">{w.currency ?? "USD"}</span>
                      <StatusBadge status={w.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{w.phoneNumber ?? w.bankDetails}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(w.createdAt), "PPP p")}</p>
                    {w.pawapayStatus && (
                      <p className="text-xs text-muted-foreground">PawaPay: <span className="font-mono font-semibold">{w.pawapayStatus}</span></p>
                    )}
                    {w.status === "rejected" && w.adminNote && (
                      <p className="text-xs text-destructive mt-1">Reason: {w.adminNote}</p>
                    )}
                    {w.status === "rejected" && <p className="text-xs text-primary mt-1 font-medium">{t("wallet.refunded")}</p>}
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    w.status === "completed" || w.status === "paid" ? "bg-primary/20 text-primary" :
                    w.status === "approved" ? "bg-blue-500/20 text-blue-500" :
                    w.status === "rejected" || w.status === "failed" ? "bg-destructive/20 text-destructive" :
                    w.status === "processing" ? "bg-violet-500/20 text-violet-500" :
                    "bg-amber-500/20 text-amber-500"
                  }`}>
                    {(w.status === "completed" || w.status === "paid") ? <Banknote className="w-5 h-5" /> :
                     w.status === "approved" ? <CheckCircle2 className="w-5 h-5" /> :
                     (w.status === "rejected" || w.status === "failed") ? <XCircle className="w-5 h-5" /> :
                     w.status === "processing" ? <Loader2 className="w-5 h-5 animate-spin" /> :
                     <Clock className="w-5 h-5" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction History */}
      {!isRestrictedRole && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-6">
            <HistoryIcon className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">{t("wallet.transaction_history")}</h2>
          </div>
          {isTransactionsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-accent/50 rounded-lg animate-pulse" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">{t("wallet.no_tx_get_started")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isCredit = ["credit", "bet_won", "bet_refund", "voucher_redeem"].includes(tx.type);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
                        {isCredit ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(tx.createdAt), "PPP p")} •{" "}
                          <span className="uppercase tracking-wider opacity-70">{tx.type.replace(/_/g, " ")}</span>
                        </p>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${isCredit ? "text-primary" : ""}`}>
                      {isCredit ? "+" : "-"}{formatCurrency(Number(tx.amount))}
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
