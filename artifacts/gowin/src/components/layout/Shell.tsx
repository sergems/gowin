import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useGetMyWallet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Activity, LayoutDashboard, History, Wallet, Trophy, LogOut, Users, Settings, X, Plus, Trash2, ArrowLeftRight, Ticket, UserCircle, AlertTriangle } from "lucide-react";

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { data: wallet } = useGetMyWallet({ query: { enabled: !!user } });
  const [location] = useLocation();
  const { selections, stake, setStake, removeSelection, totalOdds, potentialWin, placeBet, isPlacing } = useBetSlip();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">GoWin</span>
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === '/' ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
              <Activity className="w-4 h-4" /> Home
            </Link>
            <Link href="/sports" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.startsWith('/sports') ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
              <Trophy className="w-4 h-4" /> Sports
            </Link>
            {user && (
              <>
                <Link href="/history" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.startsWith('/history') ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                  <History className="w-4 h-4" /> My Bets
                </Link>
                <Link href="/wallet" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.startsWith('/wallet') ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                  <Wallet className="w-4 h-4" /> Wallet
                </Link>
                <Link href="/profile" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.startsWith('/profile') ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                  <UserCircle className="w-4 h-4" /> Profile
                  {!(user as any).phoneNumber && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-auto" />
                  )}
                </Link>
              </>
            )}
            
            {user?.role === "admin" && (
              <>
                <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </div>
                <Link href="/admin" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === '/admin' ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link href="/admin/users" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === '/admin/users' ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                  <Users className="w-4 h-4" /> Users
                </Link>
                <Link href="/admin/fixtures" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === '/admin/fixtures' ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                  <Activity className="w-4 h-4" /> Fixtures
                </Link>
                <Link href="/admin/bets" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === '/admin/bets' ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                  <Settings className="w-4 h-4" /> Bets
                </Link>
                <Link href="/admin/transactions" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === '/admin/transactions' ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                  <ArrowLeftRight className="w-4 h-4" /> Transactions
                </Link>
                <Link href="/admin/vouchers" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === '/admin/vouchers' ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                  <Ticket className="w-4 h-4" /> Vouchers
                </Link>
              </>
            )}
          </nav>
        </ScrollArea>
        {user ? (
          <div className="p-4 border-t border-border">
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
          </div>
        ) : (
          <div className="p-4 border-t border-border space-y-2">
            <Link href="/login" className="flex">
              <Button variant="outline" className="w-full">Login</Button>
            </Link>
            <Link href="/register" className="flex">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Register</Button>
            </Link>
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
          <div className="flex items-center gap-4">
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
