
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
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_project_role')
        .select(`
          role,
          projects:project_id (
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

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item.projects,
        user_role: item.role
      }));
    },
    enabled: !!user?.id,
  });
}
