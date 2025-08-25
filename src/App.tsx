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
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarNav } from './components/ui/navigation-menu';
import MenuIcon from '@mui/icons-material/Menu';
import { useAgentMetricsPolling } from './hooks/useAgentMetricsPolling';
import ErrorBoundary from './components/ErrorBoundary';
import { AgentAnalyticsProvider } from './components/AgentAnalyticsContext';
import { TicketAnalyticsProvider } from './components/TicketAnalyticsContext';
import AdminRumus from './pages/AdminRumus';
import MasterDataAgent from './components/MasterDataAgent';
import CustomerData from './pages/CustomerData';
import { IncidentData } from './pages/IncidentData';
import IncidentAnalytics from './pages/IncidentAnalytics';
import TSAnalytics from './pages/TSAnalytics';
import SiteAnalytics from './pages/SiteAnalytics';

const queryClient = new QueryClient();

function AppLayout() {
  const location = useLocation();

  // Sidebar width constants
  const SIDEBAR_WIDTH = 260;
  const SIDEBAR_COLLAPSED_WIDTH = 70;
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

  // Auto-hide sidebar drawer on route change (mobile) - removed since mobile sidebar is not used

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

  // DISABLED: Authentication check - Login page is disabled
  // React.useEffect(() => {
  //   const isLoginPage = location.pathname === '/login';
  //   const isAdminPage = location.pathname === '/admin';
  //   const authToken = localStorage.getItem('auth_token');
  //   const user = localStorage.getItem('user');
  //   
  //   if (!isLoginPage && !isAdminPage && (!authToken || !user)) {
  //     window.location.replace('/login');
  //   }
  // }, [location.pathname]);

  // Auto-redirect from login page to dashboard
  React.useEffect(() => {
    if (location.pathname === '/login') {
      window.history.replaceState({}, '', '/summary-dashboard');
    }
  }, [location.pathname]);

  // Set up default user when no authentication exists
  React.useEffect(() => {
    const authToken = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    
    if (!authToken || !user) {
      // Set up default user for disabled login
      const defaultUser = {
        id: 1,
        username: 'admin',
        role: 'super admin',
        created_at: new Date().toISOString(),
        is_active: true
      };
      
      localStorage.setItem('auth_token', 'mock-token-disabled-login');
      localStorage.setItem('user', JSON.stringify(defaultUser));
      localStorage.setItem('session_id', 'mock-session-disabled-login');
    }
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Gradient background */}
      {!isLoginPage && (
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-100 via-white to-pink-100 dark:from-gray-900 dark:via-gray-950 dark:to-blue-900" />
      )}
      {!isLoginPage && (
        <SidebarNav
          onCollapseChange={collapsed => setSidebarCollapsed(collapsed)}
        />
      )}
      {/* Mobile sidebar overlay removed since mobile sidebar is not used */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ${isLoginPage ? '' : ''}`}
        style={isLoginPage ? {} : { marginLeft: responsiveMarginLeft, transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <main className={isLoginPage ? 'flex-1 flex items-center justify-center min-h-screen bg-gray-100 dark:bg-zinc-900' : 'p-4 sm:p-6 lg:p-8'}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/login" element={<Login />} />
            {/* Path lama tetap, tambahkan path baru nested sesuai sidebar */}
            <Route path="/ticket/grid-view" element={<GridView />} />
            <Route path="/ticket/kanban-board" element={<KanbanBoard />} />
            <Route path="/ticket/ticket-analytics" element={<TicketAnalyticsProvider><TicketAnalytics /></TicketAnalyticsProvider>} />
            <Route path="/ticket/agent-analytics" element={<AgentAnalyticsProvider><AgentAnalytics /></AgentAnalyticsProvider>} />
            <Route path="/masterdata/data-agent" element={<MasterDataAgent />} />
            <Route path="/masterdata/data-customer" element={<CustomerData />} />
            {/* Incident Management Routes */}
            <Route path="/incident/data" element={<IncidentData />} />
            <Route path="/incident/analytics" element={<IncidentAnalytics />} />
            <Route path="/incident/ts-analytics" element={<TSAnalytics />} />
            <Route path="/incident/site-analytics" element={<SiteAnalytics />} />
            <Route path="/documentation/upload" element={<UploadProcess onUploadComplete={() => {}} />} />
            <Route path="/documentation/admin-rumus" element={<AdminRumus />} />
            {/* Path lama tetap untuk fallback/compatibility */}
            <Route path="/agent-analytics" element={<ErrorBoundary><AgentAnalyticsProvider><AgentAnalytics /></AgentAnalyticsProvider></ErrorBoundary>} />
            <Route path="/grid-view" element={<GridView />} />
            <Route path="/kanban-board" element={<KanbanBoard />} />
            <Route path="/ticket-analytics" element={<TicketAnalyticsProvider><TicketAnalytics /></TicketAnalyticsProvider>} />
            <Route path="/upload" element={<UploadProcess onUploadComplete={() => {}} />} />
            <Route path="/summary-dashboard" element={<SummaryDashboard />} />
            <Route path="/admin-rumus" element={<AdminRumus />} />
            <Route path="/master-agent" element={<MasterDataAgent />} />
            <Route path="/customer" element={<CustomerData />} />
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
