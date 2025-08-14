import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from './AuthContext';
import { setCurrentOrgId, clearCurrentOrgId } from '@/lib/supabase-org-helper';
import { logger } from '@/utils/logger';
import { cacheManager } from '@/utils/cacheManager';

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
  clearCacheAndRetry: () => Promise<void>;
  retryCount: number;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchDefaultOrganization = async () => {
    if (!user) {
      logger.debug('OrganizationContext: No user found');
      return;
    }

    try {
      setError(null);
      logger.info('OrganizationContext: Fetching organization for user', { 
        userId: user.id, 
        retryCount 
      });
      
      // First try to get user's default organization from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('default_org_id')
        .eq('id', user.id)
        .single();

      logger.debug('OrganizationContext: Profile query result', { profile, profileError });

      if (profileError) {
        logger.error('OrganizationContext: Profile error', profileError);
        throw profileError;
      }

      let orgId = profile?.default_org_id;
      logger.debug('OrganizationContext: Found default_org_id', { orgId });

      // If no default org, try to get user's first membership
      if (!orgId) {
        logger.debug('OrganizationContext: No default org, checking memberships...');
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .select('org_id, role')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        logger.debug('OrganizationContext: Membership query result', { membership, membershipError });

        if (membershipError) {
          logger.error('OrganizationContext: Membership error', membershipError);
          throw membershipError;
        }

        if (!membership) {
          logger.warn('OrganizationContext: No active memberships found');
          setError('No organization found. Please contact support.');
          return;
        }

        orgId = membership.org_id;
        logger.debug('OrganizationContext: Found org via membership', { orgId });

        // Update profile with this default org
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ default_org_id: orgId })
          .eq('id', user.id);

        if (updateError) {
          logger.error('OrganizationContext: Failed to update profile', updateError);
        }
      }

      // Get organization details
      logger.debug('OrganizationContext: Fetching organization details', { orgId });
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', orgId)
        .single();

      logger.debug('OrganizationContext: Organization query result', { org, orgError });

      if (orgError) {
        logger.error('OrganizationContext: Organization error', orgError);
        throw orgError;
      }

      if (!org) {
        logger.error('OrganizationContext: Organization not found');
        setError('Organization not found. Please contact support.');
        return;
      }

      logger.info('OrganizationContext: Successfully loaded organization', { 
        orgName: org.name, 
        orgId: org.id 
      });
      setCurrentOrg(org);
      setCurrentOrgId(org.id);
      
    } catch (error) {
      logger.error('OrganizationContext: Error fetching default organization', error);
      setError(`Failed to load organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // If this is a repeated failure, suggest cache clearing
      if (retryCount > 2) {
        logger.warn('Multiple organization load failures, cache issue suspected', { retryCount });
        setError('Persistent loading issue detected. Try clearing cache.');
      }
    }
  };

  const refreshOrganization = async () => {
    setRetryCount(prev => prev + 1);
    await fetchDefaultOrganization();
  };

  const clearCacheAndRetry = async () => {
    try {
      logger.info('Clearing cache and retrying organization load');
      await cacheManager.clearAllCaches({ clearStorage: false });
      setRetryCount(0);
      setError(null);
      await fetchDefaultOrganization();
    } catch (error) {
      logger.error('Failed to clear cache and retry', error);
      setError('Failed to clear cache. Please try a manual refresh.');
    }
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
      refreshOrganization,
      clearCacheAndRetry,
      retryCount
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