import { useState, useEffect, useRef } from "react";
import { useListUsers, useCreditWallet, useDebitWallet, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TranslationKey } from "@/lib/i18n";
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
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { format } from "date-fns";
import { Pencil, Ban, CheckCircle2, KeyRound, Copy, Check, Search, X as XIcon, Building2 } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:        { label: "Admin",         color: "bg-primary text-primary-foreground" },
  manager:      { label: "Manager",       color: "bg-emerald-600 text-white" },
  branch_admin: { label: "Branch Admin",  color: "bg-blue-600 text-white" },
  agent:        { label: "Agent",         color: "bg-violet-600 text-white" },
  payout:       { label: "Payout Clerk",  color: "bg-amber-600 text-white" },
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

const DRC_OPERATORS = [
  { code: "VODACOM_MPESA_COD", name: "M-Pesa (Vodacom)" },
  { code: "AIRTEL_COD",        name: "Airtel Money" },
  { code: "ORANGE_COD",        name: "Orange Money" },
];

interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  mobileOperator: string | null;
  secondaryPhoneNumber: string | null;
  secondaryMobileOperator: string | null;
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

const ROLE_TABS = [
  { key: "all",          labelKey: "admin.users.tab_all" },
  { key: "admin",        labelKey: "admin.users.tab_admin" },
  { key: "manager",      labelKey: "admin.users.tab_manager" },
  { key: "branch_admin", labelKey: "admin.users.tab_branch_admin" },
  { key: "agent",        labelKey: "admin.users.tab_agent" },
  { key: "payout",       labelKey: "admin.users.tab_payout" },
  { key: "user",         labelKey: "admin.users.tab_user" },
] as const;

type RoleTab = typeof ROLE_TABS[number]["key"];

export default function AdminUsers() {
  const { formatCurrency, parseAmount, currency, t } = useSiteSettings();
  const isForeignCurrency = currency !== "USD";
  const [activeTab, setActiveTab] = useState<RoleTab>("all");
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
    mobileOperator: "", secondaryPhoneNumber: "", secondaryMobileOperator: "",
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

  const allUsers: AdminUser[] = (data as any)?.users || [];
  const users = activeTab === "all" ? allUsers : allUsers.filter(u => u.role === activeTab);

  const openWalletDialog = (user: AdminUser, type: "credit" | "debit") => {
    setSelectedUser(user); setActionType(type); setIsWalletDialogOpen(true);
  };
  const resetWalletForm = () => { setAmount(""); setDescription(""); setSelectedUser(null); setActionType(null); };

  const handleWalletAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType || !amount) return;
    try {
      // The amount is typed in the site's active display currency; convert to USD
      // (wallet balances are always stored/processed in USD) before sending it.
      const payload = { userId: selectedUser.id, amount: parseAmount(parseFloat(amount) || 0), description: description || `Admin ${actionType}` };
      if (actionType === "credit") await creditMutation.mutateAsync({ data: payload });
      else await debitMutation.mutateAsync({ data: payload });
      toast({ title: t("admin.users.success"), description: `Successfully ${actionType}ed wallet.` });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setIsWalletDialogOpen(false);
      resetWalletForm();
    } catch (err: any) {
      toast({ title: t("admin.users.action_failed"), description: err.message, variant: "destructive" });
    }
  };

  const handleDisableToggle = async (user: AdminUser) => {
    setDisableLoadingId(user.id);
    try {
      await apiFetch(`/api/users/${user.id}/disable`, "PATCH", { disabled: !user.disabled }, token);
      toast({
        title: user.disabled ? t("admin.users.enabled") : t("admin.users.blocked_msg"),
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
      mobileOperator: user.mobileOperator ?? "",
      secondaryPhoneNumber: user.secondaryPhoneNumber ?? "",
      secondaryMobileOperator: user.secondaryMobileOperator ?? "",
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
        editForm.mobileOperator !== (editUser.mobileOperator ?? "") ||
        editForm.secondaryPhoneNumber !== (editUser.secondaryPhoneNumber ?? "") ||
        editForm.secondaryMobileOperator !== (editUser.secondaryMobileOperator ?? "") ||
        editForm.username !== editUser.username;

      if (profileChanged) {
        calls.push(apiFetch(`/api/users/${editUser.id}`, "PATCH", {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          mobileOperator: editForm.mobileOperator,
          secondaryPhoneNumber: editForm.secondaryPhoneNumber,
          secondaryMobileOperator: editForm.secondaryMobileOperator,
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
        toast({ title: t("admin.users.no_changes"), description: t("admin.users.no_changes_desc") });
        setIsEditDialogOpen(false);
        return;
      }

      await Promise.all(calls);
      toast({ title: t("admin.users.updated"), description: `${editForm.username}'s details have been saved.` });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      toast({ title: t("admin.users.update_failed"), description: err.message, variant: "destructive" });
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
      toast({ title: t("admin.users.reset_failed"), description: err.message, variant: "destructive" });
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

  const needsBranch = editForm.role === "branch_admin" || editForm.role === "agent" || editForm.role === "payout";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{t("admin.users.title")}</h1>
        <p className="text-muted-foreground">{t("admin.users.desc")}</p>
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {ROLE_TABS.map(tab => {
          const tabCount = tab.key === "all" ? allUsers.length : allUsers.filter(u => u.role === tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as RoleTab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5
                ${isActive
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
            >
              {t(tab.labelKey as TranslationKey)}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                {tabCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("admin.users.search_ph")}
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
            {isLoading ? t("admin.users.searching") : `${(data as any)?.total ?? 0} ${(data as any)?.total === 1 ? t("admin.users.result") : t("admin.users.results")}`}
          </p>
        )}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-accent/10">
              <TableRow>
                <TableHead className="w-12">{t("admin.users.col_id")}</TableHead>
                <TableHead>{t("admin.users.col_username")}</TableHead>
                <TableHead>{t("admin.users.col_name_email")}</TableHead>
                <TableHead className="w-32">{t("admin.users.col_role")}</TableHead>
                <TableHead className="w-36">{t("admin.users.col_branch")}</TableHead>
                <TableHead className="w-24">{t("admin.users.col_status")}</TableHead>
                <TableHead className="w-28">{t("admin.users.col_joined")}</TableHead>
                <TableHead className="text-right w-24">{t("admin.users.col_balance")}</TableHead>
                <TableHead className="text-right w-52">{t("admin.users.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">{t("common.loading")}…</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t("admin.users.no_users")}</TableCell></TableRow>
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
                          <Badge variant="destructive" className="text-xs">{t("admin.users.status_locked")}</Badge>
                        ) : isAdminDisabled ? (
                          <Badge variant="destructive" className="text-xs">{t("admin.users.status_blocked")}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-600/40">{t("admin.users.status_active")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm">
                        {formatCurrency(user.wallet?.balance ?? 0)}
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
                            title={isSelf ? t("admin.users.cannot_disable_self") : user.disabled ? t("admin.users.unblock") : t("admin.users.block")}
                          >
                            {disableLoadingId === user.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : user.disabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-green-600 border-green-600/40 hover:bg-green-600/10"
                            onClick={() => openWalletDialog(user, "credit")}>{t("admin.users.credit")}</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={() => openWalletDialog(user, "debit")}>{t("admin.users.debit")}</Button>
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
            <DialogTitle>{t("admin.users.edit_title")} — {editUser?.username}</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              {/* Profile section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.users.first_name")}</Label>
                  <Input value={editForm.firstName} onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))} placeholder={t("admin.users.first_name")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.users.last_name")}</Label>
                  <Input value={editForm.lastName} onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))} placeholder={t("admin.users.last_name")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.users.username")}</Label>
                <Input value={editForm.username} onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{t("common.email")}</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              {/* Mobile Payment Method */}
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.users.mobile_payment")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.users.primary_phone")}</Label>
                    <Input
                      value={editForm.phoneNumber}
                      onChange={(e) => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))}
                      placeholder="+243..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.users.primary_operator")}</Label>
                    <Select value={editForm.mobileOperator || "none"} onValueChange={(v) => setEditForm(f => ({ ...f, mobileOperator: v === "none" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.users.not_set")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("admin.users.not_set")}</SelectItem>
                        {DRC_OPERATORS.map(op => (
                          <SelectItem key={op.code} value={op.code}>{op.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.users.secondary_phone")}</Label>
                    <Input
                      value={editForm.secondaryPhoneNumber}
                      onChange={(e) => setEditForm(f => ({ ...f, secondaryPhoneNumber: e.target.value }))}
                      placeholder="+243..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.users.secondary_operator")}</Label>
                    <Select value={editForm.secondaryMobileOperator || "none"} onValueChange={(v) => setEditForm(f => ({ ...f, secondaryMobileOperator: v === "none" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.users.not_set")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("admin.users.not_set")}</SelectItem>
                        {DRC_OPERATORS.map(op => (
                          <SelectItem key={op.code} value={op.code}>{op.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">These are used for PawaPay mobile money deposits and withdrawals. Operators: M-Pesa (Vodacom), Airtel Money, Orange Money.</p>
              </div>

              {/* Role & Access section */}
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.users.role_access")}</p>
                <div className="space-y-2">
                  <Label>{t("admin.users.role")}</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v, branchId: ["branch_admin","agent","payout"].includes(v) ? f.branchId : "" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t("admin.users.tab_user")}</SelectItem>
                      <SelectItem value="admin">{t("admin.users.tab_admin")}</SelectItem>
                      <SelectItem value="manager">{t("admin.users.tab_manager")}</SelectItem>
                      <SelectItem value="branch_admin">{t("admin.users.tab_branch_admin")}</SelectItem>
                      <SelectItem value="agent">{t("admin.users.tab_agent")}</SelectItem>
                      <SelectItem value="payout">{t("admin.users.tab_payout")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {needsBranch && (
                  <div className="space-y-2">
                    <Label>{t("admin.users.branch_assignment")}</Label>
                    <Select value={editForm.branchId} onValueChange={(v) => setEditForm(f => ({ ...f, branchId: v === "none" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.users.no_branch")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("admin.users.no_branch")}</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editForm.role === "agent" && (
                  <div className="space-y-2">
                    <Label>{t("admin.users.commission_rate")}</Label>
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
                {editLoading ? `${t("common.saving")}…` : t("common.save_changes")}
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
              {t("admin.users.reset_password_title")} — {resetUser?.username}
            </DialogTitle>
          </DialogHeader>
          {resetResult ? (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("admin.users.temp_password_desc")}
                {resetResult.emailSent ? t("admin.users.email_sent") : t("admin.users.email_not_sent")}
              </p>
              <div className="space-y-2">
                <Label>{t("admin.users.temp_password")}</Label>
                <div className="flex gap-2">
                  <Input readOnly value={resetResult.tempPassword} className="font-mono text-lg tracking-widest text-center" />
                  <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("admin.users.expires")} {format(new Date(resetResult.expiresAt), "MMM d, yyyy 'at' h:mm a")}</p>
              <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                {t("admin.users.must_change_password")}
              </p>
              <Button className="w-full" onClick={() => { setIsResetDialogOpen(false); setResetResult(null); }}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("admin.users.reset_confirm_desc")} <strong>{resetUser?.username}</strong> {t("admin.users.reset_valid")}
              </p>
              <div className="p-3 bg-accent/20 rounded-md border border-border text-sm">
                <span className="text-muted-foreground">{t("admin.users.email_label")} </span>
                <span className="font-medium">{resetUser?.email}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsResetDialogOpen(false)}>{t("common.cancel")}</Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleResetPassword} disabled={resetLoading}>
                  {resetLoading ? t("admin.users.generating") : t("admin.users.generate_password")}
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
            <DialogTitle>{actionType === "credit" ? t("admin.users.wallet_credit_title") : t("admin.users.wallet_debit_title")}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleWalletAction} className="space-y-4 pt-4">
              <div className="p-3 bg-accent/20 rounded-md border border-border mb-4">
                <div className="text-sm text-muted-foreground mb-1">{t("clerk.user_label")}: <span className="font-bold text-foreground">{selectedUser.username}</span></div>
                <div className="text-sm text-muted-foreground">{t("admin.users.current_balance")} <span className="font-bold text-foreground">{formatCurrency(selectedUser.wallet?.balance ?? 0)}</span></div>
              </div>
              <div className="space-y-2">
                <Label>{t("common.amount")} ({currency})</Label>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                {isForeignCurrency && parseFloat(amount) > 0 && (
                  <p className="text-[11px] text-muted-foreground text-right">
                    ≈ ${parseAmount(parseFloat(amount)).toFixed(2)} USD
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("admin.users.description_optional")}</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={`Manual ${actionType}`} />
              </div>
              <Button type="submit" className="w-full" disabled={creditMutation.isPending || debitMutation.isPending}>
                {t("common.save")} {actionType === "credit" ? t("admin.users.credit") : t("admin.users.debit")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
