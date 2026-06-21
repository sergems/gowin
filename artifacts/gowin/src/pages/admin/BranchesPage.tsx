import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { Building2, Plus, Pencil, Trash2, Users, CheckCircle, XCircle, UserPlus, Copy } from "lucide-react";

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
  createdAt: string;
  agentCount: number;
}

const emptyForm = { name: "", code: "", country: "", city: "", address: "", phone: "", email: "" };

export default function BranchesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [adminForm, setAdminForm] = useState({ username: "", email: "", firstName: "", lastName: "" });
  const [showAddAdmin, setShowAddAdmin] = useState<number | null>(null);
  const [tempCred, setTempCred] = useState<{ username: string; email: string; tempPassword: string } | null>(null);
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
    },
    onError: (e: any) => setError(e.message ?? "Failed to create branch admin"),
  });

  const branches: Branch[] = data?.branches ?? [];

  function openEdit(b: Branch) {
    setEditBranch(b);
    setForm({ name: b.name, code: b.code, country: b.country, city: b.city, address: b.address, phone: b.phone, email: b.email });
    setError("");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-400" />
            Branch Management
          </h1>
          <p className="text-zinc-400 mt-1">Create and manage branches across regions</p>
        </div>
        <button onClick={() => { setShowCreate(true); setForm(emptyForm); setError(""); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Branch
        </button>
      </div>

      {/* Temp credential display */}
      {tempCred && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-emerald-300 mb-2">Branch Admin Account Created</p>
              <p className="text-sm text-zinc-300">Username: <span className="font-mono text-white">{tempCred.username}</span></p>
              <p className="text-sm text-zinc-300">Email: <span className="font-mono text-white">{tempCred.email}</span></p>
              <p className="text-sm text-zinc-300">Temp Password: <span className="font-mono text-yellow-300 text-base">{tempCred.tempPassword}</span></p>
              <p className="text-xs text-zinc-500 mt-1">Share these credentials securely. Admin must change password on first login.</p>
            </div>
            <button onClick={() => setTempCred(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Branch list */}
      {isLoading ? (
        <div className="text-zinc-400 text-center py-16">Loading branches...</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No branches yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {branches.map((b) => (
            <div key={b.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{b.name}</h3>
                    <span className="font-mono text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">{b.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === "active" ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm text-zinc-400">
                    <span>📍 {b.city}, {b.country}</span>
                    <span>📞 {b.phone}</span>
                    <span>✉️ {b.email}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {b.agentCount} agent{b.agentCount !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{b.address}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => setShowAddAdmin(b.id)}
                    className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 transition-colors" title="Add Branch Admin">
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(b)}
                    className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if (confirm(`Delete branch "${b.name}"?`)) deleteMut.mutate(b.id); }}
                    className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {(showCreate || editBranch) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">{editBranch ? "Edit Branch" : "New Branch"}</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              {[
                { key: "name", label: "Branch Name", placeholder: "Lagos Central" },
                { key: "code", label: "Branch Code", placeholder: "LGS001", disabled: !!editBranch },
                { key: "country", label: "Country", placeholder: "Nigeria" },
                { key: "city", label: "City", placeholder: "Lagos" },
                { key: "address", label: "Address", placeholder: "123 Main Street" },
                { key: "phone", label: "Phone", placeholder: "+234 800 000 0000" },
                { key: "email", label: "Email", placeholder: "lagos@gowin.com" },
              ].map(({ key, label, placeholder, disabled }) => (
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
                  <label className="text-xs text-zinc-400 mb-1 block">Status</label>
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
              <button
                onClick={() => { setShowCreate(false); setEditBranch(null); setError(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editBranch) updateMut.mutate({ id: editBranch.id, body: { ...form, status: editBranch.status } });
                  else createMut.mutate(form);
                }}
                disabled={createMut.isPending || updateMut.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {editBranch ? "Save Changes" : "Create Branch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin modal */}
      {showAddAdmin !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-1">Create Branch Admin</h2>
            <p className="text-sm text-zinc-400 mb-4">For: <span className="text-white">{branches.find((b) => b.id === showAddAdmin)?.name}</span></p>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              {[
                { key: "username", label: "Username", placeholder: "lagos_admin" },
                { key: "email", label: "Email", placeholder: "admin@branch.com" },
                { key: "firstName", label: "First Name", placeholder: "John" },
                { key: "lastName", label: "Last Name", placeholder: "Doe" },
              ].map(({ key, label, placeholder }) => (
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
                Cancel
              </button>
              <button
                onClick={() => addAdminMut.mutate({ branchId: showAddAdmin!, body: adminForm })}
                disabled={addAdminMut.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
