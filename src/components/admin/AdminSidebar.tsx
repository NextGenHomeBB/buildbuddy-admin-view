import { NavLink, useLocation } from 'react-router-dom';
import { 
  FolderKanban, 
  Users, 
  Settings, 
  BarChart3,
  Building2,
  ChevronLeft,
  Menu
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    title: 'Overview',
    url: '/admin/overview',
    icon: BarChart3
  },
  {
    title: 'Projects',
    url: '/admin/projects',
    icon: FolderKanban
  },
  {
    title: 'Users',
    url: '/admin/users',
    icon: Users
  },
  {
    title: 'Settings',
    url: '/admin/settings',
    icon: Settings
  }
];

export function AdminSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';
  
  const isActiveRoute = (url: string) => {
    return location.pathname === url || 
           (url === '/admin/overview' && location.pathname === '/admin');
  };

  return (
    <Sidebar 
      className={cn(
        "border-r border-sidebar-border bg-sidebar transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg admin-gradient">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-sidebar-foreground">BuildBuddy</span>
              <span className="text-sm text-sidebar-foreground/60">Admin Dashboard</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-sidebar-foreground/60 text-xs uppercase tracking-wider mb-2",
            isCollapsed && "sr-only"
          )}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild
                    className={cn(
                      "w-full justify-start gap-3 transition-colors hover:bg-sidebar-accent",
                      isActiveRoute(item.url) && 
                      "bg-sidebar-accent text-sidebar-primary font-medium"
                    )}
                  >
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Toggle Button */}
      <div className="border-t border-sidebar-border p-2">
        <SidebarTrigger className="w-full" />
      </div>
    </Sidebar>
  );
}