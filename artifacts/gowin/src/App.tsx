import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BetSlipProvider } from "@/contexts/BetSlipContext";
import { Shell } from "@/components/layout/Shell";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/home";
import SportsHub from "@/pages/sports";
import FixtureDetail from "@/pages/fixture-detail";
import History from "@/pages/history";
import Wallet from "@/pages/wallet";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminFixtures from "@/pages/admin/fixtures";
import AdminBets from "@/pages/admin/bets";
import AdminTransactions from "@/pages/admin/transactions";
import AdminVouchers from "@/pages/admin/vouchers";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  
  if (!user) {
    return <Login />;
  }
  
  if (adminOnly && user.role !== "admin") {
    return <Home />;
  }
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/sports" component={SportsHub} />
        <Route path="/sports/:sportId" component={SportsHub} />
        <Route path="/fixtures/:id" component={FixtureDetail} />
        <Route path="/history" component={() => <ProtectedRoute component={History} />} />
        <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
        
        <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} adminOnly />} />
        <Route path="/admin/users" component={() => <ProtectedRoute component={AdminUsers} adminOnly />} />
        <Route path="/admin/fixtures" component={() => <ProtectedRoute component={AdminFixtures} adminOnly />} />
        <Route path="/admin/bets" component={() => <ProtectedRoute component={AdminBets} adminOnly />} />
        <Route path="/admin/transactions" component={() => <ProtectedRoute component={AdminTransactions} adminOnly />} />
        <Route path="/admin/vouchers" component={() => <ProtectedRoute component={AdminVouchers} adminOnly />} />
        
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BetSlipProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </BetSlipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
