import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type SupabaseClient = typeof supabase;

// Global org ID - set once user loads their default org
let currentOrgId: string | null = null;

export const setCurrentOrgId = (orgId: string) => {
  currentOrgId = orgId;
};

export const getCurrentOrgId = (): string | null => {
  return currentOrgId;
};

export const clearCurrentOrgId = () => {
  currentOrgId = null;
};

// Helper to ensure org_id is always included in queries
export const createOrgScopedQuery = (tableName: keyof Database['public']['Tables']) => {
  if (!currentOrgId) {
    throw new Error('No organization context available. Please ensure user is properly authenticated.');
  }

  const baseQuery = supabase.from(tableName);
  
  return {
    // Override select to always filter by org_id
    select: (columns?: string) => {
      const query = columns ? baseQuery.select(columns) : baseQuery.select();
      return query.eq('org_id', currentOrgId);
    },
    
    // Override insert to always include org_id
    insert: (values: any) => {
      if (Array.isArray(values)) {
        const valuesWithOrgId = values.map(v => ({ ...v, org_id: currentOrgId }));
        return baseQuery.insert(valuesWithOrgId);
      } else {
        return baseQuery.insert({ ...values, org_id: currentOrgId });
      }
    },
    
    // Override update to filter by org_id
    update: (values: any) => {
      return baseQuery.update(values).eq('org_id', currentOrgId);
    },
    
    // Override delete to filter by org_id
    delete: () => {
      return baseQuery.delete().eq('org_id', currentOrgId);
    },
    
    // Override upsert to always include org_id
    upsert: (values: any) => {
      if (Array.isArray(values)) {
        const valuesWithOrgId = values.map(v => ({ ...v, org_id: currentOrgId }));
        return baseQuery.upsert(valuesWithOrgId);
      } else {
        return baseQuery.upsert({ ...values, org_id: currentOrgId });
      }
    }
  };
};

// Convenience function for direct table access with org scoping
export const orgScoped = {
  projects: () => createOrgScopedQuery('projects'),
  tasks: () => createOrgScopedQuery('tasks'),
  shifts: () => createOrgScopedQuery('shifts'),
  materials: () => createOrgScopedQuery('materials'),
  phase_expenses: () => createOrgScopedQuery('phase_expenses'),
  invitations: () => createOrgScopedQuery('invitations'),
  organization_members: () => createOrgScopedQuery('organization_members'),
};

// Utility functions for invitations using RPCs
export const inviteUserToOrg = async (email: string, role: string, expiresAt?: string) => {
  if (!currentOrgId) {
    throw new Error('No organization context available');
  }
  
  const { data, error } = await supabase.rpc('invite_user', {
    p_org_id: currentOrgId,
    p_email: email,
    p_role: role,
    p_expires_at: expiresAt || null
  });
  
  if (error) throw error;
  return data;
};

export const acceptInvitation = async (token: string) => {
  const { data, error } = await supabase.rpc('accept_invite', {
    p_token: token
  });
  
  if (error) throw error;
  return data;
};