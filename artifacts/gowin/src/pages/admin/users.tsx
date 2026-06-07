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
import { ShieldCheck, ShieldOff } from "lucide-react";

async function patchUserRole(userId: number, role: string, token: string | null) {
  const res = await fetch(`/api/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update role");
  return data;
}

export default function AdminUsers() {
  const { data, isLoading } = useListUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token, user: currentUser } = useAuth();

  const creditMutation = useCreditWallet();
  const debitMutation = useDebitWallet();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [actionType, setActionType] = useState<"credit" | "debit" | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [roleLoadingId, setRoleLoadingId] = useState<number | null>(null);

  const users = data?.users || [];

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType || !amount) return;

    try {
      const payload = {
        userId: selectedUser.id,
        amount: parseFloat(amount),
        description: description || `Admin ${actionType}`,
      };

      if (actionType === "credit") {
        await creditMutation.mutateAsync({ data: payload });
      } else {
        await debitMutation.mutateAsync({ data: payload });
      }

      toast({ title: "Success", description: `Successfully ${actionType}ed user wallet.` });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message || "An error occurred", variant: "destructive" });
    }
  };

  const handleRoleToggle = async (user: any) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setRoleLoadingId(user.id);
    try {
      await patchUserRole(user.id, newRole, token);
      toast({
        title: newRole === "admin" ? "Admin granted" : "Admin removed",
        description: `${user.username} is now a ${newRole}.`,
      });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setRoleLoadingId(null);
    }
  };

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setSelectedUser(null);
    setActionType(null);
  };

  const openDialog = (user: any, type: "credit" | "debit") => {
    setSelectedUser(user);
    setActionType(type);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage users, wallet balances, and admin roles</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-accent/10">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === (currentUser as any)?.id;
                  const isRoleLoading = roleLoadingId === user.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">#{user.id}</TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === "admin" ? "default" : "outline"}
                          className={user.role === "admin" ? "bg-primary" : ""}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${user.wallet?.balance.toFixed(2) ?? "0.00"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleToggle(user)}
                            disabled={isRoleLoading || isSelf}
                            title={isSelf ? "Cannot change your own role" : user.role === "admin" ? "Remove admin" : "Make admin"}
                            className={
                              user.role === "admin"
                                ? "hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                                : "hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                            }
                          >
                            {isRoleLoading ? (
                              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : user.role === "admin" ? (
                              <ShieldOff className="w-4 h-4" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                            <span className="ml-1.5 hidden sm:inline">
                              {user.role === "admin" ? "Revoke" : "Make Admin"}
                            </span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openDialog(user, "credit")}>
                            Credit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(user, "debit")}
                            className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Wallet</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleAction} className="space-y-4 pt-4">
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
