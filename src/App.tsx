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

// New sidebar imports
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from './components/AppSidebar';
import { ModeToggle } from './components/mode-toggle';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import LogoutIcon from '@mui/icons-material/Logout';

const queryClient = new QueryClient();

function AppLayout() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const hour = new Date().getHours();
  const isBusyHour = hour >= 8 && hour <= 17;
  useAgentMetricsPolling('/api/agent-metrics', isBusyHour);

  // Check if login page
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

  return (
    <div className="relative min-h-screen">
      {/* Gradient background */}
      {!isLoginPage && (
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-100 via-white to-pink-100 dark:from-gray-900 dark:via-gray-950 dark:to-blue-900" />
      )}
      
      {/* New Sidebar System */}
      {!isLoginPage && (
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1">
            {/* Enhanced Header with Background */}
            <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">A</span>
                  </div>
                  <h1 className="text-lg font-semibold text-card-foreground">Helpdesk Management System</h1>
                </div>
              </div>
              
              {/* Header Right Section - Avatar and Mode Toggle */}
              <div className="flex items-center gap-3">
                {/* Mode Toggle */}
                <ModeToggle />
                
                {/* Avatar with dropdown profile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center focus:outline-none group">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm font-bold">
                          {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48" align="end">
                    <DropdownMenuLabel>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm text-center">
                        {user.username || 'User'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize text-center">
                        {user.role} Role
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={async () => { 
                        try {
                          const authToken = localStorage.getItem('auth_token');
                          if (authToken) {
                            await fetch('http://localhost:3001/logout', {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${authToken}`,
                                'Content-Type': 'application/json',
                              },
                            });
                          }
                        } catch (error) {
                          console.error('Logout error:', error);
                        } finally {
                          localStorage.removeItem('auth_token');
                          localStorage.removeItem('user');
                          localStorage.removeItem('session_id');
                          window.location.href = '/summary-dashboard';
                        }
                      }} 
                      className="cursor-pointer text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/50 dark:focus:text-red-400 font-semibold"
                    >
                      <LogoutIcon className="mr-2 h-3.5 w-3.5" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
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
            </div>
          </main>
        </SidebarProvider>
      )}

      {/* Login page without sidebar */}
      {isLoginPage && (
        <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-100 dark:bg-zinc-900">
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      )}
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
