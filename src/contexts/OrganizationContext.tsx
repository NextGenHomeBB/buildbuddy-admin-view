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
    if (!user) {
      console.log('OrganizationContext: No user found');
      return;
    }

    try {
      setError(null);
      console.log('OrganizationContext: Fetching organization for user:', user.id);
      
      // First try to get user's default organization from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('default_org_id')
        .eq('id', user.id)
        .single();

      console.log('OrganizationContext: Profile query result:', { profile, profileError });

      if (profileError) {
        console.error('OrganizationContext: Profile error:', profileError);
        throw profileError;
      }

      let orgId = profile?.default_org_id;
      console.log('OrganizationContext: Found default_org_id:', orgId);

      // If no default org, try to get user's first membership
      if (!orgId) {
        console.log('OrganizationContext: No default org, checking memberships...');
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .select('org_id, role')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        console.log('OrganizationContext: Membership query result:', { membership, membershipError });

        if (membershipError) {
          console.error('OrganizationContext: Membership error:', membershipError);
          throw membershipError;
        }

        if (!membership) {
          console.warn('OrganizationContext: No active memberships found');
          setError('No organization found. Please contact support.');
          return;
        }

        orgId = membership.org_id;
        console.log('OrganizationContext: Found org via membership:', orgId);

        // Update profile with this default org
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ default_org_id: orgId })
          .eq('id', user.id);

        if (updateError) {
          console.error('OrganizationContext: Failed to update profile:', updateError);
        }
      }

      // Get organization details
      console.log('OrganizationContext: Fetching organization details for:', orgId);
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', orgId)
        .single();

      console.log('OrganizationContext: Organization query result:', { org, orgError });

      if (orgError) {
        console.error('OrganizationContext: Organization error:', orgError);
        throw orgError;
      }

      if (!org) {
        console.error('OrganizationContext: Organization not found');
        setError('Organization not found. Please contact support.');
        return;
      }

      console.log('OrganizationContext: Successfully loaded organization:', org.name);
      setCurrentOrg(org);
      setCurrentOrgId(org.id);
      
    } catch (error) {
      console.error('OrganizationContext: Error fetching default organization:', error);
      setError(`Failed to load organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
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