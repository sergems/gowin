import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Clock, CheckCircle2, XCircle, Banknote, ChevronRight,
  Smartphone, Loader2, RefreshCw, Send,
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
      <Icon className="w-3 h-3" /> {cfg.label}
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

const TABS: { key: TabKey; label: string; emptyMsg: string }[] = [
  { key: "pending",    label: "Requests",   emptyMsg: "No pending withdrawal requests" },
  { key: "approved",   label: "Approved",   emptyMsg: "No withdrawals awaiting payment" },
  { key: "processing", label: "Processing", emptyMsg: "No withdrawals in processing" },
  { key: "completed",  label: "Completed",  emptyMsg: "No completed payouts yet" },
  { key: "paid",       label: "Paid",       emptyMsg: "No manually paid withdrawals" },
  { key: "rejected",   label: "Rejected",   emptyMsg: "No rejected withdrawals" },
];

export default function AdminWithdrawals() {
  const { token } = useAuth();
  const { formatCurrency } = useSiteSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  // Inline payout operator state per withdrawal id
  const [payoutOperators, setPayoutOperators] = useState<Record<number, string>>({});
  const [payingId, setPayingId] = useState<number | null>(null);
  const [pollingId, setPollingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<Withdrawal[]>({
    queryKey: ["/api/admin/withdrawals", activeTab],
    queryFn: async () => {
      const url = `/api/admin/withdrawals?status=${activeTab}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
  });

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
    mutationFn: async ({ id, operator }: { id: number; operator: string }) => {
      const res = await fetch(`/api/admin/withdrawals/${id}/pawapay-payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operator }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Payout failed");
      return d;
    },
    onSuccess: (_, vars) => {
      setPayingId(null);
      toast({ title: "Payout sent via PawaPay", description: "Status will update when PawaPay confirms." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      // Auto-switch to processing tab
      setActiveTab("processing");
    },
    onError: (e: any) => {
      setPayingId(null);
      toast({ title: "Payout failed", description: e.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    },
  });

  const pollPayoutStatus = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/withdrawals/${id}/payout-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: (d) => {
      setPollingId(null);
      toast({ title: `Status: ${d.pawapayStatus ?? d.status}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    },
    onError: () => setPollingId(null),
  });

  const handleAction = async (id: number, status: string) => {
    try {
      await updateWithdrawal.mutateAsync({ id, status });
      const labels: Record<string, string> = {
        approved: "Approved — ready to send via PawaPay",
        rejected: "Rejected — balance refunded",
        paid: "Marked as paid",
      };
      toast({ title: labels[status] ?? "Updated" });
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSendPayout = (w: Withdrawal) => {
    const operator = payoutOperators[w.id] ?? w.operator ?? "";
    if (!operator) {
      toast({ title: "Select operator", description: "Choose a mobile operator before sending.", variant: "destructive" });
      return;
    }
    setPayingId(w.id);
    sendPawapayPayout.mutate({ id: w.id, operator });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Withdrawals</h1>
        <p className="text-muted-foreground">Review and send withdrawal payouts via PawaPay mobile money</p>
      </div>

      {/* Flow diagram */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500" /> Request</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Approve</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-violet-400" /> Send via PawaPay</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Completed</span>
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
            {tab.key === "pending" && (data?.length ?? 0) > 0 && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {data?.length}
              </span>
            )}
          </button>
        ))}
      </div>

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
            const selectedOp = payoutOperators[w.id] ?? w.operator ?? "";
            const isThisPaying = payingId === w.id && sendPawapayPayout.isPending;
            const isThisPolling = pollingId === w.id && pollPayoutStatus.isPending;

            return (
              <div
                key={w.id}
                className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-card"
              >
                {/* Top row — user info + amount + status */}
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

                {/* Actions row */}
                <div className="flex flex-wrap gap-2 items-center">
                  {isPending && (
                    <>
                      <Button size="sm" onClick={() => handleAction(w.id, "approved")}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        disabled={updateWithdrawal.isPending}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction(w.id, "rejected")}
                        disabled={updateWithdrawal.isPending}>
                        <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                      </Button>
                    </>
                  )}

                  {isApproved && (
                    <>
                      {/* Operator picker — pre-fill from withdrawal if set */}
                      <select
                        value={selectedOp}
                        onChange={(e) => setPayoutOperators((prev) => ({ ...prev, [w.id]: e.target.value }))}
                        className="bg-background border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Select operator…</option>
                        {DRC_OPERATORS.map((op) => (
                          <option key={op.code} value={op.code}>{op.name}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => handleSendPayout(w)}
                        disabled={!selectedOp || isThisPaying}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        {isThisPaying
                          ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending…</>
                          : <><Send className="w-3.5 h-3.5 mr-1.5" /> Send via PawaPay</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(w.id, "paid")}
                        disabled={updateWithdrawal.isPending}
                        title="Mark as manually paid (no PawaPay)">
                        <Banknote className="w-3.5 h-3.5 mr-1.5" /> Mark Manual
                      </Button>
                    </>
                  )}

                  {isProcessing && w.pawapayPayoutId && (
                    <Button
                      size="sm" variant="outline"
                      onClick={() => { setPollingId(w.id); pollPayoutStatus.mutate(w.id); }}
                      disabled={isThisPolling}
                    >
                      {isThisPolling
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Checking…</>
                        : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Check PawaPay Status</>}
                    </Button>
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
