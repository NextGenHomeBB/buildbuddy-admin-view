import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Organization {
  id: string;
  name: string;
  created_at: string;
  member_count?: number;
}

interface OrganizationSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrganizationJoined: () => void;
}

export function OrganizationSelectionDialog({ 
  open, 
  onOpenChange, 
  onOrganizationJoined 
}: OrganizationSelectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Fetch available organizations
  const { data: organizations, isLoading } = useQuery({
    queryKey: ['available-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .order('name');
      
      if (error) throw error;
      return data as Organization[];
    },
    enabled: open,
  });

  // Join organization mutation
  const joinOrganizationMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create organization membership
      const { error: membershipError } = await supabase
        .from('organization_members')
        .insert({
          org_id: orgId,
          user_id: user.id,
          role: 'worker',
          status: 'active'
        });

      if (membershipError) throw membershipError;

      // Update user's default organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ default_org_id: orgId })
        .eq('id', user.id);

      if (profileError) throw profileError;

      return orgId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-organization'] });
      toast({
        title: "Success",
        description: "Successfully joined organization!",
      });
      onOrganizationJoined();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join organization",
        variant: "destructive",
      });
    },
  });

  const handleJoinOrganization = () => {
    if (selectedOrgId) {
      joinOrganizationMutation.mutate(selectedOrgId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select an Organization
          </DialogTitle>
          <DialogDescription>
            Choose an organization to join and start collaborating with your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : organizations && organizations.length > 0 ? (
            <div className="space-y-3">
              {organizations.map((org) => (
                <Card
                  key={org.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedOrgId === org.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedOrgId(org.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{org.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(org.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedOrgId === org.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {org.member_count || 0}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Organizations Available</h3>
              <p className="text-muted-foreground">
                Contact your administrator to create an organization or send you an invitation.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinOrganization}
            disabled={!selectedOrgId || joinOrganizationMutation.isPending}
          >
            {joinOrganizationMutation.isPending ? 'Joining...' : 'Join Organization'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}