import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Wallet } from "lucide-react";
import { Link } from "wouter";

type DepositStatus = "PENDING" | "ACCEPTED" | "COMPLETED" | "FAILED" | "DUPLICATE_IGNORED";

interface DepositState {
  depositId: string;
  status: DepositStatus;
  amount: number;
  currency: string;
  phoneNumber?: string;
  operator?: string;
}

export default function DepositStatusPage() {
  const [, params] = useRoute("/wallet/deposit/:depositId");
  const { token } = useAuth();
  const { formatCurrency, t } = useSiteSettings();
  const [, navigate] = useLocation();

  const depositId = params?.depositId;
  const [deposit, setDeposit] = useState<DepositState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const fetchStatus = async () => {
    if (!depositId || !token) return;
    try {
      const res = await fetch(`/api/pawapay/deposits/${depositId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Deposit not found");
        setPolling(false);
        return;
      }
      setDeposit(data);
      if (data.status === "COMPLETED" || data.status === "FAILED") {
        setPolling(false);
      }
    } catch {
      setError("Unable to check payment status");
      setPolling(false);
    }
    setPollCount((c) => c + 1);
  };

  useEffect(() => {
    fetchStatus();
  }, [depositId]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 4000);
    const timeout = setTimeout(() => {
      setPolling(false);
    }, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [polling, depositId]);

  const status = deposit?.status ?? "PENDING";
  const isComplete = status === "COMPLETED";
  const isFailed = status === "FAILED";
  const isPending = !isComplete && !isFailed;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{t("deposit.title")}</h1>
        <p className="text-muted-foreground">{t("deposit.desc")}</p>
      </div>

      <Card className={`border-2 ${isComplete ? "border-primary/40 bg-primary/5" : isFailed ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
        <CardContent className="p-8 flex flex-col items-center gap-5 text-center">
          {isPending && (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{t("deposit.waiting")}</h2>
                <p className="text-muted-foreground text-sm">
                  {t("deposit.waiting_desc")} {deposit?.operator?.replace(/_/g, " ") ?? t("deposit.provider")}.
                </p>
              </div>
            </>
          )}
          {isComplete && (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{t("deposit.success_title")}</h2>
                <p className="text-muted-foreground text-sm">
                  {t("deposit.success_desc")} {deposit ? formatCurrency(deposit.amount) : ""} {deposit?.currency}.
                </p>
              </div>
            </>
          )}
          {isFailed && (
            <>
              <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{t("deposit.failed_title")}</h2>
                <p className="text-muted-foreground text-sm">{t("deposit.failed_desc")}</p>
              </div>
            </>
          )}
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          {deposit && (
            <div className="w-full text-sm rounded-lg bg-background border border-border p-4 space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("deposit.amount")}</span>
                <span className="font-bold">{formatCurrency(deposit.amount)} {deposit.currency}</span>
              </div>
              {deposit.phoneNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("deposit.phone")}</span>
                  <span className="font-mono">{deposit.phoneNumber}</span>
                </div>
              )}
              {deposit.operator && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("deposit.operator")}</span>
                  <span>{deposit.operator.replace(/_/g, " ")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("deposit.status")}</span>
                <span className={`font-semibold ${isComplete ? "text-primary" : isFailed ? "text-destructive" : "text-amber-500"}`}>
                  {status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("deposit.ref")}</span>
                <span className="font-mono text-xs truncate max-w-[160px]">{depositId}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 w-full flex-col sm:flex-row">
            {isPending && (
              <Button variant="outline" className="flex-1" onClick={fetchStatus}>
                <RefreshCw className="w-4 h-4 mr-2" /> {t("deposit.refresh")}
              </Button>
            )}
            {(isComplete || isFailed) && (
              <Link href="/wallet" className="flex-1">
                <Button className="w-full">
                  <Wallet className="w-4 h-4 mr-2" /> {t("deposit.go_to_wallet")}
                </Button>
              </Link>
            )}
            {isFailed && (
              <Link href="/wallet" className="flex-1">
                <Button variant="outline" className="w-full">{t("deposit.try_again")}</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {isPending && (
        <p className="text-center text-xs text-muted-foreground">
          {t("deposit.auto_refresh_note")}
        </p>
      )}
    </div>
  );
}
