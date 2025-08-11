import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuthContext();
  const { refreshMemberships } = useOrganization();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthorized'>('loading');
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    if (!user) {
      setStatus('unauthorized');
      return;
    }

    handleAcceptInvite();
  }, [token, user]);

  const handleAcceptInvite = async () => {
    if (!token) return;

    try {
      const { data, error } = await supabase.rpc('accept_invite', {
        p_token: token
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        setInviteData(result);
        setStatus('success');
        toast.success('Successfully joined organization!');
        await refreshMemberships();
        
        // Redirect to admin after short delay
        setTimeout(() => {
          navigate('/admin');
        }, 2000);
      } else {
        setStatus('error');
        toast.error(result?.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
      toast.error('Failed to accept invitation');
    }
  };

  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Building className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to sign in to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Processing Invitation</CardTitle>
            <CardDescription>
              Please wait while we process your invitation...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Welcome to the team!</CardTitle>
            <CardDescription>
              You've successfully joined the organization as a {inviteData?.role}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting you to the dashboard...
            </p>
            <Button onClick={() => navigate('/admin')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription>
            This invitation link is invalid or has expired
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            Return Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}