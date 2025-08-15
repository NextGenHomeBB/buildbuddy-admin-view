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
        .maybeSingle();

      logger.debug('OrganizationContext: Profile query result', { profile, profileError });

      // Continue even if profile query fails - we can try membership lookup
      let orgId = profile?.default_org_id;
      logger.debug('OrganizationContext: Found default_org_id', { orgId });

      // If no default org or profile error, try to get user's first membership
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
          // For workers, continue with auto-assignment attempt instead of failing
          logger.warn('OrganizationContext: Membership query failed, attempting auto-assignment');
        }

        if (!membership && !membershipError) {
          logger.warn('OrganizationContext: No active memberships found - attempting auto-assignment');
        }

        if (membership && !membershipError) {
          orgId = membership.org_id;
          logger.debug('OrganizationContext: Found org via membership', { orgId });

          // Update profile with this default org (but don't fail if this fails)
          try {
            await supabase
              .from('profiles')
              .update({ default_org_id: orgId })
              .eq('id', user.id);
          } catch (updateError) {
            logger.error('OrganizationContext: Failed to update profile (non-fatal)', updateError);
          }
        } else {
          // Try to auto-assign user to default organization as fallback
          try {
            logger.info('OrganizationContext: Attempting auto-assignment to default organization');
            const { data: defaultOrg, error: defaultOrgError } = await supabase
              .from('organizations')
              .select('id, name')
              .eq('name', 'NextGenHome')
              .maybeSingle();

            logger.debug('OrganizationContext: Default org lookup result', { defaultOrg, defaultOrgError });

            if (defaultOrg && !defaultOrgError) {
              // Create membership
              const { error: membershipInsertError } = await supabase
                .from('organization_members')
                .insert({
                  org_id: defaultOrg.id,
                  user_id: user.id,
                  role: 'worker',
                  status: 'active'
                });

              if (membershipInsertError) {
                logger.error('OrganizationContext: Failed to create membership', membershipInsertError);
              } else {
                // Update profile (but don't fail if this fails)
                try {
                  await supabase
                    .from('profiles')
                    .update({ default_org_id: defaultOrg.id })
                    .eq('id', user.id);
                } catch (profileUpdateError) {
                  logger.error('OrganizationContext: Failed to update profile after auto-assignment (non-fatal)', profileUpdateError);
                }

                orgId = defaultOrg.id;
                logger.info('OrganizationContext: Successfully auto-assigned user to default organization');
              }
            } else {
              logger.error('OrganizationContext: Could not find default organization for auto-assignment');
            }
          } catch (autoAssignError) {
            logger.error('OrganizationContext: Failed to auto-assign user', autoAssignError);
          }
        }

        if (!orgId) {
          logger.error('OrganizationContext: No organization found after all attempts');
          setError('No organization found. Please contact support or try clearing cache.');
          return;
        }
      }

      // Get organization details
      logger.debug('OrganizationContext: Fetching organization details', { orgId });
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', orgId)
        .maybeSingle();

      logger.debug('OrganizationContext: Organization query result', { org, orgError });

      if (orgError) {
        logger.error('OrganizationContext: Organization error', orgError);
        setError(`Organization access error: ${orgError.message}. Please contact support.`);
        return;
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide more specific error messages for common issues
      if (errorMessage.includes('row-level security')) {
        setError('Permission error: Unable to access organization data. Please contact support.');
      } else if (errorMessage.includes('connection')) {
        setError('Connection error: Please check your internet connection and try again.');
      } else {
        setError(`Failed to load organization: ${errorMessage}`);
      }
      
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