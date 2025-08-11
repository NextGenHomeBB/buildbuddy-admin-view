import { supabase } from '@/integrations/supabase/client';

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

// Simple helper to get current org ID with error handling
export const requireOrgId = (): string => {
  if (!currentOrgId) {
    throw new Error('No organization context available. Please ensure user is properly authenticated.');
  }
  return currentOrgId;
};

// Helper functions for org-scoped queries
export const getOrgScopedQuery = (tableName: string, orgId: string) => {
  return supabase.from(tableName as any).select('*').eq('org_id', orgId);
};

export const insertWithOrgId = (tableName: string, data: any, orgId: string) => {
  return supabase.from(tableName as any).insert({ ...data, org_id: orgId });
};

export const updateWithOrgId = (tableName: string, data: any, orgId: string) => {
  return supabase.from(tableName as any).update(data).eq('org_id', orgId);
};

export const deleteWithOrgId = (tableName: string, orgId: string) => {
  return supabase.from(tableName as any).delete().eq('org_id', orgId);
};

// Utility functions for invitations using RPCs
export const inviteUserToOrg = async (email: string, role: string, expiresAt?: string) => {
  const { data, error } = await supabase.rpc('invite_user', {
    p_org_id: requireOrgId(),
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