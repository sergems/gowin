import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import {
  Building2, Plus, Pencil, Trash2, Users, UserPlus, ChevronDown, ChevronRight,
  ShieldCheck, Target, DollarSign, BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Branch {
  id: number;
  name: string;
  code: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  status: "active" | "suspended";
  balance: number | string;
  createdAt: string;
  agentCount: number;
}

interface BranchMember {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  commissionRate: number;
  disabled: boolean;
  createdAt: string;
  betsPlaced: number;
  turnover: number;
}

const emptyForm = { name: "", code: "", country: "", city: "", address: "", phone: "", email: "" };

const ROLE_META: Record<string, { label: string; color: string; icon: typeof ShieldCheck }> = {
  branch_admin: { label: "Branch Admin", color: "bg-blue-600 text-white", icon: ShieldCheck },
  agent:        { label: "Agent",        color: "bg-violet-600 text-white", icon: Target },
};

function MembersList({ branchId, token }: { branchId: number; token: string | null }) {
  const { formatCurrency, t } = useSiteSettings();
  const { data, isLoading } = useQuery<{ members: BranchMember[] }>({
    queryKey: ["branch-members", branchId],
    queryFn: () => fetch(`/api/admin/branches/${branchId}/members`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(r => r.json()),
  });

  const members = data?.members ?? [];

  if (isLoading) {
    return <div className="px-5 py-4 text-sm text-zinc-400">{t("branches.loading_members")}</div>;
  }

  if (members.length === 0) {
    return (
      <div className="px-5 py-4 text-sm text-zinc-500 text-center">
        {t("branches.no_members")}
        <br />
        <span className="text-xs">{t("branches.members_assign_hint")}</span>
      </div>
    );
  }

  const branchAdmins = members.filter(m => m.role === "branch_admin");
  const agents = members.filter(m => m.role === "agent");
  const totalTurnover = members.reduce((s, m) => s + m.turnover, 0);
  const totalBets = members.reduce((s, m) => s + m.betsPlaced, 0);

  return (
    <div className="border-t border-zinc-700">
      <div className="grid grid-cols-4 gap-px bg-zinc-700">
        {[
          { label: t("branches.branch_admins"), value: branchAdmins.length, icon: ShieldCheck, color: "text-blue-400" },
          { label: t("branches.agents"),        value: agents.length,        icon: Target,      color: "text-violet-400" },
          { label: t("branches.bets_placed"),   value: totalBets,            icon: BarChart3,   color: "text-yellow-400" },
          { label: t("branches.total_turnover"), value: formatCurrency(totalTurnover), icon: DollarSign, color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-zinc-800/80 px-4 py-3 flex items-center gap-3">
            <Icon className={`w-4 h-4 ${color} shrink-0`} />
            <div>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`text-sm font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="divide-y divide-zinc-700/50">
        {members.map((m) => {
          const meta = ROLE_META[m.role] ?? { label: m.role, color: "bg-zinc-600 text-white", icon: Users };
          const displayName = [m.firstName, m.lastName].filter(Boolean).join(" ") || m.username;
          return (
            <div key={m.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-zinc-700/30 transition-colors ${m.disabled ? "opacity-50" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate">{displayName}</span>
                  <Badge className={`text-[10px] px-1.5 py-0.5 ${meta.color}`}>{meta.label}</Badge>
                  {m.disabled && <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">{t("branches.blocked")}</Badge>}
                </div>
                <p className="text-xs text-zinc-400 truncate">{m.email}</p>
              </div>
              <div className="hidden md:flex items-center gap-6 text-right shrink-0">
                {m.role === "agent" && (
                  <div>
                    <p className="text-xs text-zinc-500">{t("branches.commission")}</p>
                    <p className="text-sm font-semibold text-zinc-200">{m.commissionRate}%</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-zinc-500">{t("branches.bets")}</p>
                  <p className="text-sm font-semibold text-zinc-200">{m.betsPlaced}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">{t("branches.turnover")}</p>
                  <p className="text-sm font-semibold text-emerald-400">{formatCurrency(m.turnover)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">{t("branches.since")}</p>
                  <p className="text-xs text-zinc-400">{format(new Date(m.createdAt), "MMM d, yyyy")}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 bg-zinc-800/30 border-t border-zinc-700/50">
        <p className="text-xs text-zinc-500">{t("branches.members_footer")}</p>
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const { token } = useAuth();
  const { formatCurrency, t } = useSiteSettings();
  const [showCreate, setShowCreate] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [adminForm, setAdminForm] = useState({ username: "", email: "", firstName: "", lastName: "" });
  const [showAddAdmin, setShowAddAdmin] = useState<number | null>(null);
  const [tempCred, setTempCred] = useState<{ username: string; email: string; tempPassword: string } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [creditBranch, setCreditBranch] = useState<Branch | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNotes, setCreditNotes] = useState("");
  const [creditLoading, setCreditLoading] = useState(false);
  const [debitBranch, setDebitBranch] = useState<Branch | null>(null);
  const [debitAmount, setDebitAmount] = useState("");
  const [debitNotes, setDebitNotes] = useState("");
  const [debitLoading, setDebitLoading] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-branches"],
    queryFn: () => api.get<{ branches: Branch[] }>("/api/admin/branches").then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (body: typeof emptyForm) => api.post<Branch>("/api/admin/branches", body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-branches"] }); setShowCreate(false); setForm(emptyForm); setError(""); },
    onError: (e: any) => setError(e.message ?? "Failed to create branch"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<typeof emptyForm & { status: string }> }) =>
      api.patch<Branch>(`/api/admin/branches/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-branches"] }); setEditBranch(null); setError(""); },
    onError: (e: any) => setError(e.message ?? "Failed to update branch"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete<{ ok: boolean }>(`/api/admin/branches/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-branches"] }),
  });

  const addAdminMut = useMutation({
    mutationFn: ({ branchId, body }: { branchId: number; body: typeof adminForm }) =>
      api.post<{ user: { username: string; email: string }; tempPassword: string }>(`/api/admin/branches/${branchId}/admins`, body).then((r) => r.data),
    onSuccess: (data) => {
      setTempCred({ username: data.user.username, email: data.user.email, tempPassword: data.tempPassword });
      setShowAddAdmin(null);
      setAdminForm({ username: "", email: "", firstName: "", lastName: "" });
      qc.invalidateQueries({ queryKey: ["branch-members"] });
      qc.invalidateQueries({ queryKey: ["admin-branches"] });
    },
    onError: (e: any) => setError(e.message ?? "Failed to create branch admin"),
  });

  const branches: Branch[] = data?.branches ?? [];

  function openEdit(b: Branch) {
    setEditBranch(b);
    setForm({ name: b.name, code: b.code, country: b.country, city: b.city, address: b.address, phone: b.phone, email: b.email });
    setError("");
  }

  const toggleExpand = (id: number) => setExpandedId(prev => prev === id ? null : id);

  const formFields = [
    { key: "name",    label: t("branches.branch_name"), placeholder: "Lagos Central" },
    { key: "code",    label: t("branches.branch_code"), placeholder: "LGS001", disabled: !!editBranch },
    { key: "country", label: t("branches.country"),     placeholder: "Nigeria" },
    { key: "city",    label: t("branches.city"),        placeholder: "Lagos" },
    { key: "address", label: t("branches.address"),     placeholder: "123 Main Street" },
    { key: "phone",   label: t("branches.phone"),       placeholder: "+234 800 000 0000" },
    { key: "email",   label: t("common.email"),         placeholder: "lagos@gowin.com" },
  ];

  const adminFormFields = [
    { key: "username",  label: t("register.username"),   placeholder: "lagos_admin" },
    { key: "email",     label: t("common.email"),        placeholder: "admin@branch.com" },
    { key: "firstName", label: t("profile.first_name"),  placeholder: "John" },
    { key: "lastName",  label: t("profile.last_name"),   placeholder: "Doe" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-start gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 shrink-0" />
            {t("branches.title")}
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">{t("branches.desc")}</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm(emptyForm); setError(""); }}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">{t("branches.new")}</span>
          <span className="xs:hidden">New</span>
        </button>
      </div>

      {tempCred && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-emerald-300 mb-2">{t("branches.admin_created")}</p>
              <p className="text-sm text-zinc-300">Username: <span className="font-mono text-white">{tempCred.username}</span></p>
              <p className="text-sm text-zinc-300">Email: <span className="font-mono text-white">{tempCred.email}</span></p>
              <p className="text-sm text-zinc-300">Temp Password: <span className="font-mono text-yellow-300 text-base">{tempCred.tempPassword}</span></p>
              <p className="text-xs text-zinc-500 mt-1">{t("branches.share_hint")}</p>
            </div>
            <button onClick={() => setTempCred(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-zinc-400 text-center py-16">{t("branches.loading")}</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("branches.none")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <div key={b.id} className="bg-zinc-800/80 border border-zinc-700/60 rounded-xl overflow-hidden hover:border-zinc-600/80 transition-colors">

              {/* ── Top row: identity + edit/delete ── */}
              <div className="px-4 pt-3 pb-2 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-700/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white text-sm">{b.name}</h3>
                    <span className="font-mono text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">{b.code}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${b.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                      {b.status}
                    </span>
                  </div>
                  {/* Contact details — icon pinned, text flows to full width */}
                  <div className="flex flex-col gap-0.5 mt-1.5 text-xs text-zinc-500 text-left">
                    <div className="flex items-start gap-1">
                      <span className="shrink-0">📍</span>
                      <span className="break-all">{b.city}, {b.country}{b.address ? ` — ${b.address}` : ""}</span>
                    </div>
                    {b.phone && (
                      <div className="flex items-center gap-1">
                        <span className="shrink-0">📞</span>
                        <span>{b.phone}</span>
                      </div>
                    )}
                    {b.email && (
                      <div className="flex items-center gap-1">
                        <span className="shrink-0">✉️</span>
                        <span className="break-all">{b.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Edit + delete always visible, top-right */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(b)}
                    className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm(`Delete branch "${b.name}"?`)) deleteMut.mutate(b.id); }}
                    className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Stats row: balance + members ── */}
              <div className="px-4 pb-2 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 text-emerald-400 font-bold">
                  <DollarSign className="w-3 h-3" />
                  {formatCurrency(parseFloat(String(b.balance ?? "0")))}
                </span>
                <span className="flex items-center gap-1 text-zinc-500">
                  <Users className="w-3 h-3" />
                  {b.agentCount !== 1
                    ? t("branches.member_count_plural").replace("{n}", String(b.agentCount))
                    : t("branches.member_count").replace("{n}", String(b.agentCount))}
                </span>
              </div>

              {/* ── Action row: Credit / Debit / Members / Add Admin ── */}
              <div className="px-3 pb-3 grid grid-cols-4 gap-1.5 border-t border-zinc-700/40 pt-2.5">
                <button
                  onClick={() => { setCreditBranch(b); setCreditAmount(""); setCreditNotes(""); setError(""); }}
                  className="flex flex-col items-center gap-1 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-medium transition-colors border border-emerald-500/20"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{t("branches.credit")}</span>
                </button>
                <button
                  onClick={() => { setDebitBranch(b); setDebitAmount(""); setDebitNotes(""); setError(""); }}
                  className="flex flex-col items-center gap-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-medium transition-colors border border-red-500/20"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Debit</span>
                </button>
                <button
                  onClick={() => setShowAddAdmin(b.id)}
                  className="flex flex-col items-center gap-1 py-2 rounded-lg bg-zinc-700/40 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 text-[10px] font-medium transition-colors border border-zinc-600/40"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Admin</span>
                </button>
                <button
                  onClick={() => toggleExpand(b.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-colors border ${expandedId === b.id ? "bg-zinc-600/60 border-zinc-500/40 text-zinc-200" : "bg-zinc-700/40 border-zinc-600/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"}`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{expandedId === b.id ? "Hide" : t("branches.members")}</span>
                </button>
              </div>

              {expandedId === b.id && <MembersList branchId={b.id} token={token} />}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {(showCreate || editBranch) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              {editBranch ? t("branches.edit_title") : t("branches.new_title")}
            </h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              {formFields.map(({ key, label, placeholder, disabled }) => (
                <div key={key}>
                  <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
                  <input
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    placeholder={placeholder}
                    disabled={disabled}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              {editBranch && (
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">{t("branches.status")}</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white"
                    value={editBranch.status}
                    onChange={(e) => setEditBranch((b) => b ? { ...b, status: e.target.value as any } : b)}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowCreate(false); setEditBranch(null); setError(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm">
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  if (editBranch) updateMut.mutate({ id: editBranch.id, body: { ...form, status: editBranch.status } });
                  else createMut.mutate(form);
                }}
                disabled={createMut.isPending || updateMut.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {editBranch ? t("branches.save") : t("branches.create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Branch modal */}
      {creditBranch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-1">{t("branches.credit_title")}</h2>
            <p className="text-sm text-zinc-400 mb-1">{t("branches.branch_label")}: <span className="text-white font-medium">{creditBranch.name}</span></p>
            <p className="text-sm text-zinc-400 mb-4">{t("branches.current_balance")}: <span className="text-emerald-400 font-bold">{formatCurrency(parseFloat(String(creditBranch.balance ?? "0")))}</span></p>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">{t("branches.amount")}</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 5000.00"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">{t("branches.notes")}</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly float allocation"
                  value={creditNotes}
                  onChange={e => setCreditNotes(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setCreditBranch(null); setError(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm">
                {t("common.cancel")}
              </button>
              <button
                disabled={creditLoading || !creditAmount || parseFloat(creditAmount) <= 0}
                onClick={async () => {
                  if (!creditBranch || !creditAmount) return;
                  setCreditLoading(true);
                  setError("");
                  try {
                    await api.post(`/api/admin/branches/${creditBranch.id}/credit`, {
                      amount: parseFloat(creditAmount),
                      notes: creditNotes || undefined,
                    });
                    qc.invalidateQueries({ queryKey: ["admin-branches"] });
                    setCreditBranch(null);
                    setCreditAmount("");
                    setCreditNotes("");
                  } catch (e: any) {
                    setError(e.response?.data?.error ?? e.message ?? "Failed to credit branch");
                  } finally {
                    setCreditLoading(false);
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {creditLoading ? t("branches.crediting") : t("branches.credit_balance")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debit Branch modal */}
      {debitBranch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-1">{t("branches.debit_title")}</h2>
            <p className="text-sm text-zinc-400 mb-1">{t("branches.branch_label")}: <span className="text-white font-medium">{debitBranch.name}</span></p>
            <p className="text-sm text-zinc-400 mb-4">{t("branches.current_balance")}: <span className="text-emerald-400 font-bold">{formatCurrency(parseFloat(String(debitBranch.balance ?? "0")))}</span></p>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">{t("branches.amount")}</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 500.00"
                  value={debitAmount}
                  onChange={e => setDebitAmount(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">{t("branches.notes")}</label>
                <input
                  type="text"
                  placeholder="e.g. Funds recovery"
                  value={debitNotes}
                  onChange={e => setDebitNotes(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setDebitBranch(null); setError(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm">
                {t("common.cancel")}
              </button>
              <button
                disabled={debitLoading || !debitAmount || parseFloat(debitAmount) <= 0}
                onClick={async () => {
                  if (!debitBranch || !debitAmount) return;
                  setDebitLoading(true);
                  setError("");
                  try {
                    await api.post(`/api/admin/branches/${debitBranch.id}/debit`, {
                      amount: parseFloat(debitAmount),
                      notes: debitNotes || undefined,
                    });
                    qc.invalidateQueries({ queryKey: ["admin-branches"] });
                    setDebitBranch(null);
                    setDebitAmount("");
                    setDebitNotes("");
                  } catch (e: any) {
                    setError(e.response?.data?.error ?? e.message ?? "Failed to debit branch");
                  } finally {
                    setDebitLoading(false);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {debitLoading ? t("branches.debiting") : t("branches.debit_balance")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin modal */}
      {showAddAdmin !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-1">{t("branches.create_admin")}</h2>
            <p className="text-sm text-zinc-400 mb-4">
              {t("branches.for_branch")}: <span className="text-white">{branches.find((b) => b.id === showAddAdmin)?.name}</span>
            </p>
            <p className="text-xs text-zinc-500 mb-4 bg-zinc-800 rounded-lg p-3">
              {t("branches.create_admin_hint")}
            </p>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              {adminFormFields.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
                  <input
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    placeholder={placeholder}
                    value={(adminForm as any)[key]}
                    onChange={(e) => setAdminForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowAddAdmin(null); setError(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm">
                {t("common.cancel")}
              </button>
              <button
                onClick={() => addAdminMut.mutate({ branchId: showAddAdmin!, body: adminForm })}
                disabled={addAdminMut.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {t("branches.create_admin")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
