
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WorkerSidebar } from './WorkerSidebar';
import { WorkerHeader } from './WorkerHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDeviceType } from '@/hooks/useDeviceType';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { Home, FolderOpen, CheckSquare, User, Calendar, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkerLayout() {
  const isMobile = useIsMobile();
  const deviceType = useDeviceType();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const mobileNavItems = [
    { name: 'Dashboard', href: '/worker', icon: Home },
    { name: 'Projects', href: '/worker/projects', icon: FolderOpen },
    { name: 'Lists', href: '/worker/lists', icon: List },
    { name: 'Tasks', href: '/worker/tasks', icon: CheckSquare },
    { name: 'Calendar', href: '/worker/calendar', icon: Calendar },
  ];

  return (
    <SidebarProvider>
      <div className={cn(
        "min-h-screen flex w-full bg-background",
        deviceType === 'desktop' && "desktop-context-menu"
      )}>
        {!isMobile && <WorkerSidebar />}
        
        <div className="flex-1 flex flex-col min-w-0">
          <WorkerHeader />
          
          <main className={cn(
            "flex-1 overflow-auto gpu-accelerated",
            isMobile ? "p-4 pb-20" : "p-2 sm:p-4 lg:p-6",
            deviceType === 'tablet' && "tablet-split-view p-6",
            deviceType === 'desktop' && "keyboard-focus"
          )}>
            <Outlet />
          </main>
        </div>

        {isMobile && <MobileBottomNav items={mobileNavItems} />}
      </div>
    </SidebarProvider>
  );
}
