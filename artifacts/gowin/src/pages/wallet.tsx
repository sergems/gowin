import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetMyWallet, useGetMyTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, History as HistoryIcon,
  Minus, Ticket, Clock, CheckCircle2, XCircle, Banknote, Phone, AlertTriangle,
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

const QUICK_AMOUNTS = [50, 100, 250, 500];

interface Withdrawal {
  id: number;
  amount: number;
  bankDetails: string;
  status: "pending" | "approved" | "rejected" | "paid";
  adminNote: string | null;
  createdAt: string;
}

function StatusBadge({ status, t }: { status: Withdrawal["status"]; t: (k: string) => string }) {
  const cfg = {
    pending:  { key: "wallet.status_pending",  cls: "bg-amber-500/15 text-amber-500 border-amber-500/30",       Icon: Clock },
    approved: { key: "wallet.status_approved", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30",          Icon: CheckCircle2 },
    rejected: { key: "wallet.status_rejected", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
    paid:     { key: "wallet.status_paid",     cls: "bg-primary/15 text-primary border-primary/30",             Icon: Banknote },
  }[status];
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {t(cfg.key)}
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

  const isRestrictedRole = ["agent", "branch_admin", "payout"].includes(user?.role ?? "");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState<"voucher" | "withdraw">("voucher");
  const [voucherCode, setVoucherCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

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

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;
    setIsWithdrawing(true);
    try {
      await postWalletAction("/api/wallet/withdrawal-request", token, { amount });
      toast({ title: t("wallet.withdrawal_requested"), description: `${formatCurrency(amount)} ${t("wallet.submitted_for_review")}.` });
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/withdrawals"] });
    } catch (e: any) {
      toast({ title: t("wallet.request_failed"), description: e.message, variant: "destructive" });
    } finally {
      setIsWithdrawing(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{t("wallet.title")}</h1>
        <p className="text-muted-foreground">
          {isRestrictedRole ? t("wallet.desc_restricted") : t("wallet.desc")}
        </p>
      </div>

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

      {/* Action Tabs — hidden for agents and branch admins */}
      {!isRestrictedRole && (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-2">
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
          {activeTab === "voucher" ? (
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
          ) : (
            <div className="space-y-4">
              {/* Payment destination */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-accent/30">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{t("wallet.payment_to")}</p>
                  <p className="font-semibold">
                    {(user as any)?.phoneNumber ?? (
                      <span className="text-amber-500 text-sm flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> {t("wallet.phone_missing")}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setWithdrawAmount(String(amt))}
                    className="px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Input
                  type="number" min="1"
                  placeholder={t("wallet.withdrawal_amount")}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="text-lg font-semibold"
                  disabled={!(user as any)?.phoneNumber}
                />
              </div>
              <Button
                variant="destructive"
                onClick={handleWithdrawRequest}
                disabled={isWithdrawing || !withdrawAmount || !(user as any)?.phoneNumber}
                className="w-full"
              >
                {isWithdrawing ? t("wallet.submitting") : t("wallet.request_withdrawal")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("wallet.withdrawal_desc")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Withdrawal History — hidden for agents and branch admins */}
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{formatCurrency(w.amount)}</span>
                      <StatusBadge status={w.status} t={t} />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{w.bankDetails}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(w.createdAt), "PPP p")}</p>
                    {w.status === "rejected" && w.adminNote && (
                      <p className="text-xs text-destructive mt-1">{t("wallet.withdrawal_reason")}: {w.adminNote}</p>
                    )}
                    {w.status === "rejected" && (
                      <p className="text-xs text-primary mt-1 font-medium">{t("wallet.refunded")}</p>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    w.status === "paid" ? "bg-primary/20 text-primary" :
                    w.status === "approved" ? "bg-blue-500/20 text-blue-500" :
                    w.status === "rejected" ? "bg-destructive/20 text-destructive" :
                    "bg-amber-500/20 text-amber-500"
                  }`}>
                    {w.status === "paid" ? <Banknote className="w-5 h-5" /> :
                     w.status === "approved" ? <CheckCircle2 className="w-5 h-5" /> :
                     w.status === "rejected" ? <XCircle className="w-5 h-5" /> :
                     <Clock className="w-5 h-5" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction History — hidden for staff */}
      {!isRestrictedRole && <div className="mt-4">
        <div className="flex items-center gap-2 mb-6">
          <HistoryIcon className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">{t("wallet.transaction_history")}</h2>
        </div>
        {isTransactionsLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-accent/50 rounded-lg animate-pulse" />)}</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">
              {isRestrictedRole ? t("wallet.no_transactions") : t("wallet.no_tx_get_started")}
            </p>
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
      </div>}
    </div>
  );
}
