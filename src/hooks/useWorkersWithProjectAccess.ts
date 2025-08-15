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

      const users = data.users || [];

      // Get project access for each user
      const userIds = users.map((user: any) => user.id);
      
      if (userIds.length === 0) {
        return [];
      }

      const { data: projectRoles, error: projectError } = await supabase
        .from('user_project_role')
        .select('user_id, project_id, role')
        .in('user_id', userIds);

      if (projectError) {
        throw projectError;
      }

      // Map users with their project access
      return users.map((user: any) => ({
        id: user.id,
        full_name: user.full_name || 'Unknown User',
        role: user.role || 'worker',
        avatar_url: user.avatar_url,
        project_access: (projectRoles || [])
          .filter(pr => pr.user_id === user.id)
          .map(pr => ({
            project_id: pr.project_id,
            role: pr.role
          }))
      }));
    },
  });
}