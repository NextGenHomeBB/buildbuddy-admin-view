
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
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Use the edge function to get users with roles (properly scoped)
      const { data, error } = await supabase.functions.invoke('get_users_with_roles', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      return (data.users || []).map((user: any) => ({
        id: user.id,
        full_name: user.full_name || 'Unknown User',
        role: user.role || 'worker',
        avatar_url: user.avatar_url
      }));
    },
  });
}
