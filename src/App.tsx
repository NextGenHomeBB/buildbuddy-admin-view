
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProjectLayout } from "@/components/admin/ProjectLayout";
import { RequireAdmin } from "@/components/RequireAdmin";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminProjects } from "./pages/admin/AdminProjects";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { ProjectDetail } from "./pages/admin/ProjectDetail";
import { PhaseTemplateListPage } from "./pages/admin/PhaseTemplateListPage";
import { PhaseTemplateDetailPage } from "./pages/admin/PhaseTemplateDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<AdminOverview />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="phase-templates" element={<PhaseTemplateListPage />} />
                <Route path="phase-templates/:id" element={<PhaseTemplateDetailPage />} />
              </Route>

              {/* Project routes */}
              <Route path="/admin/projects/:id/*" element={<RequireAdmin><ProjectLayout /></RequireAdmin>} />
              <Route path="/admin/projects/:id/phase/:phaseId" element={<RequireAdmin><ProjectLayout /></RequireAdmin>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
