
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
      
      // Query projects through user_project_role table
      const { data: projectAssignments, error: projectsError } = await supabase
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

      if (projectsError) {
        throw projectsError;
      }

      // Map to the expected format with actual user role
      return projectAssignments?.map(assignment => ({
        id: assignment.projects.id,
        name: assignment.projects.name,
        description: assignment.projects.description || '',
        status: assignment.projects.status || 'planning',
        progress: assignment.projects.progress || 0,
        location: assignment.projects.location,
        start_date: assignment.projects.start_date,
        budget: assignment.projects.budget,
        user_role: assignment.role
      })) || [];
    },
    enabled: !!user?.id,
  });
}
