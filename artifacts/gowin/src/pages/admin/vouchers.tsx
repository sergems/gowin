import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket, Plus, Copy, CheckCircle, Clock, Building2, User, Send, ChevronDown, X } from "lucide-react";
import { format } from "date-fns";

const VOUCHER_VALUES = [1, 5, 10, 50, 100];
const QUANTITY_OPTIONS = [1, 5, 10, 25, 50];

type FilterType = "all" | "unallocated" | "branch" | "agent" | "redeemed";

interface Voucher {
  id: number;
  code: string;
  value: number;
  isRedeemed: boolean;
  redeemedBy: number | null;
  redeemedAt: string | null;
  createdAt: string;
  redeemedByUsername: string | null;
  branchId: number | null;
  branchName: string | null;
  allocatedToBranch: boolean;
  allocatedToBranchAt: string | null;
  agentId: number | null;
  soldAt: string | null;
}

interface Branch { id: number; name: string; code: string; }

function getAllocationStage(v: Voucher): FilterType {
  if (v.isRedeemed) return "redeemed";
  if (v.agentId) return "agent";
  if (v.allocatedToBranch) return "branch";
  return "unallocated";
}

const STAGE_META: Record<FilterType, { label: string; color: string }> = {
  unallocated: { label: "Unallocated",  color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  branch:      { label: "In Branch",    color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  agent:       { label: "With Agent",   color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  redeemed:    { label: "Redeemed",     color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  all:         { label: "All",          color: "" },
};

async function apiFetch(path: string, method: string, body: object, token: string | null) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function AdminVouchers() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useSiteSettings();
  const queryClient = useQueryClient();

  const [selectedValue, setSelectedValue] = useState<number>(10);
  const [quantity, setQuantity] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [targetBranchId, setTargetBranchId] = useState<string>("");
  const [isAllocating, setIsAllocating] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/vouchers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vouchers", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to fetch vouchers");
      return d as { vouchers: Voucher[] };
    },
  });

  const { data: branchesData } = useQuery<{ branches: Branch[] }>({
    queryKey: ["admin-branches"],
    queryFn: () => fetch("/api/admin/branches", { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()),
  });
  const branches: Branch[] = branchesData?.branches ?? [];

  const vouchers = data?.vouchers ?? [];

  const stageCounts = useMemo(() => {
    const counts: Record<FilterType, number> = { all: vouchers.length, unallocated: 0, branch: 0, agent: 0, redeemed: 0 };
    for (const v of vouchers) counts[getAllocationStage(v)]++;
    return counts;
  }, [vouchers]);

  const filtered = useMemo(() => {
    if (filter === "all") return vouchers;
    return vouchers.filter((v) => getAllocationStage(v) === filter);
  }, [vouchers, filter]);

  const totalUnredeemedValue = vouchers.filter(v => !v.isRedeemed).reduce((s, v) => s + v.value, 0);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await apiFetch("/api/admin/vouchers", "POST", { value: selectedValue, quantity }, token);
      toast({ title: `${quantity} voucher${quantity > 1 ? "s" : ""} created`, description: `${formatCurrency(selectedValue)} each` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vouchers"] });
    } catch (e: any) {
      toast({ title: "Failed to create vouchers", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllUnallocated = () => {
    const unallocatedVisible = filtered.filter(v => getAllocationStage(v) === "unallocated");
    setSelectedIds(new Set(unallocatedVisible.map(v => v.id)));
  };

  const clearSelection = () => { setSelectedIds(new Set()); setShowBranchPicker(false); setTargetBranchId(""); };

  const handleAllocate = async () => {
    if (!targetBranchId || selectedIds.size === 0) return;
    setIsAllocating(true);
    try {
      const res = await apiFetch("/api/admin/vouchers/allocate-to-branch", "POST", {
        voucherIds: Array.from(selectedIds),
        branchId: parseInt(targetBranchId),
      }, token);
      const branch = branches.find(b => b.id === parseInt(targetBranchId));
      toast({ title: `${res.allocated} voucher${res.allocated !== 1 ? "s" : ""} sent to ${branch?.name ?? "branch"}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vouchers"] });
      clearSelection();
    } catch (e: any) {
      toast({ title: "Allocation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsAllocating(false);
    }
  };

  const selectedUnallocatedCount = Array.from(selectedIds).filter(id => {
    const v = vouchers.find(x => x.id === id);
    return v && getAllocationStage(v) === "unallocated";
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Vouchers</h1>
        <p className="text-muted-foreground">Generate, allocate, and track vouchers across branches and agents</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          { key: "all" as FilterType,         label: "Total",        icon: Ticket,    color: "text-foreground" },
          { key: "unallocated" as FilterType,  label: "Unallocated",  icon: Clock,     color: "text-zinc-400" },
          { key: "branch" as FilterType,       label: "In Branch",    icon: Building2, color: "text-blue-400" },
          { key: "agent" as FilterType,        label: "With Agent",   icon: User,      color: "text-violet-400" },
          { key: "redeemed" as FilterType,     label: "Redeemed",     icon: CheckCircle, color: "text-emerald-400" },
        ] as const).map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-left transition-all rounded-xl border p-4 ${filter === key ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className="text-2xl font-black">{stageCounts[key]}</p>
            {key === "unallocated" && stageCounts.unallocated > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatCurrency(vouchers.filter(v => getAllocationStage(v) === "unallocated").reduce((s,v) => s+v.value, 0))} value
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Generate card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Generate Vouchers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Denomination</p>
            <div className="flex gap-2 flex-wrap">
              {VOUCHER_VALUES.map((v) => (
                <button key={v} onClick={() => setSelectedValue(v)}
                  className={`px-5 py-2.5 rounded-lg border text-sm font-bold transition-all ${selectedValue === v ? "bg-primary text-primary-foreground border-primary" : "bg-accent/40 border-border hover:border-primary/40 hover:bg-primary/5"}`}>
                  ${v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Quantity</p>
            <div className="flex gap-2 flex-wrap">
              {QUANTITY_OPTIONS.map((q) => (
                <button key={q} onClick={() => setQuantity(q)}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${quantity === q ? "bg-primary text-primary-foreground border-primary" : "bg-accent/40 border-border hover:border-primary/40"}`}>
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
              <Plus className="w-4 h-4" />
              {isCreating ? "Generating..." : `Generate ${quantity} × ${formatCurrency(selectedValue)}`}
            </Button>
            <span className="text-sm text-muted-foreground">
              Total value: <strong>{formatCurrency(quantity * selectedValue)}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Voucher list */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Voucher List</CardTitle>
            <div className="flex gap-2 flex-wrap">
              {(["all", "unallocated", "branch", "agent", "redeemed"] as FilterType[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"}`}>
                  {f === "all" ? "All" : f === "unallocated" ? "Unallocated" : f === "branch" ? "In Branch" : f === "agent" ? "With Agent" : "Redeemed"}
                  <span className="ml-1 opacity-70">({stageCounts[f]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selection toolbar */}
          {(filter === "all" || filter === "unallocated") && stageCounts.unallocated > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border mt-2">
              <button
                onClick={selectAllUnallocated}
                className="text-xs text-primary hover:underline font-medium"
              >
                Select all unallocated ({filter === "unallocated" ? filtered.filter(v => getAllocationStage(v) === "unallocated").length : stageCounts.unallocated})
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs font-semibold">{selectedIds.size} selected</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear
                  </button>
                  {selectedUnallocatedCount > 0 && (
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                      {showBranchPicker ? (
                        <>
                          <select
                            value={targetBranchId}
                            onChange={(e) => setTargetBranchId(e.target.value)}
                            className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:border-primary"
                          >
                            <option value="">— Pick a branch —</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                            ))}
                          </select>
                          <Button size="sm" onClick={handleAllocate} disabled={!targetBranchId || isAllocating} className="gap-1.5 h-8">
                            <Send className="w-3.5 h-3.5" />
                            {isAllocating ? "Sending…" : `Send ${selectedUnallocatedCount}`}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowBranchPicker(false)}>Cancel</Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => setShowBranchPicker(true)} className="gap-1.5 h-8 bg-blue-600 hover:bg-blue-500 text-white">
                          <Building2 className="w-3.5 h-3.5" />
                          Allocate to Branch
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-accent/40 rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-xl">
              <Ticket className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No vouchers in this category.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => {
                const stage = getAllocationStage(v);
                const stageMeta = STAGE_META[stage];
                const isSelectable = stage === "unallocated";
                const isSelected = selectedIds.has(v.id);

                return (
                  <div
                    key={v.id}
                    onClick={() => isSelectable && toggleSelect(v.id)}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : isSelectable
                        ? "border-border hover:border-primary/40 hover:bg-accent/30 cursor-pointer"
                        : "border-border bg-accent/5"
                    } ${stage === "redeemed" ? "opacity-60" : ""}`}
                  >
                    {/* Checkbox / icon */}
                    <div className="shrink-0">
                      {isSelectable ? (
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          stage === "redeemed" ? "bg-muted" : stage === "branch" ? "bg-blue-500/15" : stage === "agent" ? "bg-violet-500/15" : "bg-muted"
                        }`}>
                          {stage === "redeemed" ? <CheckCircle className="w-4 h-4 text-muted-foreground" />
                          : stage === "branch"   ? <Building2  className="w-4 h-4 text-blue-400" />
                          : stage === "agent"    ? <User        className="w-4 h-4 text-violet-400" />
                          :                        <Ticket      className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      )}
                    </div>

                    {/* Code + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold tracking-widest text-sm">{v.code}</span>
                        {stage !== "redeemed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); copyCode(v.code); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy code"
                          >
                            {copiedCode === v.code ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stageMeta.color}`}>
                          {stageMeta.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {stage === "redeemed" && `Redeemed by ${v.redeemedByUsername ?? "user"} · ${format(new Date(v.redeemedAt!), "PPP p")}`}
                        {stage === "branch"   && `→ ${v.branchName ?? "branch"} · ${v.allocatedToBranchAt ? format(new Date(v.allocatedToBranchAt), "PPP") : ""}`}
                        {stage === "agent"    && `→ ${v.branchName ?? "branch"} · assigned to agent`}
                        {stage === "unallocated" && `Created ${format(new Date(v.createdAt), "PPP")}`}
                      </p>
                    </div>

                    {/* Value */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xl font-black">{formatCurrency(v.value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4 text-right">
              Showing {filtered.length} voucher{filtered.length !== 1 ? "s" : ""} · Total unredeemed value: <strong>{formatCurrency(totalUnredeemedValue)}</strong>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
