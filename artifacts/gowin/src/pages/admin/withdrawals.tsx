import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Clock, CheckCircle2, XCircle, Banknote, ChevronRight,
  Smartphone, Loader2, Send, Wifi,
} from "lucide-react";

const DRC_OPERATORS = [
  { code: "VODACOM_MPESA_COD", name: "M-Pesa (Vodacom)" },
  { code: "AIRTEL_COD",        name: "Airtel Money" },
  { code: "ORANGE_COD",        name: "Orange Money" },
];

interface Withdrawal {
  id: number;
  amount: number;
  currency: string | null;
  bankDetails: string;
  phoneNumber: string | null;
  operator: string | null;
  status: "pending" | "approved" | "rejected" | "paid" | "processing" | "completed" | "failed";
  adminNote: string | null;
  pawapayPayoutId: string | null;
  pawapayStatus: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    publicId: number | null;
    username: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

function displayName(user: Withdrawal["user"]) {
  if (!user) return "Unknown";
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  return user.username;
}

// ── Age-based urgency helpers ──────────────────────────────────────────────
function getAgeMs(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime();
}

function getAgingTier(createdAt: string): "fresh" | "normal" | "slow" | "late" | "critical" {
  const h = getAgeMs(createdAt) / 3_600_000;
  if (h < 0.5) return "fresh";
  if (h < 2)   return "normal";
  if (h < 6)   return "slow";
  if (h < 12)  return "late";
  return "critical";
}

const AGING_CARD_STYLES: Record<string, string> = {
  fresh:    "border-emerald-500/40 bg-emerald-500/5",
  normal:   "border-amber-400/30 bg-amber-400/5",
  slow:     "border-orange-500/40 bg-orange-500/5",
  late:     "border-red-500/50 bg-red-500/8",
  critical: "border-red-700/60 bg-red-700/10",
};

const AGING_BADGE_STYLES: Record<string, string> = {
  fresh:    "text-emerald-500",
  normal:   "text-amber-400",
  slow:     "text-orange-500",
  late:     "text-red-500",
  critical: "text-red-700 animate-pulse font-bold",
};

const AGING_DOTS: Record<string, string> = {
  fresh: "🟢", normal: "🟡", slow: "🟠", late: "🔴", critical: "⚠️",
};

function AgingBadge({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  const ageMs = now - new Date(createdAt).getTime();
  const hours = Math.floor(ageMs / 3_600_000);
  const minutes = Math.floor((ageMs % 3_600_000) / 60_000);
  const tier = getAgingTier(createdAt);

  let label = "";
  if (tier === "critical") label = `${hours}h ${minutes}m — OVERDUE`;
  else if (tier === "late") label = `${hours}h ${minutes}m — Past deadline`;
  else if (hours > 0) label = `${hours}h ${minutes}m`;
  else label = `${minutes}m`;

  return (
    <span className={`text-xs ${AGING_BADGE_STYLES[tier]}`}>
      {AGING_DOTS[tier]} {label}
    </span>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  pending:    { label: "Pending",    color: "bg-amber-500/15 text-amber-500 border-amber-500/30",       Icon: Clock },
  approved:   { label: "Approved",   color: "bg-blue-500/15 text-blue-500 border-blue-500/30",          Icon: CheckCircle2 },
  rejected:   { label: "Rejected",   color: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
  paid:       { label: "Paid",       color: "bg-primary/15 text-primary border-primary/30",             Icon: Banknote },
  processing: { label: "Processing", color: "bg-violet-500/15 text-violet-500 border-violet-500/30",   Icon: Loader2 },
  completed:  { label: "Completed",  color: "bg-primary/15 text-primary border-primary/30",             Icon: CheckCircle2 },
  failed:     { label: "Failed",     color: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} /> {cfg.label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center border border-dashed border-border rounded-xl">
      <Banknote className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

type TabKey = "pending" | "approved" | "processing" | "completed" | "paid" | "rejected";

const TAB_KEYS: TabKey[] = ["pending", "approved", "processing", "completed", "paid", "rejected"];

const POLL_INTERVAL_MS = 10_000;

export default function AdminWithdrawals() {
  const { token } = useAuth();
  const { formatCurrency, t } = useSiteSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const TABS: { key: TabKey; label: string; emptyMsg: string }[] = [
    { key: "pending",    label: t("admin.withdrawals.tab_requests"),   emptyMsg: t("admin.withdrawals.empty_pending") },
    { key: "approved",   label: t("admin.withdrawals.tab_approved"),   emptyMsg: t("admin.withdrawals.empty_approved") },
    { key: "processing", label: t("admin.withdrawals.tab_processing"), emptyMsg: t("admin.withdrawals.empty_processing") },
    { key: "completed",  label: t("admin.withdrawals.tab_completed"),  emptyMsg: t("admin.withdrawals.empty_completed") },
    { key: "paid",       label: t("admin.withdrawals.tab_paid"),       emptyMsg: t("admin.withdrawals.empty_paid") },
    { key: "rejected",   label: t("admin.withdrawals.tab_rejected"),   emptyMsg: t("admin.withdrawals.empty_rejected") },
  ];

  const [payingId, setPayingId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL_MS / 1000);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading } = useQuery<Withdrawal[]>({
    queryKey: ["/api/admin/withdrawals", activeTab],
    queryFn: async () => {
      const url = `/api/admin/withdrawals?status=${activeTab}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    refetchInterval: activeTab === "processing" ? POLL_INTERVAL_MS : false,
  });

  // Auto-poll PawaPay status for each processing item every 10s
  const pollProcessingItems = useCallback(async () => {
    const processingItems = (data ?? []).filter(
      (w) => w.status === "processing" && w.pawapayPayoutId
    );
    if (processingItems.length === 0) return;

    await Promise.allSettled(
      processingItems.map((w) =>
        fetch(`/api/admin/withdrawals/${w.id}/payout-status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
  }, [data, token, queryClient]);

  // Set up auto-polling when on processing tab
  useEffect(() => {
    if (activeTab !== "processing") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    setCountdown(POLL_INTERVAL_MS / 1000);

    // Countdown ticker
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? POLL_INTERVAL_MS / 1000 : c - 1));
    }, 1000);

    // Status poller
    pollingRef.current = setInterval(() => {
      pollProcessingItems();
      setCountdown(POLL_INTERVAL_MS / 1000);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [activeTab, pollProcessingItems]);

  const updateWithdrawal = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: number; status: string; adminNote?: string }) => {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, adminNote }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] }),
  });

  const sendPawapayPayout = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/withdrawals/${id}/pawapay-payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Payout failed");
      return d;
    },
    onSuccess: () => {
      setPayingId(null);
      toast({ title: t("admin.withdrawals.payout_sent"), description: t("admin.withdrawals.payout_sent_desc") });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      setActiveTab("processing");
    },
    onError: (e: any) => {
      setPayingId(null);
      toast({ title: t("admin.withdrawals.payout_failed"), description: e.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    },
  });

  const handleAction = async (id: number, status: string) => {
    try {
      await updateWithdrawal.mutateAsync({ id, status });
      const labels: Record<string, string> = {
        approved: t("admin.withdrawals.approved_msg"),
        rejected: t("admin.withdrawals.rejected_msg"),
        paid: t("admin.withdrawals.paid_msg"),
      };
      toast({ title: labels[status] ?? "Updated" });
    } catch (e: any) {
      toast({ title: t("admin.withdrawals.action_failed"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{t("admin.withdrawals.title")}</h1>
        <p className="text-muted-foreground">{t("admin.withdrawals.desc")}</p>
      </div>

      {/* Flow diagram */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500" /> {t("admin.withdrawals.request")}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {t("admin.withdrawals.approve")}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-violet-400" /> {t("admin.withdrawals.send_pawapay")}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> {t("admin.withdrawals.tab_completed")}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
            {tab.key === "pending" && (data?.length ?? 0) > 0 && activeTab === "pending" && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {data?.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Auto-poll indicator */}
      {activeTab === "processing" && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-violet-500/30 bg-violet-500/5 text-sm">
          <Wifi className="w-4 h-4 text-violet-400 animate-pulse" />
          <span className="text-violet-300 font-medium">{t("admin.withdrawals.live_polling")}</span>
          <span className="text-muted-foreground ml-auto text-xs">{t("admin.withdrawals.next_check").replace("{n}", String(countdown))}</span>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-accent/40 rounded-xl animate-pulse" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState message={TABS.find((t) => t.key === activeTab)?.emptyMsg ?? "Nothing here"} />
      ) : (
        <div className="space-y-3">
          {data.map((w) => {
            const isPending = w.status === "pending";
            const isApproved = w.status === "approved";
            const isProcessing = w.status === "processing";
            const isThisPaying = payingId === w.id && sendPawapayPayout.isPending;
            const tier = isProcessing ? getAgingTier(w.createdAt) : null;

            return (
              <div
                key={w.id}
                className={`flex flex-col gap-4 p-4 rounded-xl border bg-card transition-colors ${
                  isProcessing && tier ? AGING_CARD_STYLES[tier] : "border-border"
                }`}
              >
                {/* Top row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {displayName(w.user).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{displayName(w.user)}</span>
                        {w.user?.publicId && (
                          <span className="text-xs font-mono text-muted-foreground">#{w.user.publicId}</span>
                        )}
                        <StatusBadge status={w.status} />
                        {w.pawapayStatus && (
                          <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                            PP: {w.pawapayStatus}
                          </span>
                        )}
                        {isProcessing && <AgingBadge createdAt={w.createdAt} />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{w.phoneNumber ?? w.bankDetails}</p>
                      {w.operator && (
                        <p className="text-xs text-muted-foreground">{w.operator.replace(/_/g, " ")}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{format(new Date(w.createdAt), "PPP p")}</p>
                      {w.adminNote && (
                        <p className="text-xs text-muted-foreground italic mt-1">Note: {w.adminNote}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-14 sm:ml-0">
                    <p className="text-2xl font-black">{formatCurrency(w.amount)}</p>
                    <p className="text-xs text-muted-foreground">{w.currency ?? "USD"}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 items-center">
                  {isPending && (
                    <>
                      <Button size="sm" onClick={() => handleAction(w.id, "approved")}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        disabled={updateWithdrawal.isPending}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> {t("admin.withdrawals.approve")}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction(w.id, "rejected")}
                        disabled={updateWithdrawal.isPending}>
                        <XCircle className="w-3.5 h-3.5 mr-1.5" /> {t("admin.withdrawals.reject")}
                      </Button>
                    </>
                  )}

                  {isApproved && (
                    <>
                      {/* Phone + operator info */}
                      {w.phoneNumber && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/40 border border-border text-xs">
                          <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-mono">{w.phoneNumber}</span>
                          {w.operator && <span className="text-muted-foreground">{w.operator.replace(/_/g, " ")}</span>}
                        </div>
                      )}
                      <Button
                        size="sm"
                        onClick={() => { setPayingId(w.id); sendPawapayPayout.mutate(w.id); }}
                        disabled={isThisPaying || !w.operator}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                        title={!w.operator ? "No operator set on this withdrawal" : ""}
                      >
                        {isThisPaying
                          ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {t("admin.withdrawals.sending")}</>
                          : <><Send className="w-3.5 h-3.5 mr-1.5" /> {t("admin.withdrawals.send_pawapay")}</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(w.id, "paid")}
                        disabled={updateWithdrawal.isPending}
                        title="Mark as manually paid (no PawaPay)">
                        <Banknote className="w-3.5 h-3.5 mr-1.5" /> {t("admin.withdrawals.mark_manual")}
                      </Button>
                    </>
                  )}

                  {isProcessing && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Wifi className="w-3 h-3 text-violet-400" />
                      {t("admin.withdrawals.auto_update").replace("{n}", String(POLL_INTERVAL_MS / 1000))}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
