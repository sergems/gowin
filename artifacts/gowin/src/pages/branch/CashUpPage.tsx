import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Users, Plus, CheckCircle2, AlertTriangle, Clock, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";

interface FloatAllocation {
  id: number; agentId: number; agentUsername: string; agentName: string | null;
  amount: number; shiftDate: string; shiftLabel: string; status: "open" | "cashed_up";
  notes: string | null; createdAt: string;
}
interface CashUpPreview { openingFloat: number; totalBets: number; expectedReturn: number; }
interface CashUpSession {
  id: number; agentUsername: string; agentName: string | null;
  openingFloat: number; totalBets: number; totalPayouts: number;
  expectedReturn: number; cashReturned: number; variance: number;
  shiftDate: string; shiftLabel: string; notes: string | null; createdAt: string;
}
interface BranchInfo { id: number; name: string; balance: number | string; }

async function apiFetch(path: string, method: string, body: object | null, token: string | null) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== null ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const SHIFT_LABELS = ["Morning", "Afternoon", "Evening", "Night", "Day"];

function VariancePill({ v }: { v: number }) {
  if (Math.abs(v) < 0.01) return <span className="text-xs text-emerald-400 font-bold">✓ Balanced</span>;
  if (v < 0) return <span className="text-xs text-red-400 font-bold">▼ Short ${Math.abs(v).toFixed(2)}</span>;
  return <span className="text-xs text-amber-400 font-bold">▲ +${v.toFixed(2)}</span>;
}

export default function CashUpPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [shiftDate, setShiftDate] = useState(today);
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocForm, setAllocForm] = useState({ agentId: "", amount: "", shiftLabel: "Day", notes: "" });
  const [allocating, setAllocating] = useState(false);

  const [cashUpId, setCashUpId] = useState<number | null>(null);
  const [cashUpPreview, setCashUpPreview] = useState<CashUpPreview | null>(null);
  const [cashReturned, setCashReturned] = useState("");
  const [cashUpNotes, setCashUpNotes] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const { data: branchInfo } = useQuery<BranchInfo>({
    queryKey: ["branch-info-cashup"],
    queryFn: () => fetch("/api/branch/info", { headers }).then(r => r.json()).then(d => d.branch),
  });
  const { data: agentsData } = useQuery<{ agents: { id: number; username: string; firstName: string|null; lastName: string|null }[] }>({
    queryKey: ["branch-agents-cashup"],
    queryFn: () => fetch("/api/branch/agents", { headers }).then(r => r.json()),
  });
  const { data: floatsData, isLoading: floatsLoading } = useQuery<{ floats: FloatAllocation[] }>({
    queryKey: ["branch-floats", shiftDate],
    queryFn: () => fetch(`/api/branch/floats?date=${shiftDate}`, { headers }).then(r => r.json()),
    refetchInterval: 30000,
  });
  const { data: historyData } = useQuery<{ sessions: CashUpSession[] }>({
    queryKey: ["branch-cashups"],
    queryFn: () => fetch("/api/branch/cashups", { headers }).then(r => r.json()),
    enabled: historyOpen,
  });

  const agents = agentsData?.agents ?? [];
  const floats: FloatAllocation[] = floatsData?.floats ?? [];
  const sessions: CashUpSession[] = historyData?.sessions ?? [];
  const openFloats = floats.filter(f => f.status === "open");
  const closedFloats = floats.filter(f => f.status === "cashed_up");
  const branchBalance = parseFloat(String(branchInfo?.balance ?? "0"));

  const stats = useMemo(() => ({
    totalAllocated: floats.reduce((s, f) => s + f.amount, 0),
    open: openFloats.length,
    done: closedFloats.length,
  }), [floats, openFloats.length, closedFloats.length]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocating(true);
    try {
      const res = await apiFetch("/api/branch/floats", "POST", {
        agentId: parseInt(allocForm.agentId),
        amount: parseFloat(allocForm.amount),
        shiftDate, shiftLabel: allocForm.shiftLabel, notes: allocForm.notes || null,
      }, token);
      const msg = res.accumulated
        ? `Added $${parseFloat(allocForm.amount).toFixed(2)} to existing float`
        : `$${parseFloat(allocForm.amount).toFixed(2)} float allocated`;
      toast({ title: "Float allocated", description: msg });
      qc.invalidateQueries({ queryKey: ["branch-floats"] });
      qc.invalidateQueries({ queryKey: ["branch-info-cashup"] });
      setAllocForm({ agentId: "", amount: "", shiftLabel: "Day", notes: "" });
      setShowAllocate(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setAllocating(false); }
  };

  const openCashUp = async (id: number) => {
    setLoadingPreview(true);
    setCashUpId(id);
    setCashReturned("");
    setCashUpNotes("");
    try {
      const data = await apiFetch(`/api/branch/floats/${id}/preview`, "GET", null, token);
      setCashUpPreview(data);
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
      setCashUpId(null);
    } finally { setLoadingPreview(false); }
  };

  const handleCashUp = async () => {
    if (!cashUpId || !cashUpPreview || cashReturned === "") return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/branch/floats/${cashUpId}/cashup`, "POST", {
        cashReturned: parseFloat(cashReturned), notes: cashUpNotes || null,
      }, token);
      const v = parseFloat(cashReturned) - cashUpPreview.expectedReturn;
      toast({ title: "Cash up done", description: Math.abs(v) < 0.01 ? "Balanced." : v < 0 ? `Short $${Math.abs(v).toFixed(2)}` : `Surplus $${v.toFixed(2)}` });
      qc.invalidateQueries({ queryKey: ["branch-floats"] });
      qc.invalidateQueries({ queryKey: ["branch-cashups"] });
      qc.invalidateQueries({ queryKey: ["branch-info-cashup"] });
      setCashUpId(null);
      setCashUpPreview(null);
    } catch (err: any) {
      toast({ title: "Cash up failed", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const cashReturnedNum = parseFloat(cashReturned) || 0;
  const liveVariance = cashUpPreview ? cashReturnedNum - cashUpPreview.expectedReturn : 0;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" /> Cash Up
          </h1>
          <p className="text-xs text-zinc-400">Float allocation & end-of-shift reconciliation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-right">
            <p className="text-[10px] text-zinc-500">Branch Balance</p>
            <p className="text-sm font-black text-emerald-400">${branchBalance.toFixed(2)}</p>
          </div>
          <input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500" />
          <button onClick={() => setShowAllocate(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" /> Allocate Float
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total Allocated", val: `$${stats.totalAllocated.toFixed(2)}`, color: "text-emerald-400" },
          { label: "Open Shifts",     val: stats.open,                             color: "text-amber-400" },
          { label: "Cashed Up",       val: stats.done,                             color: "text-blue-400" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
            <p className="text-[10px] text-zinc-500 mb-0.5">{label}</p>
            <p className={`text-base font-black ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Open shifts */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> Open Shifts ({openFloats.length})
        </p>
        {floatsLoading ? (
          <div className="h-14 bg-zinc-800 rounded-lg animate-pulse" />
        ) : openFloats.length === 0 ? (
          <div className="bg-zinc-800/50 border border-zinc-700 border-dashed rounded-lg py-6 text-center text-xs text-zinc-500">
            No open shifts for {shiftDate === today ? "today" : shiftDate}
          </div>
        ) : (
          <div className="space-y-2">
            {openFloats.map(f => (
              <div key={f.id} className="bg-zinc-800 border border-amber-500/20 rounded-lg px-4 py-2.5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {(f.agentName || f.agentUsername).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">{f.agentName || f.agentUsername}</span>
                    <span className="text-[10px] text-zinc-500">@{f.agentUsername}</span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">{f.shiftLabel}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">{format(new Date(f.createdAt), "h:mm a")}{f.notes ? ` · ${f.notes}` : ""}</p>
                </div>
                <div className="text-right shrink-0 mr-2">
                  <p className="text-[10px] text-zinc-500">Float</p>
                  <p className="text-sm font-black text-white">${f.amount.toFixed(2)}</p>
                </div>
                <button onClick={() => openCashUp(f.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cash Up
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cashed up today */}
      {closedFloats.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Completed ({closedFloats.length})
          </p>
          <div className="space-y-1.5">
            {closedFloats.map(f => (
              <div key={f.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2 flex items-center justify-between gap-3 opacity-70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                    {(f.agentName || f.agentUsername).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-zinc-300">{f.agentName || f.agentUsername}</span>
                  <span className="text-[10px] text-zinc-500">{f.shiftLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-300">${f.amount.toFixed(2)}</span>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">Cashed Up</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="border border-zinc-700 rounded-lg overflow-hidden">
        <button onClick={() => setHistoryOpen(h => !h)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700/80 transition-colors text-xs font-semibold text-zinc-300">
          <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Cash Up History</span>
          {historyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {historyOpen && (
          <div className="divide-y divide-zinc-700/50 max-h-72 overflow-y-auto">
            {!historyData ? (
              <div className="p-4 text-center text-xs text-zinc-500">Loading…</div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">No history yet.</div>
            ) : sessions.map(s => {
              const isShort = s.variance < -0.005;
              const isSurplus = s.variance > 0.005;
              return (
                <div key={s.id} className="px-4 py-2.5 flex items-center gap-3 justify-between hover:bg-zinc-700/20">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{s.agentName || s.agentUsername}</span>
                      <span className="text-[10px] text-zinc-500">{s.shiftLabel} · {format(new Date(s.shiftDate), "d MMM")}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Float ${s.openingFloat.toFixed(2)} · Bets ${s.totalBets.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <p className="text-[10px] text-zinc-500">Expected</p>
                      <p className="text-xs font-bold text-zinc-200">${s.expectedReturn.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500">Returned</p>
                      <p className="text-xs font-bold text-zinc-200">${s.cashReturned.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500">Variance</p>
                      <p className={`text-xs font-black ${isShort ? "text-red-400" : isSurplus ? "text-amber-400" : "text-emerald-400"}`}>
                        {isShort ? "-" : isSurplus ? "+" : ""}${Math.abs(s.variance).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Allocate Float Modal */}
      {showAllocate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Allocate Float</h2>
              <button onClick={() => setShowAllocate(false)} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-zinc-800 rounded-lg px-3 py-1.5 mb-3 text-xs flex justify-between">
              <span className="text-zinc-400">Branch balance</span>
              <span className="font-bold text-emerald-400">${branchBalance.toFixed(2)}</span>
            </div>
            <form onSubmit={handleAllocate} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Agent</label>
                <select required value={allocForm.agentId} onChange={e => setAllocForm(f => ({ ...f, agentId: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="">— Select agent —</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {[a.firstName, a.lastName].filter(Boolean).join(" ") || a.username} (@{a.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Amount ($)</label>
                  <input required type="number" min="1" step="0.01" value={allocForm.amount}
                    onChange={e => setAllocForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Shift</label>
                  <select value={allocForm.shiftLabel} onChange={e => setAllocForm(f => ({ ...f, shiftLabel: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                    {SHIFT_LABELS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Notes (optional)</label>
                <input type="text" value={allocForm.notes} onChange={e => setAllocForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional note"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              {allocForm.amount && parseFloat(allocForm.amount) > branchBalance && (
                <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Exceeds branch balance</p>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAllocate(false)}
                  className="flex-1 border border-zinc-600 text-zinc-300 rounded-lg px-3 py-2 text-sm hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={allocating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 transition-colors">
                  {allocating ? "Allocating…" : "Allocate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Up Modal */}
      {cashUpId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> End-of-Shift Cash Up
              </h2>
              <button onClick={() => { setCashUpId(null); setCashUpPreview(null); }} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingPreview ? (
              <div className="flex items-center justify-center py-10 text-zinc-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
              </div>
            ) : cashUpPreview ? (
              <div className="space-y-4">
                {/* Breakdown */}
                <div className="bg-zinc-800 rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-zinc-700">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Opening Float</p>
                      <p className="text-[10px] text-zinc-500">Float given at start of shift</p>
                    </div>
                    <p className="text-sm font-bold text-white">${cashUpPreview.openingFloat.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-zinc-700">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Cash Collected</p>
                      <p className="text-[10px] text-zinc-500">Client bets placed</p>
                    </div>
                    <p className="text-sm font-bold text-red-400">-${cashUpPreview.totalBets.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-zinc-700/40">
                    <p className="text-sm font-bold text-white">Expected Return</p>
                    <p className="text-base font-black text-white">${cashUpPreview.expectedReturn.toFixed(2)}</p>
                  </div>
                </div>

                {/* Cash returned input */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Actual Cash Returned ($)</label>
                  <input type="number" min="0" step="0.01" value={cashReturned}
                    onChange={e => setCashReturned(e.target.value)}
                    placeholder="0.00" autoFocus
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-emerald-500" />
                </div>

                {/* Live variance */}
                {cashReturned !== "" && (
                  <div className={`rounded-lg px-3 py-2.5 border flex items-center justify-between ${
                    Math.abs(liveVariance) < 0.01 ? "bg-emerald-900/20 border-emerald-700"
                    : liveVariance < 0 ? "bg-red-900/20 border-red-700"
                    : "bg-amber-900/20 border-amber-700"
                  }`}>
                    <p className="text-xs text-zinc-300">
                      {Math.abs(liveVariance) < 0.01 ? "✓ Perfectly balanced"
                       : liveVariance < 0 ? "⚠ Agent is short"
                       : "Agent has surplus"}
                    </p>
                    <p className={`text-lg font-black ${Math.abs(liveVariance) < 0.01 ? "text-emerald-400" : liveVariance < 0 ? "text-red-400" : "text-amber-400"}`}>
                      {liveVariance >= 0 ? "+" : ""}{liveVariance.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Notes */}
                <input type="text" value={cashUpNotes} onChange={e => setCashUpNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />

                <div className="flex gap-2">
                  <button onClick={() => { setCashUpId(null); setCashUpPreview(null); }}
                    className="flex-1 border border-zinc-600 text-zinc-300 rounded-lg px-3 py-2 text-sm hover:bg-zinc-800 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleCashUp} disabled={cashReturned === "" || submitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                    {submitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing…</> : "Confirm Cash Up"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
