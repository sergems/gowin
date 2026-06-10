import { ReactNode, useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useGetMyWallet } from "@workspace/api-client-react";
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
  Home, Menu, Images,
} from "lucide-react";

interface LeagueEntry { id: number; name: string; logo: string | null; fixtureCount: number; }
interface CountryEntry { name: string; logo: string | null; leagues: LeagueEntry[]; }
interface FootballData { featured: LeagueEntry[]; international: LeagueEntry[]; countries: CountryEntry[]; }

function LeagueLogo({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  return <img src={src} alt={alt} width={14} height={14} className="object-contain shrink-0 w-3.5 h-3.5" onError={() => setFailed(true)} />;
}

function FlagImg({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="text-xs shrink-0">🏳️</span>;
  return <img src={src} alt={alt} width={16} height={11} className="object-cover rounded-sm shrink-0 w-4" style={{ height: 11 }} onError={() => setFailed(true)} />;
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { data: wallet } = useGetMyWallet({ query: { enabled: !!user } });
  const [location, navigate] = useLocation();
  const { selections, stake, setStake, removeSelection, totalOdds, potentialWin, placeBet, isPlacing } = useBetSlip();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [betSlipOpen, setBetSlipOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
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

  const { data: footballData } = useQuery<FootballData>({
    queryKey: ["football-countries"],
    queryFn: () => fetch("/api/football/countries").then((r) => r.json()),
    enabled: sportsOpen && !isAdmin,
    staleTime: 5 * 60 * 1000,
  });

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

  const handleLogout = () => { logout(); setMobileSidebarOpen(false); navigate("/login"); };

  const adminLinks = user?.role === "admin" ? [
    { href: "/admin",              icon: LayoutDashboard, label: "Dashboard",    match: (l: string) => l === "/admin" },
    { href: "/admin/users",        icon: Users,           label: "Users",        match: (l: string) => l === "/admin/users" },
    { href: "/admin/fixtures",     icon: Activity,        label: "Fixtures",     match: (l: string) => l === "/admin/fixtures" },
    { href: "/admin/bets",         icon: Settings,        label: "Bets",         match: (l: string) => l === "/admin/bets" },
    { href: "/admin/transactions", icon: ArrowLeftRight,  label: "Transactions", match: (l: string) => l === "/admin/transactions" },
    { href: "/admin/vouchers",     icon: Ticket,          label: "Vouchers",     match: (l: string) => l === "/admin/vouchers" },
    { href: "/admin/withdrawals",  icon: Banknote,        label: "Withdrawals",  match: (l: string) => l === "/admin/withdrawals" },
    { href: "/admin/slides",       icon: Images,            label: "Slides",    match: (l: string) => l === "/admin/slides" },
    { href: "/admin/settings",     icon: SlidersHorizontal, label: "Settings",  match: (l: string) => l === "/admin/settings" },
  ] : [];

  // ── Sidebar nav content (shared desktop + mobile) ────────────────────────
  function SidebarNav({ open, onNav }: { open: boolean; onNav?: () => void }) {
    return (
      <>
        <ScrollArea className="flex-1 py-3">
          <nav className={`space-y-1 ${open ? "px-2" : "px-1"}`}>

            <Link href="/" title={!open ? "Home" : undefined} onClick={onNav}
              className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                ${location === "/" ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
              <Activity className="w-4 h-4 shrink-0" />
              {open && <span className="flex-1">Home</span>}
            </Link>

            {isAdmin ? (
              <Link href="/sports" title={!open ? "Sports" : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/sports") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <Trophy className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">Sports</span>}
              </Link>
            ) : (
              <>
                <button title={!open ? "Sports" : undefined}
                  onClick={() => {
                    if (!open) setSidebarOpen(true);
                    setSportsOpen((v) => !v);
                  }}
                  className={`w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                    ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                    ${location.startsWith("/sports") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                  <Trophy className="w-4 h-4 shrink-0" />
                  {open && <span className="flex-1 text-left">Sports</span>}
                  {open && (sportsOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />)}
                </button>

                {open && sportsOpen && (
                  <div className="ml-1 border-l border-border/50 pl-1 max-h-[50vh] overflow-y-auto space-y-0.5 pb-1">
                    <button onClick={() => { navigate("/sports"); onNav?.(); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors
                        ${location === "/sports" && !location.includes("leagueId") ? "text-primary font-medium" : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"}`}>
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="flex-1 text-left">All Fixtures</span>
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
            )}

            {!isAdmin && (
              <Link href="/results" title={!open ? "Results" : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/results") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">Results</span>}
              </Link>
            )}

            {user && (
              <Link href="/history" title={!open ? "My Bets" : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/history") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <History className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">My Bets</span>}
              </Link>
            )}

            {user && (
              <Link href="/wallet" title={!open ? "Wallet" : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/wallet") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <Wallet className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">Wallet</span>}
              </Link>
            )}

            {user && (
              <Link href="/profile" title={!open ? "Profile" : undefined} onClick={onNav}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors relative
                  ${open ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/profile") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}>
                <UserCircle className="w-4 h-4 shrink-0" />
                {open && <span className="flex-1">Profile</span>}
                {open && !(user as any).phoneNumber && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                {!open && !(user as any).phoneNumber && <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-500 top-1 right-1" />}
              </Link>
            )}

            {adminLinks.length > 0 && (
              <>
                {open && (
                  <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Admin
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
                <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
              </>
            ) : (
              <button onClick={handleLogout} title="Logout"
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
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link href="/register" className="flex" onClick={onNav}>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Register</Button>
                </Link>
              </>
            ) : (
              <Link href="/login" title="Login" onClick={onNav}
                className="flex justify-center text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors">
                <UserCircle className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </>
    );
  }

  // ── Bet slip content (shared desktop + mobile drawer) ─────────────────────
  function BetSlipBody({ onClose, onToggle }: { onClose?: () => void; onToggle?: () => void }) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-accent/30">
          {onToggle && (
            <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent mr-2" title="Collapse bet slip">
              <PanelRightClose className="w-5 h-5" />
            </button>
          )}
          <span className="font-bold">Bet Slip</span>
          <span className="ml-2 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">{selections.length}</span>
          {onClose && (
            <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-yellow-400/70
          [&::-webkit-scrollbar-thumb:hover]:bg-yellow-400">
          {user && !(user as any).phoneNumber && (
            <Link href="/profile" onClick={onClose}>
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 mb-4 cursor-pointer hover:bg-amber-500/15 transition-colors">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-500">Phone required to bet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tap to complete your profile</p>
                </div>
              </div>
            </Link>
          )}
          {selections.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 mt-20">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <Trophy className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm">Your bet slip is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selections.map((sel) => (
                <div key={sel.oddsId} className="bg-accent/40 border border-border rounded-lg p-3 relative group">
                  <button onClick={() => removeSelection(sel.oddsId)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-muted-foreground mb-1 pr-6">{sel.fixtureName}</p>
                  <p className="font-semibold text-sm leading-tight">{sel.selection}</p>
                  {(sel.competitionName || sel.startTime) && (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5 mb-1 leading-tight">
                      {[
                        sel.competitionName,
                        sel.startTime ? format(new Date(sel.startTime), "d MMM · HH:mm") : null,
                      ].filter(Boolean).join("  ·  ")}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-background/50 px-2 py-1 rounded text-muted-foreground">{sel.marketName}</span>
                    <span className="font-bold text-primary">{sel.odds.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selections.length > 0 && (
          <div className="p-4 border-t border-border bg-accent/10 space-y-4 shrink-0">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Odds</span>
                <span className="font-bold">{totalOdds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2">
                <span className="text-muted-foreground">Stake ($)</span>
                <Input
                  type="number" min="0.01" step="0.01"
                  className="w-24 h-8 text-right font-medium"
                  value={stake || ""}
                  onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                />
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential Win</span>
                <span className="font-bold text-primary">${potentialWin.toFixed(2)}</span>
              </div>
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-12"
              onClick={() => placeBet()}
              disabled={isPlacing || stake <= 0 || !user}
            >
              {isPlacing ? "Placing Bet..." : !user ? "Login to Bet" : "Place Bet"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground dark">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? "w-64" : "w-14"} border-r border-border bg-card hidden md:flex flex-col shrink-0 transition-all duration-200`}>
        <div className={`h-14 flex items-center border-b border-border shrink-0 ${sidebarOpen ? "px-4 gap-2" : "justify-center"}`}>
          {sidebarOpen && (
            <>
              <Trophy className="w-5 h-5 text-primary shrink-0" />
              <span className="font-bold text-xl tracking-tight flex-1">GoWin</span>
            </>
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
              <Trophy className="w-5 h-5 text-primary shrink-0" />
              <span className="font-bold text-xl tracking-tight flex-1">GoWin</span>
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
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          {/* Mobile: hamburger */}
          <button className="md:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent mr-2"
            onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop: welcome */}
          <div className="flex-1 hidden md:block">
            {user && (
              <span className="text-sm text-muted-foreground">
                Welcome,{" "}
                <span className="font-semibold text-foreground">
                  {(user as any).firstName && (user as any).lastName
                    ? `${(user as any).firstName} ${(user as any).lastName}`
                    : user.username}
                </span>
              </span>
            )}
          </div>

          {/* Mobile: centered logo */}
          <div className="md:hidden flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-bold text-lg tracking-tight">GoWin</span>
          </div>

          <p className={`flex-[5] text-center text-xs text-muted-foreground/70 leading-snug px-2 ${user ? "hidden" : "hidden md:block"}`}>
            GOWIN SPORTSBOOK est un opérateur de paris agréé. GOWIN encourage le jeu responsable. Le jeu est interdit aux moins de 18 ans. Avertissement : le jeu peut engendrer une dépendance et être dangereux s'il n'est pas contrôlé et pratiqué avec modération. Les gagnants savent s'arrêter.
          </p>

          <div className="flex items-center gap-3 flex-1 justify-end">
            {user && wallet && (
              <Link href="/wallet">
                <div className="flex items-center gap-1.5 bg-accent/50 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border border-border hover:bg-accent transition-colors cursor-pointer">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">${wallet.balance.toFixed(2)}</span>
                </div>
              </Link>
            )}
            {!betSlipOpen && (
              <button
                onClick={() => setBetSlipOpen(true)}
                className="hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-accent relative"
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

        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
            {children}
          </div>
        </ScrollArea>

        {user && (
          <footer className="shrink-0 border-t border-border bg-card/50 px-6 py-2 hidden md:block">
            <p className="text-[10px] text-muted-foreground/60 text-center leading-snug">
              GOWIN SPORTSBOOK est un opérateur de paris agréé. GOWIN encourage le jeu responsable. Le jeu est interdit aux moins de 18 ans. Avertissement : le jeu peut engendrer une dépendance et être dangereux s'il n'est pas contrôlé et pratiqué avec modération. Les gagnants savent s'arrêter.
            </p>
          </footer>
        )}
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
          </>
        ) : (
          <>
            <Link href="/results"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors
                ${location.startsWith("/results") ? "text-primary" : "text-muted-foreground"}`}>
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-[10px] font-medium">Results</span>
            </Link>
            <Link href="/login"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors
                ${location.startsWith("/login") ? "text-primary" : "text-muted-foreground"}`}>
              <UserCircle className="w-5 h-5" />
              <span className="text-[10px] font-medium">Login</span>
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
          <span className="text-[10px] font-medium">Bet Slip</span>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLogout}
            >
              Log out
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

    </div>
  );
}
