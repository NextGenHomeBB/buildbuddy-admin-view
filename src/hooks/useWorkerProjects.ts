
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WorkerProject {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  location?: string;
  start_date?: string;
  budget?: number;
  user_role: string;
}

export function useWorkerProjects() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['worker-projects', user?.id],
    queryFn: async (): Promise<WorkerProject[]> => {
      if (!user?.id) {
        console.log('useWorkerProjects: No user ID found, returning empty array');
        return [];
      }
      
      console.log('useWorkerProjects: Fetching projects for user:', user.id);
      
      // First, get the user's project roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_project_role')
        .select('project_id, role')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }

      console.log('User roles found:', userRoles);

      if (!userRoles || userRoles.length === 0) {
        console.log('No roles found for user');
        return [];
      }

      // Get project IDs
      const projectIds = userRoles.map(role => role.project_id);
      
      // Then fetch the projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, status, progress, location, start_date, budget')
        .in('id', projectIds);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      console.log('Projects found:', projects);

      // Combine projects with user roles
      const result = projects?.map(project => {
        const userRole = userRoles.find(role => role.project_id === project.id);
        return {
          ...project,
          user_role: userRole?.role || 'worker'
        };
      }) || [];

      console.log('Final result:', result);
      return result;
    },
    enabled: !!user?.id,
  });
}
