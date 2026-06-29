import { useState } from "react";
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
  RefreshCw, Phone, AlertTriangle, Loader2,
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

const DRC_OPERATORS = [
  { code: "ORANGE_CD", name: "Orange Money" },
  { code: "AIRTEL_CD", name: "Airtel Money" },
  { code: "VODACOM_CD", name: "M-Pesa (Vodacom)" },
  { code: "AFRICELL_CD", name: "Africell Money" },
];

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
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function displayName(user: Withdrawal["user"]) {
  if (!user) return "Unknown";
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  return user.username;
}

const TABS = [
  { key: "approved",   label: "Pending Authorisation" },
  { key: "processing", label: "Processing" },
  { key: "completed",  label: "Completed" },
  { key: "failed",     label: "Failed" },
  { key: "rejected",   label: "Rejected" },
];

export default function ClerkWithdrawalsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useSiteSettings();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("approved");
  const [authoriseModal, setAuthoriseModal] = useState<Withdrawal | null>(null);
  const [rejectModal, setRejectModal] = useState<Withdrawal | null>(null);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, refetch } = useQuery<Withdrawal[]>({
    queryKey: ["/api/clerk/withdrawals", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/clerk/withdrawals?status=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
  });

  const authoriseMutation = useMutation({
    mutationFn: async ({ id, operator }: { id: number; operator: string }) => {
      const res = await fetch(`/api/clerk/withdrawals/${id}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operator }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      toast({ title: "Payout initiated", description: "PawaPay payout has been sent" });
      setAuthoriseModal(null);
      setSelectedOperator("");
      queryClient.invalidateQueries({ queryKey: ["/api/clerk/withdrawals"] });
    },
    onError: (e: any) => toast({ title: "Payout failed", description: e.message, variant: "destructive" }),
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
      toast({ title: "Withdrawal rejected", description: "Balance restored to user wallet" });
      setRejectModal(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/clerk/withdrawals"] });
    },
    onError: (e: any) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const checkStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/clerk/withdrawals/${id}/payout-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    },
    onSuccess: (d) => {
      toast({ title: `PawaPay status: ${d.pawapayStatus ?? d.status}` });
      queryClient.invalidateQueries({ queryKey: ["/api/clerk/withdrawals"] });
    },
    onError: (e: any) => toast({ title: "Status check failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Withdrawal Payouts</h1>
          <p className="text-muted-foreground">Authorise and process approved withdrawal requests via PawaPay</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Flow */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-500" /> Admin Approved</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><Banknote className="w-4 h-4 text-violet-500" /> Clerk Authorises</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> PawaPay Completes</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
            {tab.key === "approved" && data && activeTab === "approved" && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {data.length}
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
        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <Banknote className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No {activeTab} withdrawals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((w) => (
            <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/20 transition-colors">
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
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {w.phoneNumber ?? w.bankDetails}
                    {w.operator && <span className="ml-1 text-foreground/70">via {w.operator}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{format(new Date(w.createdAt), "PPP p")}</p>
                  {w.pawapayStatus && (
                    <p className="text-xs text-muted-foreground">PawaPay: <span className="font-mono font-semibold">{w.pawapayStatus}</span></p>
                  )}
                  {w.clerkNote && <p className="text-xs text-muted-foreground italic">Note: {w.clerkNote}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-14 sm:ml-0 flex-wrap">
                <span className="text-xl font-black">{formatCurrency(w.amount)}</span>
                {w.status === "approved" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setAuthoriseModal(w); setSelectedOperator(w.operator ?? ""); }}>
                      Authorise
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setRejectModal(w); setRejectReason(""); }}>
                      Reject
                    </Button>
                  </div>
                )}
                {w.status === "processing" && w.pawapayPayoutId && (
                  <Button size="sm" variant="outline" onClick={() => checkStatusMutation.mutate(w.id)} disabled={checkStatusMutation.isPending}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Check Status
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Authorise modal */}
      <Dialog open={!!authoriseModal} onOpenChange={(o) => !o && setAuthoriseModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authorise Payout</DialogTitle>
          </DialogHeader>
          {authoriseModal && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-accent/30 border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">User</span>
                  <span className="font-semibold text-sm">{displayName(authoriseModal.user)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Amount</span>
                  <span className="font-bold">{formatCurrency(authoriseModal.amount)} {authoriseModal.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Phone</span>
                  <span className="font-mono text-sm">{authoriseModal.phoneNumber ?? authoriseModal.bankDetails}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mobile Money Operator</Label>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select operator…</option>
                  {DRC_OPERATORS.map((op) => (
                    <option key={op.code} value={op.code}>{op.name}</option>
                  ))}
                </select>
              </div>
              {!selectedOperator && (
                <div className="flex items-center gap-2 text-xs text-amber-500">
                  <AlertTriangle className="w-3.5 h-3.5" /> Operator required to process payout
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthoriseModal(null)}>Cancel</Button>
            <Button
              disabled={!selectedOperator || authoriseMutation.isPending}
              onClick={() => authoriseModal && authoriseMutation.mutate({ id: authoriseModal.id, operator: selectedOperator })}
            >
              {authoriseMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : "Send Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectModal} onOpenChange={(o) => !o && setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
          </DialogHeader>
          {rejectModal && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Rejecting this withdrawal will refund <span className="font-bold text-foreground">{formatCurrency(rejectModal.amount)} {rejectModal.currency}</span> back to the user's wallet.
              </p>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  placeholder="Reason for rejection…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => rejectModal && rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })}
            >
              {rejectMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting…</> : "Reject & Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
