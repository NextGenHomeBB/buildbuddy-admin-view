
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WorkerSidebar } from './WorkerSidebar';
import { WorkerHeader } from './WorkerHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function WorkerLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <WorkerSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <WorkerHeader />
          
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
