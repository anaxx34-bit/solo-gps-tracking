import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DevLogin from "./pages/DevLogin";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import ParentDashboard from "./pages/ParentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import LiveTracking from "./pages/LiveTracking";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  // Route based on user role
  if (user) {
    return (
      <Switch>
        {user.userType === "parent" && (
          <>
            <Route path="/" component={ParentDashboard} />
            <Route path="/tracking/:busId" component={LiveTracking} />
          </>
        )}
        {user.userType === "driver" && (
          <>
            <Route path="/" component={DriverDashboard} />
          </>
        )}
        {user.userType === "admin" && (
          <>
            <Route path="/" component={AdminDashboard} />
          </>
        )}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Public routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dev-login" component={DevLogin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - SOLO uses a light theme with professional colors for school transportation
// - Color palette in index.css is optimized for mobile-first design
// - Theme is not switchable to maintain consistent user experience

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
