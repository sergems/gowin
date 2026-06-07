import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMyWallet, useGetMyTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, History as HistoryIcon, Plus, Minus, Ticket } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

async function postWalletAction(path: string, token: string | null, amount: number) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const QUICK_AMOUNTS = [50, 100, 250, 500];

export default function Wallet() {
  const { data: wallet, isLoading: isWalletLoading } = useGetMyWallet();
  const { data: transactionsData, isLoading: isTransactionsLoading } = useGetMyTransactions();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "voucher">("deposit");
  const [voucherCode, setVoucherCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const transactions = transactionsData?.transactions || [];

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    setIsDepositing(true);
    try {
      await postWalletAction("/api/wallet/deposit", token, amount);
      toast({ title: "Deposit successful", description: `$${amount.toFixed(2)} added to your wallet.` });
      setDepositAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    } catch (e: any) {
      toast({ title: "Deposit failed", description: e.message, variant: "destructive" });
    } finally {
      setIsDepositing(false);
    }
  };

  const handleRedeemVoucher = async () => {
    if (!voucherCode.trim()) return;
    setIsRedeeming(true);
    try {
      const res = await fetch("/api/wallet/redeem-voucher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: voucherCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redemption failed");
      toast({ title: "Voucher redeemed!", description: `$${data.amount.toFixed(2)} added to your wallet.` });
      setVoucherCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    } catch (e: any) {
      toast({ title: "Redemption failed", description: e.message, variant: "destructive" });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;
    setIsWithdrawing(true);
    try {
      await postWalletAction("/api/wallet/withdraw", token, amount);
      toast({ title: "Withdrawal successful", description: `$${amount.toFixed(2)} withdrawn from your wallet.` });
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    } catch (e: any) {
      toast({ title: "Withdrawal failed", description: e.message, variant: "destructive" });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Wallet</h1>
        <p className="text-muted-foreground">Manage your funds and view transaction history</p>
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
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Available Balance</p>
                <h2 className="text-5xl font-black tracking-tight">${wallet?.balance?.toFixed(2) ?? "0.00"}</h2>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("deposit")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "deposit"
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              <Plus className="w-4 h-4" /> Deposit
            </button>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "withdraw"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              <Minus className="w-4 h-4" /> Withdraw
            </button>
            <button
              onClick={() => setActiveTab("voucher")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "voucher"
                  ? "bg-amber-500 text-white"
                  : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              <Ticket className="w-4 h-4" /> Voucher
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeTab === "voucher" ? (
            <>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <Ticket className="w-8 h-8 text-amber-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold mb-1">Redeem a Voucher</p>
                  <p className="text-sm text-muted-foreground">Enter your 12-character voucher code to credit your wallet instantly</p>
                </div>
                <div className="flex gap-3 w-full max-w-sm">
                  <Input
                    placeholder="XXXX-XXXX-XXXX"
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
                    {isRedeeming ? "..." : "Redeem"}
                  </Button>
                </div>
              </div>
            </>
          ) : activeTab === "deposit" ? (
            <>
              <div className="flex gap-2 flex-wrap">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDepositAmount(String(amt))}
                    className="px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  >
                    +${amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  placeholder="Enter amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="text-lg font-semibold"
                />
                <Button onClick={handleDeposit} disabled={isDepositing || !depositAmount} className="px-8">
                  {isDepositing ? "Processing..." : "Deposit"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Simulated deposit. Max $10,000 per transaction.</p>
            </>
          ) : (
            <>
              <div className="flex gap-3">
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="text-lg font-semibold"
                />
                <Button
                  variant="destructive"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount}
                  className="px-8"
                >
                  {isWithdrawing ? "Processing..." : "Withdraw"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Simulated withdrawal. Must not exceed your balance.</p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <div className="flex items-center gap-2 mb-6">
          <HistoryIcon className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Transaction History</h2>
        </div>

        {isTransactionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-accent/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No transactions yet. Make your first deposit!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isCredit = ["credit", "bet_won", "bet_refund"].includes(tx.type);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCredit ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                      }`}
                    >
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
                    {isCredit ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
