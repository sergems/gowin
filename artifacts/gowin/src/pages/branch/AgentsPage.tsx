import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { useSiteSettings } from "../../contexts/SiteSettingsContext";
import { Users, Plus, UserX, UserCheck, DollarSign, ShieldCheck } from "lucide-react";

interface Agent {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  disabled: boolean;
  role: string;
  commissionRate: number;
  createdAt: string;
  betsPlaced: number;
  totalStake: number;
  vouchersSold: number;
}

const emptyForm = { username: "", email: "", firstName: "", lastName: "", phoneNumber: "", commissionRate: "", role: "agent" };

export default function BranchAgentsPage() {
  const { formatCurrency } = useSiteSettings();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [tempCred, setTempCred] = useState<{ username: string; email: string; tempPassword: string; role: string } | null>(null);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["branch-agents"],
    queryFn: () => api.get<{ agents: Agent[] }>("/api/branch/agents").then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (body: typeof emptyForm) =>
      api.post<{ agent: { username: string; email: string; role: string }; tempPassword: string }>("/api/branch/agents", {
        ...body,
        commissionRate: body.role === "agent" ? (parseFloat(body.commissionRate) || 0) : 0,
      }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["branch-agents"] });
      setShowCreate(false);
      setForm(emptyForm);
      setTempCred({ username: data.agent.username, email: data.agent.email, tempPassword: data.tempPassword, role: data.agent.role });
      setError("");
    },
    onError: (e: any) => setError(e.response?.data?.error ?? e.message ?? "Failed to create staff account"),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, disabled }: { id: number; disabled: boolean }) =>
      api.patch<{ ok: boolean }>(`/api/branch/agents/${id}/suspend`, { disabled }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branch-agents"] }),
    onError: (e: any) => toast({ title: "Error", description: e.response?.data?.error ?? e.message ?? "Failed to update staff status", variant: "destructive" }),
  });

  const agents: Agent[] = data?.agents ?? [];
  const agentList = agents.filter(a => a.role === "agent");
  const payoutList = agents.filter(a => a.role === "payout");

  const StaffCard = ({ agent }: { agent: Agent }) => (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className="font-semibold text-white">
              {agent.firstName || agent.lastName
                ? `${agent.firstName ?? ""} ${agent.lastName ?? ""}`.trim()
                : agent.username}
            </p>
            <span className="text-xs text-zinc-500">@{agent.username}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${!agent.disabled ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
              {agent.disabled ? "Suspended" : "Active"}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>✉️ {agent.email}</span>
            {agent.phoneNumber && <span>📞 {agent.phoneNumber}</span>}
            {agent.role === "agent" && (
              <>
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {agent.commissionRate}% commission</span>
                <span>🎯 {agent.betsPlaced} bets · {formatCurrency(agent.totalStake)}</span>
                <span>🎫 {agent.vouchersSold} vouchers</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => suspendMut.mutate({ id: agent.id, disabled: !agent.disabled })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${agent.disabled ? "bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-400" : "bg-red-900/40 hover:bg-red-900/70 text-red-400"}`}>
          {agent.disabled ? <><UserCheck className="w-3.5 h-3.5" /> Activate</> : <><UserX className="w-3.5 h-3.5" /> Suspend</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-400" />
            Branch Staff
          </h1>
          <p className="text-zinc-400 mt-1">Manage agents and payout staff in your branch</p>
        </div>
        <button onClick={() => { setShowCreate(true); setForm(emptyForm); setError(""); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Staff
        </button>
      </div>

      {tempCred && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-emerald-300 mb-2">
                {tempCred.role === "payout" ? "Payout Agent Account Created" : "Agent Account Created"}
              </p>
              <p className="text-sm text-zinc-300">Username: <span className="font-mono text-white">{tempCred.username}</span></p>
              <p className="text-sm text-zinc-300">Email: <span className="font-mono text-white">{tempCred.email}</span></p>
              <p className="text-sm text-zinc-300">Temp Password: <span className="font-mono text-yellow-300 text-base">{tempCred.tempPassword}</span></p>
              <p className="text-xs text-zinc-500 mt-1">Share these credentials securely. Staff must change password on first login.</p>
            </div>
            <button onClick={() => setTempCred(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-zinc-400 text-center py-16">Loading...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No staff yet. Add your first agent or payout staff.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Agents */}
          {agentList.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Agents ({agentList.length})
              </h2>
              <div className="grid gap-3">
                {agentList.map((agent) => <StaffCard key={agent.id} agent={agent} />)}
              </div>
            </div>
          )}

          {/* Payout staff */}
          {payoutList.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" /> Payout Desk ({payoutList.length})
              </h2>
              <div className="grid gap-3">
                {payoutList.map((agent) => <StaffCard key={agent.id} agent={agent} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">New Staff Account</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

            {/* Role selector */}
            <div className="mb-4">
              <label className="text-xs text-zinc-400 mb-1.5 block">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "agent", label: "Agent", desc: "Places bets, sells vouchers" },
                  { value: "payout", label: "Payout Agent", desc: "Pays out winning tickets" },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: value }))}
                    className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                      form.role === value
                        ? "border-emerald-500 bg-emerald-900/20 text-white"
                        : "border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                    }`}>
                    <p className="font-semibold">{label}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: "username", label: "Username", placeholder: form.role === "payout" ? "payout_lagos" : "agent_lagos" },
                { key: "email", label: "Email", placeholder: "staff@branch.com" },
                { key: "firstName", label: "First Name", placeholder: "John" },
                { key: "lastName", label: "Last Name", placeholder: "Doe" },
                { key: "phoneNumber", label: "Phone", placeholder: "+234 800 000 0000" },
                ...(form.role === "agent" ? [{ key: "commissionRate", label: "Commission Rate (%)", placeholder: "5" }] : []),
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
                  <input
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    placeholder={placeholder}
                    type={key === "commissionRate" ? "number" : "text"}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowCreate(false); setError(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm">
                Cancel
              </button>
              <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {createMut.isPending ? "Creating…" : `Create ${form.role === "payout" ? "Payout Agent" : "Agent"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
