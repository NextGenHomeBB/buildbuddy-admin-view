import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus, Mail, Shield, Clock, Edit, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

// Define user interface to match database schema
interface User {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
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
      }
    };

    fetchUsers();
  }, []);

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
              <DropdownMenuItem className="gap-2">
                <Mail className="h-4 w-4" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Edit className="h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Shield className="h-4 w-4" />
                Change Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
        <Button className="admin-button-primary gap-2">
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Search users..."
        />
      )}
    </div>
  );
}