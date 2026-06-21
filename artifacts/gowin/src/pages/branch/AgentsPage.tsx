import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { Users, Plus, UserX, UserCheck, DollarSign } from "lucide-react";

interface Agent {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  disabled: boolean;
  commissionRate: number;
  createdAt: string;
  betsPlaced: number;
  totalStake: number;
  vouchersSold: number;
}

const emptyForm = { username: "", email: "", firstName: "", lastName: "", phoneNumber: "", commissionRate: "" };

export default function BranchAgentsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [tempCred, setTempCred] = useState<{ username: string; email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["branch-agents"],
    queryFn: () => api.get<{ agents: Agent[] }>("/api/branch/agents").then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (body: typeof emptyForm) => api.post<{ agent: { username: string; email: string }; tempPassword: string }>("/api/branch/agents", { ...body, commissionRate: parseFloat(body.commissionRate) || 0 }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["branch-agents"] });
      setShowCreate(false);
      setForm(emptyForm);
      setTempCred({ username: data.agent.username, email: data.agent.email, tempPassword: data.tempPassword });
      setError("");
    },
    onError: (e: any) => setError(e.message ?? "Failed to create agent"),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, disabled }: { id: number; disabled: boolean }) =>
      api.patch<{ ok: boolean }>(`/api/branch/agents/${id}/suspend`, { disabled }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branch-agents"] }),
  });

  const agents: Agent[] = data?.agents ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-400" />
            Agents
          </h1>
          <p className="text-zinc-400 mt-1">Manage agents in your branch</p>
        </div>
        <button onClick={() => { setShowCreate(true); setForm(emptyForm); setError(""); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Agent
        </button>
      </div>

      {tempCred && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-emerald-300 mb-2">Agent Account Created</p>
              <p className="text-sm text-zinc-300">Username: <span className="font-mono text-white">{tempCred.username}</span></p>
              <p className="text-sm text-zinc-300">Email: <span className="font-mono text-white">{tempCred.email}</span></p>
              <p className="text-sm text-zinc-300">Temp Password: <span className="font-mono text-yellow-300 text-base">{tempCred.tempPassword}</span></p>
              <p className="text-xs text-zinc-500 mt-1">Share these credentials securely. Agent must change password on first login.</p>
            </div>
            <button onClick={() => setTempCred(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-zinc-400 text-center py-16">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No agents yet. Add your first agent.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
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
                  <div className="flex gap-6 text-xs text-zinc-500">
                    <span>✉️ {agent.email}</span>
                    {agent.phoneNumber && <span>📞 {agent.phoneNumber}</span>}
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {agent.commissionRate}% commission</span>
                    <span>🎯 {agent.betsPlaced} bets · ${agent.totalStake.toFixed(2)}</span>
                    <span>🎫 {agent.vouchersSold} vouchers</span>
                  </div>
                </div>
                <button
                  onClick={() => suspendMut.mutate({ id: agent.id, disabled: !agent.disabled })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${agent.disabled ? "bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-400" : "bg-red-900/40 hover:bg-red-900/70 text-red-400"}`}>
                  {agent.disabled ? <><UserCheck className="w-3.5 h-3.5" /> Activate</> : <><UserX className="w-3.5 h-3.5" /> Suspend</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">New Agent</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              {[
                { key: "username", label: "Username", placeholder: "agent_lagos" },
                { key: "email", label: "Email", placeholder: "agent@branch.com" },
                { key: "firstName", label: "First Name", placeholder: "John" },
                { key: "lastName", label: "Last Name", placeholder: "Doe" },
                { key: "phoneNumber", label: "Phone", placeholder: "+234 800 000 0000" },
                { key: "commissionRate", label: "Commission Rate (%)", placeholder: "5" },
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
                Create Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
