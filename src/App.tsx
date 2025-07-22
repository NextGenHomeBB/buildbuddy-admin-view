import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminProjects } from "./pages/admin/AdminProjects";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { ProjectDetail } from "./pages/admin/ProjectDetail";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { RequireAdmin } from "./components/RequireAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }>
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
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
