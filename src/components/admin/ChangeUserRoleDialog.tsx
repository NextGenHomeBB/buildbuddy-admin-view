import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Shield, Users, AlertTriangle, Check } from 'lucide-react';
import { logger } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const roleChangeSchema = z.object({
  newRole: z.enum(['admin', 'manager', 'worker']),
  reason: z.string().optional(),
});

type RoleChangeFormData = z.infer<typeof roleChangeSchema>;

interface User {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface ChangeUserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onRoleChanged?: () => void;
}

const getRoleDescription = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Full system access - can manage all users, projects, and settings';
    case 'manager':
      return 'Project management access - can manage assigned projects and teams';
    case 'worker':
      return 'Basic access - can view and update assigned tasks';
    default:
      return 'Unknown role';
  }
};

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

export function ChangeUserRoleDialog({ 
  open, 
  onOpenChange, 
  user, 
  onRoleChanged 
}: ChangeUserRoleDialogProps) {
  const [changing, setChanging] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<RoleChangeFormData | null>(null);
  const { toast } = useToast();

  const form = useForm<RoleChangeFormData>({
    resolver: zodResolver(roleChangeSchema),
    defaultValues: {
      newRole: (user?.role as 'admin' | 'manager' | 'worker') || 'worker',
    },
  });

  // Reset form when user changes
  useState(() => {
    if (user) {
      form.reset({
        newRole: (user.role as 'admin' | 'manager' | 'worker') || 'worker',
      });
    }
  }, [user, form]);

  const onSubmit = async (data: RoleChangeFormData) => {
    if (!user || data.newRole === user.role) {
      toast({
        title: 'No changes needed',
        description: 'The user already has this role.',
      });
      return;
    }

    // Show confirmation dialog for role changes
    setFormData(data);
    setShowConfirmDialog(true);
  };

  const confirmRoleChange = async () => {
    if (!user || !formData) return;

    try {
      setChanging(true);
      
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to change user roles.',
          variant: 'destructive',
        });
        return;
      }

      // Change user role through edge function
      const { error } = await supabase.functions.invoke('change_user_role', {
        body: {
          user_id: user.id,
          new_role: formData.newRole,
          reason: formData.reason,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        logger.error('Failed to change user role:', error);
        toast({
          title: 'Failed to change role',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Role changed successfully',
        description: `${user.full_name} is now a ${formData.newRole}`,
      });

      onRoleChanged?.();
      handleClose();
    } catch (error) {
      logger.error('Error changing user role:', error);
      toast({
        title: 'Failed to change role',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setChanging(false);
      setShowConfirmDialog(false);
    }
  };

  const handleClose = () => {
    if (!changing) {
      setFormData(null);
      setShowConfirmDialog(false);
      form.reset();
      onOpenChange(false);
    }
  };

  if (!user) return null;

  const selectedRole = form.watch('newRole');
  const isRoleChange = selectedRole !== user.role;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Change User Role
            </DialogTitle>
            <DialogDescription>
              Update the role and permissions for this team member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
                <AvatarFallback>
                  {user.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{user.full_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">Current role:</span>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                    {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>New Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value: 'admin' | 'manager' | 'worker') =>
                    form.setValue('newRole', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">Worker</div>
                          <div className="text-xs text-muted-foreground">Basic task access</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">Manager</div>
                          <div className="text-xs text-muted-foreground">Project management</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">Admin</div>
                          <div className="text-xs text-muted-foreground">Full system access</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Role description */}
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {getRoleDescription(selectedRole)}
                </div>
              </div>

              {/* Show change indicator */}
              {isRoleChange && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/10 rounded-md border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    This will change the user's access permissions immediately.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isRoleChange || changing}
                  variant={isRoleChange ? 'default' : 'secondary'}
                  className="gap-2"
                >
                  {changing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {isRoleChange ? 'Change Role' : 'No Changes'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {user.full_name}'s role from{' '}
              <Badge variant={getRoleBadgeVariant(user.role)} className="mx-1 capitalize">
                {user.role}
              </Badge>
              to{' '}
              <Badge variant={getRoleBadgeVariant(formData?.newRole || 'worker')} className="mx-1 capitalize">
                {formData?.newRole}
              </Badge>
              ?
              <br /><br />
              This will immediately update their access permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              disabled={changing}
              className="gap-2"
            >
              {changing && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}