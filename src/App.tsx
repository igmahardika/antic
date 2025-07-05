import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "@/components/theme-provider"
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AgentAnalytics from './components/AgentAnalytics';
import GridView from './components/GridView';
import KanbanBoard from './components/KanbanBoard';
import TicketAnalytics from './components/TicketAnalytics';
import UploadProcess from './components/UploadProcess';
import SummaryDashboard from './components/SummaryDashboard';
import { NavigationMenuBar } from './components/ui/navigation-menu';
import { AnalyticsProvider } from './components/AnalyticsContext';
import { ModeToggle } from './components/mode-toggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sun, Moon, LogOut } from "lucide-react";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarNav } from './components/ui/navigation-menu';
import { Menu as MenuIcon } from 'lucide-react';
import { useAgentMetricsPolling } from './hooks/useAgentMetricsPolling';
import ErrorBoundary from './components/ErrorBoundary';
import { AgentAnalyticsProvider } from './components/AgentAnalyticsContext';
import { TicketAnalyticsProvider } from './components/TicketAnalyticsContext';

const queryClient = new QueryClient();

function AppLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const location = useLocation();

  // Sidebar width constants
  const SIDEBAR_WIDTH = 310;
  const SIDEBAR_COLLAPSED_WIDTH = 80;
  // Track sidebar collapsed state for margin (sync with SidebarNav hover logic)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Responsive margin state
  const [responsiveMarginLeft, setResponsiveMarginLeft] = React.useState(0);

  // Listen for custom event from SidebarNav to update collapsed state
  React.useEffect(() => {
    function handleSidebarCollapse(e) {
      setSidebarCollapsed(e.detail.collapsed);
    }
    window.addEventListener('sidebar:collapse', handleSidebarCollapse);
    return () => window.removeEventListener('sidebar:collapse', handleSidebarCollapse);
  }, []);

  // Auto-hide sidebar drawer on route change (mobile)
  React.useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Calculate left margin for main content (responsive)
  React.useEffect(() => {
    function updateMargin() {
      if (window.innerWidth >= 768) {
        setResponsiveMarginLeft(sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH);
      } else {
        setResponsiveMarginLeft(0);
      }
    }
    updateMargin();
    window.addEventListener('resize', updateMargin);
    return () => window.removeEventListener('resize', updateMargin);
  }, [sidebarCollapsed]);

  const hour = new Date().getHours();
  const isBusyHour = hour >= 8 && hour <= 17;
  useAgentMetricsPolling('/api/agent-metrics', isBusyHour);

  // Cek jika halaman login, sembunyikan sidebar dan background
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="relative min-h-screen">
      {/* Gradient background */}
      {!isLoginPage && (
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-100 via-white to-pink-100 dark:from-gray-900 dark:via-gray-950 dark:to-blue-900" />
      )}
      {!isLoginPage && (
        <SidebarNav
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
          onCollapseChange={collapsed => setSidebarCollapsed(collapsed)}
        />
      )}
      {!isLoginPage && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ${isLoginPage ? '' : ''}`}
        style={isLoginPage ? {} : { marginLeft: responsiveMarginLeft, transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <main className={isLoginPage ? 'flex-1 flex items-center justify-center min-h-screen bg-gray-100 dark:bg-zinc-900' : 'p-4 sm:p-6 lg:p-8'}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/agent-analytics" element={<ErrorBoundary><AgentAnalyticsProvider><AgentAnalytics /></AgentAnalyticsProvider></ErrorBoundary>} />
            <Route path="/grid-view" element={<GridView />} />
            <Route path="/kanban-board" element={<KanbanBoard />} />
            <Route path="/ticket-analytics" element={<TicketAnalyticsProvider><TicketAnalytics /></TicketAnalyticsProvider>} />
            <Route path="/upload" element={<UploadProcess onUploadComplete={() => {}} />} />
            <Route path="/summary-dashboard" element={<SummaryDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AnalyticsProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </AnalyticsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
