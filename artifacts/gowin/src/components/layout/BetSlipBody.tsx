import { useState, useEffect, useRef } from "react";
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
  BookMarked, Copy, Check,
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
  useEffect(() => {
    if (prevLen.current > 0 && selections.length === 0) {
      setStakeInput("");
    }
    prevLen.current = selections.length;
  }, [selections.length]);

  // Poll fixture status every 15s to keep live scores and statuses current
  const fixtureIdsKey = [...new Set(selections.map((s) => s.fixtureId))].sort().join(",");
  useEffect(() => {
    if (!fixtureIdsKey) return;

    async function fetchLiveData() {
      const ids = fixtureIdsKey.split(",").map(Number).filter(Boolean);
      if (ids.length === 0) return;
      try {
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/fixtures/${id}`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
          ),
        );
        const map = new Map<number, FixtureLiveData>();
        for (const f of results) {
          if (f?.id != null) {
            map.set(f.id, {
              status: f.status,
              scoreHome: f.scoreHome ?? null,
              scoreAway: f.scoreAway ?? null,
            });
          }
        }
        setLiveData(map);
      } catch {
        // non-fatal — keep showing last known state
      }
    }

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 15_000);
    return () => clearInterval(interval);
  }, [fixtureIdsKey]);

  const hasStartedSelections = selections.some((s) => {
    const d = liveData.get(s.fixtureId);
    // Only block for finished/cancelled games — live games are fine to bet on
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
            onClick={() => setShowLoadInput(v => !v)}
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
              onChange={e => { setLoadCodeInput(e.target.value.toUpperCase()); setLoadCodeError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLoadCode()}
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

      {/* Selections */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-yellow-400/70
        [&::-webkit-scrollbar-thumb:hover]:bg-yellow-400">
        {user && !(user as any).phoneNumber && (
          <Link href="/profile" onClick={onClose}>
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 mb-4 cursor-pointer hover:bg-amber-500/15 transition-colors">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-500">Phone required to bet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tap to complete your profile</p>
              </div>
            </div>
          </Link>
        )}
        {selections.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 mt-20">
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

                  {/* Live / FT status badge */}
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
                        <span className="text-[10px] text-amber-400 ml-auto pr-6">bet may be rejected</span>
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
                      ].filter(Boolean).join("  ·  ")}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-background/50 px-2 py-1 rounded text-muted-foreground">
                      {sel.marketName}
                    </span>
                    <span className="font-bold text-primary">{sel.odds.toFixed(2)}</span>
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
                One or more events have already started. Remove them to place your bet.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("betslip.total_odds")}</span>
              <span className="font-bold">{totalOdds.toFixed(2)}</span>
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
                    // stake is always tracked internally in USD; the input is in the
                    // site's active display currency (e.g. CDF), so convert it back.
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
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("betslip.potential_win")}</span>
              <span className="font-bold text-primary">
                {formatCurrency(potentialWin)}
              </span>
            </div>
            {isMaxWinCapped && (
              <p className="text-[11px] text-amber-400 mt-1 text-right">{t("betslip.max_win_capped")} {formatCurrency(1000000)}</p>
            )}
          </div>
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-11"
            onClick={() => placeBet()}
            disabled={isPlacing || stake <= 0 || !user || hasStartedSelections}
          >
            {isPlacing ? "Placing Bet..." : !user ? "Login to Bet" : "Place Bet"}
          </Button>
          <Button
            variant="outline"
            className="w-full h-9 text-sm"
            onClick={handleBookBet}
            disabled={isBooking}
          >
            <BookMarked className="w-4 h-4 mr-2" />
            {isBooking ? "Booking..." : "Book Bet"}
          </Button>
        </div>
      )}

      {/* Booking code modal */}
      {bookingCode && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10 rounded-lg">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-xs text-center space-y-4">
            <BookMarked className="w-10 h-10 text-primary mx-auto" />
            <div>
              <p className="font-bold text-lg">Bet Booked!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Share this code so others can load your selections
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
              {copiedCode ? "Copied!" : "Copy code"}
            </button>
            <p className="text-[11px] text-muted-foreground">Valid for 30 days</p>
            <Button className="w-full" onClick={() => setBookingCode(null)}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}
