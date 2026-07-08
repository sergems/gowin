import { useState, useRef } from "react";
import { fmtUTCDateTimeShort } from "@/lib/formatUTC";
import { Link } from "wouter";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  PanelRightClose, Trophy, X, AlertTriangle, Upload,
  BookMarked, Copy, Check, Sparkles, ChevronRight,
} from "lucide-react";

interface BetSlipBodyProps {
  onClose?: () => void;
  onToggle?: () => void;
}

interface FixtureLiveData {
  status: string;
  scoreHome: number | null;
  scoreAway: number | null;
}

export function BetSlipBody({ onClose, onToggle }: BetSlipBodyProps) {
  const { t, formatCurrency, currency, parseAmount } = useSiteSettings();
  const isForeignCurrency = currency !== "USD";
  const {
    selections, removeSelection, stake, setStake,
    totalOdds, potentialWin, isMaxWinCapped,
    winBonusConfig, qualifyingSelections, bonusPercentage,
    baseWin, bonusAmount, isWinBonusActive,
    placeBet, isPlacing, bookBet, isBooking, loadBooking,
  } = useBetSlip();
  const { user } = useAuth();

  const [stakeInput, setStakeInput] = useState("");
  const [bookingCode, setBookingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showLoadInput, setShowLoadInput] = useState(false);
  const [loadCodeInput, setLoadCodeInput] = useState("");
  const [loadCodeError, setLoadCodeError] = useState("");
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [liveData, setLiveData] = useState<Map<number, FixtureLiveData>>(new Map());

  const prevLen = useRef(selections.length);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep stake input in sync when selections are cleared
  if (prevLen.current > 0 && selections.length === 0 && stakeInput !== "") {
    setStakeInput("");
  }
  prevLen.current = selections.length;

  // Poll fixture status every 15s for live scores
  const fixtureIdsKey = [...new Set(selections.map((s) => s.fixtureId))].sort().join(",");

  // Derived Win Bonus UI values
  const config = winBonusConfig;
  const maxSel = config?.maxSelections ?? 50;
  const minQual = config?.minQualifyingSelections ?? 10;
  const isAccumulator = selections.length >= 2;
  const selectionCount = selections.length;
  const nextBonusTier = config?.bonusTable
    ?.slice()
    .sort((a, b) => a.selections - b.selections)
    .find((t) => t.selections > qualifyingSelections);

  const progressPct = Math.min((qualifyingSelections / maxSel) * 100, 100);

  const hasStartedSelections = [...liveData.values()].some(
    (d) => d.status === "finished" || d.status === "cancelled",
  ) && selections.some((s) => {
    const d = liveData.get(s.fixtureId);
    return d && (d.status === "finished" || d.status === "cancelled");
  });

  async function handleBookBet() {
    const code = await bookBet();
    if (code) setBookingCode(code);
  }

  async function handleLoadCode() {
    if (!loadCodeInput.trim()) return;
    setLoadCodeError("");
    setIsLoadingCode(true);
    try {
      await loadBooking(loadCodeInput.trim());
      setLoadCodeInput("");
      setShowLoadInput(false);
    } catch (err: any) {
      setLoadCodeError(err.message || "Code not found");
    } finally {
      setIsLoadingCode(false);
    }
  }

  function copyBookingCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-accent/30">
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent mr-2"
            title="Collapse bet slip"
          >
            <PanelRightClose className="w-5 h-5" />
          </button>
        )}
        <span className="font-bold">{t("betslip.title")}</span>
        <span className="ml-2 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
          {selections.length}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setShowLoadInput((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
            title={t("betslip.load_booked")}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t("betslip.load")}</span>
          </button>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Load Bet panel */}
      {showLoadInput && (
        <div className="px-4 pt-3 pb-2 border-b border-border bg-accent/10">
          <p className="text-xs font-medium mb-2">{t("betslip.load_panel_title")}</p>
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs font-mono uppercase"
              placeholder={t("betslip.enter_booking_code")}
              value={loadCodeInput}
              onChange={(e) => { setLoadCodeInput(e.target.value.toUpperCase()); setLoadCodeError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLoadCode()}
            />
            <Button
              size="sm"
              className="h-8 px-3 shrink-0"
              onClick={handleLoadCode}
              disabled={isLoadingCode || !loadCodeInput.trim()}
            >
              {isLoadingCode ? "..." : t("betslip.load")}
            </Button>
          </div>
          {loadCodeError && <p className="text-xs text-destructive mt-1">{loadCodeError}</p>}
        </div>
      )}

      {/* Win Bonus promo banner (show when promotion is enabled and no selections yet, or before threshold) */}
      {config?.enabled && selections.length === 0 && (
        <div className="mx-3 mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs font-bold text-primary">{config.title}</p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Build an accumulator with 10+ qualifying selections (odds &gt; {config.minQualifyingOdds}) to unlock up to {Math.max(...config.bonusTable.map((t) => t.bonusPercent))}% extra winnings.
          </p>
        </div>
      )}

      {/* Selections */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-4
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-yellow-400/70
          [&::-webkit-scrollbar-thumb:hover]:bg-yellow-400"
      >
        {user && !(user as any).phoneNumber && (
          <Link href="/profile" onClick={onClose}>
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 mb-4 cursor-pointer hover:bg-amber-500/15 transition-colors">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-500">{t("betslip.phone_required")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("betslip.complete_profile")}</p>
              </div>
            </div>
          </Link>
        )}
        {selections.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 mt-8">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
              <Trophy className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm">{t("betslip.empty")}</p>
            <button
              onClick={() => setShowLoadInput(true)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Upload className="w-3 h-3" /> {t("betslip.load_booked")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {selections.map((sel) => {
              const live = liveData.get(sel.fixtureId);
              const isLive = live?.status === "live";
              const isFinished = live?.status === "finished" || live?.status === "cancelled";
              const hasScore = live != null && (live.scoreHome != null || live.scoreAway != null);
              const qualifies = config ? sel.odds > config.minQualifyingOdds : sel.odds > 1.4;

              return (
                <div
                  key={sel.oddsId}
                  className={`border rounded-lg p-3 relative group transition-colors ${
                    isLive
                      ? "bg-red-500/5 border-red-500/30"
                      : isFinished
                        ? "bg-accent/20 border-border opacity-70"
                        : "bg-accent/40 border-border"
                  }`}
                >
                  <button
                    onClick={() => removeSelection(sel.oddsId)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {(isLive || isFinished) && (
                    <div className="flex items-center gap-2 mb-1.5">
                      {isLive ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                          FT
                        </span>
                      )}
                      {hasScore && (
                        <span className="text-[11px] font-bold tabular-nums">
                          {live!.scoreHome ?? 0} – {live!.scoreAway ?? 0}
                        </span>
                      )}
                      {isFinished && (
                        <span className="text-[10px] text-amber-400 ml-auto pr-6">{t("betslip.may_be_rejected")}</span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mb-1 pr-6">{sel.fixtureName}</p>
                  <p className="font-semibold text-sm leading-tight">{sel.selection}</p>
                  {(sel.competitionName || sel.startTime) && (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5 mb-1 leading-tight">
                      {[
                        sel.competitionName,
                        sel.startTime ? fmtUTCDateTimeShort(sel.startTime) : null,
                      ]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-background/50 px-2 py-1 rounded text-muted-foreground">
                      {sel.marketName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {config?.enabled && isAccumulator && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            qualifies
                              ? "bg-primary/20 text-primary"
                              : "bg-muted/50 text-muted-foreground"
                          }`}
                          title={qualifies ? "Qualifies for Win Bonus" : "Odds too low for bonus"}
                        >
                          {qualifies ? t("betslip.qualifies") : t("betslip.no_bonus")}
                        </span>
                      )}
                      <span className="font-bold text-primary">{sel.odds.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {selections.length > 0 && (
        <div className="p-4 border-t border-border bg-accent/10 space-y-3 shrink-0">
          {hasStartedSelections && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300 leading-snug">
                {t("betslip.events_started")}
              </p>
            </div>
          )}

          {/* Win Bonus progress bar — only for accumulators when promotion is on */}
          {config?.enabled && isAccumulator && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">{t("betslip.win_bonus")}</span>
                </div>
                <span className="text-xs font-bold text-primary">
                  {bonusPercentage > 0 ? `${bonusPercentage}%` : t("betslip.locked")}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{t("betslip.qualifying")} {qualifyingSelections} / {maxSel}</span>
                  <span>{selectionCount} {t("betslip.selections_total")}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Status text */}
              {bonusPercentage === 0 ? (
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {qualifyingSelections < minQual
                    ? `Add ${minQual - qualifyingSelections} more qualifying selection${minQual - qualifyingSelections === 1 ? "" : "s"} (odds > ${config.minQualifyingOdds}) to unlock the Win Bonus.`
                    : "Add more qualifying selections to unlock the Win Bonus."}
                </p>
              ) : nextBonusTier ? (
                <p className="text-[10px] text-muted-foreground leading-snug flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                  Add {nextBonusTier.selections - qualifyingSelections} more qualifying selection{nextBonusTier.selections - qualifyingSelections === 1 ? "" : "s"} to reach{" "}
                  <span className="font-bold text-primary ml-0.5">{nextBonusTier.bonusPercent}% bonus</span>
                </p>
              ) : (
                <p className="text-[10px] text-primary font-semibold">{t("betslip.max_bonus")}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("betslip.total_odds")}</span>
              <span className="font-bold">{(selections.length > 0 ? totalOdds : 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-sm pt-2">
              <span className="text-muted-foreground">{t("betslip.stake")} ({currency})</span>
              <Input
                type="text"
                inputMode="decimal"
                className="w-24 h-8 text-right font-medium"
                value={stakeInput}
                placeholder="0.00"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                    setStakeInput(raw);
                    const parsed = parseFloat(raw);
                    setStake(!isNaN(parsed) ? parseAmount(parsed) : 0);
                  }
                }}
                onBlur={() => {
                  if (stakeInput && !isNaN(parseFloat(stakeInput))) {
                    setStakeInput(parseFloat(stakeInput).toFixed(2));
                  }
                }}
              />
            </div>
            {isForeignCurrency && stake > 0 && (
              <p className="text-[11px] text-muted-foreground text-right -mt-1">
                ≈ ${stake.toFixed(2)} USD
              </p>
            )}

            <Separator className="my-2" />

            {/* Win Bonus breakdown */}
            {isWinBonusActive && stake > 0 ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("betslip.base_win")}</span>
                  <span className="font-medium">{formatCurrency(baseWin)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-primary">
                    <Sparkles className="w-3 h-3" />
                    Bonus ({bonusPercentage}%)
                  </span>
                  <span className="font-medium text-primary">+ {formatCurrency(bonusAmount)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">{t("betslip.potential_win")}</span>
                  <span className="font-bold text-primary text-base">
                    {formatCurrency(potentialWin)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("betslip.potential_win")}</span>
                <span className="font-bold text-primary">
                  {formatCurrency(potentialWin)}
                </span>
              </div>
            )}

            {isMaxWinCapped && (
              <p className="text-[11px] text-amber-400 mt-1 text-right">
                {t("betslip.max_payout_applied").replace("{amount}", formatCurrency(config?.maxPayout ?? 1_000_000))}
              </p>
            )}
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-11"
            onClick={() => placeBet()}
            disabled={isPlacing || stake <= 0 || !user || hasStartedSelections}
          >
            {isPlacing ? t("betslip.placing") : !user ? t("betslip.login_to_bet") : t("betslip.place_bet")}
          </Button>
          <Button
            variant="outline"
            className="w-full h-9 text-sm"
            onClick={handleBookBet}
            disabled={isBooking}
          >
            <BookMarked className="w-4 h-4 mr-2" />
            {isBooking ? t("betslip.booking") : t("betslip.book_bet")}
          </Button>
        </div>
      )}

      {/* Booking code modal */}
      {bookingCode && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10 rounded-lg">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-xs text-center space-y-4">
            <BookMarked className="w-10 h-10 text-primary mx-auto" />
            <div>
              <p className="font-bold text-lg">{t("betslip.bet_booked")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("betslip.share_code")}
              </p>
            </div>
            <div className="bg-accent rounded-lg px-4 py-3 font-mono text-2xl font-bold tracking-widest select-all">
              {bookingCode}
            </div>
            <button
              onClick={() => copyBookingCode(bookingCode)}
              className="flex items-center gap-2 mx-auto text-sm text-primary hover:underline"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? t("betslip.copied") : t("betslip.copy_code")}
            </button>
            <p className="text-[11px] text-muted-foreground">{t("betslip.valid_days")}</p>
            <Button className="w-full" onClick={() => setBookingCode(null)}>{t("betslip.done")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
