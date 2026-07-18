import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { useSiteSettings } from "../../contexts/SiteSettingsContext";
import { Ticket, RefreshCw, ChevronDown } from "lucide-react";

interface Voucher {
  id: number;
  code: string;
  value: number;
  isRedeemed: boolean;
  allocatedToBranch: boolean;
  allocatedToBranchAt: string | null;
  agentId: number | null;
  agentUsername: string | null;
  agentFirstName: string | null;
  agentLastName: string | null;
  soldAt: string | null;
  printedAt: string | null;
  createdAt: string;
}

interface Agent { id: number; username: string; firstName: string | null; lastName: string | null; }

export default function BranchVouchersPage() {
  const qc = useQueryClient();
  const { formatCurrency } = useSiteSettings();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showAllocate, setShowAllocate] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unallocated" | "allocated" | "sold" | "redeemed">("all");

  const { data: vData, isLoading } = useQuery({
    queryKey: ["branch-vouchers"],
    queryFn: () => api.get<{ vouchers: Voucher[] }>("/api/branch/vouchers").then((r) => r.data),
  });

  const { data: aData } = useQuery({
    queryKey: ["branch-agents"],
    queryFn: () => api.get<{ agents: Agent[] }>("/api/branch/agents").then((r) => r.data),
  });

  const allocateMut = useMutation({
    mutationFn: ({ voucherIds, agentId }: { voucherIds: number[]; agentId: number }) =>
      api.post<{ allocated: number }>("/api/branch/vouchers/allocate-to-agent", { voucherIds, agentId }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["branch-vouchers"] });
      setSelectedIds(new Set());
      setShowAllocate(false);
      setTargetAgentId(null);
      setError("");
      toast({ title: "Vouchers allocated", description: `${data.allocated} voucher(s) allocated to agent.`, variant: "success" });
    },
    onError: (e: any) => setError(e.response?.data?.error ?? e.message ?? "Failed to allocate"),
  });

  const vouchers: Voucher[] = vData?.vouchers ?? [];
  const agents: Agent[] = aData?.agents ?? [];

  const filtered = vouchers.filter((v) => {
    if (filterStatus === "unallocated") return !v.agentId && !v.isRedeemed;
    if (filterStatus === "allocated") return !!v.agentId && !v.soldAt && !v.isRedeemed;
    if (filterStatus === "sold") return !!v.soldAt && !v.isRedeemed;
    if (filterStatus === "redeemed") return v.isRedeemed;
    return true;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const allocatable = filtered.filter((v) => !v.agentId && !v.isRedeemed);
    setSelectedIds(new Set(allocatable.map((v) => v.id)));
  };

  const statusBadge = (v: Voucher) => {
    if (v.isRedeemed) return <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">Redeemed</span>;
    if (v.soldAt) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400">Sold</span>;
    if (v.agentId) return <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-400">With Agent</span>;
    if (v.allocatedToBranch) return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">Available</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">Pending</span>;
  };

  const stats = {
    total: vouchers.length,
    available: vouchers.filter((v) => v.allocatedToBranch && !v.agentId && !v.isRedeemed).length,
    withAgent: vouchers.filter((v) => !!v.agentId && !v.soldAt && !v.isRedeemed).length,
    sold: vouchers.filter((v) => !!v.soldAt && !v.isRedeemed).length,
    redeemed: vouchers.filter((v) => v.isRedeemed).length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-7 h-7 text-emerald-400" />
            Vouchers
          </h1>
          <p className="text-zinc-400 mt-1">Manage voucher inventory and allocate to agents</p>
        </div>
        {selectedIds.size > 0 && (
          <button onClick={() => setShowAllocate(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Allocate {selectedIds.size} to Agent
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Available", value: stats.available, color: "text-emerald-400" },
          { label: "With Agent", value: stats.withAgent, color: "text-purple-400" },
          { label: "Sold", value: stats.sold, color: "text-blue-400" },
          { label: "Redeemed", value: stats.redeemed, color: "text-zinc-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Select All */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {(["all", "unallocated", "allocated", "sold", "redeemed"] as const).map((s) => (
            <button key={s} onClick={() => { setFilterStatus(s); setSelectedIds(new Set()); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${filterStatus === s ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <button onClick={selectAll} className="ml-auto text-xs text-zinc-400 hover:text-white underline">
          Select all allocatable
        </button>
        {selectedIds.size > 0 && (
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-500 hover:text-white">
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-zinc-400 text-center py-16">Loading vouchers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No vouchers in this category.</p>
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-8"></th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Value</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700/50">
              {filtered.map((v) => {
                const canSelect = !v.agentId && !v.isRedeemed;
                return (
                  <tr key={v.id} className={`hover:bg-zinc-700/30 ${selectedIds.has(v.id) ? "bg-emerald-900/10" : ""}`}>
                    <td className="px-4 py-3">
                      {canSelect && (
                        <input type="checkbox" checked={selectedIds.has(v.id)} onChange={() => toggleSelect(v.id)}
                          className="rounded accent-emerald-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-white">{v.code}</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">{formatCurrency(v.value)}</td>
                    <td className="px-4 py-3">{statusBadge(v)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {v.agentFirstName || v.agentLastName
                        ? `${v.agentFirstName ?? ""} ${v.agentLastName ?? ""}`.trim()
                        : v.agentUsername ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {v.soldAt ? new Date(v.soldAt).toLocaleDateString() : v.allocatedToBranchAt ? new Date(v.allocatedToBranchAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAllocate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-white mb-4">Allocate {selectedIds.size} Voucher{selectedIds.size !== 1 ? "s" : ""} to Agent</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <label className="text-xs text-zinc-400 mb-1 block">Select Agent</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white mb-4"
              value={targetAgentId ?? ""}
              onChange={(e) => setTargetAgentId(parseInt(e.target.value) || null)}>
              <option value="">— choose agent —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName || a.lastName ? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() : a.username} (@{a.username})
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setShowAllocate(false); setError(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm">
                Cancel
              </button>
              <button
                onClick={() => { if (targetAgentId) allocateMut.mutate({ voucherIds: Array.from(selectedIds), agentId: targetAgentId }); }}
                disabled={!targetAgentId || allocateMut.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                Allocate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
