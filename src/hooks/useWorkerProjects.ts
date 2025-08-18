
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
        return [];
      }
      
      // Query user project roles to get assigned projects
      const { data: userProjects, error: userProjectsError } = await supabase
        .from('user_project_role')
        .select(`
          project_id,
          role,
          projects (
            id,
            name,
            description,
            status,
            progress,
            location,
            start_date,
            budget
          )
        `)
        .eq('user_id', user.id);

      if (userProjectsError) {
        throw userProjectsError;
      }

      // Map to the expected format
      return userProjects?.map(item => {
        const project = item.projects;
        return {
          id: project.id,
          name: project.name,
          description: project.description || '',
          status: project.status || 'planning',
          progress: project.progress || 0,
          location: project.location,
          start_date: project.start_date,
          budget: project.budget,
          user_role: item.role || 'worker'
        };
      }) || [];
    },
    enabled: !!user?.id,
  });
}
