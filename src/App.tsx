import React from 'react';
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
import { AnalyticsProvider } from './components/AnalyticsContext';
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
import PageWrapper from './components/PageWrapper';

const queryClient = new QueryClient();

function AppLayout() {
  const location = useLocation();

  const hour = new Date().getHours();
  const isBusyHour = hour >= 8 && hour <= 17;
  useAgentMetricsPolling('/api/agent-metrics', isBusyHour);

  // Check if it's login page
  const isLoginPage = location.pathname === '/login';

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

  // If it's login page, render without PageWrapper
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-zinc-900 flex items-center justify-center">
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    );
  }

  // For all other pages, use PageWrapper with new navigation
  return (
    <PageWrapper>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/admin" element={<AdminPanel />} />
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
    </PageWrapper>
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
