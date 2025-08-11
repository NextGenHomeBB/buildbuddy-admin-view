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
      
      // Get user's default organization from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          default_org_id,
          organizations!inner (
            id,
            name,
            created_at
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.default_org_id) {
        setError('No organization found. Please contact support.');
        setLoading(false);
        return;
      }

      const org = profile.organizations as Organization;
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