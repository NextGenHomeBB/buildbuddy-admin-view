
import { Home, FolderOpen, CheckSquare, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const navigation = [
  { name: 'Dashboard', href: '/worker', icon: Home },
  { name: 'My Projects', href: '/worker/projects', icon: FolderOpen },
  { name: 'My Tasks', href: '/worker/tasks', icon: CheckSquare },
  { name: 'Profile', href: '/worker/profile', icon: User },
];

export function WorkerSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="border-b border-border p-6">
        <h2 className="text-lg font-semibold">BuildBuddy</h2>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton 
                asChild 
                className={cn(
                  location.pathname === item.href && 'bg-accent text-accent-foreground'
                )}
              >
                <Link to={item.href} className="flex items-center gap-3 px-3 py-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
