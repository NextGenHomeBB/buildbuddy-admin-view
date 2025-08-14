import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SecureProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  work_role: any;
  company_id: string;
  default_org_id: string;
  created_at: string;
}

export const useSecureProfiles = (
  userId?: string
) => {
  return useQuery({
    queryKey: ['secure-profile', userId],
    queryFn: async (): Promise<SecureProfile[]> => {
      const { data, error } = await supabase.rpc('get_profile_secure', {
        p_user_id: userId || null
      });

      if (error) {
        console.error('Error fetching secure profile:', error);
        throw error;
      }

      return data || [];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};