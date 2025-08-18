import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from './AuthContext';
import { setCurrentOrgId, clearCurrentOrgId } from '@/lib/supabase-org-helper';

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDefaultOrganization = async () => {
    if (!user) return;

    try {
      setError(null);
      
      // First try to get user's default organization from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('default_org_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      let orgId = profile?.default_org_id;

      // If no default org, try to get user's first membership
      if (!orgId) {
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .select('org_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (membershipError || !membership) {
          setError('No organization found. Please contact support.');
          return;
        }

        orgId = membership.org_id;

        // Update profile with this default org
        await supabase
          .from('profiles')
          .update({ default_org_id: orgId })
          .eq('id', user.id);
      }

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', orgId)
        .single();

      if (orgError) throw orgError;

      setCurrentOrg(org);
      setCurrentOrgId(org.id);
      
    } catch (error) {
      console.error('Error fetching default organization:', error);
      setError('Failed to load organization');
    }
  };

  const refreshOrganization = async () => {
    await fetchDefaultOrganization();
  };

  useEffect(() => {
    if (user) {
      fetchDefaultOrganization().finally(() => setLoading(false));
    } else {
      setCurrentOrg(null);
      clearCurrentOrgId();
      setLoading(false);
    }
  }, [user]);

  return (
    <OrganizationContext.Provider value={{
      currentOrg,
      loading,
      error,
      refreshOrganization
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}