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
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import ChangePassword from "@/pages/change-password";
import Home from "@/pages/home";
import SportsHub from "@/pages/sports";
import FixtureDetail from "@/pages/fixture-detail";
import History from "@/pages/history";
import Results from "@/pages/results";
import Wallet from "@/pages/wallet";
import Profile from "@/pages/profile";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminFixtures from "@/pages/admin/fixtures";
import AdminBets from "@/pages/admin/bets";
import AdminTransactions from "@/pages/admin/transactions";
import AdminVouchers from "@/pages/admin/vouchers";
import AdminWithdrawals from "@/pages/admin/withdrawals";
import AdminSettings from "@/pages/admin/settings";
import AdminSlides from "@/pages/admin/slides";
import AdminFixtureUpdate from "@/pages/admin/fixture-update";
import AdminBranches from "@/pages/admin/BranchesPage";

// Branch Admin Pages
import BranchDashboard from "@/pages/branch/DashboardPage";
import BranchAgents from "@/pages/branch/AgentsPage";
import BranchBets from "@/pages/branch/BetsPage";
import BranchCashUp from "@/pages/branch/CashUpPage";
import BranchVouchers from "@/pages/branch/VouchersPage";
import BranchReports from "@/pages/branch/ReportsPage";

// Agent Pages
import AgentDashboard from "@/pages/agent/DashboardPage";
import AgentVouchers from "@/pages/agent/VouchersPage";
import AgentReports from "@/pages/agent/ReportsPage";
import AgentBets from "@/pages/agent/BetsPage";

// Payout Pages
import PayoutPage from "@/pages/payout/PayoutPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: 1,
    },
  },
});

function ProtectedRoute({ component: Component, allowedRoles, adminOnly = false, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!user) return <Login />;

  if ((user as any).mustChangePassword) return <ChangePassword />;

  if (adminOnly && user.role !== "admin") return <Home />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "admin") return <AdminDashboard />;
    if (user.role === "branch_admin") return <BranchDashboard />;
    if (user.role === "agent") return <AgentDashboard />;
    if (user.role === "payout") return <PayoutPage />;
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
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/change-password" component={() => <ProtectedRoute component={ChangePassword} />} />
        <Route path="/sports" component={SportsHub} />
        <Route path="/sports/:sportId" component={SportsHub} />
        <Route path="/fixtures/:id" component={FixtureDetail} />
        <Route path="/results" component={Results} />
        <Route path="/history" component={() => <ProtectedRoute component={History} />} />
        <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />

        {/* Super Admin Routes */}
        <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} adminOnly />} />
        <Route path="/admin/users" component={() => <ProtectedRoute component={AdminUsers} adminOnly />} />
        <Route path="/admin/fixtures" component={() => <ProtectedRoute component={AdminFixtures} adminOnly />} />
        <Route path="/admin/bets" component={() => <ProtectedRoute component={AdminBets} adminOnly />} />
        <Route path="/admin/transactions" component={() => <ProtectedRoute component={AdminTransactions} adminOnly />} />
        <Route path="/admin/vouchers" component={() => <ProtectedRoute component={AdminVouchers} adminOnly />} />
        <Route path="/admin/withdrawals" component={() => <ProtectedRoute component={AdminWithdrawals} adminOnly />} />
        <Route path="/admin/settings" component={() => <ProtectedRoute component={AdminSettings} adminOnly />} />
        <Route path="/admin/slides" component={() => <ProtectedRoute component={AdminSlides} adminOnly />} />
        <Route path="/admin/fixture-update" component={() => <ProtectedRoute component={AdminFixtureUpdate} adminOnly />} />
        <Route path="/admin/branches" component={() => <ProtectedRoute component={AdminBranches} adminOnly />} />

        {/* Branch Admin Routes */}
        <Route path="/branch" component={() => <ProtectedRoute component={BranchDashboard} allowedRoles={["branch_admin"]} />} />
        <Route path="/branch/agents" component={() => <ProtectedRoute component={BranchAgents} allowedRoles={["branch_admin"]} />} />
        <Route path="/branch/bets"   component={() => <ProtectedRoute component={BranchBets}   allowedRoles={["branch_admin"]} />} />
        <Route path="/branch/cashup" component={() => <ProtectedRoute component={BranchCashUp} allowedRoles={["branch_admin"]} />} />
        <Route path="/branch/vouchers" component={() => <ProtectedRoute component={BranchVouchers} allowedRoles={["branch_admin"]} />} />
        <Route path="/branch/reports" component={() => <ProtectedRoute component={BranchReports} allowedRoles={["branch_admin"]} />} />

        {/* Agent Routes */}
        <Route path="/agent" component={() => <ProtectedRoute component={AgentDashboard} allowedRoles={["agent"]} />} />
        <Route path="/agent/bets" component={() => <ProtectedRoute component={AgentBets} allowedRoles={["agent"]} />} />
        <Route path="/agent/vouchers" component={() => <ProtectedRoute component={AgentVouchers} allowedRoles={["agent"]} />} />
        <Route path="/agent/reports" component={() => <ProtectedRoute component={AgentReports} allowedRoles={["agent"]} />} />

        {/* Payout Routes */}
        <Route path="/payout" component={() => <ProtectedRoute component={PayoutPage} allowedRoles={["payout", "admin"]} />} />

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
