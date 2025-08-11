import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

interface Membership {
  id: string;
  org_id: string;
  role: string;
  status: string;
  expires_at?: string;
  organization: Organization;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  memberships: Membership[];
  loading: boolean;
  switchOrganization: (orgId: string) => void;
  refreshMemberships: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          org_id,
          role,
          status,
          expires_at,
          created_at,
          organizations!inner (
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMemberships: Membership[] = data?.map((item: any) => ({
        id: item.org_id, // Use org_id as membership identifier
        org_id: item.org_id,
        role: item.role,
        status: item.status || 'active',
        expires_at: item.expires_at,
        organization: item.organizations as Organization
      })) || [];

      setMemberships(formattedMemberships);

      // Set current org if not set (first membership)
      if (!currentOrg && formattedMemberships.length > 0) {
        const savedOrgId = localStorage.getItem('currentOrgId');
        const savedOrg = formattedMemberships.find(m => m.org_id === savedOrgId);
        setCurrentOrg(savedOrg?.organization || formattedMemberships[0].organization);
      }
    } catch (error) {
      console.error('Error fetching memberships:', error);
    }
  };

  const switchOrganization = (orgId: string) => {
    const membership = memberships.find(m => m.org_id === orgId);
    if (membership) {
      setCurrentOrg(membership.organization);
      localStorage.setItem('currentOrgId', orgId);
    }
  };

  const refreshMemberships = async () => {
    await fetchMemberships();
  };

  useEffect(() => {
    if (user) {
      fetchMemberships().finally(() => setLoading(false));
    } else {
      setCurrentOrg(null);
      setMemberships([]);
      setLoading(false);
    }
  }, [user]);

  return (
    <OrganizationContext.Provider value={{
      currentOrg,
      memberships,
      loading,
      switchOrganization,
      refreshMemberships
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