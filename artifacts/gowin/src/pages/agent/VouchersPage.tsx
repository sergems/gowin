import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { useSiteSettings } from "../../contexts/SiteSettingsContext";
import { Ticket, Printer, ShoppingCart, CheckCircle2 } from "lucide-react";

interface Voucher {
  id: number;
  code: string;
  value: number;
  isRedeemed: boolean;
  soldAt: string | null;
  printedAt: string | null;
  createdAt: string;
}

export default function AgentVouchersPage() {
  const qc = useQueryClient();
  const { formatCurrency, t } = useSiteSettings();
  const [printedCode, setPrintedCode] = useState<{ code: string; value: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "available" | "sold" | "printed">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["agent-vouchers"],
    queryFn: () => api.get<{ vouchers: Voucher[] }>("/api/agent/vouchers").then((r) => r.data),
  });

  const sellMut = useMutation({
    mutationFn: (id: number) => api.post<{ ok: boolean }>(`/api/agent/vouchers/${id}/sell`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-vouchers"] }),
  });

  const printMut = useMutation({
    mutationFn: (id: number) => api.post<{ voucher: { code: string; value: number } }>(`/api/agent/vouchers/${id}/print`).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["agent-vouchers"] });
      setPrintedCode({ code: data.voucher.code, value: data.voucher.value });
    },
  });

  const vouchers: Voucher[] = data?.vouchers ?? [];

  const filtered = vouchers.filter((v) => {
    if (filter === "available") return !v.isRedeemed && !v.soldAt;
    if (filter === "sold") return !!v.soldAt && !v.isRedeemed;
    if (filter === "printed") return !!v.printedAt;
    return true;
  });

  const stats = {
    total: vouchers.length,
    available: vouchers.filter((v) => !v.isRedeemed && !v.soldAt).length,
    sold: vouchers.filter((v) => !!v.soldAt && !v.isRedeemed).length,
  };

  function printReceipt(code: string, value: number) {
    const w = window.open("", "_blank", "width=300,height=400");
    if (!w) return;
    const displayValue = formatCurrency(value);
    w.document.write(`
      <html><head><title>Voucher Receipt</title>
      <style>body{font-family:monospace;text-align:center;padding:20px}
      .code{font-size:24px;font-weight:bold;border:2px dashed #333;padding:12px;margin:16px 0;letter-spacing:2px}
      .value{font-size:20px;color:#16a34a}</style></head>
      <body>
        <h2>${t("agent.vouchers.receipt_title")}</h2>
        <div class="value">${displayValue}</div>
        <div class="code">${code}</div>
        <p>${t("agent.vouchers.receipt_use")}</p>
        <p><small>${new Date().toLocaleString()}</small></p>
      </body></html>
    `);
    w.document.close();
    w.print();
  }

  const filterLabels: Record<string, string> = {
    all: t("agent.vouchers.filter_all"),
    available: t("agent.vouchers.filter_available"),
    sold: t("agent.vouchers.filter_sold"),
    printed: t("agent.vouchers.filter_printed"),
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Ticket className="w-7 h-7 text-emerald-400" />
          {t("agent.vouchers.title")}
        </h1>
        <p className="text-zinc-400 mt-1">{t("agent.vouchers.desc")}</p>
      </div>

      {printedCode && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Printer className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-300">{t("agent.vouchers.printed_msg")}</p>
            <p className="text-sm text-zinc-300 mt-1 font-mono">{printedCode.code} · {formatCurrency(printedCode.value)}</p>
            <button onClick={() => printReceipt(printedCode.code, printedCode.value)}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">{t("agent.vouchers.print_again")}</button>
          </div>
          <button onClick={() => setPrintedCode(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t("agent.vouchers.total")}</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.available}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t("agent.vouchers.available")}</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.sold}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t("agent.vouchers.sold_label")}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "available", "sold", "printed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${filter === f ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-zinc-400 text-center py-16">{t("agent.vouchers.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("agent.vouchers.none")}</p>
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">{t("agent.vouchers.col_code")}</th>
                <th className="px-5 py-3 text-left">{t("agent.vouchers.col_value")}</th>
                <th className="px-5 py-3 text-left">{t("agent.vouchers.col_status")}</th>
                <th className="px-5 py-3 text-right">{t("agent.vouchers.col_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700/50">
              {filtered.map((v) => {
                const isAvailable = !v.isRedeemed && !v.soldAt;
                return (
                  <tr key={v.id} className="hover:bg-zinc-700/30">
                    <td className="px-5 py-3 font-mono text-white">{v.code}</td>
                    <td className="px-5 py-3 text-emerald-400 font-semibold">{formatCurrency(v.value)}</td>
                    <td className="px-5 py-3">
                      {v.isRedeemed
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">{t("agent.vouchers.status_redeemed")}</span>
                        : v.soldAt
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400">{t("agent.vouchers.status_sold")}</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">{t("agent.vouchers.status_available")}</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isAvailable && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { printMut.mutate(v.id); printReceipt(v.code, v.value); }}
                            disabled={printMut.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-900/70 text-blue-400 text-xs font-medium transition-colors disabled:opacity-50">
                            <Printer className="w-3.5 h-3.5" /> {t("agent.vouchers.print")}
                          </button>
                          <button
                            onClick={() => { if (confirm(t("agent.vouchers.sell_confirm"))) sellMut.mutate(v.id); }}
                            disabled={sellMut.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-400 text-xs font-medium transition-colors disabled:opacity-50">
                            <ShoppingCart className="w-3.5 h-3.5" /> {t("agent.vouchers.sell")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
