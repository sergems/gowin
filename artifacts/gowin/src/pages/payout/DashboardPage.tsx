import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import api from "../../lib/api";
import { useSiteSettings } from "../../contexts/SiteSettingsContext";
import { format } from "date-fns";
import { Banknote, CheckCircle2, Clock, LayoutDashboard, ArrowRight } from "lucide-react";

interface PayoutStats {
  paidToday: number;
  amountPaidToday: number;
  pendingClaims: number;
  paidTotal: number;
  amountPaidTotal: number;
  recentPaid: { id: number; amount: number; status: string; createdAt: string; betCode: string | null }[];
}

export default function PayoutDashboardPage() {
  const [, navigate] = useLocation();
  const { formatCurrency, t } = useSiteSettings();

  const { data, isLoading } = useQuery<PayoutStats>({
    queryKey: ["payout-stats"],
    queryFn: () => api.get<PayoutStats>("/api/payout/stats").then(r => r.data),
    refetchInterval: 30_000,
  });

  const stats = data;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
            {t("payout.dashboard_title")}
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>
        <button
          onClick={() => navigate("/payout/desk")}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Banknote className="w-4 h-4" /> {t("nav.payout_desk")} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">{t("payout.paid_today")}</p>
            </div>
            <p className="text-3xl font-black text-white">{stats.paidToday}</p>
            <p className="text-sm text-emerald-300 font-semibold mt-0.5">{formatCurrency(stats.amountPaidToday)}</p>
          </div>

          <div className={`border rounded-2xl p-4 ${stats.pendingClaims > 0 ? "bg-amber-900/20 border-amber-700/40" : "bg-zinc-800 border-zinc-700"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className={`w-4 h-4 ${stats.pendingClaims > 0 ? "text-amber-400" : "text-zinc-400"}`} />
              <p className={`text-xs font-semibold uppercase tracking-wider ${stats.pendingClaims > 0 ? "text-amber-400" : "text-zinc-400"}`}>{t("payout.pending_approval")}</p>
            </div>
            <p className="text-3xl font-black text-white">{stats.pendingClaims}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t("payout.claims_awaiting")}</p>
          </div>

          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("payout.total_paid")}</p>
            </div>
            <p className="text-3xl font-black text-white">{stats.paidTotal}</p>
            <p className="text-sm text-zinc-300 font-semibold mt-0.5">{formatCurrency(stats.amountPaidTotal)}</p>
          </div>

          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 flex flex-col justify-center">
            <button
              onClick={() => navigate("/payout/desk")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-bold text-sm transition-colors flex items-center justify-center gap-2">
              <Banknote className="w-4 h-4" /> {t("payout.verify_ticket")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Recent paid tickets */}
      {stats && stats.recentPaid.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t("payout.recent_payouts")}</h2>
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden">
            {stats.recentPaid.map((item, idx) => (
              <div key={item.id} className={`flex items-center justify-between px-4 py-3 ${idx < stats.recentPaid.length - 1 ? "border-b border-zinc-700/60" : ""}`}>
                <div>
                  <p className="text-sm font-mono font-bold text-white">{item.betCode ?? `#${item.id}`}</p>
                  <p className="text-xs text-zinc-500">{format(new Date(item.createdAt), "d MMM, HH:mm")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(item.amount)}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-semibold">{t("payout.paid_badge")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && stats.recentPaid.length === 0 && !isLoading && (
        <div className="text-center py-12 text-zinc-500">
          <Banknote className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{t("payout.no_tickets")}</p>
          <p className="text-xs text-zinc-600 mt-1">{t("payout.no_tickets_desc")}</p>
        </div>
      )}
    </div>
  );
}
