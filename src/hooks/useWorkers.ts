
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
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.warn('No valid session found for workers query');
          return [];
        }

        // Use the edge function to get users with roles (properly scoped)
        const { data, error } = await supabase.functions.invoke('get_users_with_roles', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('Error fetching workers:', error);
          throw error;
        }

        const users = data?.users || [];
        console.log('Fetched workers:', users.length);

        return users
          .filter((user: any) => user.id) // Filter out invalid users
          .map((user: any) => ({
            id: user.id,
            full_name: user.full_name || 'Unknown User',
            role: user.role || 'worker',
            avatar_url: user.avatar_url
          }));
      } catch (error) {
        console.error('Error in useWorkers:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 1 * 60 * 1000, // Reduced to 1 minute for faster updates
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
}
