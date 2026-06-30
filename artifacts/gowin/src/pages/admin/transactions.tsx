import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Search, Receipt } from "lucide-react";

const TYPE_META: Record<string, { label: string; color: string; credit: boolean }> = {
  credit:      { label: "Deposit",      color: "bg-primary/20 text-primary border-primary/30",          credit: true  },
  debit:       { label: "Withdrawal",   color: "bg-orange-500/20 text-orange-400 border-orange-500/30", credit: false },
  bet_placed:  { label: "Bet Placed",   color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", credit: false },
  bet_won:     { label: "Bet Won",      color: "bg-primary/20 text-primary border-primary/30",          credit: true  },
  bet_refund:  { label: "Bet Refund",   color: "bg-blue-500/20 text-blue-400 border-blue-500/30",       credit: true  },
  bet_lost:    { label: "Bet Lost",     color: "bg-destructive/20 text-destructive border-destructive/30", credit: false },
};

function useFetchAdminTransactions(token: string | null, page: number, typeFilter: string, search: string) {
  return useQuery({
    queryKey: ["/api/admin/transactions", page, typeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/transactions?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load transactions");
      return res.json();
    },
    enabled: !!token,
  });
}

export default function AdminTransactions() {
  const { token } = useAuth();
  const { formatCurrency } = useSiteSettings();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  };

  const { data, isLoading } = useFetchAdminTransactions(token, page, typeFilter, debouncedSearch);

  const transactions: any[] = data?.transactions ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">All Transactions</h1>
        <p className="text-muted-foreground">Full ledger of every deposit, withdrawal, and bet across all users</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: total, sub: "transactions" },
          { label: "Deposits",      value: data?.summary?.deposits   ?? "—", sub: "credits" },
          { label: "Withdrawals",   value: data?.summary?.withdrawals ?? "—", sub: "debits"  },
          { label: "Bets Placed",   value: data?.summary?.betsPlaced ?? "—", sub: "wagers"  },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by username or description…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="credit">Deposit</SelectItem>
            <SelectItem value="debit">Withdrawal</SelectItem>
            <SelectItem value="bet_placed">Bet Placed</SelectItem>
            <SelectItem value="bet_won">Bet Won</SelectItem>
            <SelectItem value="bet_refund">Bet Refund</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border/40">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-accent/50 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-accent/50 rounded w-40" />
                    <div className="h-3 bg-accent/30 rounded w-24" />
                  </div>
                  <div className="h-4 bg-accent/50 rounded w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No transactions found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {/* Header row */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_2fr_1fr_1fr] gap-4 px-5 py-2.5 bg-accent/10 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>User</span>
                <span>Type</span>
                <span>Description</span>
                <span>Date</span>
                <span className="text-right">Amount</span>
              </div>

              {transactions.map((tx: any) => {
                const meta = TYPE_META[tx.type] ?? { label: tx.type, color: "bg-muted/40 text-muted-foreground border-border", credit: true };
                return (
                  <div key={tx.id} className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[2fr_1fr_2fr_1fr_1fr] gap-x-4 gap-y-1 items-center px-5 py-3.5 hover:bg-accent/10 transition-colors">
                    {/* User */}
                    <div className="flex items-center gap-3 col-span-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.credit ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
                        {meta.credit ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{tx.user?.username ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate hidden sm:block">{tx.user?.email}</div>
                      </div>
                    </div>

                    {/* Type badge */}
                    <div className="hidden sm:flex">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="hidden sm:block text-sm text-muted-foreground truncate">{tx.description || "—"}</div>

                    {/* Date */}
                    <div className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(tx.createdAt), "MMM d, yyyy")}
                      <br />
                      {format(new Date(tx.createdAt), "HH:mm")}
                    </div>

                    {/* Amount */}
                    <div className={`text-right font-bold text-sm col-start-3 sm:col-auto ${meta.credit ? "text-primary" : ""}`}>
                      {meta.credit ? "+" : "−"}{formatCurrency(Math.abs(Number(tx.amount)))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} &middot; {total} total</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
