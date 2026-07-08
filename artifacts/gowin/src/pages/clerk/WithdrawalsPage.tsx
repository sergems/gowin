import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Clock, CheckCircle2, XCircle, Banknote, ChevronRight,
  Phone, AlertTriangle, Loader2, Wifi, Smartphone,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Withdrawal {
  id: number;
  amount: number;
  currency: string;
  bankDetails: string;
  phoneNumber: string | null;
  operator: string | null;
  status: string;
  adminNote: string | null;
  clerkNote: string | null;
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
    phoneNumber: string | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  pending:     { label: "Pending",     color: "bg-amber-500/15 text-amber-500 border-amber-500/30",       Icon: Clock },
  approved:    { label: "Approved",    color: "bg-blue-500/15 text-blue-500 border-blue-500/30",          Icon: CheckCircle2 },
  rejected:    { label: "Rejected",    color: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
  paid:        { label: "Paid",        color: "bg-primary/15 text-primary border-primary/30",             Icon: Banknote },
  processing:  { label: "Processing",  color: "bg-violet-500/15 text-violet-500 border-violet-500/30",   Icon: Loader2 },
  completed:   { label: "Completed",   color: "bg-primary/15 text-primary border-primary/30",             Icon: CheckCircle2 },
  failed:      { label: "Failed",      color: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
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

function displayName(user: Withdrawal["user"]) {
  if (!user) return "Unknown";
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  return user.username;
}

// ── Age-based urgency ────────────────────────────────────────────────────
function getAgingTier(createdAt: string): "fresh" | "normal" | "slow" | "late" | "critical" {
  const h = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
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
    <span className={`text-xs ${AGING_BADGE_STYLES[tier]}`}>{AGING_DOTS[tier]} {label}</span>
  );
}

// Tab labels are set in component using t() — see TABS_KEYS
const TABS_KEYS = [
  { key: "approved",   labelKey: "clerk.tab_pending_auth" as const },
  { key: "processing", labelKey: "clerk.tab_processing" as const },
  { key: "completed",  labelKey: "clerk.tab_completed" as const },
  { key: "failed",     labelKey: "clerk.tab_failed" as const },
  { key: "rejected",   labelKey: "clerk.tab_rejected" as const },
];

const POLL_INTERVAL_MS = 10_000;

export default function ClerkWithdrawalsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { formatCurrency, t } = useSiteSettings();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("approved");
  const [authoriseModal, setAuthoriseModal] = useState<Withdrawal | null>(null);
  const [rejectModal, setRejectModal] = useState<Withdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [countdown, setCountdown] = useState(POLL_INTERVAL_MS / 1000);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading } = useQuery<Withdrawal[]>({
    queryKey: ["/api/clerk/withdrawals", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/clerk/withdrawals?status=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    refetchInterval: activeTab === "processing" ? POLL_INTERVAL_MS : false,
  });

  // Auto-poll PawaPay for each processing item
  const pollProcessingItems = useCallback(async () => {
    const items = (data ?? []).filter((w) => w.status === "processing" && w.pawapayPayoutId);
    if (items.length === 0) return;
    await Promise.allSettled(
      items.map((w) =>
        fetch(`/api/clerk/withdrawals/${w.id}/payout-status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    queryClient.invalidateQueries({ queryKey: ["/api/clerk/withdrawals"] });
  }, [data, token, queryClient]);

  useEffect(() => {
    if (activeTab !== "processing") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    setCountdown(POLL_INTERVAL_MS / 1000);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? POLL_INTERVAL_MS / 1000 : c - 1));
    }, 1000);
    pollingRef.current = setInterval(() => {
      pollProcessingItems();
      setCountdown(POLL_INTERVAL_MS / 1000);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [activeTab, pollProcessingItems]);

  const authoriseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/clerk/withdrawals/${id}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      toast({ title: t("clerk.payout_initiated"), description: t("clerk.payout_sent_desc") });
      setAuthoriseModal(null);
      queryClient.invalidateQueries({ queryKey: ["/api/clerk/withdrawals"] });
      setActiveTab("processing");
    },
    onError: (e: any) => toast({ title: t("clerk.payout_failed"), description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await fetch(`/api/clerk/withdrawals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      toast({ title: t("clerk.withdrawal_rejected"), description: t("clerk.balance_restored") });
      setRejectModal(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/clerk/withdrawals"] });
    },
    onError: (e: any) => toast({ title: t("clerk.action_failed"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">{t("clerk.withdrawals_title")}</h1>
          <p className="text-muted-foreground">{t("clerk.withdrawals_page_desc")}</p>
        </div>
      </div>

      {/* Flow */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-500" /> {t("clerk.flow_approved")}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><Banknote className="w-4 h-4 text-violet-500" /> {t("clerk.flow_authorise")}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> {t("clerk.flow_complete")}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS_KEYS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:bg-accent"
            }`}
          >
            {t(tab.labelKey)}
            {tab.key === "approved" && data && activeTab === "approved" && data.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {data.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Auto-poll indicator */}
      {activeTab === "processing" && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-violet-500/30 bg-violet-500/5 text-sm">
          <Wifi className="w-4 h-4 text-violet-400 animate-pulse" />
          <span className="text-violet-300 font-medium">{t("clerk.live_polling").replace("{n}", String(POLL_INTERVAL_MS / 1000))}</span>
          <span className="text-muted-foreground ml-auto text-xs">{t("clerk.next_check").replace("{n}", String(countdown))}</span>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-accent/40 rounded-xl animate-pulse" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <Banknote className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">{t("common.no_results")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((w) => {
            const tier = w.status === "processing" ? getAgingTier(w.createdAt) : null;
            return (
              <div
                key={w.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card transition-colors ${
                  tier ? AGING_CARD_STYLES[tier] : "border-border hover:bg-accent/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    {displayName(w.user).charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{displayName(w.user)}</span>
                      {w.user?.publicId && <span className="text-xs font-mono text-muted-foreground">#{w.user.publicId}</span>}
                      <StatusBadge status={w.status} />
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-accent text-muted-foreground">{w.currency}</span>
                      {tier && <AgingBadge createdAt={w.createdAt} />}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {w.phoneNumber ?? w.bankDetails}
                      {w.operator && <span className="ml-1 text-foreground/70">via {w.operator.replace(/_/g, " ")}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(w.createdAt), "PPP p")}</p>
                    {w.pawapayStatus && (
                      <p className="text-xs text-muted-foreground">PawaPay: <span className="font-mono font-semibold">{w.pawapayStatus}</span></p>
                    )}
                    {w.status === "processing" && (
                      <p className="text-xs text-violet-400 flex items-center gap-1"><Wifi className="w-3 h-3" /> {t("clerk.auto_updating")}</p>
                    )}
                    {w.clerkNote && <p className="text-xs text-muted-foreground italic">Note: {w.clerkNote}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-14 sm:ml-0 flex-wrap">
                  <span className="text-xl font-black">{formatCurrency(w.amount)}</span>
                  {w.status === "approved" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setAuthoriseModal(w)}>
                        {t("clerk.authorise_btn")}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setRejectModal(w); setRejectReason(""); }}>
                        {t("clerk.reject_btn")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Authorise modal */}
      <Dialog open={!!authoriseModal} onOpenChange={(o) => !o && setAuthoriseModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clerk.authorise_title")}</DialogTitle>
          </DialogHeader>
          {authoriseModal && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-accent/30 border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">{t("clerk.user_label")}</span>
                  <span className="font-semibold text-sm">{displayName(authoriseModal.user)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">{t("common.amount")}</span>
                  <span className="font-bold">{formatCurrency(authoriseModal.amount)} {authoriseModal.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">{t("clerk.phone_label")}</span>
                  <span className="font-mono text-sm">{authoriseModal.phoneNumber ?? authoriseModal.bankDetails}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">{t("clerk.operator_label")}</span>
                  <span className="text-sm font-semibold">
                    {authoriseModal.operator
                      ? authoriseModal.operator.replace(/_/g, " ")
                      : <span className="text-destructive">{t("clerk.not_set")}</span>}
                  </span>
                </div>
              </div>
              {!authoriseModal.operator && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">
                    {t("clerk.no_operator_warning")}
                  </p>
                </div>
              )}
              {authoriseModal.operator && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span>Payout will be sent via <strong>{authoriseModal.operator.replace(/_/g, " ")}</strong> to <strong className="font-mono">{authoriseModal.phoneNumber ?? authoriseModal.bankDetails}</strong></span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthoriseModal(null)}>{t("common.cancel")}</Button>
            <Button
              disabled={!authoriseModal?.operator || authoriseMutation.isPending}
              onClick={() => authoriseModal && authoriseMutation.mutate(authoriseModal.id)}
            >
              {authoriseMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("clerk.sending")}</> : t("clerk.send_payout")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectModal} onOpenChange={(o) => !o && setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clerk.reject_title")}</DialogTitle>
          </DialogHeader>
          {rejectModal && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {t("clerk.reject_desc_pre")} <span className="font-bold text-foreground">{formatCurrency(rejectModal.amount)} {rejectModal.currency}</span> {t("clerk.reject_desc_post")}
              </p>
              <div className="space-y-2">
                <Label>{t("clerk.reason_optional")}</Label>
                <Input
                  placeholder={t("clerk.reject_reason_ph")}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => rejectModal && rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })}
            >
              {rejectMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("clerk.rejecting")}</> : t("clerk.reject_refund")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
