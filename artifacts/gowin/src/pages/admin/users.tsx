import { useState } from "react";
import { useListUsers, useCreditWallet, useDebitWallet, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ShieldCheck, ShieldOff, Pencil, Ban, CheckCircle2 } from "lucide-react";

// ── API helpers ────────────────────────────────────────────────────────────────
async function patchUserRole(userId: number, role: string, token: string | null) {
  const res = await fetch(`/api/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update role");
  return data;
}

async function patchUserDisabled(userId: number, disabled: boolean, token: string | null) {
  const res = await fetch(`/api/users/${userId}/disable`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ disabled }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update account status");
  return data;
}

async function patchUserDetails(
  userId: number,
  details: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string; username?: string },
  token: string | null
) {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(details),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update user");
  return data;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: string;
  disabled: boolean;
  createdAt: string;
  wallet?: { balance: number };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { data, isLoading } = useListUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token, user: currentUser } = useAuth();

  const creditMutation = useCreditWallet();
  const debitMutation = useDebitWallet();

  // Wallet dialog
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [actionType, setActionType] = useState<"credit" | "debit" | null>(null);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  // Edit dialog
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", username: "" });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Per-row loading states
  const [roleLoadingId, setRoleLoadingId] = useState<number | null>(null);
  const [disableLoadingId, setDisableLoadingId] = useState<number | null>(null);

  const users: AdminUser[] = (data as any)?.users || [];

  // ── Wallet actions ────────────────────────────────────────────────────────
  const openWalletDialog = (user: AdminUser, type: "credit" | "debit") => {
    setSelectedUser(user);
    setActionType(type);
    setIsWalletDialogOpen(true);
  };

  const resetWalletForm = () => {
    setAmount("");
    setDescription("");
    setSelectedUser(null);
    setActionType(null);
  };

  const handleWalletAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType || !amount) return;
    try {
      const payload = { userId: selectedUser.id, amount: parseFloat(amount), description: description || `Admin ${actionType}` };
      if (actionType === "credit") {
        await creditMutation.mutateAsync({ data: payload });
      } else {
        await debitMutation.mutateAsync({ data: payload });
      }
      toast({ title: "Success", description: `Successfully ${actionType}ed wallet.` });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setIsWalletDialogOpen(false);
      resetWalletForm();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  // ── Role toggle ───────────────────────────────────────────────────────────
  const handleRoleToggle = async (user: AdminUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setRoleLoadingId(user.id);
    try {
      await patchUserRole(user.id, newRole, token);
      toast({ title: newRole === "admin" ? "Admin granted" : "Admin removed", description: `${user.username} is now a ${newRole}.` });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setRoleLoadingId(null);
    }
  };

  // ── Disable / enable ──────────────────────────────────────────────────────
  const handleDisableToggle = async (user: AdminUser) => {
    setDisableLoadingId(user.id);
    try {
      await patchUserDisabled(user.id, !user.disabled, token);
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

  // ── Edit user ─────────────────────────────────────────────────────────────
  const openEditDialog = (user: AdminUser) => {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      phoneNumber: user.phoneNumber ?? "",
      username: user.username,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      await patchUserDetails(
        editUser.id,
        {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          username: editForm.username,
        },
        token
      );
      toast({ title: "User updated", description: `${editForm.username}'s details have been saved.` });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage users, wallet balances, roles, and account access</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-accent/10">
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-20">Role</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-28">Joined</TableHead>
                <TableHead className="text-right w-24">Balance</TableHead>
                <TableHead className="text-right w-56">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === (currentUser as any)?.id;
                  return (
                    <TableRow key={user.id} className={user.disabled ? "opacity-60" : ""}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{user.id}</TableCell>
                      <TableCell className="font-semibold">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === "admin" ? "default" : "outline"}
                          className={user.role === "admin" ? "bg-primary text-xs" : "text-xs"}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.disabled ? (
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(user)}
                            title="Edit user"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${user.disabled ? "text-green-600 hover:text-green-600 hover:bg-green-600/10" : "text-destructive hover:text-destructive hover:bg-destructive/10"}`}
                            onClick={() => handleDisableToggle(user)}
                            disabled={disableLoadingId === user.id || isSelf}
                            title={isSelf ? "Cannot disable your own account" : user.disabled ? "Unblock account" : "Block account"}
                          >
                            {disableLoadingId === user.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : user.disabled ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${user.role === "admin" ? "text-destructive hover:text-destructive hover:bg-destructive/10" : "text-primary hover:text-primary hover:bg-primary/10"}`}
                            onClick={() => handleRoleToggle(user)}
                            disabled={roleLoadingId === user.id || isSelf}
                            title={isSelf ? "Cannot change your own role" : user.role === "admin" ? "Remove admin" : "Make admin"}
                          >
                            {roleLoadingId === user.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : user.role === "admin" ? (
                              <ShieldOff className="w-3.5 h-3.5" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 text-green-600 border-green-600/40 hover:bg-green-600/10"
                            onClick={() => openWalletDialog(user, "credit")}
                          >
                            Credit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={() => openWalletDialog(user, "debit")}
                          >
                            Debit
                          </Button>
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
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.username}</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="+243..."
                />
              </div>
              <Button type="submit" className="w-full" disabled={editLoading}>
                {editLoading ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Wallet Dialog ─────────────────────────────────────────────────────── */}
      <Dialog
        open={isWalletDialogOpen}
        onOpenChange={(open) => { setIsWalletDialogOpen(open); if (!open) resetWalletForm(); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Wallet</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleWalletAction} className="space-y-4 pt-4">
              <div className="p-3 bg-accent/20 rounded-md border border-border mb-4">
                <div className="text-sm text-muted-foreground mb-1">
                  User: <span className="font-bold text-foreground">{selectedUser.username}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Current Balance:{" "}
                  <span className="font-bold text-foreground">${selectedUser.wallet?.balance.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Manual ${actionType}`}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={creditMutation.isPending || debitMutation.isPending}
              >
                Confirm {actionType}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
