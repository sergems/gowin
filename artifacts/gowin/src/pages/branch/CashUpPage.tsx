import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Users, Plus, CheckCircle2, AlertTriangle, TrendingUp,
  TrendingDown, Clock, ChevronDown, ChevronUp, RefreshCw, X,
} from "lucide-react";
import { format } from "date-fns";

interface Agent {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  commissionRate: number;
}

interface FloatAllocation {
  id: number;
  agentId: number;
  agentUsername: string;
  agentName: string | null;
  amount: number;
  shiftDate: string;
  shiftLabel: string;
  status: "open" | "cashed_up";
  notes: string | null;
  createdAt: string;
}

interface CashUpPreview {
  openingFloat: number;
  totalBets: number;
  expectedReturn: number;
}

interface CashUpSession {
  id: number;
  agentUsername: string;
  agentName: string | null;
  performedByUsername: string;
  openingFloat: number;
  totalBets: number;
  totalPayouts: number;
  expectedReturn: number;
  cashReturned: number;
  variance: number;
  shiftDate: string;
  shiftLabel: string;
  notes: string | null;
  createdAt: string;
}

interface BranchInfo {
  id: number;
  name: string;
  balance: number | string;
}

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

function VarianceBadge({ variance }: { variance: number }) {
  if (Math.abs(variance) < 0.01) {
    return (
      <span className="flex items-center gap-1 text-emerald-400 font-bold">
        <CheckCircle2 className="w-4 h-4" /> Balanced
      </span>
    );
  }
  if (variance < 0) {
    return (
      <span className="flex items-center gap-1 text-red-400 font-bold">
        <AlertTriangle className="w-4 h-4" /> Short ${Math.abs(variance).toFixed(2)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-amber-400 font-bold">
      <TrendingUp className="w-4 h-4" /> Surplus ${variance.toFixed(2)}
    </span>
  );
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
  const [submittingCashUp, setSubmittingCashUp] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const { data: branchInfo } = useQuery<BranchInfo>({
    queryKey: ["branch-info-cashup"],
    queryFn: () => fetch("/api/branch/info", { headers }).then(r => r.json()).then(d => d.branch),
  });

  const branchBalance = parseFloat(String(branchInfo?.balance ?? "0"));

  const { data: agentsData } = useQuery<{ agents: Agent[] }>({
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

  const agents: Agent[] = agentsData?.agents ?? [];
  const floats: FloatAllocation[] = floatsData?.floats ?? [];
  const sessions: CashUpSession[] = historyData?.sessions ?? [];

  const openFloats = floats.filter(f => f.status === "open");
  const closedFloats = floats.filter(f => f.status === "cashed_up");

  const shiftStats = useMemo(() => {
    const totalAllocated = floats.reduce((s, f) => s + f.amount, 0);
    const doneCount = closedFloats.length;
    const openCount = openFloats.length;
    return { totalAllocated, doneCount, openCount };
  }, [floats, openFloats, closedFloats]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocating(true);
    try {
      await apiFetch("/api/branch/floats", "POST", {
        agentId: parseInt(allocForm.agentId),
        amount: parseFloat(allocForm.amount),
        shiftDate,
        shiftLabel: allocForm.shiftLabel,
        notes: allocForm.notes || null,
      }, token);
      toast({ title: "Float allocated", description: `$${parseFloat(allocForm.amount).toFixed(2)} sent to agent` });
      qc.invalidateQueries({ queryKey: ["branch-floats"] });
      qc.invalidateQueries({ queryKey: ["branch-info-cashup"] });
      setAllocForm({ agentId: "", amount: "", shiftLabel: "Day", notes: "" });
      setShowAllocate(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setAllocating(false);
    }
  };

  const openCashUp = async (allocationId: number) => {
    setLoadingPreview(true);
    setCashUpId(allocationId);
    setCashReturned("");
    setCashUpNotes("");
    try {
      const data = await apiFetch(`/api/branch/floats/${allocationId}/preview`, "GET", null, token);
      setCashUpPreview(data);
    } catch (err: any) {
      toast({ title: "Failed to load preview", description: err.message, variant: "destructive" });
      setCashUpId(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCashUp = async () => {
    if (!cashUpId || !cashUpPreview || cashReturned === "") return;
    setSubmittingCashUp(true);
    try {
      await apiFetch(`/api/branch/floats/${cashUpId}/cashup`, "POST", {
        cashReturned: parseFloat(cashReturned),
        notes: cashUpNotes || null,
      }, token);
      const variance = parseFloat(cashReturned) - cashUpPreview.expectedReturn;
      const msg = Math.abs(variance) < 0.01
        ? "Sheets balanced perfectly."
        : variance < 0
        ? `Short by $${Math.abs(variance).toFixed(2)} — flagged.`
        : `Surplus of $${variance.toFixed(2)} returned to branch.`;
      toast({ title: "Cash up complete", description: msg });
      qc.invalidateQueries({ queryKey: ["branch-floats"] });
      qc.invalidateQueries({ queryKey: ["branch-cashups"] });
      qc.invalidateQueries({ queryKey: ["branch-info-cashup"] });
      setCashUpId(null);
      setCashUpPreview(null);
    } catch (err: any) {
      toast({ title: "Cash up failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingCashUp(false);
    }
  };

  const cashReturnedNum = parseFloat(cashReturned) || 0;
  const liveVariance = cashUpPreview ? cashReturnedNum - cashUpPreview.expectedReturn : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Cash Up
          </h1>
          <p className="text-zinc-400 mt-1">Manage daily float allocation and end-of-shift reconciliation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-right">
            <p className="text-xs text-zinc-500">Branch Balance</p>
            <p className="text-lg font-black text-emerald-400">${branchBalance.toFixed(2)}</p>
          </div>
          <input
            type="date"
            value={shiftDate}
            onChange={e => setShiftDate(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => setShowAllocate(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Allocate Float
          </button>
        </div>
      </div>

      {/* Shift summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Allocated",  value: `$${shiftStats.totalAllocated.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400" },
          { label: "Open Shifts",      value: shiftStats.openCount,                        icon: Clock,      color: "text-amber-400" },
          { label: "Cashed Up",        value: shiftStats.doneCount,                        icon: CheckCircle2, color: "text-blue-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-4">
            <Icon className={`w-6 h-6 ${color} shrink-0`} />
            <div>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Open floats */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" /> Open Shifts ({openFloats.length})
        </h2>
        {floatsLoading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 bg-zinc-800 rounded-xl animate-pulse" />)}</div>
        ) : openFloats.length === 0 ? (
          <div className="bg-zinc-800/50 border border-zinc-700 border-dashed rounded-xl p-8 text-center text-zinc-500">
            No open shifts for {shiftDate === today ? "today" : shiftDate}. Allocate a float to start.
          </div>
        ) : (
          <div className="space-y-3">
            {openFloats.map(f => (
              <div key={f.id} className="bg-zinc-800 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {(f.agentName || f.agentUsername).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{f.agentName || f.agentUsername}</span>
                      <span className="text-xs text-zinc-500">@{f.agentUsername}</span>
                      <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">{f.shiftLabel}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">Allocated {format(new Date(f.createdAt), "h:mm a")}{f.notes ? ` · ${f.notes}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Float</p>
                    <p className="text-lg font-black text-white">${f.amount.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => openCashUp(f.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Cash Up
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cashed up today */}
      {closedFloats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" /> Completed Today ({closedFloats.length})
          </h2>
          <div className="space-y-2">
            {closedFloats.map(f => (
              <div key={f.id} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 flex items-center justify-between gap-4 opacity-75">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                    {(f.agentName || f.agentUsername).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium text-zinc-300">{f.agentName || f.agentUsername}</span>
                    <span className="ml-2 text-xs text-zinc-500">{f.shiftLabel} shift</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-zinc-300">${f.amount.toFixed(2)}</span>
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Cashed Up
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History accordion */}
      <div className="border border-zinc-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setHistoryOpen(h => !h)}
          className="w-full flex items-center justify-between px-5 py-4 bg-zinc-800 hover:bg-zinc-700/80 transition-colors text-sm font-semibold text-zinc-300"
        >
          <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Cash Up History</span>
          {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {historyOpen && (
          <div className="divide-y divide-zinc-700/50">
            {!historyData ? (
              <div className="p-6 text-center text-zinc-500">Loading…</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No cash up history yet.</div>
            ) : (
              sessions.map(s => {
                const isShort = s.variance < -0.005;
                const isSurplus = s.variance > 0.005;
                return (
                  <div key={s.id} className="px-5 py-4 flex flex-wrap items-center gap-4 justify-between hover:bg-zinc-700/20">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{s.agentName || s.agentUsername}</span>
                        <span className="text-xs text-zinc-500">{s.shiftLabel} · {format(new Date(s.shiftDate), "MMM d, yyyy")}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Float ${s.openingFloat.toFixed(2)} · Bets ${s.totalBets.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-xs text-zinc-500">Expected</p>
                        <p className="text-sm font-bold text-zinc-200">${s.expectedReturn.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Returned</p>
                        <p className="text-sm font-bold text-zinc-200">${s.cashReturned.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Variance</p>
                        <p className={`text-sm font-black ${isShort ? "text-red-400" : isSurplus ? "text-amber-400" : "text-emerald-400"}`}>
                          {isShort ? "-" : isSurplus ? "+" : ""}${Math.abs(s.variance).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Allocate Float Modal */}
      {showAllocate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Allocate Float to Agent</h2>
              <button onClick={() => setShowAllocate(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-zinc-800 rounded-lg px-4 py-2 mb-4 text-sm flex justify-between">
              <span className="text-zinc-400">Branch balance</span>
              <span className="font-bold text-emerald-400">${branchBalance.toFixed(2)}</span>
            </div>
            <form onSubmit={handleAllocate} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Agent</label>
                <select
                  required
                  value={allocForm.agentId}
                  onChange={e => setAllocForm(f => ({ ...f, agentId: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">— Select agent —</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {[a.firstName, a.lastName].filter(Boolean).join(" ") || a.username} (@{a.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Float Amount ($)</label>
                  <input
                    required
                    type="number" min="1" step="0.01"
                    value={allocForm.amount}
                    onChange={e => setAllocForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Shift</label>
                  <select
                    value={allocForm.shiftLabel}
                    onChange={e => setAllocForm(f => ({ ...f, shiftLabel: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {SHIFT_LABELS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={allocForm.notes}
                  onChange={e => setAllocForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Extra float for weekend"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              {allocForm.amount && parseFloat(allocForm.amount) > branchBalance && (
                <p className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Amount exceeds branch balance
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAllocate(false)}
                  className="flex-1 border border-zinc-600 text-zinc-300 rounded-lg px-4 py-2 text-sm hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={allocating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors">
                  {allocating ? "Allocating…" : "Allocate Float"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Up Modal */}
      {cashUpId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> End-of-Shift Cash Up
              </h2>
              <button onClick={() => { setCashUpId(null); setCashUpPreview(null); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingPreview ? (
              <div className="flex items-center justify-center py-12 text-zinc-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading shift data…
              </div>
            ) : cashUpPreview ? (
              <div className="space-y-5">
                {/* Breakdown */}
                <div className="bg-zinc-800 rounded-xl divide-y divide-zinc-700">
                  {[
                    { label: "Opening Float",  value: cashUpPreview.openingFloat, color: "text-white",         desc: "Float given at start of shift" },
                    { label: "Cash Collected", value: -cashUpPreview.totalBets,   color: "text-red-400",       desc: "Client bets placed (cash received)" },
                  ].map(({ label, value, color, desc }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{label}</p>
                        <p className="text-xs text-zinc-500">{desc}</p>
                      </div>
                      <p className={`text-base font-bold ${color}`}>
                        {value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-700/40">
                    <div>
                      <p className="text-sm font-bold text-white">Expected Return</p>
                      <p className="text-xs text-zinc-400">What agent should hand back</p>
                    </div>
                    <p className="text-lg font-black text-white">${cashUpPreview.expectedReturn.toFixed(2)}</p>
                  </div>
                </div>

                {/* Cash returned input */}
                <div>
                  <label className="text-sm font-semibold text-zinc-300 block mb-2">Actual Cash Returned by Agent ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={cashReturned}
                    onChange={e => setCashReturned(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                {/* Live variance */}
                {cashReturned !== "" && (
                  <div className={`rounded-xl px-4 py-3 border flex items-center justify-between ${
                    Math.abs(liveVariance) < 0.01
                      ? "bg-emerald-900/20 border-emerald-700"
                      : liveVariance < 0
                      ? "bg-red-900/20 border-red-700"
                      : "bg-amber-900/20 border-amber-700"
                  }`}>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Variance</p>
                      <p className="text-xs text-zinc-400">
                        {Math.abs(liveVariance) < 0.01
                          ? "Perfectly balanced"
                          : liveVariance < 0
                          ? "Agent is short — difference flagged"
                          : "Agent has surplus — will return to branch"}
                      </p>
                    </div>
                    <p className={`text-2xl font-black ${
                      Math.abs(liveVariance) < 0.01 ? "text-emerald-400"
                      : liveVariance < 0 ? "text-red-400"
                      : "text-amber-400"
                    }`}>
                      {liveVariance >= 0 ? "+" : ""}{liveVariance.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={cashUpNotes}
                    onChange={e => setCashUpNotes(e.target.value)}
                    placeholder="e.g. Agent explained missing $5 due to client dispute"
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setCashUpId(null); setCashUpPreview(null); }}
                    className="flex-1 border border-zinc-600 text-zinc-300 rounded-lg px-4 py-2 text-sm hover:bg-zinc-800 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleCashUp}
                    disabled={cashReturned === "" || submittingCashUp}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {submittingCashUp ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : "Confirm Cash Up"}
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
