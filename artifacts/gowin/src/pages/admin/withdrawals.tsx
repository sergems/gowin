import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, CheckCircle2, XCircle, Banknote, ChevronRight, AlertTriangle } from "lucide-react";

interface Withdrawal {
  id: number;
  amount: number;
  bankDetails: string;
  status: "pending" | "approved" | "rejected" | "paid";
  adminNote: string | null;
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

function useWithdrawals(status?: string) {
  const { token } = useAuth();
  return useQuery<Withdrawal[]>({
    queryKey: ["/api/admin/withdrawals", status],
    queryFn: async () => {
      const url = status ? `/api/admin/withdrawals?status=${status}` : "/api/admin/withdrawals";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
  });
}

function useUpdateWithdrawal() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: number; status: string; adminNote?: string }) => {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    },
  });
}

function displayName(user: Withdrawal["user"]) {
  if (!user) return "Unknown";
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  return user.username;
}

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "bg-amber-500/15 text-amber-500 border-amber-500/30",  icon: Clock },
  approved: { label: "Approved", color: "bg-blue-500/15 text-blue-500 border-blue-500/30",     icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  paid:     { label: "Paid",     color: "bg-primary/15 text-primary border-primary/30",         icon: Banknote },
};

function StatusBadge({ status }: { status: Withdrawal["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function WithdrawalRow({ w, onAction }: { w: Withdrawal; onAction: (id: number, status: string) => void }) {
  const isPending = w.status === "pending";
  const isApproved = w.status === "approved";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/20 transition-colors">
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
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{w.bankDetails}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(w.createdAt), "PPP p")}</p>
          {w.adminNote && (
            <p className="text-xs text-muted-foreground italic mt-1">Note: {w.adminNote}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-14 sm:ml-0">
        <span className="text-xl font-black">{formatCurrency(w.amount)}</span>
        {isPending && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAction(w.id, "approved")} className="bg-blue-500 hover:bg-blue-600 text-white">
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onAction(w.id, "rejected")}>
              Reject
            </Button>
          </div>
        )}
        {isApproved && (
          <Button size="sm" onClick={() => onAction(w.id, "paid")} className="bg-primary hover:bg-primary/90">
            Mark Paid
          </Button>
        )}
      </div>
    </div>
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

type TabKey = "pending" | "approved" | "paid" | "rejected";

const TABS: { key: TabKey; label: string; emptyMsg: string }[] = [
  { key: "pending",  label: "Requests",  emptyMsg: "No pending withdrawal requests" },
  { key: "approved", label: "Payment",   emptyMsg: "No withdrawals awaiting payment" },
  { key: "paid",     label: "Paid",      emptyMsg: "No paid withdrawals yet" },
  { key: "rejected", label: "Rejected",  emptyMsg: "No rejected withdrawals" },
];

export default function AdminWithdrawals() {
  const { formatCurrency } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const { data, isLoading } = useWithdrawals(activeTab);
  const updateWithdrawal = useUpdateWithdrawal();
  const { toast } = useToast();

  const handleAction = async (id: number, status: string) => {
    try {
      await updateWithdrawal.mutateAsync({ id, status });
      const labels: Record<string, string> = { approved: "Approved", rejected: "Rejected — balance refunded", paid: "Marked as paid" };
      toast({ title: labels[status] ?? "Updated" });
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Withdrawals</h1>
        <p className="text-muted-foreground">Review and process user withdrawal requests</p>
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
            {tab.key === "pending" && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {data?.length ?? ""}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Flow explanation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500" /> Requests</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Payment</span>
        <ChevronRight className="w-4 h-4" />
        <span className="flex items-center gap-1.5"><Banknote className="w-4 h-4 text-primary" /> Paid</span>
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
          {data.map((w) => (
            <WithdrawalRow key={w.id} w={w} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
