import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerWithProjectAccess {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  project_access: {
    project_id: string;
    role: string;
  }[];
}

export function useWorkersWithProjectAccess() {
  return useQuery({
    queryKey: ['workers-with-project-access'],
    queryFn: async (): Promise<WorkerWithProjectAccess[]> => {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.warn('No valid session found for worker access query');
          return [];
        }

        // Use the edge function to get users with roles (properly scoped)
        const { data, error } = await supabase.functions.invoke('get_users_with_roles', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('Error fetching users with roles:', error);
          throw error;
        }

        const users = data?.users || [];
        console.log('Fetched users:', users.length);

        if (users.length === 0) {
          console.warn('No users found');
          return [];
        }

        // Get project access for each user
        const userIds = users.map((user: any) => user.id).filter(Boolean);
        
        if (userIds.length === 0) {
          console.warn('No valid user IDs found');
          return [];
        }

        // Get user_project_role entries only (single source of truth)
        const { data: projectRoles, error: projectError } = await supabase
          .from('user_project_role')
          .select('user_id, project_id, role')
          .in('user_id', userIds);

        if (projectError) {
          console.error('Error fetching project roles:', projectError);
        }

        // Build a comprehensive project access map
        const projectAccessMap = new Map<string, Set<{ project_id: string; role: string }>>();

        // Initialize map for all users
        userIds.forEach(userId => {
          projectAccessMap.set(userId, new Set());
        });

        // Add project roles from user_project_role table
        if (projectRoles) {
          projectRoles.forEach(pr => {
            if (pr.user_id && pr.project_id) {
              const userAccess = projectAccessMap.get(pr.user_id);
              if (userAccess) {
                userAccess.add({
                  project_id: pr.project_id,
                  role: pr.role || 'worker'
                });
              }
            }
          });
        }

        console.log('Project access map built:', projectAccessMap.size, 'users with access data');

        // Map users with their project access
        const result = users.map((user: any) => {
          const userAccess = projectAccessMap.get(user.id) || new Set();
          return {
            id: user.id,
            full_name: user.full_name || 'Unknown User',
            role: user.role || 'worker',
            avatar_url: user.avatar_url,
            project_access: Array.from(userAccess)
          };
        });

        console.log('Final workers with access:', result.length);
        return result;
      } catch (error) {
        console.error('Error in useWorkersWithProjectAccess:', error);
        // Return empty array to prevent UI crashes
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