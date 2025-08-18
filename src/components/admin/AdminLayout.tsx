import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useAdminKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useContextMenu } from '@/hooks/useContextMenu';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { ContextMenuOverlay } from '@/components/ui/context-menu-overlay';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { GlobalSearch } from '@/components/admin/GlobalSearch';
import { NewProjectDialog } from '@/components/admin/NewProjectDialog';
import { Home, Users, FolderOpen, Calendar, DollarSign, Settings, BarChart3, Plus, Search, HelpCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminLayout() {
  const isMobile = useIsMobile();
  const deviceType = useDeviceType();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  
  // Keyboard shortcuts
  useAdminKeyboardShortcuts();
  
  // Context menu
  const { contextMenu, showContextMenu, hideContextMenu, handleItemClick } = useContextMenu();

  // Global event listeners for keyboard shortcuts
  useEffect(() => {
    const handleCustomEvents = (event: Event) => {
      switch (event.type) {
        case 'admin:new-project':
          setShowNewProjectDialog(true);
          break;
        case 'admin:search':
          setShowGlobalSearch(true);
          break;
        case 'admin:show-shortcuts':
          setShowShortcutsHelp(true);
          break;
      }
    };

    window.addEventListener('admin:new-project', handleCustomEvents);
    window.addEventListener('admin:search', handleCustomEvents);
    window.addEventListener('admin:show-shortcuts', handleCustomEvents);

    return () => {
      window.removeEventListener('admin:new-project', handleCustomEvents);
      window.removeEventListener('admin:search', handleCustomEvents);
      window.removeEventListener('admin:show-shortcuts', handleCustomEvents);
    };
  }, []);

  const mobileNavItems = [
    { name: 'Overview', href: '/admin', icon: Home },
    { name: 'Projects', href: '/admin/projects', icon: FolderOpen },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  ];

  const contextMenuItems = [
    { 
      label: 'New Project', 
      action: () => setShowNewProjectDialog(true), 
      icon: Plus, 
      shortcut: 'Ctrl+N' 
    },
    { 
      label: 'Search', 
      action: () => setShowGlobalSearch(true), 
      icon: Search, 
      shortcut: 'Ctrl+K' 
    },
    { 
      label: 'Keyboard Shortcuts', 
      action: () => setShowShortcutsHelp(true), 
      icon: HelpCircle, 
      shortcut: '?' 
    },
  ];

  return (
    <SidebarProvider>
      <div 
        className={cn(
          "min-h-screen flex w-full bg-background",
          deviceType === 'desktop' && "desktop-context-menu"
        )}
        onContextMenu={(e) => deviceType === 'desktop' && showContextMenu(e, contextMenuItems)}
      >
        {/* Desktop Sidebar */}
        {!isMobile && <AdminSidebar />}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          
          {/* Page Content */}
          <main className={cn(
            "flex-1 overflow-auto gpu-accelerated",
            isMobile ? "p-4 pb-20" : "p-2 sm:p-4 lg:p-6",
            deviceType === 'tablet' && "tablet-split-view p-6",
            deviceType === 'desktop' && "keyboard-focus"
          )}>
            <Outlet />
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav items={mobileNavItems} />}
        
        {/* Context Menu */}
        <ContextMenuOverlay
          isOpen={contextMenu.isOpen}
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onItemClick={handleItemClick}
          onClose={hideContextMenu}
        />
        
        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp
          isOpen={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
        />
        
        {/* Global Search */}
        <GlobalSearch
          isOpen={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
        />
        
        {/* New Project Dialog */}
        <NewProjectDialog
          isOpen={showNewProjectDialog}
          onClose={() => setShowNewProjectDialog(false)}
        />
      </div>
    </SidebarProvider>
  );
}