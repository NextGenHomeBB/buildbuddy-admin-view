
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Worker {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

export function useWorkers() {
  return useQuery({
    queryKey: ['workers'],
    queryFn: async (): Promise<Worker[]> => {
      // Get all profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      // For now, return all profiles as workers since we can't access user_roles directly
      // In production, you'd want to use a proper view or join
      return (profiles || []).map(profile => ({
        ...profile,
        role: 'worker' // Default role
      }));
    },
  });
}
