import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus, Mail, Shield, Clock, Edit, Trash2, Users } from 'lucide-react';
import { logger } from '@/utils/logger';
import { DataTable } from '@/components/admin/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { InvitationManagement } from '@/components/admin/InvitationManagement';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { UserInviteDialog } from '@/components/admin/UserInviteDialog';
import { ChangeUserRoleDialog } from '@/components/admin/ChangeUserRoleDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { ProjectSelectionDialog } from '@/components/admin/ProjectSelectionDialog';

// Define user interface to match database schema
interface User {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  bio?: string;
  work_role?: string;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'manager':
      return 'default';
    case 'worker':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function AdminUsers() {
  const isMobile = useIsMobile();
  const { currentOrg } = useOrganization();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      
      // Get current session to pass authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No valid session found');
        return;
      }

      // Call our edge function to get users with their roles
      const { data, error } = await supabase.functions.invoke('get_users_with_roles', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching users with roles:', error);
        return;
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Mobile card render function
  const renderMobileCard = (user: User, index: number) => (
    <Card key={user.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback>
                {user.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{user.full_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize text-xs">
                  {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Joined {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2"
                onClick={() => {
                  setSelectedUser(user);
                  setShowEditDialog(true);
                }}
              >
                <Edit className="h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-2"
                onClick={() => {
                  setSelectedUser(user);
                  setShowRoleDialog(true);
                }}
              >
                <Shield className="h-4 w-4" />
                Change Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2"
                onClick={() => {
                  setSelectedUser(user);
                  setShowAssignDialog(true);
                }}
              >
                <Users className="h-4 w-4" />
                Assign to Project
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Mail className="h-4 w-4" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Remove User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'full_name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback>
                {user.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-foreground">{user.full_name}</div>
              <div className="text-sm text-muted-foreground">{user.id}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('role') as string;
        return (
          <Badge variant={getRoleBadgeVariant(role)} className="capitalize gap-1">
            {role === 'admin' && <Shield className="h-3 w-3" />}
            {role}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => {
        const createdAt = row.getValue('created_at') as string;
        return (
          <span className="text-sm">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2"
                onClick={() => {
                  setSelectedUser(user);
                  setShowEditDialog(true);
                }}
              >
                <Edit className="h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-2"
                onClick={() => {
                  setSelectedUser(user);
                  setShowRoleDialog(true);
                }}
              >
                <Shield className="h-4 w-4" />
                Change Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2"
                onClick={() => {
                  setSelectedUser(user);
                  setShowAssignDialog(true);
                }}
              >
                <Users className="h-4 w-4" />
                Assign to Project
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Mail className="h-4 w-4" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Remove User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage team members and user permissions.
          </p>
        </div>
        <Button 
          className="admin-button-primary gap-2"
          onClick={() => setShowInviteDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Users Content */}
      {loading ? (
        <div className="space-y-4">
          {isMobile ? (
            // Mobile skeleton cards
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} showAvatar showBadge />
            ))
          ) : (
            // Desktop skeleton table
            <div className="space-y-4">
              <div className="flex gap-4 p-4 border-b">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 bg-muted animate-pulse rounded w-24" />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border-b border-border/50">
                  <div className="h-4 bg-muted animate-pulse rounded w-32" />
                  <div className="h-4 bg-muted animate-pulse rounded w-20" />
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                  <div className="h-4 bg-muted animate-pulse rounded w-16" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="There are no users in your organization yet. Invite team members to get started."
          action={{
            label: "Invite User",
            onClick: () => setShowInviteDialog(true)
          }}
        />
      ) : (
        <PullToRefresh 
          onRefresh={() => fetchUsers(true)}
        >
          <DataTable
            columns={columns}
            data={users}
            searchPlaceholder="Search users..."
            mobileCardRender={renderMobileCard}
          />
        </PullToRefresh>
      )}

      {/* Dialogs */}
      <UserInviteDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onUserInvited={() => {
          fetchUsers();
          setShowInviteDialog(false);
        }}
      />

      <ChangeUserRoleDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        user={selectedUser}
        onRoleChanged={() => {
          fetchUsers();
          setShowRoleDialog(false);
          setSelectedUser(null);
        }}
      />

      <EditUserDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={selectedUser}
        onUserUpdated={() => {
          fetchUsers();
          setShowEditDialog(false);
          setSelectedUser(null);
        }}
      />

      <ProjectSelectionDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        selectedUser={selectedUser}
      />

      {/* Organization-specific invitation management */}
      {currentOrg && (
        <div className="mt-8">
          <InvitationManagement />
        </div>
      )}
    </div>
  );
}