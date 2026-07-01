import { ReactNode, useState, useEffect, useRef } from "react";
import gowinLogo from "../../assets/logo.png";
import { format, formatDistanceToNow } from "date-fns";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useGetMyWallet, getGetMyWalletQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Activity, LayoutDashboard, History, Wallet, Trophy, LogOut, Users, Settings, X,
  ArrowLeftRight, Ticket, UserCircle, AlertTriangle, Banknote, SlidersHorizontal,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ChevronDown, ChevronRight, Globe, Shield, CheckCircle2,
  Home, Menu, Images, Printer, Clock, Building2, Target, BarChart3, FileText, DollarSign, Radio, Bell,
} from "lucide-react";
import type { PlacedBetDetails } from "@/contexts/BetSlipContext";
import { printBetSlip } from "@/lib/printBetSlip";
import { BetSlipBody } from "./BetSlipBody";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

interface LeagueEntry { id: number; name: string; logo: string | null; fixtureCount: number; }
interface CountryEntry { name: string; logo: string | null; leagues: LeagueEntry[]; }
interface FootballData { featured: LeagueEntry[]; international: LeagueEntry[]; countries: CountryEntry[]; }

function LeagueLogo({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Shield className="w-4 h-4 text-muted-foreground shrink-0" />;
  return <img src={src} alt={alt} width={20} height={20} className="object-contain shrink-0 w-5 h-5" onError={() => setFailed(true)} />;
}

function FlagImg({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="text-xs shrink-0">🏳️</span>;
  return <img src={src} alt={alt} width={16} height={11} className="object-cover rounded-sm shrink-0 w-4" style={{ height: 11 }} onError={() => setFailed(true)} />;
}

const NOTIF_ICONS: Record<string, string> = {
  payout_completed: "✅",
  payout_failed: "❌",
  withdrawal_approved: "🕐",
  withdrawal_rejected: "⛔",
};

function NotificationBell() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery<{ notifications: any[]; unreadCount: number }>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 30_000,
    enabled: !!token,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/mark-read", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    if ((data?.unreadCount ?? 0) > 0) markAllRead.mutate();
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  const [toast, setToast] = useState<{ title: string; message: string; icon: string } | null>(null);
  const hasInitialized = useRef(false);
  const prevUnreadRef = useRef(0);

  useEffect(() => {
    if (!data) return;
    const count = data.unreadCount;
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      prevUnreadRef.current = count;
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (count > prevUnreadRef.current) {
      const latest = data.notifications[0];
      if (latest) {
        setToast({ title: latest.title, message: latest.message, icon: NOTIF_ICONS[latest.type] ?? "🔔" });
        timer = setTimeout(() => setToast(null), 5000);
      }
    }
    prevUnreadRef.current = count;
    return () => { if (timer !== undefined) clearTimeout(timer); };
  }, [data?.unreadCount]);

  function relTime(d: string) {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ""; }
  }

  return (
    <>
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                  <span className="text-base mt-0.5 shrink-0">{NOTIF_ICONS[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">{relTime(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse" />}
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-accent/20 flex items-center justify-between">
              <Link href="/wallet" onClick={() => setOpen(false)} className="text-xs text-primary hover:underline">
                View wallet →
              </Link>
              <span className="text-xs text-muted-foreground/50">{notifications.length} total</span>
            </div>
          )}
        </div>
      )}
    </div>

    {toast && (
      <div
        className="fixed bottom-6 right-6 z-[100] bg-card border border-border rounded-xl shadow-2xl p-4 max-w-xs cursor-pointer"
        onClick={() => setToast(null)}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0 mt-0.5">{toast.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">{toast.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-3">{toast.message}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setToast(null); }}
            className="text-muted-foreground hover:text-foreground p-0.5 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )}
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { formatCurrency, currency, t } = useSiteSettings();
  const { data: wallet } = useGetMyWallet({ query: { enabled: !!user, queryKey: getGetMyWalletQueryKey() } });
  const [location, navigate] = useLocation();
  const { selections, stake, lastPlacedBet, clearLastPlacedBet } = useBetSlip();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [betSlipOpen, setBetSlipOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1280);
  const [sportsOpen, setSportsOpen] = useState(false);
  const [openCountries, setOpenCountries] = useState<Set<string>>(new Set());
  const [intlOpen, setIntlOpen] = useState(false);
  const [mobileBetSlipOpen, setMobileBetSlipOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const prevSelectionsLen = useRef(0);
  useEffect(() => {
    if (prevSelectionsLen.current === 0 && selections.length > 0) {
      setBetSlipOpen(true);
    }
    if (prevSelectionsLen.current > 0 && selections.length === 0) {
      setBetSlipOpen(false);
    }
    prevSelectionsLen.current = selections.length;
  }, [selections.length]);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isBranchAdmin = user?.role === "branch_admin";
  const isAgent = user?.role === "agent";
  const isPayout = user?.role === "payout";
  const isPaymentClerk = user?.role === "payment_clerk";

  useEffect(() => {
    if (isAdmin || isManager || isBranchAdmin || isAgent || isPayout || isPaymentClerk) {
      setBetSlipOpen(false);
    }
  }, [isAdmin, isManager, isBranchAdmin, isAgent, isPayout, isPaymentClerk]);
  const isStaffRole = isManager || isBranchAdmin || isAgent || isPayout || isPaymentClerk;

  const { data: footballData } = useQuery<FootballData>({
    queryKey: ["football-countries"],
    queryFn: () => fetch("/api/football/countries").then((r) => r.json()),
    enabled: sportsOpen && !isAdmin && !isStaffRole,
    staleTime: 5 * 60 * 1000,
  });

  const { data: sportsData } = useQuery<Array<{ id: number; name: string; icon: string }>>({
    queryKey: ["sports-list"],
    queryFn: () => fetch("/api/sports").then((r) => r.json()),
    enabled: !isAdmin && !isStaffRole,
    staleTime: 10 * 60 * 1000,
  });

  const activeSportId = location.startsWith("/sports") && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("sportId")
    : null;

  const toggleCountry = (name: string) => {
    setOpenCountries((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const selectLeague = (id: number, name: string) => {
    navigate(`/sports?leagueId=${id}&leagueName=${encodeURIComponent(name)}`);
    setMobileSidebarOpen(false);
  };

  const COUNTRY_PRIORITY = ["England", "Spain", "Germany", "Italy", "France", "Netherlands", "Portugal", "Turkey", "Congo DR"];

  const sortedCountries = (countries: CountryEntry[]) => {
    const priorityMap = new Map(COUNTRY_PRIORITY.map((n, i) => [n, i]));
    return [...countries].sort((a, b) => {
      const ai = priorityMap.has(a.name) ? priorityMap.get(a.name)! : COUNTRY_PRIORITY.length;
      const bi = priorityMap.has(b.name) ? priorityMap.get(b.name)! : COUNTRY_PRIORITY.length;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
  };

  const handleLogout = () => {
    logout();
    setMobileSidebarOpen(false);
    setLogoutConfirmOpen(false);
    setTimeout(() => navigate("/"), 0);
  };

  const branchAdminLinks = isBranchAdmin ? [
    { href: "/branch",          icon: LayoutDashboard, label: t("nav.dashboard"), match: (l: string) => l === "/branch" },
    { href: "/branch/agents",   icon: Users,           label: t("nav.agents"),    match: (l: string) => l === "/branch/agents" },
    { href: "/branch/bets",     icon: History,         label: t("nav.bets"),      match: (l: string) => l === "/branch/bets" },
    { href: "/branch/cashup",   icon: DollarSign,      label: t("nav.cashup"),    match: (l: string) => l === "/branch/cashup" },
    { href: "/branch/vouchers", icon: Ticket,          label: t("nav.vouchers"),  match: (l: string) => l === "/branch/vouchers" },
    { href: "/branch/reports",  icon: BarChart3,       label: t("nav.reports"),   match: (l: string) => l === "/branch/reports" },
  ] : [];

  const agentLinks = isAgent ? [
    { href: "/agent",          icon: LayoutDashboard, label: t("nav.dashboard"),    match: (l: string) => l === "/agent" },
    { href: "/agent/bets",     icon: History,         label: t("nav.my_bets_short"), match: (l: string) => l === "/agent/bets" },
    { href: "/agent/vouchers", icon: Ticket,          label: t("nav.vouchers"),     match: (l: string) => l === "/agent/vouchers" },
    { href: "/agent/reports",  icon: BarChart3,       label: t("nav.reports"),      match: (l: string) => l === "/agent/reports" },
  ] : [];

  const payoutLinks = isPayout ? [
    { href: "/payout",      icon: LayoutDashboard, label: t("nav.dashboard"),  match: (l: string) => l === "/payout" },
    { href: "/payout/desk", icon: Banknote,        label: t("nav.payout_desk"), match: (l: string) => l === "/payout/desk" },
  ] : [];

  const clerkLinks = isPaymentClerk ? [
    { href: "/clerk",             icon: LayoutDashboard, label: "Dashboard",    match: (l: string) => l === "/clerk" },
    { href: "/clerk/withdrawals", icon: Banknote,        label: "Withdrawals",  match: (l: string) => l === "/clerk/withdrawals" },
  ] : [];

  const adminLinks = user?.role === "admin" ? [
    { href: "/admin",              icon: LayoutDashboard, label: t("nav.dashboard"),      match: (l: string) => l === "/admin" },
    { href: "/admin/users",        icon: Users,           label: t("nav.users"),          match: (l: string) => l === "/admin/users" },
    { href: "/admin/branches",     icon: Building2,       label: t("nav.branches"),       match: (l: string) => l.startsWith("/admin/branches") },
    { href: "/admin/fixtures",     icon: Activity,        label: t("nav.fixtures"),       match: (l: string) => l === "/admin/fixtures" },
    { href: "/admin/bets",         icon: Settings,        label: t("nav.bets"),           match: (l: string) => l === "/admin/bets" },
    { href: "/admin/transactions", icon: ArrowLeftRight,  label: t("nav.transactions"),   match: (l: string) => l === "/admin/transactions" },
    { href: "/admin/vouchers",     icon: Ticket,          label: t("nav.vouchers"),       match: (l: string) => l === "/admin/vouchers" },
    { href: "/admin/withdrawals",  icon: Banknote,        label: t("nav.withdrawals"),    match: (l: string) => l === "/admin/withdrawals" },
    { href: "/admin/slides",          icon: Images,            label: t("nav.slides"),         match: (l: string) => l === "/admin/slides" },
    { href: "/admin/fixture-update",  icon: Clock,             label: t("nav.fixture_update"), match: (l: string) => l === "/admin/fixture-update" },
    { href: "/admin/api-monitor",     icon: BarChart3,         label: t("nav.api_monitor"),    match: (l: string) => l === "/admin/api-monitor" },
    { href: "/admin/settings",        icon: SlidersHorizontal, label: t("nav.settings"),       match: (l: string) => l === "/admin/settings" },
  ] : [];

  const managerLinks = user?.role === "manager" ? [
    { href: "/admin",                 icon: LayoutDashboard, label: t("nav.dashboard"),      match: (l: string) => l === "/admin" },
    { href: "/admin/users",           icon: Users,           label: t("nav.users"),          match: (l: string) => l === "/admin/users" },
    { href: "/admin/branches",        icon: Building2,       label: t("nav.branches"),       match: (l: string) => l.startsWith("/admin/branches") },
    { href: "/admin/fixtures",        icon: Activity,        label: t("nav.fixtures"),       match: (l: string) => l === "/admin/fixtures" },
    { href: "/admin/bets",            icon: Settings,        label: t("nav.bets"),           match: (l: string) => l === "/admin/bets" },
    { href: "/admin/transactions",    icon: ArrowLeftRight,  label: t("nav.transactions"),   match: (l: string) => l === "/admin/transactions" },
    { href: "/admin/vouchers",        icon: Ticket,          label: t("nav.vouchers"),       match: (l: string) => l === "/admin/vouchers" },
    { href: "/admin/withdrawals",     icon: Banknote,        label: t("nav.withdrawals"),    match: (l: string) => l === "/admin/withdrawals" },
    { href: "/admin/fixture-update",  icon: Clock,           label: t("nav.fixture_update"), match: (l: string) => l === "/admin/fixture-update" },
  ] : [];

  // ── Sidebar nav content (shared desktop + mobile) ────────────────────────
  function SidebarNav({ open, onNav }: { open: boolean; onNav?: () => void }) {
    return (
      <>
        <ScrollArea className="flex-1 py-3">
          <nav className={`space-y-1 ${open ? "px-2" : "px-1"}`}>

            {!isPayout && (
              <Link href="/" title={!open ? t("nav.home") : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location === "/" ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <Activity className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">{t("nav.home")}</span>}
              </Link>
            )}


            {!isStaffRole && isAdmin ? (
              <Link href="/sports" title={!open ? t("nav.football") : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/sports") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <Trophy className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">{t("nav.football")}</span>}
              </Link>
            ) : !isStaffRole ? (
              <> 
                <button title={!open ? t("nav.football") : undefined}
                  onClick={() => {
                    if (!open) setSidebarOpen(true);
                    setSportsOpen((v) => !v);
                  }}
                  className={`w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                    ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                    ${location.startsWith("/sports") && !activeSportId ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                  <Trophy className="w-4 h-4 shrink-0" />
                  {open && <span className="flex-1 text-left">{t("nav.football")}</span>}
                  {open && (sportsOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />)}
                </button>

                {open && sportsOpen && (
                  <div className="ml-1 border-l border-border/50 pl-1 max-h-[50vh] overflow-y-auto space-y-0.5 pb-1">
                    <button onClick={() => { navigate("/sports"); onNav?.(); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors
                        ${location === "/sports" && !location.includes("leagueId") ? "text-primary font-medium" : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"}`}>
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="flex-1 text-left">{t("nav.all_fixtures")}</span>
                    </button>

                    {!footballData ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground/60">Loading…</div>
                    ) : (
                      <>
                        {footballData.featured.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                              🏅 UEFA Competitions
                            </div>
                            {footballData.featured.map((lg) => (
                              <button key={lg.id} onClick={() => selectLeague(lg.id, lg.name)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors">
                                <LeagueLogo src={lg.logo} alt={lg.name} />
                                <span className="flex-1 text-left truncate">{lg.name}</span>
                                {lg.fixtureCount > 0 && <span className="text-[10px] text-muted-foreground/50 shrink-0">{lg.fixtureCount}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        {footballData.international.length > 0 && (
                          <div>
                            <button onClick={() => setIntlOpen((v) => !v)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="flex-1 text-left">International</span>
                              <span className="mr-1">{footballData.international.length}</span>
                              {intlOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {intlOpen && footballData.international.map((lg) => (
                              <button key={lg.id} onClick={() => selectLeague(lg.id, lg.name)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors">
                                <LeagueLogo src={lg.logo} alt={lg.name} />
                                <span className="flex-1 text-left truncate">{lg.name}</span>
                                <span className="text-[10px] text-muted-foreground/50 shrink-0">{lg.fixtureCount}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {sortedCountries(footballData.countries).map((country) => (
                          <div key={country.name}>
                            <button onClick={() => toggleCountry(country.name)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                              <FlagImg src={country.logo} alt={country.name} />
                              <span className="flex-1 text-left truncate normal-case text-xs font-medium">{country.name}</span>
                              <span className="mr-1 text-[10px]">{country.leagues.length}</span>
                              {openCountries.has(country.name) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {openCountries.has(country.name) && country.leagues.map((lg) => (
                              <button key={lg.id} onClick={() => selectLeague(lg.id, lg.name)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors">
                                <LeagueLogo src={lg.logo} alt={lg.name} />
                                <span className="flex-1 text-left truncate">{lg.name}</span>
                                <span className="text-[10px] text-muted-foreground/50 shrink-0">{lg.fixtureCount}</span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </>
            ) : null}

            {!isAdmin && !isStaffRole && sportsData?.filter((s) => s.name !== "Football").map((sport) => (
              <Link
                key={sport.id}
                href={`/sports?sportId=${sport.id}&sportName=${encodeURIComponent(sport.name)}`}
                title={!open ? sport.name : undefined}
                onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${activeSportId === String(sport.id)
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}
              >
                <span className="w-4 h-4 shrink-0 text-base leading-none flex items-center justify-center">{sport.icon}</span>
                {open && <span className="flex-1">{sport.name}</span>}
              </Link>
            ))}

            {!isAdmin && !isStaffRole && (
              <Link href="/results" title={!open ? t("nav.results") : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/results") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">{t("nav.results")}</span>}
              </Link>
            )}

            {!isStaffRole && (
              <div
                title={!open ? t("nav.live") : undefined}
                className={`flex items-center gap-3 rounded-md text-sm font-medium cursor-not-allowed opacity-40 select-none
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}`}>
                <Radio className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">{t("nav.live")}</span>}
                {open && <span className="text-[10px] font-semibold border border-muted-foreground/30 text-muted-foreground rounded px-1 py-0.5 leading-none">{t("nav.coming_soon")}</span>}
              </div>
            )}

            {!isStaffRole && (
              <a
                href="/api/fixtures-pdf/download"
                title={!open ? "Download Fixtures PDF" : undefined}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  hover:bg-accent hover:text-accent-foreground text-muted-foreground`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">Fixtures</span>}
              </a>
            )}

            {!user && !isStaffRole && (
              <a
                href="/gowin.apk"
                download="GoWin.apk"
                title={t("footer.download_title")}
                className={`flex items-center gap-3 rounded-md transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  hover:bg-accent opacity-90 hover:opacity-100`}
              >
                <img src="/store-badges/google-play.png" alt="Get it on Google Play" className="h-9 w-auto object-contain" />
              </a>
            )}

            {user && !isStaffRole && (
              <Link href="/history" title={!open ? t("nav.my_bets") : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/history") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <History className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">{t("nav.my_bets")}</span>}
              </Link>
            )}

            {user && !isStaffRole && (
              <Link href="/wallet" title={!open ? t("nav.wallet") : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/wallet") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <Wallet className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">{t("nav.wallet")}</span>}
              </Link>
            )}

            {user && !isStaffRole && (
              <a
                href="/gowin.apk"
                download="GoWin.apk"
                title={t("footer.download_title")}
                className={`flex items-center gap-3 rounded-md transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  hover:bg-accent opacity-90 hover:opacity-100`}
              >
                <img src="/store-badges/google-play.png" alt="Get it on Google Play" className="h-9 w-auto object-contain" />
              </a>
            )}

            {adminLinks.length > 0 && (
              <>
                {open && (
                  <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("nav.admin")}
                  </div>
                )}
                {!open && <div className="my-2 mx-1 border-t border-border" />}
                {adminLinks.map(({ href, icon: Icon, label, match }) => (
                  <Link key={href} href={href} title={!open ? label : undefined} onClick={onNav}
                    className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                      ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                      ${match(location) ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {open && label}
                  </Link>
                ))}
              </>
            )}

            {managerLinks.length > 0 && (
              <>
                {open && (
                  <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("nav.admin")}
                  </div>
                )}
                {!open && <div className="my-2 mx-1 border-t border-border" />}
                {managerLinks.map(({ href, icon: Icon, label, match }) => (
                  <Link key={href} href={href} title={!open ? label : undefined} onClick={onNav}
                    className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                      ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                      ${match(location) ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {open && label}
                  </Link>
                ))}
              </>
            )}

            {branchAdminLinks.length > 0 && (
              <>
                {open && (
                  <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("nav.branch")}
                  </div>
                )}
                {!open && <div className="my-2 mx-1 border-t border-border" />}
                {branchAdminLinks.map(({ href, icon: Icon, label, match }) => (
                  <Link key={href} href={href} title={!open ? label : undefined} onClick={onNav}
                    className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                      ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                      ${match(location) ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {open && label}
                  </Link>
                ))}
              </>
            )}

            {agentLinks.length > 0 && (
              <>
                {open && (
                  <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("nav.agent")}
                  </div>
                )}
                {!open && <div className="my-2 mx-1 border-t border-border" />}
                {agentLinks.map(({ href, icon: Icon, label, match }) => (
                  <Link key={href} href={href} title={!open ? label : undefined} onClick={onNav}
                    className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                      ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                      ${match(location) ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {open && label}
                  </Link>
                ))}
              </>
            )}

            {payoutLinks.length > 0 && (
              <>
                {open && (
                  <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("nav.payout")}
                  </div>
                )}
                {!open && <div className="my-2 mx-1 border-t border-border" />}
                {payoutLinks.map(({ href, icon: Icon, label, match }) => (
                  <Link key={href} href={href} title={!open ? label : undefined} onClick={onNav}
                    className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                      ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                      ${match(location) ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {open && label}
                  </Link>
                ))}
              </>
            )}

            {clerkLinks.length > 0 && (
              <>
                {open && (
                  <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Payment Clerk
                  </div>
                )}
                {!open && <div className="my-2 mx-1 border-t border-border" />}
                {clerkLinks.map(({ href, icon: Icon, label, match }) => (
                  <Link key={href} href={href} title={!open ? label : undefined} onClick={onNav}
                    className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                      ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                      ${match(location) ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {open && label}
                  </Link>
                ))}
              </>
            )}

            {user && (
              <Link href="/profile" title={!open ? t("nav.profile") : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors relative
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/profile") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <UserCircle className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">{t("nav.profile")}</span>}
                {open && !(user as any).phoneNumber && !isStaffRole && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                {!open && !(user as any).phoneNumber && !isStaffRole && <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-500 top-1 right-1" />}
              </Link>
            )}
          </nav>
        </ScrollArea>

        {/* User footer */}
        {user ? (
          <div className={`border-t border-border ${open ? "p-4" : "p-2"}`}>
            {open ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    {((user as any).firstName || user.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate">
                      {(user as any).firstName && (user as any).lastName
                        ? `${(user as any).firstName} ${(user as any).lastName}`
                        : user.username}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">ID: {(user as any).publicId ?? "—"}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setLogoutConfirmOpen(true)}>
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
              </>
            ) : (
              <button onClick={() => setLogoutConfirmOpen(true)} title="Logout"
                className="w-full flex justify-center text-muted-foreground hover:text-destructive transition-colors p-2 rounded-md hover:bg-accent">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className={`border-t border-border ${open ? "p-4 space-y-2" : "p-2 space-y-2"}`}>
            {open ? (
              <>
                <Link href="/login" className="flex" onClick={onNav}>
                  <Button variant="outline" className="w-full">{t("auth.login")}</Button>
                </Link>
                <Link href="/register" className="flex" onClick={onNav}>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">{t("auth.register")}</Button>
                </Link>
              </>
            ) : (
              <Link href="/login" title={t("auth.login")} onClick={onNav}
                className="flex justify-center text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors">
                <UserCircle className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground dark">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? "w-64" : "w-14"} border-r border-border bg-card hidden md:flex flex-col shrink-0 transition-all duration-200`}>
        <div className={`h-14 flex items-center border-b border-border shrink-0 ${sidebarOpen ? "px-4 gap-2" : "justify-center"}`}>
          {sidebarOpen && (
            <img src={gowinLogo} alt="GoWin" className="h-8 w-auto object-contain flex-1" />
          )}
          <button onClick={() => setSidebarOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
        </div>
        <SidebarNav open={sidebarOpen} />
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col overflow-hidden">
            <div className="h-14 flex items-center px-4 gap-2 border-b border-border shrink-0">
              <img src={gowinLogo} alt="GoWin" className="h-8 w-auto object-contain flex-1" />
              <button onClick={() => setMobileSidebarOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarNav open={true} onNav={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Floating overlay header — zero height, sits on top of content */}
        <header className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 md:px-6 z-20 pointer-events-none">
          {/* Mobile: hamburger */}
          <button className="md:hidden pointer-events-auto text-white/90 hover:text-white p-1.5 rounded-md hover:bg-white/10 mr-2 drop-shadow"
            onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile: centered logo */}
          <div className="md:hidden pointer-events-auto flex items-center absolute left-1/2 -translate-x-1/2">
            <img src={gowinLogo} alt="GoWin" className="h-7 w-auto object-contain drop-shadow" />
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end pointer-events-auto">
            {user && wallet && (
              <Link href="/wallet">
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border border-white/20 hover:bg-black/60 transition-colors cursor-pointer">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-white">{formatCurrency(wallet.balance)}</span>
                </div>
              </Link>
            )}
            {user && !isStaffRole && <NotificationBell />}
            {!betSlipOpen && (
              <button
                onClick={() => setBetSlipOpen(true)}
                className="hidden md:flex items-center gap-1.5 text-white/80 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/10 relative drop-shadow"
                title="Open bet slip"
              >
                <PanelRightOpen className="w-5 h-5" />
                {selections.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {selections.length > 9 ? "9+" : selections.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-yellow-400/70
          [&::-webkit-scrollbar-thumb:hover]:bg-yellow-400">
          <div className="pt-14 px-4 pb-24 md:px-5 md:pb-6 lg:px-6 max-w-7xl mx-auto">
            {children}
          </div>
        </div>

        <footer className="shrink-0 border-t border-border bg-card/50 px-4 py-2 hidden md:block">
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground/50">
            <span>© {new Date().getFullYear()} GoWin Sportsbook. {t("footer.rights")}</span>
            <span>·</span>
            <a href="/privacy" className="hover:text-muted-foreground transition-colors">{t("footer.privacy")}</a>
            <span>·</span>
            <a href="/terms" className="hover:text-muted-foreground transition-colors">{t("footer.terms")}</a>
          </div>
        </footer>
      </main>

      {/* ── Desktop Bet Slip ─────────────────────────────────────────────────── */}
      {betSlipOpen && (
        <aside className="w-80 border-l border-border bg-card hidden md:flex flex-col shrink-0">
          <BetSlipBody onToggle={() => setBetSlipOpen(false)} />
        </aside>
      )}

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card md:hidden flex items-center h-14 px-1 safe-area-inset-bottom">
        <Link href="/"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors
            ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {user ? (
          <>
            <Link href="/history"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors
                ${location.startsWith("/history") ? "text-primary" : "text-muted-foreground"}`}>
              <History className="w-5 h-5" />
              <span className="text-[10px] font-medium">My Bets</span>
            </Link>
            <Link href="/wallet"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors
                ${location.startsWith("/wallet") ? "text-primary" : "text-muted-foreground"}`}>
              <Wallet className="w-5 h-5" />
              <span className="text-[10px] font-medium">Wallet</span>
            </Link>
            <a href="/gowin.apk" download="GoWin.apk"
              className="flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors opacity-90 hover:opacity-100">
              <img src="/store-badges/google-play.png" alt="Get it on Google Play" className="h-8 w-auto object-contain" />
            </a>
          </>
        ) : (
          <>
            <Link href="/results"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors
                ${location.startsWith("/results") ? "text-primary" : "text-muted-foreground"}`}>
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t("nav.results")}</span>
            </Link>
            <a href="/gowin.apk" download="GoWin.apk"
              className="flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors opacity-90 hover:opacity-100">
              <img src="/store-badges/google-play.png" alt="Get it on Google Play" className="h-8 w-auto object-contain" />
            </a>
            <Link href="/login"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors
                ${location.startsWith("/login") ? "text-primary" : "text-muted-foreground"}`}>
              <UserCircle className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t("auth.login")}</span>
            </Link>
          </>
        )}

        {/* Bet Slip FAB */}
        <button onClick={() => setMobileBetSlipOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors relative
            ${mobileBetSlipOpen ? "text-primary" : "text-muted-foreground"}`}>
          <div className="relative">
            <Ticket className="w-5 h-5" />
            {selections.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {selections.length > 9 ? "9+" : selections.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{t("betslip.title")}</span>
        </button>

        {/* Logout (logged-in only) */}
        {user && (
          <button onClick={() => setLogoutConfirmOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors text-muted-foreground hover:text-destructive">
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        )}
      </nav>

      {/* ── Logout Confirmation Dialog ───────────────────────────────────────── */}
      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("auth.logout_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLogout}
            >
              {t("auth.logout_yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Mobile Bet Slip Drawer ───────────────────────────────────────────── */}
      {mobileBetSlipOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileBetSlipOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl flex flex-col overflow-hidden shadow-2xl" style={{ maxHeight: '85dvh', height: '85dvh' }}>
            <BetSlipBody onClose={() => setMobileBetSlipOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Print / Save Bet Slip dialog ─────────────────────────────────────── */}
      {lastPlacedBet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={clearLastPlacedBet} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-base">{t("betslip.placed")}</p>
                <p className="text-xs text-muted-foreground">
                  Code: <span className="font-mono font-bold">{lastPlacedBet.code || "—"}</span>
                </p>
              </div>
              <button onClick={clearLastPlacedBet} className="ml-auto text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-accent/30 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("betslip.selections")}</span>
                <span className="font-medium">{lastPlacedBet.selections.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("betslip.total_odds")}</span>
                <span className="font-medium">{lastPlacedBet.totalOdds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("betslip.stake")}</span>
                <span className="font-medium">{formatCurrency(lastPlacedBet.stake)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold">
                <span>{t("betslip.potential_win")}</span>
                <span className="text-primary">{formatCurrency(lastPlacedBet.potentialWin)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11 gap-2"
                onClick={() => { printBetSlip(lastPlacedBet, currency); }}
              >
                <Printer className="w-4 h-4" />
                {t("betslip.print")}
              </Button>
              <Button className="h-11" onClick={clearLastPlacedBet}>
                {t("common.done")}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
