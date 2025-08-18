
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
      
      // Directly query projects where the user is in assigned_workers array
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, status, progress, location, start_date, budget, assigned_workers')
        .contains('assigned_workers', [user.id]);

      if (projectsError) {
        throw projectsError;
      }

      // Map to the expected format with user_role as 'worker'
      return projects?.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        status: project.status || 'planning',
        progress: project.progress || 0,
        location: project.location,
        start_date: project.start_date,
        budget: project.budget,
        user_role: 'worker' as const
      })) || [];
    },
    enabled: !!user?.id,
  });
}
