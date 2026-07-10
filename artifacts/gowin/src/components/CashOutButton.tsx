import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Wallet, Loader2, TrendingDown, AlertTriangle } from "lucide-react";

export interface CashOutOffer {
  eligible: boolean;
  reason?: string;
  offerAmount: number;
  potentialWin: number;
  stake: number;
  marginUsed: number;
}

async function fetchOffer(betId: number, token: string | null): Promise<CashOutOffer> {
  const res = await fetch(`/api/bets/${betId}/cash-out`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error("Failed to load Cash Out offer");
  return res.json();
}

async function acceptOffer(betId: number, expectedAmount: number, token: string | null) {
  const res = await fetch(`/api/bets/${betId}/cash-out`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
    },
    body: JSON.stringify({ expectedAmount }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.error || "Failed to cash out");
    err.offer = data.offer;
    throw err;
  }
  return data;
}

export function CashOutButton({ betId, stake, potentialWin }: { betId: number; stake: number; potentialWin: number }) {
  const { token } = useAuth();
  const { formatCurrency, t } = useSiteSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: offer, isLoading, refetch } = useQuery<CashOutOffer>({
    queryKey: ["cash-out-offer", betId],
    queryFn: () => fetchOffer(betId, token),
    enabled: !!token,
    refetchInterval: 10_000,
    retry: false,
  });

  async function handleConfirm() {
    if (!offer?.eligible) return;
    setSubmitting(true);
    try {
      const result = await acceptOffer(betId, offer.offerAmount, token);
      toast({
        title: t("bets.cash_out_success"),
        description: `${formatCurrency(result.offer.offerAmount)} ${t("bets.cash_out_amount_received")}`,
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["myBets"] });
      queryClient.invalidateQueries({ queryKey: ["cash-out-offer", betId] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    } catch (err: any) {
      if (err.offer) {
        toast({ title: t("bets.cash_out_offer_changed"), description: err.message, variant: "destructive" });
        refetch();
      } else {
        toast({ title: t("bets.cash_out_error"), description: err.message, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("bets.cash_out_loading")}
      </span>
    );
  }

  if (!offer?.eligible) return null;

  return (
    <>
      <Button
        size="sm"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="bg-amber-500 hover:bg-amber-600 text-black font-bold shrink-0"
      >
        <Wallet className="w-3.5 h-3.5 mr-1.5" />
        {t("bets.cash_out")} · {formatCurrency(offer.offerAmount)}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("bets.cash_out_confirm_title")}</DialogTitle>
            <DialogDescription>{t("bets.cash_out_confirm_desc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("bets.cash_out_stake")}</span>
              <span className="font-semibold">{formatCurrency(stake)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("bets.cash_out_potential_win")}</span>
              <span className="font-semibold">{formatCurrency(potentialWin)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> {t("bets.cash_out_sacrificed")}</span>
              <span className="font-semibold text-destructive">{formatCurrency(Math.max(0, potentialWin - offer.offerAmount))}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-border">
              <span className="font-bold">{t("bets.cash_out_amount")}</span>
              <span className="font-black text-2xl text-amber-500">{formatCurrency(offer.offerAmount)}</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-accent/40 rounded-md p-2 mt-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{t("bets.cash_out_confirm_desc")}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {t("bets.cash_out_cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={submitting} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t("bets.cash_out_confirm_button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
