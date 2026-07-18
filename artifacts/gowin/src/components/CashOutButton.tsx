import { useState, useEffect, useRef, useCallback } from "react";
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
import { Wallet, Loader2, TrendingDown, AlertTriangle, TrendingUp, Ban } from "lucide-react";
import { subscribeCashOutUpdates, onCashOutUpdate } from "@/lib/cashOutUpdates";

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

type FlashDir = "up" | "down" | null;

export function CashOutButton({
  betId,
  stake,
  potentialWin,
}: {
  betId: number;
  stake: number;
  potentialWin: number;
}) {
  const { token } = useAuth();
  const { formatCurrency, t } = useSiteSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<FlashDir>(null);
  const prevAmountRef = useRef<number | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch offer — stale time is effectively infinity; we trigger refetches
  //    ourselves on every server-pushed CASH_OUT_UPDATE event ─────────────────
  const {
    data: offer,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<CashOutOffer>({
    queryKey: ["cash-out-offer", betId],
    queryFn: () => fetchOffer(betId, token),
    enabled: !!token,
    staleTime: 10_000,        // don't auto-refetch on mount if fresh
    refetchInterval: 10_000,  // fallback poll every 10 s in case WS is down
    retry: false,
  });

  // ── Detect amount change and flash ───────────────────────────────────────────
  useEffect(() => {
    if (!offer?.eligible || offer.offerAmount == null) return;
    const prev = prevAmountRef.current;
    if (prev !== null && prev !== offer.offerAmount) {
      const dir: FlashDir = offer.offerAmount > prev ? "up" : "down";
      setFlash(dir);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 1200);
    }
    prevAmountRef.current = offer.offerAmount;
  }, [offer?.offerAmount, offer?.eligible]);

  // ── Subscribe to server-pushed cash-out updates ──────────────────────────────
  const stableRefetch = useCallback(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const unsub = subscribeCashOutUpdates();
    const unlisten = onCashOutUpdate(stableRefetch);
    return () => {
      unlisten();
      unsub();
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [stableRefetch]);

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
        // Server returned a fresher offer — update local cache and show new amount
        queryClient.setQueryData<CashOutOffer>(["cash-out-offer", betId], err.offer);
        toast({
          title: t("bets.cash_out_offer_changed"),
          description: err.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("bets.cash_out_error"),
          description: err.message,
          variant: "destructive",
        });
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

  // ── Suspended / not-available state ──────────────────────────────────────────
  if (!offer?.eligible) {
    const label = offer?.reason === "Cash Out not available" ? "Cash Out not available" : "Cash Out Suspended";
    return (
      <span
        className="flex items-center gap-1.5 text-xs text-muted-foreground/60 select-none"
        title={offer?.reason ?? "Cash Out unavailable"}
      >
        <Ban className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  }

  // ── Flash colour for the button/amount ──────────────────────────────────────
  const flashClass =
    flash === "up"
      ? "ring-2 ring-emerald-400 shadow-[0_0_8px_0px_rgba(52,211,153,0.6)]"
      : flash === "down"
      ? "ring-2 ring-red-400 shadow-[0_0_8px_0px_rgba(239,68,68,0.6)]"
      : "";

  // Colour for the amount inside the button (amber background → needs dark text)
  const buttonAmountColour =
    flash === "up"
      ? "text-emerald-900"
      : flash === "down"
      ? "text-red-900"
      : "text-black";

  // Colour for the amount inside the dialog (dark background → keep vivid colours)
  const dialogAmountColour =
    flash === "up"
      ? "text-emerald-400"
      : flash === "down"
      ? "text-red-400"
      : "text-emerald-500";

  return (
    <>
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        disabled={isFetching && !offer}
        className={`bg-primary hover:bg-primary/90 text-black border border-black font-bold shrink-0 transition-all duration-300 ${flashClass}`}
      >
        {isFetching ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : flash === "up" ? (
          <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
        ) : flash === "down" ? (
          <TrendingDown className="w-3.5 h-3.5 mr-1.5" />
        ) : (
          <Wallet className="w-3.5 h-3.5 mr-1.5" />
        )}
        {t("bets.cash_out")} ·{" "}
        <span className={`transition-colors duration-300 ${buttonAmountColour}`}>
          {formatCurrency(offer.offerAmount)}
        </span>
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
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> {t("bets.cash_out_sacrificed")}
              </span>
              <span className="font-semibold text-destructive">
                {formatCurrency(Math.max(0, potentialWin - offer.offerAmount))}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-border">
              <span className="font-bold">{t("bets.cash_out_amount")}</span>
              <span
                className={`font-black text-2xl transition-colors duration-300 ${dialogAmountColour}`}
              >
                {formatCurrency(offer.offerAmount)}
              </span>
            </div>
            {isFetching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Recalculating offer…</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-accent/40 rounded-md p-2 mt-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{t("bets.cash_out_confirm_desc")}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {t("bets.cash_out_cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting || isFetching}
              className="bg-primary hover:bg-primary/90 text-black border border-black font-bold"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t("bets.cash_out_confirm_button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
