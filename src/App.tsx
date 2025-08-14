// Main App component
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { OrganizationErrorBoundary } from "@/components/OrganizationErrorBoundary";
import { cacheManager } from "@/utils/cacheManager";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProjectLayout } from "@/components/admin/ProjectLayout";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireWorker } from "@/components/RequireWorker";
import { WorkerLayout } from "@/components/worker/WorkerLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminProjects } from "./pages/admin/AdminProjects";
import { AdminLists } from "./pages/admin/AdminLists";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { CalendarPage } from "./pages/admin/AdminCalendar";
import AdminCosts from "./pages/admin/AdminCosts";
import { AdminAvailability } from "./pages/admin/AdminAvailability";
import { SystemOverview } from "./components/admin/SystemOverview";
import { WorkerCalendar } from "./pages/worker/WorkerCalendar";
import { ProjectDetailPage } from "./pages/admin/ProjectDetailPage";
import { PhaseTemplateListPage } from "./pages/admin/PhaseTemplateListPage";
import { PhaseTemplateDetailPage } from "./pages/admin/PhaseTemplateDetailPage";
import { Reports } from "./pages/admin/Reports";
import AdminQuotations from "./pages/admin/AdminQuotations";
import AdminQuotationTemplates from "./pages/admin/AdminQuotationTemplates";
import AdminScheduleAuto from "./pages/admin/AdminScheduleAuto";
import AdminScheduleManual from "./pages/admin/AdminScheduleManual";
import AdminMaterials from "./pages/admin/AdminMaterials";
import AdminIndeling from "./pages/admin/AdminIndeling";
import AdminStyling from "./pages/admin/AdminStyling";
import AdminAIMaterials from "./pages/admin/AdminAIMaterials";
import { WorkerDashboard } from "./pages/worker/WorkerDashboard";
import { WorkerProjects } from "./pages/worker/WorkerProjects";
import { WorkerLists } from "./pages/worker/WorkerLists";
import { WorkerProjectDetail } from "./pages/worker/WorkerProjectDetail";
import { AcceptInvite } from "./pages/AcceptInvite";
import QuotationAcceptance from "./pages/QuotationAcceptance";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (new property name in v5)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

function App() {
  // Initialize cache manager on app start
  React.useEffect(() => {
    cacheManager.initialize();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <OrganizationErrorBoundary>
              <OrganizationProvider>
              <Toaster />
              <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              <Route path="/quotation/:token" element={<QuotationAcceptance />} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<AdminOverview />} />
                <Route path="overview" element={<AdminOverview />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="lists" element={<AdminLists />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="availability" element={<AdminAvailability />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="materials" element={<AdminMaterials />} />
                <Route path="indeling" element={<AdminIndeling />} />
                <Route path="styling" element={<AdminStyling />} />
                <Route path="ai-materials" element={<AdminAIMaterials />} />
                <Route path="costs" element={<AdminCosts />} />
                <Route path="reports" element={<Reports />} />
                <Route path="quotations" element={<AdminQuotations />} />
                <Route path="quotation-templates" element={<AdminQuotationTemplates />} />
                <Route path="schedule/auto" element={<AdminScheduleAuto />} />
                <Route path="schedule/manual" element={<AdminScheduleManual />} />
                <Route path="system" element={<SystemOverview />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="phase-templates" element={<PhaseTemplateListPage />} />
                <Route path="phase-templates/:id" element={<PhaseTemplateDetailPage />} />
                {/* Redirect old template URLs to new ones */}
                <Route path="templates/phases" element={<Navigate to="/admin/phase-templates" replace />} />
                <Route path="templates/phases/:id" element={<Navigate to="/admin/phase-templates" replace />} />
              </Route>

              {/* Project routes */}
              <Route path="/admin/projects/:id/*" element={<RequireAdmin><ProjectDetailPage /></RequireAdmin>} />
              
              {/* Worker routes */}
              <Route path="/worker" element={<RequireWorker><WorkerLayout /></RequireWorker>}>
                <Route index element={<WorkerDashboard />} />
                <Route path="projects" element={<WorkerProjects />} />
                <Route path="lists" element={<WorkerLists />} />
                <Route path="projects/:id" element={<WorkerProjectDetail />} />
                <Route path="calendar" element={<WorkerCalendar />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
              </Routes>
              </BrowserRouter>
            </OrganizationProvider>
            </OrganizationErrorBoundary>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
