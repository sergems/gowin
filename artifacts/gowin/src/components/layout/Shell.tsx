import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useGetMyWallet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Activity, LayoutDashboard, History, Wallet, Trophy, LogOut, Users, Settings, X, ArrowLeftRight, Ticket, UserCircle, AlertTriangle, Banknote, SlidersHorizontal, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, Globe, Shield } from "lucide-react";

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
  const [sportsOpen, setSportsOpen] = useState(false);
  const [openCountries, setOpenCountries] = useState<Set<string>>(new Set());
  const [intlOpen, setIntlOpen] = useState(false);

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
  };

  const navLinks = [
    { href: "/", icon: Activity, label: "Home", match: (l: string) => l === "/" },
    { href: "/sports", icon: Trophy, label: "Sports", match: (l: string) => l.startsWith("/sports") },
    ...(user ? [
      { href: "/history", icon: History, label: "My Bets", match: (l: string) => l.startsWith("/history") },
      { href: "/wallet", icon: Wallet, label: "Wallet", match: (l: string) => l.startsWith("/wallet") },
      { href: "/profile", icon: UserCircle, label: "Profile", match: (l: string) => l.startsWith("/profile"), badge: !(user as any).phoneNumber ? "warn" : undefined },
    ] : []),
  ];

  const adminLinks = user?.role === "admin" ? [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard", match: (l: string) => l === "/admin" },
    { href: "/admin/users", icon: Users, label: "Users", match: (l: string) => l === "/admin/users" },
    { href: "/admin/fixtures", icon: Activity, label: "Fixtures", match: (l: string) => l === "/admin/fixtures" },
    { href: "/admin/bets", icon: Settings, label: "Bets", match: (l: string) => l === "/admin/bets" },
    { href: "/admin/transactions", icon: ArrowLeftRight, label: "Transactions", match: (l: string) => l === "/admin/transactions" },
    { href: "/admin/vouchers", icon: Ticket, label: "Vouchers", match: (l: string) => l === "/admin/vouchers" },
    { href: "/admin/withdrawals", icon: Banknote, label: "Withdrawals", match: (l: string) => l === "/admin/withdrawals" },
    { href: "/admin/settings", icon: SlidersHorizontal, label: "Settings", match: (l: string) => l === "/admin/settings" },
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground dark">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-14"} border-r border-border bg-card flex flex-col shrink-0 transition-all duration-200`}
      >
        {/* Logo + Toggle */}
        <div className={`h-14 flex items-center border-b border-border shrink-0 ${sidebarOpen ? "px-4 gap-2" : "justify-center"}`}>
          {sidebarOpen && (
            <>
              <Trophy className="w-5 h-5 text-primary shrink-0" />
              <span className="font-bold text-xl tracking-tight flex-1">GoWin</span>
            </>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
        </div>

        <ScrollArea className="flex-1 py-3">
          <nav className={`space-y-1 ${sidebarOpen ? "px-2" : "px-1"}`}>

            {/* Home */}
            <Link
              href="/"
              title={!sidebarOpen ? "Home" : undefined}
              className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                ${sidebarOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
                ${location === "/" ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="flex-1">Home</span>}
            </Link>

            {/* Sports — toggle for non-admin, plain link for admin */}
            {isAdmin ? (
              <Link
                href="/sports"
                title={!sidebarOpen ? "Sports" : undefined}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${sidebarOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/sports") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}
              >
                <Trophy className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="flex-1">Sports</span>}
              </Link>
            ) : (
              <>
                <button
                  title={!sidebarOpen ? "Sports" : undefined}
                  onClick={() => {
                    if (!sidebarOpen) setSidebarOpen(true);
                    setSportsOpen((v) => !v);
                  }}
                  className={`w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                    ${sidebarOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
                    ${location.startsWith("/sports") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  {sidebarOpen && <span className="flex-1 text-left">Sports</span>}
                  {sidebarOpen && (sportsOpen
                    ? <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 shrink-0" />)}
                </button>

                {/* Football submenu */}
                {sidebarOpen && sportsOpen && (
                  <div className="ml-1 border-l border-border/50 pl-1 max-h-[50vh] overflow-y-auto space-y-0.5 pb-1">
                    {/* All Fixtures */}
                    <button
                      onClick={() => navigate("/sports")}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors
                        ${location === "/sports" && !location.includes("leagueId") ? "text-primary font-medium" : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"}`}
                    >
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="flex-1 text-left">All Fixtures</span>
                    </button>

                    {!footballData ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground/60">Loading…</div>
                    ) : (
                      <>
                        {/* UEFA */}
                        {footballData.featured.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                              🏅 UEFA Competitions
                            </div>
                            {footballData.featured.map((lg) => (
                              <button
                                key={lg.id}
                                onClick={() => selectLeague(lg.id, lg.name)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors"
                              >
                                <LeagueLogo src={lg.logo} alt={lg.name} />
                                <span className="flex-1 text-left truncate">{lg.name}</span>
                                {lg.fixtureCount > 0 && <span className="text-[10px] text-muted-foreground/50 shrink-0">{lg.fixtureCount}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* International */}
                        {footballData.international.length > 0 && (
                          <div>
                            <button
                              onClick={() => setIntlOpen((v) => !v)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                            >
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="flex-1 text-left">International</span>
                              <span className="mr-1">{footballData.international.length}</span>
                              {intlOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {intlOpen && footballData.international.map((lg) => (
                              <button
                                key={lg.id}
                                onClick={() => selectLeague(lg.id, lg.name)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors"
                              >
                                <LeagueLogo src={lg.logo} alt={lg.name} />
                                <span className="flex-1 text-left truncate">{lg.name}</span>
                                <span className="text-[10px] text-muted-foreground/50 shrink-0">{lg.fixtureCount}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Countries */}
                        {sortedCountries(footballData.countries).map((country) => (
                          <div key={country.name}>
                            <button
                              onClick={() => toggleCountry(country.name)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                            >
                              <FlagImg src={country.logo} alt={country.name} />
                              <span className="flex-1 text-left truncate normal-case text-xs font-medium">{country.name}</span>
                              <span className="mr-1 text-[10px]">{country.leagues.length}</span>
                              {openCountries.has(country.name) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {openCountries.has(country.name) && country.leagues.map((lg) => (
                              <button
                                key={lg.id}
                                onClick={() => selectLeague(lg.id, lg.name)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors"
                              >
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

            {/* My Bets */}
            {user && (
              <Link
                href="/history"
                title={!sidebarOpen ? "My Bets" : undefined}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${sidebarOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/history") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}
              >
                <History className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="flex-1">My Bets</span>}
              </Link>
            )}

            {/* Wallet */}
            {user && (
              <Link
                href="/wallet"
                title={!sidebarOpen ? "Wallet" : undefined}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${sidebarOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/wallet") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}
              >
                <Wallet className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="flex-1">Wallet</span>}
              </Link>
            )}

            {/* Profile */}
            {user && (
              <Link
                href="/profile"
                title={!sidebarOpen ? "Profile" : undefined}
                className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                  ${sidebarOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
                  ${location.startsWith("/profile") ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}
              >
                <UserCircle className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="flex-1">Profile</span>}
                {sidebarOpen && !(user as any).phoneNumber && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                {!sidebarOpen && !(user as any).phoneNumber && <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-500 top-1 right-1" />}
              </Link>
            )}

            {/* Admin section */}
            {adminLinks.length > 0 && (
              <>
                {sidebarOpen && (
                  <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Admin
                  </div>
                )}
                {!sidebarOpen && <div className="my-2 mx-1 border-t border-border" />}
                {adminLinks.map(({ href, icon: Icon, label, match }) => {
                  const active = match(location);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={!sidebarOpen ? label : undefined}
                      className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors
                        ${sidebarOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
                        ${active ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {sidebarOpen && label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* User footer */}
        {user ? (
          <div className={`border-t border-border ${sidebarOpen ? "p-4" : "p-2"}`}>
            {sidebarOpen ? (
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
              <button
                onClick={handleLogout}
                title="Logout"
                className="w-full flex justify-center text-muted-foreground hover:text-destructive transition-colors p-2 rounded-md hover:bg-accent"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className={`border-t border-border ${sidebarOpen ? "p-4 space-y-2" : "p-2 space-y-2"}`}>
            {sidebarOpen ? (
              <>
                <Link href="/login" className="flex">
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link href="/register" className="flex">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Register</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" title="Login" className="flex justify-center text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors">
                  <UserCircle className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex-1">
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
          <p className="hidden md:block flex-[5] text-center text-xs text-muted-foreground/70 leading-snug px-2">
            GOWIN SPORTSBOOK est un opérateur de paris agréé. GOWIN encourage le jeu responsable. Le jeu est interdit aux moins de 18 ans. Avertissement : le jeu peut engendrer une dépendance et être dangereux s'il n'est pas contrôlé et pratiqué avec modération. Les gagnants savent s'arrêter.
          </p>
          <div className="flex items-center gap-4 flex-1 justify-end">
            {user && wallet && (
              <div className="flex items-center gap-2 bg-accent/50 px-3 py-1.5 rounded-full border border-border">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">${wallet.balance.toFixed(2)}</span>
              </div>
            )}
          </div>
        </header>
        <ScrollArea className="flex-1">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </ScrollArea>
      </main>

      {/* Bet Slip */}
      <aside className="w-80 border-l border-border bg-card flex flex-col shrink-0">
        <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-accent/30">
          <span className="font-bold">Bet Slip</span>
          <span className="ml-2 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">{selections.length}</span>
        </div>

        <ScrollArea className="flex-1 p-4">
          {user && !(user as any).phoneNumber && (
            <Link href="/profile">
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
                  <button
                    onClick={() => removeSelection(sel.oddsId)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-muted-foreground mb-1 pr-6">{sel.fixtureName}</p>
                  <p className="font-medium text-sm mb-1">{sel.selection}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-background/50 px-2 py-1 rounded text-muted-foreground">{sel.marketName}</span>
                    <span className="font-bold text-primary">{sel.odds.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {selections.length > 0 && (
          <div className="p-4 border-t border-border bg-accent/10 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Odds</span>
                <span className="font-bold">{totalOdds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2">
                <span className="text-muted-foreground">Stake ($)</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
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
              onClick={placeBet}
              disabled={isPlacing || stake <= 0 || !user}
            >
              {isPlacing ? "Placing Bet..." : !user ? "Login to Bet" : "Place Bet"}
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
