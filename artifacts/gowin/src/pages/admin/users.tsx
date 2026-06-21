import { useState, useEffect, useRef } from "react";
import { useListUsers, useCreditWallet, useDebitWallet, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Pencil, Ban, CheckCircle2, KeyRound, Copy, Check, Search, X as XIcon, Building2 } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:        { label: "Admin",         color: "bg-primary text-primary-foreground" },
  branch_admin: { label: "Branch Admin",  color: "bg-blue-600 text-white" },
  agent:        { label: "Agent",         color: "bg-violet-600 text-white" },
  user:         { label: "User",          color: "bg-muted text-muted-foreground" },
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

interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: string;
  branchId?: number | null;
  commissionRate?: number;
  disabled: boolean;
  disabledReason?: string | null;
  loginAttempts?: number;
  createdAt: string;
  wallet?: { balance: number };
}

interface Branch { id: number; name: string; code: string; }

export default function AdminUsers() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val.trim()), 350);
  };
  const clearSearch = () => { setSearchInput(""); setSearch(""); };
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const { data, isLoading } = useListUsers(search ? { search } : undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token, user: currentUser } = useAuth();

  const creditMutation = useCreditWallet();
  const debitMutation = useDebitWallet();

  const { data: branchesData } = useQuery<{ branches: Branch[] }>({
    queryKey: ["admin-branches"],
    queryFn: () => fetch("/api/admin/branches", { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()),
    enabled: !!token,
  });
  const branches: Branch[] = branchesData?.branches ?? [];

  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]));

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [actionType, setActionType] = useState<"credit" | "debit" | null>(null);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", email: "", phoneNumber: "", username: "",
    role: "user", branchId: "", commissionRate: "",
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ tempPassword: string; expiresAt: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const [disableLoadingId, setDisableLoadingId] = useState<number | null>(null);

  const users: AdminUser[] = (data as any)?.users || [];

  const openWalletDialog = (user: AdminUser, type: "credit" | "debit") => {
    setSelectedUser(user); setActionType(type); setIsWalletDialogOpen(true);
  };
  const resetWalletForm = () => { setAmount(""); setDescription(""); setSelectedUser(null); setActionType(null); };

  const handleWalletAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType || !amount) return;
    try {
      const payload = { userId: selectedUser.id, amount: parseFloat(amount), description: description || `Admin ${actionType}` };
      if (actionType === "credit") await creditMutation.mutateAsync({ data: payload });
      else await debitMutation.mutateAsync({ data: payload });
      toast({ title: "Success", description: `Successfully ${actionType}ed wallet.` });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setIsWalletDialogOpen(false);
      resetWalletForm();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDisableToggle = async (user: AdminUser) => {
    setDisableLoadingId(user.id);
    try {
      await apiFetch(`/api/users/${user.id}/disable`, "PATCH", { disabled: !user.disabled }, token);
      toast({
        title: user.disabled ? "Account enabled" : "Account blocked",
        description: `${user.username} has been ${user.disabled ? "unblocked" : "blocked"}.`,
        variant: user.disabled ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setDisableLoadingId(null);
    }
  };

  const openEditDialog = (user: AdminUser) => {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      phoneNumber: user.phoneNumber ?? "",
      username: user.username,
      role: user.role,
      branchId: user.branchId != null ? String(user.branchId) : "",
      commissionRate: user.commissionRate != null ? String(user.commissionRate) : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      const calls: Promise<any>[] = [];

      const profileChanged =
        editForm.firstName !== (editUser.firstName ?? "") ||
        editForm.lastName !== (editUser.lastName ?? "") ||
        editForm.email !== editUser.email ||
        editForm.phoneNumber !== (editUser.phoneNumber ?? "") ||
        editForm.username !== editUser.username;

      if (profileChanged) {
        calls.push(apiFetch(`/api/users/${editUser.id}`, "PATCH", {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          username: editForm.username,
        }, token));
      }

      const branchIdVal = editForm.branchId === "" ? null : parseInt(editForm.branchId);
      const commRateVal = editForm.commissionRate === "" ? 0 : parseFloat(editForm.commissionRate);
      const accessChanged =
        editForm.role !== editUser.role ||
        branchIdVal !== (editUser.branchId ?? null) ||
        commRateVal !== (editUser.commissionRate ?? 0);

      if (accessChanged) {
        calls.push(apiFetch(`/api/admin/users/${editUser.id}/assign-branch`, "PATCH", {
          role: editForm.role,
          branchId: branchIdVal,
          commissionRate: commRateVal,
        }, token));
      }

      if (calls.length === 0) {
        toast({ title: "No changes", description: "Nothing was modified." });
        setIsEditDialogOpen(false);
        return;
      }

      await Promise.all(calls);
      toast({ title: "User updated", description: `${editForm.username}'s details have been saved.` });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  const openResetDialog = (user: AdminUser) => {
    setResetUser(user); setResetResult(null); setCopied(false); setIsResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    setResetLoading(true);
    try {
      const result = await apiFetch(`/api/users/${resetUser.id}/reset-password`, "POST", {}, token);
      setResetResult(result);
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (resetResult?.tempPassword) {
      navigator.clipboard.writeText(resetResult.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const needsBranch = editForm.role === "branch_admin" || editForm.role === "agent";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage users, roles, wallet balances, and account access</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by email, phone or username…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        {search && (
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Searching…" : `${(data as any)?.total ?? 0} result${(data as any)?.total === 1 ? "" : "s"}`}
          </p>
        )}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-accent/10">
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Name / Email</TableHead>
                <TableHead className="w-32">Role</TableHead>
                <TableHead className="w-36">Branch</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Joined</TableHead>
                <TableHead className="text-right w-24">Balance</TableHead>
                <TableHead className="text-right w-52">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === (currentUser as any)?.id;
                  const isSystemLocked = user.disabled && user.disabledReason === "system";
                  const isAdminDisabled = user.disabled && user.disabledReason === "admin";
                  const roleMeta = ROLE_LABELS[user.role] ?? { label: user.role, color: "bg-muted text-muted-foreground" };
                  const branchName = user.branchId ? branchMap[user.branchId]?.name : null;

                  return (
                    <TableRow key={user.id} className={user.disabled ? "opacity-60" : ""}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{user.id}</TableCell>
                      <TableCell className="font-semibold">{user.username}</TableCell>
                      <TableCell>
                        <div className="text-sm">{[user.firstName, user.lastName].filter(Boolean).join(" ") || <span className="text-muted-foreground">—</span>}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${roleMeta.color}`}>{roleMeta.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {branchName ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" /> {branchName}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {isSystemLocked ? (
                          <Badge variant="destructive" className="text-xs">Locked</Badge>
                        ) : isAdminDisabled ? (
                          <Badge variant="destructive" className="text-xs">Blocked</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-600/40">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm">
                        ${user.wallet?.balance.toFixed(2) ?? "0.00"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(user)} title="Edit user">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                            onClick={() => openResetDialog(user)} title="Reset password">
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className={`h-8 w-8 ${user.disabled ? "text-green-600 hover:text-green-600 hover:bg-green-600/10" : "text-destructive hover:text-destructive hover:bg-destructive/10"}`}
                            onClick={() => handleDisableToggle(user)}
                            disabled={disableLoadingId === user.id || isSelf}
                            title={isSelf ? "Cannot disable your own account" : user.disabled ? "Unblock account" : "Block account"}
                          >
                            {disableLoadingId === user.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : user.disabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-green-600 border-green-600/40 hover:bg-green-600/10"
                            onClick={() => openWalletDialog(user, "credit")}>Credit</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={() => openWalletDialog(user, "debit")}>Debit</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Edit User Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.username}</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              {/* Profile section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={editForm.firstName} onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={editForm.lastName} onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={editForm.username} onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={editForm.phoneNumber} onChange={(e) => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="+243..." />
              </div>

              {/* Role & Access section */}
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role & Access</p>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v, branchId: ["branch_admin","agent"].includes(v) ? f.branchId : "" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="branch_admin">Branch Admin</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {needsBranch && (
                  <div className="space-y-2">
                    <Label>Branch Assignment</Label>
                    <Select value={editForm.branchId} onValueChange={(v) => setEditForm(f => ({ ...f, branchId: v === "none" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No Branch —</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editForm.role === "agent" && (
                  <div className="space-y-2">
                    <Label>Commission Rate (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.01"
                      value={editForm.commissionRate}
                      onChange={(e) => setEditForm(f => ({ ...f, commissionRate: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={editLoading}>
                {editLoading ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isResetDialogOpen} onOpenChange={(open) => { setIsResetDialogOpen(open); if (!open) { setResetResult(null); setCopied(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              Reset Password — {resetUser?.username}
            </DialogTitle>
          </DialogHeader>
          {resetResult ? (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                A temporary password has been generated. It is valid for <strong>1 hour</strong>.
                {resetResult.emailSent ? " An email has been sent to the user." : " Email delivery is not configured — share this password with the user directly."}
              </p>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex gap-2">
                  <Input readOnly value={resetResult.tempPassword} className="font-mono text-lg tracking-widest text-center" />
                  <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Expires: {format(new Date(resetResult.expiresAt), "MMM d, yyyy 'at' h:mm a")}</p>
              <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                The user will be required to set a new password immediately after logging in.
              </p>
              <Button className="w-full" onClick={() => { setIsResetDialogOpen(false); setResetResult(null); }}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                This will generate a temporary password for <strong>{resetUser?.username}</strong> valid for 1 hour.
              </p>
              <div className="p-3 bg-accent/20 rounded-md border border-border text-sm">
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{resetUser?.email}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsResetDialogOpen(false)}>Cancel</Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleResetPassword} disabled={resetLoading}>
                  {resetLoading ? "Generating…" : "Generate Password"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Wallet Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={isWalletDialogOpen} onOpenChange={(open) => { setIsWalletDialogOpen(open); if (!open) resetWalletForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Wallet</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleWalletAction} className="space-y-4 pt-4">
              <div className="p-3 bg-accent/20 rounded-md border border-border mb-4">
                <div className="text-sm text-muted-foreground mb-1">User: <span className="font-bold text-foreground">{selectedUser.username}</span></div>
                <div className="text-sm text-muted-foreground">Current Balance: <span className="font-bold text-foreground">${selectedUser.wallet?.balance.toFixed(2)}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={`Manual ${actionType}`} />
              </div>
              <Button type="submit" className="w-full" disabled={creditMutation.isPending || debitMutation.isPending}>
                Confirm {actionType}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
