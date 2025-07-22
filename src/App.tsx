import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminProjects } from "./pages/admin/AdminProjects";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { ProjectDetail } from "./pages/admin/ProjectDetail";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { PhaseTemplateListPage } from "./pages/admin/PhaseTemplateListPage";
import { PhaseTemplateDetailPage } from "./pages/admin/PhaseTemplateDetailPage";
import { RequireAdmin } from "./components/RequireAdmin";
import { ProjectLayout } from "./components/admin/ProjectLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        console.error('Query failed:', error);
        return failureCount < 2;
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }>
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="projects/:id/*" element={<ProjectLayout />} />
            <Route path="templates/phases" element={<PhaseTemplateListPage />} />
            <Route path="templates/phases/:id" element={<PhaseTemplateDetailPage />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
