import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "@/components/theme-provider"
import AdminPanel from "./pages/AdminPanel";
import SummaryDashboard from "./components/SummaryDashboard";
import GridView from "./components/GridView";
import KanbanBoard from "./components/KanbanBoard";
import TicketAnalytics from "./components/TicketAnalytics";
import AgentAnalytics from "./components/AgentAnalytics";
import UploadProcess from "./components/UploadProcess";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            
            <Route element={<AppLayout />}>
              <Route path="/summary" element={<SummaryDashboard />} />
              <Route path="/grid-view" element={<GridView />} />
              <Route path="/customer-analysis" element={<KanbanBoard />} />
              <Route path="/ticket-analysis" element={<TicketAnalytics />} />
              <Route path="/agent-analysis" element={<AgentAnalytics />} />
              <Route path="/upload" element={<UploadProcess />} />
              {/* Redirect from old dashboard path to the new default */}
              <Route path="/dashboard" element={<Navigate to="/summary" replace />} />
            </Route>

            <Route path="/admin" element={<AdminPanel />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
