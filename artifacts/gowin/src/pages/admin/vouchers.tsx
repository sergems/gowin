import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket, Plus, Copy, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const VOUCHER_VALUES = [1, 5, 10, 50, 100];

interface Voucher {
  id: number;
  code: string;
  value: number;
  isRedeemed: boolean;
  redeemedBy: number | null;
  redeemedAt: string | null;
  createdAt: string;
  redeemedByUsername: string | null;
}

async function fetchVouchers(token: string | null): Promise<{ vouchers: Voucher[] }> {
  const res = await fetch("/api/admin/vouchers", {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch vouchers");
  return data;
}

async function createVouchers(token: string | null, value: number, quantity: number) {
  const res = await fetch("/api/admin/vouchers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ value, quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create vouchers");
  return data;
}

export default function AdminVouchers() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedValue, setSelectedValue] = useState<number>(10);
  const [quantity, setQuantity] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "redeemed">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/vouchers"],
    queryFn: () => fetchVouchers(token),
  });

  const vouchers = data?.vouchers ?? [];
  const filtered = vouchers.filter((v) => {
    if (filter === "active") return !v.isRedeemed;
    if (filter === "redeemed") return v.isRedeemed;
    return true;
  });

  const stats = {
    total: vouchers.length,
    active: vouchers.filter((v) => !v.isRedeemed).length,
    redeemed: vouchers.filter((v) => v.isRedeemed).length,
    totalValue: vouchers.filter((v) => !v.isRedeemed).reduce((s, v) => s + v.value, 0),
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createVouchers(token, selectedValue, quantity);
      toast({ title: `${quantity} voucher${quantity > 1 ? "s" : ""} created`, description: `$${selectedValue} each` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vouchers"] });
    } catch (e: any) {
      toast({ title: "Failed to create vouchers", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Vouchers</h1>
        <p className="text-muted-foreground">Generate voucher codes users can redeem into their wallets</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Vouchers", value: stats.total, icon: Ticket },
          { label: "Active", value: stats.active, icon: Clock },
          { label: "Redeemed", value: stats.redeemed, icon: CheckCircle },
          { label: "Unredeemed Value", value: `$${stats.totalValue.toFixed(2)}`, icon: Ticket },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-black">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Generate Vouchers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Select Value</p>
            <div className="flex gap-2 flex-wrap">
              {VOUCHER_VALUES.map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedValue(v)}
                  className={`px-5 py-2.5 rounded-lg border text-sm font-bold transition-all ${
                    selectedValue === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-accent/40 border-border hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  ${v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Quantity</p>
            <div className="flex gap-2">
              {[1, 5, 10, 25].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                    quantity === q
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-accent/40 border-border hover:border-primary/40"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
            <Plus className="w-4 h-4" />
            {isCreating ? "Generating..." : `Generate ${quantity} × $${selectedValue} voucher${quantity > 1 ? "s" : ""}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Voucher List</CardTitle>
            <div className="flex gap-2">
              {(["all", "active", "redeemed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                    filter === f ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-accent/40 rounded-lg animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-xl">
              <Ticket className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No vouchers yet. Generate some above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => (
                <div
                  key={v.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    v.isRedeemed ? "border-border bg-accent/10 opacity-70" : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${v.isRedeemed ? "bg-muted" : "bg-primary/20"}`}>
                      {v.isRedeemed ? <CheckCircle className="w-5 h-5 text-muted-foreground" /> : <Ticket className="w-5 h-5 text-primary" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tracking-widest text-sm">{v.code}</span>
                        {!v.isRedeemed && (
                          <button onClick={() => copyCode(v.code)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {copiedCode === v.code ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {v.isRedeemed
                          ? `Redeemed by ${v.redeemedByUsername ?? "user"} · ${format(new Date(v.redeemedAt!), "PPP p")}`
                          : `Created ${format(new Date(v.createdAt), "PPP")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black">${v.value.toFixed(0)}</span>
                    <Badge variant={v.isRedeemed ? "secondary" : "default"}>{v.isRedeemed ? "Redeemed" : "Active"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
