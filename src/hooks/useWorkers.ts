
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .in('role', ['worker', 'developer', 'project_manager'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}
