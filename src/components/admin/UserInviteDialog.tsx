import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Mail, Users, Shield, Send, Check } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const inviteSchema = z.object({
  emails: z.string().min(1, 'At least one email is required'),
  role: z.enum(['admin', 'manager', 'worker']),
  message: z.string().optional(),
  send_welcome: z.boolean().default(true),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserInvited?: () => void;
}

export function UserInviteDialog({ open, onOpenChange, onUserInvited }: UserInviteDialogProps) {
  const [inviting, setInviting] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const { toast } = useToast();
  const { currentOrg } = useOrganization();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      emails: '',
      role: 'worker',
      message: '',
      send_welcome: true,
    },
  });

  const parseEmails = (emailString: string): string[] => {
    return emailString
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
  };

  const validateEmails = (emails: string[]): { valid: string[]; invalid: string[] } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      if (emailRegex.test(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    return { valid, invalid };
  };

  const onSubmit = async (data: InviteFormData) => {
    try {
      setInviting(true);
      
      const emails = parseEmails(data.emails);
      const { valid, invalid } = validateEmails(emails);

      if (invalid.length > 0) {
        toast({
          title: 'Invalid emails found',
          description: `Please fix these emails: ${invalid.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to invite users.',
          variant: 'destructive',
        });
        return;
      }

      if (!currentOrg?.id) {
        toast({
          title: 'No organization selected',
          description: 'Please select an organization first.',
          variant: 'destructive',
        });
        return;
      }

      // Send invitations through edge function
      const { data: result, error } = await supabase.functions.invoke('invite_users', {
        body: {
          emails: valid,
          role: data.role,
          org_id: currentOrg.id,
          send_welcome: data.send_welcome,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        logger.error('Failed to send invitations:', error);
        
        // Better error handling based on error type
        let errorMessage = 'An unexpected error occurred';
        let errorTitle = 'Failed to send invitations';
        
        if (error.message?.includes('Rate limit exceeded')) {
          errorTitle = 'Too many requests';
          errorMessage = 'Please wait a moment before sending more invitations.';
        } else if (error.message?.includes('Admin or owner access required')) {
          errorTitle = 'Insufficient permissions';
          errorMessage = 'You need admin or owner privileges to send invitations.';
        } else if (error.message?.includes('Organization ID is required')) {
          errorTitle = 'Organization error';
          errorMessage = 'Please select an organization first.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      setInvitedEmails(valid);
      setStep('success');
      
      toast({
        title: 'Invitations sent successfully',
        description: `Sent ${valid.length} invitation(s)`,
      });

      onUserInvited?.();
    } catch (error) {
      logger.error('Error inviting users:', error);
      toast({
        title: 'Failed to send invitations',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setInvitedEmails([]);
    form.reset();
    onOpenChange(false);
  };

  const currentEmails = parseEmails(form.watch('emails') || '');
  const { valid: validEmails, invalid: invalidEmails } = validateEmails(currentEmails);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invite Team Members
              </DialogTitle>
              <DialogDescription>
                Send invitations to new team members to join your organization.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="emails">Email Addresses</Label>
                <Textarea
                  id="emails"
                  placeholder="Enter email addresses separated by commas, semicolons, or new lines..."
                  {...form.register('emails')}
                  rows={4}
                />
                {form.formState.errors.emails && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.emails.message}
                  </p>
                )}
                
                {/* Email validation preview */}
                {currentEmails.length > 0 && (
                  <div className="space-y-2">
                    {validEmails.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Valid:</span>
                        {validEmails.map(email => (
                          <Badge key={email} variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            {email}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {invalidEmails.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-sm font-medium text-destructive">Invalid:</span>
                        {invalidEmails.map(email => (
                          <Badge key={email} variant="destructive" className="text-xs">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Default Role</Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(value: 'admin' | 'manager' | 'worker') =>
                    form.setValue('role', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Worker - Basic access to assigned tasks
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Manager - Manage projects and teams
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin - Full system access
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Custom Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to the invitation..."
                  {...form.register('message')}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviting || validEmails.length === 0}
                  className="gap-2"
                >
                  {inviting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send {validEmails.length} Invitation{validEmails.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Invitations Sent Successfully
              </DialogTitle>
              <DialogDescription>
                Your team members will receive invitation emails shortly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Invited Users ({invitedEmails.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {invitedEmails.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" />
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h5 className="font-medium mb-2">Next Steps:</h5>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Invited users will receive an email with setup instructions</li>
                  <li>• They'll need to create an account and verify their email</li>
                  <li>• Once verified, they'll have access based on their assigned role</li>
                  <li>• You can manage their permissions anytime from the Users page</li>
                </ul>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}