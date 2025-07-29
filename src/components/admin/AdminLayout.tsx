import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { Home, Users, FolderOpen, Calendar, DollarSign, Settings, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const mobileNavItems = [
    { name: 'Overview', href: '/admin', icon: Home },
    { name: 'Projects', href: '/admin/projects', icon: FolderOpen },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        {!isMobile && <AdminSidebar />}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          
          {/* Page Content */}
          <main className={cn(
            "flex-1 overflow-auto",
            isMobile ? "p-4 pb-20" : "p-2 sm:p-4 lg:p-6"
          )}>
            <Outlet />
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav items={mobileNavItems} />}
      </div>
    </SidebarProvider>
  );
}